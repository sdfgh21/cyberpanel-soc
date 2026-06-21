import React, { useState, useEffect } from 'react';
import { Search, Shield, Globe, Lock, AlertTriangle, CheckCircle, XCircle,
         Clock, ChevronDown, ChevronUp, Download, Trash2, ExternalLink } from 'lucide-react';
import api from '../utils/api';
import { timeAgo, formatDate } from '../utils/helpers.jsx';
import toast from 'react-hot-toast';

const GRADE_COLORS = { A:'text-green-400', B:'text-cyber-400', C:'text-yellow-400', D:'text-orange-400', F:'text-red-400' };
const GRADE_BG     = { A:'bg-green-900/30 border-green-700/40', B:'bg-cyber-900/30 border-cyber-700/40', C:'bg-yellow-900/30 border-yellow-700/40', D:'bg-orange-900/30 border-orange-700/40', F:'bg-red-900/30 border-red-700/40' };
const SEV_COLORS   = { critical:'text-red-400', high:'text-orange-400', medium:'text-yellow-400', low:'text-green-400' };
const PRIORITY_COLORS = { P1:'text-red-400 bg-red-900/20 border-red-800/30', P2:'text-orange-400 bg-orange-900/20 border-orange-800/30', P3:'text-yellow-400 bg-yellow-900/20 border-yellow-800/30' };

function ScoreGauge({ score, grade }) {
  const pct   = score;
  const color = grade==='A'?'#22c55e':grade==='B'?'#14b8a6':grade==='C'?'#eab308':grade==='D'?'#f97316':'#ef4444';
  return (
    <div className="relative w-32 h-32 mx-auto">
      <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
        <circle cx="18" cy="18" r="15.9" fill="none" stroke="#1f2937" strokeWidth="3"/>
        <circle cx="18" cy="18" r="15.9" fill="none" stroke={color} strokeWidth="3"
          strokeDasharray={`${pct} ${100-pct}`} strokeLinecap="round"/>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-3xl font-bold font-mono ${GRADE_COLORS[grade]}`}>{grade}</span>
        <span className="text-xs text-gray-500 font-mono">{score}/100</span>
      </div>
    </div>
  );
}

function HeaderRow({ h }) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-gray-800/40 last:border-0">
      {h.present
        ? <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0"/>
        : <XCircle    className="w-4 h-4 text-red-400 flex-shrink-0"/>}
      <div className="flex-1 min-w-0">
        <div className="text-xs font-mono text-gray-300">{h.label}</div>
        {h.present && h.value && <div className="text-[10px] text-gray-600 truncate font-mono">{h.value}</div>}
      </div>
      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${h.present?'text-green-400 bg-green-900/20':'text-red-400 bg-red-900/20'}`}>
        {h.present?'✓ Present':'✗ Missing'}
      </span>
    </div>
  );
}

