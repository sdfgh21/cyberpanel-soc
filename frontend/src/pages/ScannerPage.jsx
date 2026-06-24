import React, { useState, useEffect } from 'react';
import { Search, Shield, Globe, CheckCircle, XCircle,
         Clock, ChevronDown, ChevronUp, Download, Trash2, ExternalLink } from 'lucide-react';
import api from '../utils/api';
import { timeAgo, formatDate } from '../utils/helpers.jsx';
import toast from 'react-hot-toast';

const GRADE_COLORS = { A:'text-green-400', B:'text-cyber-400', C:'text-yellow-400', D:'text-orange-400', F:'text-red-400' };
const GRADE_BG     = { A:'bg-green-900/30 border-green-700/40', B:'bg-cyber-900/30 border-cyber-700/40', C:'bg-yellow-900/30 border-yellow-700/40', D:'bg-orange-900/30 border-orange-700/40', F:'bg-red-900/30 border-red-700/40' };
const SEV_COLORS   = { critical:'text-red-400', high:'text-orange-400', medium:'text-yellow-400', low:'text-green-400' };
const PRIO_COLORS  = { P1:'text-red-400 bg-red-900/20 border-red-800/30', P2:'text-orange-400 bg-orange-900/20 border-orange-800/30', P3:'text-yellow-400 bg-yellow-900/20 border-yellow-800/30' };