function RecommendationCard({ rec, index }) {
  const [open, setOpen] = useState(index < 2);
  return (
    <div className={`rounded-lg border p-3 ${PRIORITY_COLORS[rec.priority]?.split(' ').slice(1).join(' ')||'bg-gray-800/30 border-gray-700/40'}`}>
      <div className="flex items-center gap-2 cursor-pointer" onClick={()=>setOpen(!open)}>
        <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${PRIORITY_COLORS[rec.priority]}`}>{rec.priority}</span>
        <span className={`text-[10px] font-mono ${SEV_COLORS[rec.severity]||'text-gray-400'}`}>{rec.severity?.toUpperCase()}</span>
        <span className="text-xs font-medium text-gray-200 flex-1">{rec.title}</span>
        <span className="text-[10px] text-gray-500 font-mono">{rec.category}</span>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-gray-600"/> : <ChevronDown className="w-3.5 h-3.5 text-gray-600"/>}
      </div>
      {open && (
        <div className="mt-3 space-y-2 fade-in-up">
          <p className="text-xs text-gray-400">{rec.description}</p>
          {rec.fix && (
            <div className="bg-gray-900/60 rounded p-3">
              <div className="text-[10px] text-gray-500 font-mono uppercase mb-1">Fix / Remediation:</div>
              <pre className="text-xs text-cyber-400 font-mono whitespace-pre-wrap">{rec.fix}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ScanResult({ result }) {
  const [section, setSection] = useState('overview');
  const tabs = ['overview','headers','ssl','techs','reputation','recommendations'];

  const handleDownload = () => {
    const html = generateReportHTML(result);
    const blob = new Blob([html], {type:'text/html'});
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `security-scan-${result.hostname}-${Date.now()}.html`; a.click();
    URL.revokeObjectURL(url);
    toast.success('Report downloaded!');
  };

  return (
    <div className="glass-card overflow-hidden fade-in-up">
      {/* Header */}
      <div className="p-5 border-b border-gray-800/60 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <Globe className="w-4 h-4 text-cyber-400"/>{result.hostname}
          </h2>
          <p className="text-[10px] text-gray-500 font-mono mt-0.5">{result.url} · Scanned {formatDate(result.timestamp)}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className={`text-center px-4 py-2 rounded-lg border ${GRADE_BG[result.grade]}`}>
            <div className={`text-2xl font-bold font-mono ${GRADE_COLORS[result.grade]}`}>{result.grade}</div>
            <div className="text-[10px] text-gray-500 font-mono">{result.score}/100</div>
          </div>
          <button onClick={handleDownload} className="btn-ghost"><Download className="w-4 h-4"/>Export</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto border-b border-gray-800/60 bg-gray-800/20">
        {tabs.map(t=>(
          <button key={t} onClick={()=>setSection(t)}
            className={`px-4 py-2.5 text-xs font-mono capitalize whitespace-nowrap transition-colors ${section===t?'text-cyber-400 border-b-2 border-cyber-400 bg-cyber-900/20':'text-gray-500 hover:text-gray-300'}`}>
            {t}
            {t==='recommendations' && result.recommendations?.length>0 && (
              <span className="ml-1.5 bg-red-500 text-white text-[9px] font-bold rounded-full px-1.5 py-0.5">{result.recommendations.length}</span>
            )}
          </button>
        ))}
      </div>

      <div className="p-5">
        {/* Overview */}
        {section==='overview' && (
          <div className="space-y-5">
            <div className="flex items-center gap-6 flex-wrap">
              <ScoreGauge score={result.score} grade={result.grade}/>
              <div className="flex-1 space-y-3">
                {result.breakdown && Object.entries(result.breakdown).map(([k,v])=>(
                  <div key={k} className="flex items-center gap-3">
                    <span className="text-xs font-mono text-gray-400 w-24 capitalize">{k}</span>
                    <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${v>=20?'bg-green-500':v>=12?'bg-yellow-500':'bg-red-500'}`}
                        style={{width:`${(v/25)*100}%`}}/>
                    </div>
                    <span className="text-xs font-mono text-gray-400 w-12 text-right">{v}/25</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Steps */}
            <div className="space-y-2">
              {result.steps?.map((step,i)=>(
                <div key={i} className="flex items-center gap-3 text-xs">
                  {step.status==='done'  && <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0"/>}
                  {step.status==='error' && <XCircle    className="w-4 h-4 text-red-400 flex-shrink-0"/>}
                  {step.status==='running'&&<Clock       className="w-4 h-4 text-yellow-400 flex-shrink-0 animate-pulse"/>}
                  <span className="text-gray-300 font-medium">{step.step}</span>
                  <span className="text-gray-600 font-mono">→ {step.data}</span>
                </div>
              ))}
            </div>
            {/* DNS */}
            {result.dns?.ips?.length>0 && (
              <div className="bg-gray-800/30 rounded-lg p-3">
                <div className="text-[10px] text-gray-500 font-mono uppercase mb-2">DNS Resolution</div>
                <div className="flex flex-wrap gap-2">
                  {result.dns.ips.map((ip,i)=><span key={i} className="text-xs font-mono text-cyber-400 bg-cyber-900/20 px-2 py-0.5 rounded">{ip}</span>)}
                  {result.dns.ipv6?.map((ip,i)=><span key={`v6-${i}`} className="text-xs font-mono text-blue-400 bg-blue-900/20 px-2 py-0.5 rounded">{ip}</span>)}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Headers */}
        {section==='headers' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500">
                {result.headers?.filter(h=>h.present).length||0}/{result.headers?.length||0} security headers configured
              </p>
              <div className="flex gap-2 text-[10px] font-mono">
                <span className="text-green-400">✓ {result.headers?.filter(h=>h.present).length||0} present</span>
                <span className="text-red-400">✗ {result.headers?.filter(h=>!h.present).length||0} missing</span>
              </div>
            </div>
            {result.headers?.map((h,i)=><HeaderRow key={i} h={h}/>)}
          </div>
        )}

        {/* SSL */}
        {section==='ssl' && (
          <div className="space-y-4">
            <div className={`flex items-center gap-3 p-4 rounded-lg border ${result.ssl?.valid?'bg-green-900/20 border-green-800/30':'bg-red-900/20 border-red-800/30'}`}>
              {result.ssl?.valid ? <CheckCircle className="w-6 h-6 text-green-400"/> : <XCircle className="w-6 h-6 text-red-400"/>}
              <div>
                <div className={`text-sm font-semibold ${result.ssl?.valid?'text-green-400':'text-red-400'}`}>
                  {result.ssl?.valid ? 'Valid SSL Certificate' : `Invalid SSL: ${result.ssl?.error}`}
                </div>
                {result.ssl?.valid && <div className="text-xs text-gray-400">{result.ssl.subject} — Issued by {result.ssl.issuer}</div>}
              </div>
            </div>
            {result.ssl?.valid && (
              <div className="grid grid-cols-2 gap-3">
                {[['Expiry Date',formatDate(result.ssl.expiry)],['Days Remaining',`${result.ssl.daysLeft} days`],['Protocol',result.ssl.protocol||'TLS'],['Status',result.ssl.expired?'❌ Expired':result.ssl.expiringSoon?'⚠️ Expiring Soon':'✅ Valid']].map(([l,v])=>(
                  <div key={l} className="bg-gray-800/40 rounded-lg p-3">
                    <div className="text-[10px] text-gray-500 font-mono uppercase">{l}</div>
                    <div className="text-xs text-gray-200 mt-1 font-mono">{v}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Technologies */}
        {section==='techs' && (
          <div className="space-y-3">
            {result.technologies?.length===0 ? (
              <p className="text-gray-600 font-mono text-sm">No technologies detected</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {result.technologies?.map((t,i)=>(
                  <div key={i} className="bg-gray-800/40 border border-gray-700/40 rounded-lg px-3 py-2">
                    <div className="text-xs font-medium text-gray-200">{t.name}</div>
                    <div className="text-[10px] text-gray-500 font-mono capitalize">{t.category}</div>
                  </div>
                ))}
              </div>
            )}
            <p className="text-[10px] text-gray-600 font-mono">Technology detection is based on HTTP headers and HTML analysis</p>
          </div>
        )}

        {/* Reputation */}
        {section==='reputation' && (
          <div className="space-y-4">
            {result.reputation?.abuseipdb ? (
              <div className={`p-4 rounded-lg border ${result.reputation.abuseipdb.abuseConfidenceScore>50?'bg-red-900/20 border-red-800/30':'bg-green-900/20 border-green-800/30'}`}>
                <div className="text-sm font-semibold text-gray-200 mb-2">AbuseIPDB Report</div>
                <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                  {[['IP Address',result.reputation.abuseipdb.ipAddress],['Abuse Score',`${result.reputation.abuseipdb.abuseConfidenceScore}%`],['Total Reports',result.reputation.abuseipdb.totalReports||0],['ISP',result.reputation.abuseipdb.isp||'Unknown'],['Country',result.reputation.abuseipdb.countryCode||'Unknown'],['Usage Type',result.reputation.abuseipdb.usageType||'Unknown']].map(([l,v])=>(
                    <div key={l}><span className="text-gray-500">{l}: </span><span className="text-gray-200">{v}</span></div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 space-y-2">
                <Shield className="w-10 h-10 text-gray-700 mx-auto"/>
                <p className="text-gray-500 font-mono text-sm">No reputation data</p>
                <p className="text-gray-600 text-xs">Add <code className="text-cyber-400">ABUSEIPDB_API_KEY</code> in Railway Variables for IP reputation checks</p>
              </div>
            )}
          </div>
        )}

        {/* Recommendations */}
        {section==='recommendations' && (
          <div className="space-y-3">
            {result.recommendations?.length===0 ? (
              <div className="text-center py-8">
                <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-2"/>
                <p className="text-green-400 font-mono">Excellent! No critical issues found.</p>
              </div>
            ) : (
              <>
                <div className="flex gap-3 text-xs font-mono mb-4 flex-wrap">
                  {['P1','P2','P3'].map(p=>{
                    const count = result.recommendations?.filter(r=>r.priority===p).length||0;
                    if (!count) return null;
                    return <span key={p} className={`px-2 py-0.5 rounded border ${PRIORITY_COLORS[p]}`}>{p}: {count}</span>;
                  })}
                </div>
                {result.recommendations?.map((rec,i)=><RecommendationCard key={i} rec={rec} index={i}/>)}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function generateReportHTML(result) {
  const sev = s => ({critical:'#ef4444',high:'#f97316',medium:'#eab308',low:'#22c55e'})[s]||'#6b7280';
  const pColor = p => ({P1:'#ef4444',P2:'#f97316',P3:'#eab308'})[p]||'#6b7280';
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Security Scan — ${result.hostname}</title>
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',Arial,sans-serif;background:#0f172a;color:#e2e8f0;padding:40px}
h1{font-size:24px;font-weight:800;color:#fff;margin-bottom:4px}.accent{color:#14b8a6}
.grade{display:inline-block;font-size:48px;font-weight:900;font-family:monospace;margin:20px 0}
.score{font-size:14px;color:#64748b;font-family:monospace}
.section{background:#1e293b;border:1px solid #334155;border-radius:12px;padding:24px;margin-bottom:20px}
h2{font-size:14px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.1em;margin-bottom:16px}
.rec{border:1px solid #334155;border-radius:8px;padding:16px;margin-bottom:12px}
.tag{display:inline-block;font-size:10px;font-family:monospace;font-weight:700;padding:2px 8px;border-radius:9999px;margin-right:6px}
.fix{background:#0f172a;border-radius:6px;padding:12px;margin-top:8px;font-family:monospace;font-size:12px;color:#14b8a6;white-space:pre-wrap}
.header-row{display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid #1e293b22}
.ok{color:#22c55e}.err{color:#ef4444}
.footer{text-align:center;color:#334155;font-size:11px;font-family:monospace;margin-top:32px}
</style></head><body>
<h1>Security Scan — <span class="accent">${result.hostname}</span></h1>
<div class="score">Scanned: ${new Date(result.timestamp).toLocaleString('fr-FR')}</div>
<div class="grade" style="color:${{A:'#22c55e',B:'#14b8a6',C:'#eab308',D:'#f97316',F:'#ef4444'}[result.grade]||'#6b7280'}">${result.grade}</div>
<div class="score">${result.score}/100</div>

<div class="section"><h2>Security Headers</h2>
${result.headers?.map(h=>`<div class="header-row"><span class="${h.present?'ok':'err'}">${h.present?'✓':'✗'}</span><span>${h.label}</span></div>`).join('')||'No data'}
</div>

<div class="section"><h2>SSL/TLS</h2>
<p style="color:${result.ssl?.valid?'#22c55e':'#ef4444'}">${result.ssl?.valid?`Valid · Expires in ${result.ssl.daysLeft} days`:`Invalid: ${result.ssl?.error}`}</p>
</div>

<div class="section"><h2>Recommendations (${result.recommendations?.length||0})</h2>
${result.recommendations?.map(r=>`<div class="rec">
<span class="tag" style="background:${pColor(r.priority)}22;color:${pColor(r.priority)};border:1px solid ${pColor(r.priority)}44">${r.priority}</span>
<span style="font-size:13px;font-weight:600">${r.title}</span>
<p style="color:#9ca3af;font-size:12px;margin-top:8px">${r.description}</p>
${r.fix?`<div class="fix">${r.fix}</div>`:''}
</div>`).join('')||'No recommendations'}
</div>
<div class="footer">CyberPanel Security Scanner — ${new Date().toLocaleDateString('fr-FR')}</div>
</body></html>`;
}

export default function ScannerPage() {
  const [url, setUrl]         = useState('');
  const [scanning, setScanning] = useState(false);
  const [result, setResult]   = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => { api.get('/scanner/history').then(r=>setHistory(r.data)).catch(()=>{}); }, []);

  const handleScan = async (e) => {
    e.preventDefault();
    if (!url.trim()) return;
    setScanning(true); setResult(null);
    try {
      const {data} = await api.post('/scanner/scan', { url: url.trim() });
      setResult(data);
      setHistory(h => [{ id:Date.now(), url:data.url, score:data.score, grade:data.grade, created_at:data.timestamp }, ...h].slice(0,20));
      toast.success(`Scan complete — Grade ${data.grade}`);
    } catch (err) { toast.error(err.response?.data?.error||'Scan failed'); }
    finally { setScanning(false); }
  };

  const loadScan = async (id) => {
    try { const {data} = await api.get(`/scanner/${id}`); setResult(data.raw||data); }
    catch { toast.error('Failed to load scan'); }
  };

  const deleteScan = async (id) => {
    await api.delete(`/scanner/${id}`);
    setHistory(h=>h.filter(x=>x.id!==id));
    toast.success('Deleted');
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2"><Shield className="w-5 h-5 text-cyber-400"/>Web Security Scanner</h1>
        <p className="text-xs text-gray-500 font-mono mt-0.5">DNS · SSL · Headers · Tech · Reputation · Score · Recommendations</p>
      </div>

      {/* Scan form */}
      <div className="glass-card p-5 space-y-4">
        <form onSubmit={handleScan} className="flex gap-3">
          <div className="relative flex-1">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500"/>
            <input type="text" value={url} onChange={e=>setUrl(e.target.value)}
              placeholder="https://example.com or example.com"
              className="input-dark pl-9 text-base" autoFocus/>
          </div>
          <button type="submit" disabled={scanning||!url.trim()} className="btn-primary px-6 disabled:opacity-50">
            {scanning
              ? <span className="font-mono text-xs flex items-center gap-2"><span className="blink">⠋</span>Scanning...</span>
              : <><Search className="w-4 h-4"/>Scan</>}
          </button>
        </form>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[10px] font-mono text-gray-600">
          {['DNS Resolution','SSL Certificate','Security Headers','Technology Detection'].map(f=>(
            <div key={f} className="flex items-center gap-1.5 bg-gray-800/40 rounded px-2 py-1.5">
              <CheckCircle className="w-3 h-3 text-cyber-600"/>{f}
            </div>
          ))}
          {['IP Reputation (AbuseIPDB)','Security Score A-F','Prioritized Recommendations','HTML Report Export'].map(f=>(
            <div key={f} className="flex items-center gap-1.5 bg-gray-800/40 rounded px-2 py-1.5">
              <CheckCircle className="w-3 h-3 text-cyber-600"/>{f}
            </div>
          ))}
        </div>
      </div>

      {/* Loading animation */}
      {scanning && (
        <div className="glass-card p-8 text-center space-y-4">
          <div className="relative w-16 h-16 mx-auto">
            <div className="absolute inset-0 rounded-full border-2 border-cyber-500/30 animate-ping"/>
            <div className="absolute inset-2 rounded-full border-2 border-cyber-400/50 animate-ping" style={{animationDelay:'0.2s'}}/>
            <Shield className="absolute inset-0 m-auto w-8 h-8 text-cyber-400 animate-pulse"/>
          </div>
          <p className="text-cyber-400 font-mono text-sm">Scanning {url}<span className="blink">_</span></p>
          <p className="text-gray-600 text-xs font-mono">Checking DNS, SSL, headers, technologies and reputation...</p>
        </div>
      )}

      {/* Result */}
      {result && !scanning && <ScanResult result={result}/>}

      {/* History */}
      {history.length > 0 && (
        <div className="glass-card overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-800/60 flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyber-400"/>
            <span className="text-sm font-semibold text-gray-300">Scan History</span>
            <span className="text-xs text-gray-600 font-mono ml-auto">{history.length} scans</span>
          </div>
          <div className="divide-y divide-gray-800/40">
            {history.map(scan=>(
              <div key={scan.id} className="px-4 py-3 flex items-center gap-3 hover:bg-gray-800/20 transition-colors">
                <div className={`text-sm font-bold font-mono w-8 text-center ${GRADE_COLORS[scan.grade]}`}>{scan.grade}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-200 truncate">{scan.url}</div>
                  <div className="text-[10px] text-gray-600 font-mono">{scan.score}/100 · {timeAgo(scan.created_at)}</div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={()=>loadScan(scan.id)} className="text-gray-600 hover:text-cyber-400" title="View">
                    <ExternalLink className="w-4 h-4"/>
                  </button>
                  <button onClick={()=>deleteScan(scan.id)} className="text-gray-600 hover:text-red-400" title="Delete">
                    <Trash2 className="w-4 h-4"/>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