// ── Devis HTML export ─────────────────────────────────────────
function generateDevisHTML(devis) {
  const pColor = p => ({ P1:'#ef4444', P2:'#f97316', P3:'#eab308' })[p]||'#6b7280';
  const rows = devis.lignes.map(l => `
    <tr>
      <td>${l.numero}</td>
      <td><span style="background:${pColor(l.priorite)}22;color:${pColor(l.priorite)};padding:2px 8px;border-radius:9999px;font-size:11px;font-family:monospace;font-weight:bold">${l.priorite}</span></td>
      <td><strong style="color:#f1f5f9">${l.titre}</strong><br/><small style="color:#64748b">${l.description}</small>
        ${l.fix?`<div style="background:#0f172a;border-radius:6px;padding:8px;margin-top:8px;font-family:monospace;font-size:11px;color:#14b8a6;white-space:pre-wrap">${l.fix}</div>`:''}
      </td>
      <td>${l.categorie}</td>
      <td style="text-align:right;font-family:monospace">${l.prix_ht} €</td>
      <td style="text-align:right;font-family:monospace;color:#64748b">${l.tva} €</td>
      <td style="text-align:right;font-family:monospace;font-weight:bold">${l.prix_ttc} €</td>
    </tr>`).join('');
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
<title>Devis ${devis.numero} — ${devis.client}</title>
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',Arial,sans-serif;background:#0f172a;color:#e2e8f0;padding:40px}
.hdr{background:linear-gradient(135deg,#042f2e,#0f172a);border:1px solid #14b8a640;border-radius:16px;padding:32px;margin-bottom:32px;display:flex;justify-content:space-between}
h1{font-size:28px;font-weight:800}.accent{color:#14b8a6}.num{font-size:36px;font-weight:900;font-family:monospace;color:#14b8a6;margin-top:12px}
.meta{color:#64748b;font-size:12px;font-family:monospace;margin-top:4px}
table{width:100%;border-collapse:collapse;background:#1e293b;border:1px solid #334155;border-radius:12px;overflow:hidden;margin-bottom:24px}
th{background:#0f172a;color:#64748b;font-size:10px;text-transform:uppercase;letter-spacing:.1em;padding:12px 16px;text-align:left}
td{padding:12px 16px;border-bottom:1px solid #334155;font-size:13px;vertical-align:top}
.total{font-size:24px;font-weight:900;font-family:monospace;color:#14b8a6}
.footer{text-align:center;color:#334155;font-size:11px;font-family:monospace;margin-top:32px}
</style></head><body>
<div class="hdr">
  <div><h1>Cyber<span class="accent">Panel</span></h1><div class="meta">SOC Security Services</div>
    <div class="num">${devis.numero}</div><div class="meta">DEVIS DE REMÉDIATION</div></div>
  <div style="text-align:right">
    <div class="meta">Date: <strong style="color:#e2e8f0">${devis.date}</strong></div>
    <div class="meta">Validité: <strong style="color:#e2e8f0">${devis.validite}</strong></div>
    <div class="meta">Client: <strong style="color:#14b8a6">${devis.client}</strong></div>
  </div>
</div>
<div style="background:#1e293b;border:1px solid #334155;border-radius:12px;padding:20px;margin-bottom:24px">
  <p style="font-size:13px;color:#94a3b8;line-height:1.6">Suite à l'audit de sécurité de <strong style="color:#14b8a6">${devis.client}</strong>, nous avons identifié <strong style="color:#f1f5f9">${devis.lignes.length} point(s)</strong> à corriger pour améliorer la posture de sécurité.</p>
</div>
<table>
  <thead><tr><th>#</th><th>Priorité</th><th>Prestation / Correctif</th><th>Catégorie</th><th style="text-align:right">HT</th><th style="text-align:right">TVA 20%</th><th style="text-align:right">TTC</th></tr></thead>
  <tbody>${rows}</tbody>
  <tfoot><tr style="background:#0f172a;border-top:2px solid #334155">
    <td colspan="4" style="padding:16px;color:#475569;font-size:11px;font-family:monospace">${devis.conditions}</td>
    <td style="padding:16px;text-align:right;font-family:monospace"><div style="font-size:10px;color:#64748b">Total HT</div><strong>${devis.total_ht} €</strong></td>
    <td style="padding:16px;text-align:right;font-family:monospace"><div style="font-size:10px;color:#64748b">TVA</div><strong style="color:#64748b">${devis.total_tva} €</strong></td>
    <td style="padding:16px;text-align:right"><div style="font-size:10px;color:#64748b;font-family:monospace">Total TTC</div><div class="total">${devis.total_ttc} €</div></td>
  </tr></tfoot>
</table>
<div class="footer">CyberPanel SOC — Devis ${devis.numero} — ${devis.date}</div>
</body></html>`;
}

// ── Devis component ───────────────────────────────────────────
function DevisSection({ devis }) {
  const download = () => {
    const blob = new Blob([generateDevisHTML(devis)], { type:'text/html' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `devis-${devis.numero}-${devis.client}.html`; a.click();
    URL.revokeObjectURL(url); toast.success('Devis téléchargé !');
  };
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 p-4 bg-gray-800/30 rounded-xl border border-gray-700/40">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold font-mono text-cyber-400">{devis.numero}</span>
            <span className="text-[10px] text-gray-500 font-mono uppercase">Devis de remédiation</span>
          </div>
          <div className="text-xs text-gray-500 font-mono mt-1">Émis le {devis.date} · Valable jusqu'au {devis.validite} · {devis.client}</div>
        </div>
        <button onClick={download} className="btn-primary"><Download className="w-4 h-4"/>Télécharger Devis</button>
      </div>
      {/* Totals */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gray-800/40 rounded-lg p-4 text-center border border-gray-700/30">
          <div className="text-xl font-bold font-mono text-white">{devis.total_ht} €</div>
          <div className="text-[10px] text-gray-500 font-mono uppercase mt-1">Total HT</div>
        </div>
        <div className="bg-gray-800/40 rounded-lg p-4 text-center border border-gray-700/30">
          <div className="text-xl font-bold font-mono text-gray-400">{devis.total_tva} €</div>
          <div className="text-[10px] text-gray-500 font-mono uppercase mt-1">TVA 20%</div>
        </div>
        <div className="bg-cyber-900/30 rounded-lg p-4 text-center border border-cyber-700/40">
          <div className="text-2xl font-bold font-mono text-cyber-400">{devis.total_ttc} €</div>
          <div className="text-[10px] text-gray-500 font-mono uppercase mt-1">Total TTC</div>
        </div>
      </div>
      {/* Table */}
      <div className="glass-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-800/40 text-[10px] font-mono text-gray-500 uppercase">
              <th className="px-3 py-2.5 text-left w-8">#</th>
              <th className="px-3 py-2.5 text-left w-16">Prio.</th>
              <th className="px-3 py-2.5 text-left">Prestation</th>
              <th className="px-3 py-2.5 text-left w-28">Catégorie</th>
              <th className="px-3 py-2.5 text-right w-16">HT</th>
              <th className="px-3 py-2.5 text-right w-16">TVA</th>
              <th className="px-3 py-2.5 text-right w-20">TTC</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/40">
            {devis.lignes.map((l, i) => (
              <tr key={i} className="hover:bg-gray-800/20 transition-colors">
                <td className="px-3 py-3 text-xs text-gray-500 font-mono">{l.numero}</td>
                <td className="px-3 py-3">
                  <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${PRIO_COLORS[l.priorite]}`}>{l.priorite}</span>
                </td>
                <td className="px-3 py-3">
                  <div className="text-xs font-medium text-gray-200">{l.titre}</div>
                  <div className="text-[10px] text-gray-500 mt-0.5">{l.description}</div>
                  {l.fix && (
                    <div className="mt-1.5 bg-gray-900/60 rounded px-2 py-1.5">
                      <pre className="text-[10px] text-cyber-500 font-mono whitespace-pre-wrap">{l.fix}</pre>
                    </div>
                  )}
                </td>
                <td className="px-3 py-3">
                  <span className="text-[10px] font-mono text-cyber-700 bg-cyber-900/30 border border-cyber-800/30 px-1.5 py-0.5 rounded-full">{l.categorie}</span>
                </td>
                <td className="px-3 py-3 text-right text-xs font-mono text-gray-300">{l.prix_ht} €</td>
                <td className="px-3 py-3 text-right text-xs font-mono text-gray-500">{l.tva} €</td>
                <td className="px-3 py-3 text-right text-xs font-mono font-bold text-white">{l.prix_ttc} €</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-800/30 border-t border-gray-700/60">
              <td colSpan="4" className="px-3 py-3 text-[10px] text-gray-600 font-mono italic">{devis.conditions}</td>
              <td className="px-3 py-3 text-right"><div className="text-[10px] text-gray-500 font-mono">HT</div><div className="text-sm font-bold font-mono text-gray-200">{devis.total_ht} €</div></td>
              <td className="px-3 py-3 text-right"><div className="text-[10px] text-gray-500 font-mono">TVA</div><div className="text-sm font-bold font-mono text-gray-400">{devis.total_tva} €</div></td>
              <td className="px-3 py-3 text-right"><div className="text-[10px] text-gray-500 font-mono">TTC</div><div className="text-lg font-bold font-mono text-cyber-400">{devis.total_ttc} €</div></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

// ── Other sub-components ──────────────────────────────────────
function ScoreGauge({ score, grade }) {
  const color = grade==='A'?'#22c55e':grade==='B'?'#14b8a6':grade==='C'?'#eab308':grade==='D'?'#f97316':'#ef4444';
  return (
    <div className="relative w-32 h-32 mx-auto">
      <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
        <circle cx="18" cy="18" r="15.9" fill="none" stroke="#1f2937" strokeWidth="3"/>
        <circle cx="18" cy="18" r="15.9" fill="none" stroke={color} strokeWidth="3" strokeDasharray={`${score} ${100-score}`} strokeLinecap="round"/>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-3xl font-bold font-mono ${GRADE_COLORS[grade]}`}>{grade}</span>
        <span className="text-xs text-gray-500 font-mono">{score}/100</span>
      </div>
    </div>
  );
}

function RecommendationCard({ rec, index }) {
  const [open, setOpen] = useState(index < 2);
  return (
    <div className={`rounded-lg border p-3 ${PRIO_COLORS[rec.priority]?.split(' ').slice(1).join(' ')||'bg-gray-800/30 border-gray-700/40'}`}>
      <div className="flex items-center gap-2 cursor-pointer" onClick={()=>setOpen(!open)}>
        <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${PRIO_COLORS[rec.priority]}`}>{rec.priority}</span>
        <span className={`text-[10px] font-mono ${SEV_COLORS[rec.severity]||'text-gray-400'}`}>{rec.severity?.toUpperCase()}</span>
        <span className="text-xs font-medium text-gray-200 flex-1">{rec.title}</span>
        <span className="text-[10px] text-gray-500 font-mono">{rec.category}</span>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-gray-600"/> : <ChevronDown className="w-3.5 h-3.5 text-gray-600"/>}
      </div>
      {open && (
        <div className="mt-3 space-y-2 fade-in-up">
          <p className="text-xs text-gray-400">{rec.description}</p>
          {rec.fix && <div className="bg-gray-900/60 rounded p-3"><pre className="text-xs text-cyber-400 font-mono whitespace-pre-wrap">{rec.fix}</pre></div>}
        </div>
      )}
    </div>
  );
}

function generateReportHTML(result) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Scan — ${result.hostname}</title>
<style>body{font-family:'Segoe UI',sans-serif;background:#0f172a;color:#e2e8f0;padding:40px}
.s{background:#1e293b;border:1px solid #334155;border-radius:12px;padding:24px;margin-bottom:20px}
h1{font-size:24px;font-weight:800;color:#fff}.a{color:#14b8a6}
h2{font-size:14px;font-weight:700;color:#94a3b8;text-transform:uppercase;margin-bottom:16px}
.fix{background:#0f172a;padding:10px;font-family:monospace;font-size:11px;color:#14b8a6;border-radius:6px;margin-top:8px;white-space:pre-wrap}
.footer{text-align:center;color:#334155;font-size:11px;font-family:monospace;margin-top:32px}</style>
</head><body>
<h1>Scan — <span class="a">${result.hostname}</span></h1>
<p style="font-family:monospace;color:#64748b;margin-top:8px">${result.score}/100 · Grade ${result.grade} · ${new Date(result.timestamp).toLocaleString('fr-FR')}</p>
<div class="s" style="margin-top:24px"><h2>Security Headers</h2>
${result.headers?.map(h=>`<div style="display:flex;align-items:center;gap:12px;padding:6px 0;border-bottom:1px solid #33415530">
<span style="color:${h.present?'#22c55e':'#ef4444'}">${h.present?'✓':'✗'}</span><span style="font-size:13px">${h.label}</span></div>`).join('')}</div>
<div class="s"><h2>Recommendations (${result.recommendations?.length||0})</h2>
${result.recommendations?.map(r=>`<div style="border:1px solid #334155;border-radius:8px;padding:14px;margin-bottom:10px">
<strong style="color:#f1f5f9">${r.priority} — ${r.title}</strong>
<p style="color:#9ca3af;font-size:12px;margin-top:6px">${r.description}</p>
${r.fix?`<div class="fix">${r.fix}</div>`:''}</div>`).join('')}</div>
<div class="footer">CyberPanel Security Scanner — ${new Date().toLocaleDateString('fr-FR')}</div>
</body></html>`;
}

// ── Main ScanResult ───────────────────────────────────────────
function ScanResult({ result }) {
  const [section, setSection] = useState('overview');
  const TABS = ['overview','headers','ssl','techs','reputation','recommendations','devis'];

  const downloadReport = () => {
    const blob = new Blob([generateReportHTML(result)], {type:'text/html'});
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `scan-${result.hostname}.html`; a.click();
    URL.revokeObjectURL(url); toast.success('Report downloaded!');
  };

  return (
    <div className="glass-card overflow-hidden fade-in-up">
      {/* Header */}
      <div className="p-5 border-b border-gray-800/60 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <Globe className="w-4 h-4 text-cyber-400"/>{result.hostname}
          </h2>
          <p className="text-[10px] text-gray-500 font-mono mt-0.5">{result.url} · {formatDate(result.timestamp)}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className={`text-center px-4 py-2 rounded-lg border ${GRADE_BG[result.grade]}`}>
            <div className={`text-2xl font-bold font-mono ${GRADE_COLORS[result.grade]}`}>{result.grade}</div>
            <div className="text-[10px] text-gray-500 font-mono">{result.score}/100</div>
          </div>
          {result.devis && (
            <div className="text-center px-4 py-2 rounded-lg border border-cyber-700/40 bg-cyber-900/20">
              <div className="text-lg font-bold font-mono text-cyber-400">{result.devis.total_ttc} €</div>
              <div className="text-[10px] text-gray-500 font-mono">Devis TTC</div>
            </div>
          )}
          <button onClick={downloadReport} className="btn-ghost"><Download className="w-4 h-4"/>Rapport</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto border-b border-gray-800/60 bg-gray-800/20">
        {TABS.map(t => (
          <button key={t} onClick={()=>setSection(t)}
            className={`px-4 py-2.5 text-xs font-mono capitalize whitespace-nowrap transition-colors ${section===t?'text-cyber-400 border-b-2 border-cyber-400 bg-cyber-900/20':'text-gray-500 hover:text-gray-300'}`}>
            {t==='devis'?'💶 Devis':t}
            {t==='recommendations'&&result.recommendations?.length>0&&(
              <span className="ml-1.5 bg-red-500 text-white text-[9px] font-bold rounded-full px-1.5 py-0.5">{result.recommendations.length}</span>
            )}
            {t==='devis'&&result.devis&&(
              <span className="ml-1.5 bg-cyber-600 text-white text-[9px] font-bold rounded-full px-1.5 py-0.5">{result.devis.total_ttc}€</span>
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
                      <div className={`h-full rounded-full ${v>=20?'bg-green-500':v>=12?'bg-yellow-500':'bg-red-500'}`} style={{width:`${(v/25)*100}%`}}/>
                    </div>
                    <span className="text-xs font-mono text-gray-400 w-12 text-right">{v}/25</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              {result.steps?.map((step,i)=>(
                <div key={i} className="flex items-center gap-3 text-xs">
                  {step.status==='done'   && <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0"/>}
                  {step.status==='error'  && <XCircle    className="w-4 h-4 text-red-400 flex-shrink-0"/>}
                  {step.status==='running'&& <Clock       className="w-4 h-4 text-yellow-400 flex-shrink-0 animate-pulse"/>}
                  <span className="text-gray-300 font-medium">{step.step}</span>
                  <span className="text-gray-600 font-mono">→ {step.data}</span>
                </div>
              ))}
            </div>
            {result.dns?.ips?.length>0 && (
              <div className="bg-gray-800/30 rounded-lg p-3">
                <div className="text-[10px] text-gray-500 font-mono uppercase mb-2">DNS</div>
                <div className="flex flex-wrap gap-2">
                  {result.dns.ips.map((ip,i)=><span key={i} className="text-xs font-mono text-cyber-400 bg-cyber-900/20 px-2 py-0.5 rounded">{ip}</span>)}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Headers */}
        {section==='headers' && (
          <div className="space-y-1">
            <div className="flex justify-between mb-3">
              <span className="text-xs text-gray-500">{result.headers?.filter(h=>h.present).length||0}/{result.headers?.length||0} headers configured</span>
              <div className="flex gap-3 text-[10px] font-mono">
                <span className="text-green-400">✓ {result.headers?.filter(h=>h.present).length||0}</span>
                <span className="text-red-400">✗ {result.headers?.filter(h=>!h.present).length||0}</span>
              </div>
            </div>
            {result.headers?.map((h,i)=>(
              <div key={i} className="flex items-center gap-3 py-2 border-b border-gray-800/40 last:border-0">
                {h.present ? <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0"/> : <XCircle className="w-4 h-4 text-red-400 flex-shrink-0"/>}
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-mono text-gray-300">{h.label}</div>
                  {h.present && h.value && <div className="text-[10px] text-gray-600 truncate font-mono">{h.value}</div>}
                </div>
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${h.present?'text-green-400 bg-green-900/20':'text-red-400 bg-red-900/20'}`}>
                  {h.present?'✓ Present':'✗ Missing'}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* SSL */}
        {section==='ssl' && (
          <div className="space-y-4">
            <div className={`flex items-center gap-3 p-4 rounded-lg border ${result.ssl?.valid?'bg-green-900/20 border-green-800/30':'bg-red-900/20 border-red-800/30'}`}>
              {result.ssl?.valid ? <CheckCircle className="w-6 h-6 text-green-400"/> : <XCircle className="w-6 h-6 text-red-400"/>}
              <div>
                <div className={`text-sm font-semibold ${result.ssl?.valid?'text-green-400':'text-red-400'}`}>
                  {result.ssl?.valid ? 'Valid SSL Certificate' : `Invalid: ${result.ssl?.error}`}
                </div>
                {result.ssl?.valid && <div className="text-xs text-gray-400">{result.ssl.subject} — {result.ssl.issuer}</div>}
              </div>
            </div>
            {result.ssl?.valid && (
              <div className="grid grid-cols-2 gap-3">
                {[['Expiry',formatDate(result.ssl.expiry)],['Days Left',`${result.ssl.daysLeft} days`],['Protocol',result.ssl.protocol||'TLS'],['Status',result.ssl.expired?'❌ Expired':result.ssl.expiringSoon?'⚠️ Expiring Soon':'✅ Valid']].map(([l,v])=>(
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
          <div>
            {!result.technologies?.length ? <p className="text-gray-600 font-mono text-sm">No technologies detected</p> : (
              <div className="flex flex-wrap gap-2">
                {result.technologies.map((t,i)=>(
                  <div key={i} className="bg-gray-800/40 border border-gray-700/40 rounded-lg px-3 py-2">
                    <div className="text-xs font-medium text-gray-200">{t.name}</div>
                    <div className="text-[10px] text-gray-500 font-mono capitalize">{t.category}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Reputation */}
        {section==='reputation' && (
          <div>
            {result.reputation?.abuseipdb ? (
              <div className={`p-4 rounded-lg border ${result.reputation.abuseipdb.abuseConfidenceScore>50?'bg-red-900/20 border-red-800/30':'bg-green-900/20 border-green-800/30'}`}>
                <div className="text-sm font-semibold text-gray-200 mb-3">AbuseIPDB Report</div>
                <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                  {[['IP',result.reputation.abuseipdb.ipAddress],['Score',`${result.reputation.abuseipdb.abuseConfidenceScore}%`],['Reports',result.reputation.abuseipdb.totalReports||0],['ISP',result.reputation.abuseipdb.isp||'—'],['Country',result.reputation.abuseipdb.countryCode||'—'],['Usage',result.reputation.abuseipdb.usageType||'—']].map(([l,v])=>(
                    <div key={l}><span className="text-gray-500">{l}: </span><span className="text-gray-200">{v}</span></div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Shield className="w-10 h-10 text-gray-700 mx-auto mb-2"/>
                <p className="text-gray-500 font-mono text-sm">Add <code className="text-cyber-400">ABUSEIPDB_API_KEY</code> in Railway Variables</p>
              </div>
            )}
          </div>
        )}

        {/* Recommendations */}
        {section==='recommendations' && (
          <div className="space-y-3">
            {!result.recommendations?.length ? (
              <div className="text-center py-8">
                <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-2"/>
                <p className="text-green-400 font-mono">No critical issues found!</p>
              </div>
            ) : (
              <>
                <div className="flex gap-2 text-xs font-mono mb-3 flex-wrap">
                  {['P1','P2','P3'].map(p=>{
                    const c=result.recommendations.filter(r=>r.priority===p).length;
                    return c ? <span key={p} className={`px-2 py-0.5 rounded border ${PRIO_COLORS[p]}`}>{p}: {c}</span> : null;
                  })}
                </div>
                {result.recommendations.map((rec,i)=><RecommendationCard key={i} rec={rec} index={i}/>)}
              </>
            )}
          </div>
        )}

        {/* Devis */}
        {section==='devis' && (
          result.devis
            ? <DevisSection devis={result.devis}/>
            : <div className="text-center py-8 text-gray-600 font-mono">No devis available</div>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────
export default function ScannerPage() {
  const [url, setUrl]           = useState('');
  const [scanning, setScanning] = useState(false);
  const [result, setResult]     = useState(null);
  const [history, setHistory]   = useState([]);

  useEffect(() => { api.get('/scanner/history').then(r=>setHistory(r.data)).catch(()=>{}); }, []);

  const handleScan = async (e) => {
    e.preventDefault();
    if (!url.trim()) return;
    setScanning(true); setResult(null);
    try {
      const {data} = await api.post('/scanner/scan', { url:url.trim() });
      setResult(data);
      setHistory(h=>[{id:Date.now(),url:data.url,score:data.score,grade:data.grade,created_at:data.timestamp},...h].slice(0,20));
      toast.success(`Grade ${data.grade} · Devis: ${data.devis?.total_ttc||0}€ TTC`);
    } catch(err) { toast.error(err.response?.data?.error||'Scan failed'); }
    finally { setScanning(false); }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Shield className="w-5 h-5 text-cyber-400"/>Web Security Scanner
        </h1>
        <p className="text-xs text-gray-500 font-mono mt-0.5">DNS · SSL · Headers · Tech · Reputation · Score A-F · Devis automatique</p>
      </div>

      <div className="glass-card p-5 space-y-4">
        <form onSubmit={handleScan} className="flex gap-3">
          <div className="relative flex-1">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500"/>
            <input type="text" value={url} onChange={e=>setUrl(e.target.value)}
              placeholder="https://example.com ou example.com"
              className="input-dark pl-9 text-base" autoFocus/>
          </div>
          <button type="submit" disabled={scanning||!url.trim()} className="btn-primary px-6 disabled:opacity-50">
            {scanning
              ? <span className="font-mono text-xs flex items-center gap-2"><span className="blink">⠋</span>Scanning...</span>
              : <><Search className="w-4 h-4"/>Scan</>}
          </button>
        </form>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[10px] font-mono text-gray-600">
          {['✓ DNS & SSL','✓ Security Headers','✓ Technologies','✓ IP Reputation','✓ Score A-F','✓ Recommendations','✓ 💶 Devis auto','✓ Export HTML'].map(f=>(
            <div key={f} className="bg-gray-800/40 rounded px-2 py-1.5">{f}</div>
          ))}
        </div>
      </div>

      {scanning && (
        <div className="glass-card p-8 text-center space-y-4">
          <div className="relative w-16 h-16 mx-auto">
            <div className="absolute inset-0 rounded-full border-2 border-cyber-500/30 animate-ping"/>
            <div className="absolute inset-2 rounded-full border-2 border-cyber-400/50 animate-ping" style={{animationDelay:'0.2s'}}/>
            <Shield className="absolute inset-0 m-auto w-8 h-8 text-cyber-400 animate-pulse"/>
          </div>
          <p className="text-cyber-400 font-mono text-sm">Scanning {url}<span className="blink">_</span></p>
          <p className="text-gray-600 text-xs">DNS, SSL, headers, technologies, réputation, score et génération du devis...</p>
        </div>
      )}

      {result && !scanning && <ScanResult result={result}/>}

      {history.length > 0 && (
        <div className="glass-card overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-800/60 flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyber-400"/>
            <span className="text-sm font-semibold text-gray-300">Scan History</span>
            <span className="text-xs text-gray-600 font-mono ml-auto">{history.length} scans</span>
          </div>
          <div className="divide-y divide-gray-800/40">
            {history.map(scan=>(
              <div key={scan.id} className="px-4 py-3 flex items-center gap-3 hover:bg-gray-800/20">
                <div className={`text-sm font-bold font-mono w-8 text-center ${GRADE_COLORS[scan.grade]}`}>{scan.grade}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-200 truncate">{scan.url}</div>
                  <div className="text-[10px] text-gray-600 font-mono">{scan.score}/100 · {timeAgo(scan.created_at)}</div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={async()=>{try{const{data}=await api.get(`/scanner/${scan.id}`);setResult(data.raw||data);}catch{toast.error('Failed');}}} className="text-gray-600 hover:text-cyber-400"><ExternalLink className="w-4 h-4"/></button>
                  <button onClick={async()=>{await api.delete(`/scanner/${scan.id}`);setHistory(h=>h.filter(x=>x.id!==scan.id));toast.success('Deleted');}} className="text-gray-600 hover:text-red-400"><Trash2 className="w-4 h-4"/></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
