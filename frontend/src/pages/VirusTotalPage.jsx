import React, { useState, useEffect } from 'react';
import { Search, Shield, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../utils/api';
import { timeAgo } from '../utils/helpers.jsx';
import toast from 'react-hot-toast';

function VTBar({ malicious, suspicious, undetected, harmless }) {
  const total = malicious+suspicious+undetected+harmless||1;
  return (
    <div className="space-y-1.5">
      {[['Malicious',malicious,'bg-red-500'],['Suspicious',suspicious,'bg-orange-500'],['Undetected',undetected,'bg-gray-600'],['Harmless',harmless,'bg-green-500']].map(([l,v,c]) => (
        <div key={l} className="flex items-center gap-2 text-xs">
          <span className="w-20 text-gray-400 font-mono">{l}</span>
          <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div className={`h-full ${c} rounded-full`} style={{width:`${(v/total)*100}%`}} />
          </div>
          <span className="w-6 text-right font-mono text-gray-400">{v}</span>
        </div>
      ))}
    </div>
  );
}

function HistoryRow({ row }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`border-b border-gray-800/40 hover:bg-gray-800/20 ${row.malicious>0?'border-l-2 border-l-red-500/50':''}`}>
      <div className="px-4 py-3 flex items-center gap-3 cursor-pointer" onClick={() => setOpen(!open)}>
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${row.malicious>0?'bg-red-500':'bg-green-500'}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-gray-800 text-gray-400">{row.indicator_type}</span>
            <span className="text-sm font-mono text-gray-200 truncate">{row.indicator}</span>
          </div>
          <div className="flex gap-4 mt-1 text-[10px] font-mono">
            <span className="text-red-400">Mal: {row.malicious}</span>
            <span className="text-orange-400">Sus: {row.suspicious}</span>
            <span className="text-green-400">OK: {row.harmless}</span>
            {row.country && <span className="text-gray-500">📍{row.country}</span>}
          </div>
        </div>
        <span className="text-[10px] text-gray-600 font-mono">{timeAgo(row.queried_at)}</span>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-gray-600" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-600" />}
      </div>
      {open && (
        <div className="px-4 pb-3 fade-in-up">
          <div className="bg-gray-800/40 rounded-lg p-4">
            <VTBar malicious={row.malicious} suspicious={row.suspicious} undetected={row.undetected} harmless={row.harmless} />
            {row.owner && <p className="text-xs text-gray-500 font-mono mt-3">Owner: {row.owner}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

export default function VirusTotalPage() {
  const [indicator, setIndicator] = useState('');
  const [result, setResult]       = useState(null);
  const [history, setHistory]     = useState([]);
  const [scanning, setScanning]   = useState(false);

  useEffect(() => { api.get('/virustotal/history').then(r => setHistory(r.data)).catch(()=>{}); }, []);

  const handleScan = async (e) => {
    e.preventDefault();
    if (!indicator.trim()) return;
    setScanning(true); setResult(null);
    try {
      const { data } = await api.post('/virustotal/scan', { indicator: indicator.trim() });
      setResult(data);
      setHistory(h => [data,...h.filter(x=>x.indicator!==data.indicator)].slice(0,50));
      toast.success('Scan complete');
    } catch (err) { toast.error(err.response?.data?.error||'Scan failed'); }
    finally { setScanning(false); }
  };

  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2"><Shield className="w-5 h-5 text-cyber-400" />VirusTotal Scanner</h1>
        <p className="text-xs text-gray-500 font-mono mt-0.5">Scan IPs, domains, hashes and URLs</p>
      </div>
      <div className="glass-card p-5 space-y-3">
        <form onSubmit={handleScan} className="flex gap-3">
          <input type="text" value={indicator} onChange={e => setIndicator(e.target.value)}
            placeholder="8.8.8.8 | evil.com | sha256hash | https://..." className="input-dark flex-1" />
          <button type="submit" disabled={scanning||!indicator.trim()} className="btn-primary px-5 disabled:opacity-50">
            {scanning ? <span className="font-mono text-xs">Scanning<span className="blink">_</span></span> : <><Search className="w-4 h-4" />Scan</>}
          </button>
        </form>
        <p className="text-[10px] text-gray-600 font-mono">
          Requires <code className="text-cyber-400">VIRUSTOTAL_API_KEY</code> in Railway backend Variables —{' '}
          <a href="https://www.virustotal.com/gui/my-apikey" target="_blank" rel="noopener noreferrer" className="text-cyber-500 hover:text-cyber-400">Get free key ↗</a>
        </p>
      </div>

      {result && !result.error && (
        <div className="glass-card p-5 fade-in-up space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-gray-800 text-gray-400">{result.indicator_type}</span>
            <span className="font-mono text-cyber-400">{result.indicator}</span>
            <span className={`text-sm font-bold font-mono ${result.malicious>0?'text-red-400':'text-green-400'}`}>
              {result.malicious>0?`⚠️ ${result.malicious} detections`:'✅ Clean'}
            </span>
          </div>
          <VTBar malicious={result.malicious} suspicious={result.suspicious} undetected={result.undetected} harmless={result.harmless} />
          <div className="grid grid-cols-2 gap-3 text-xs font-mono">
            {result.country && <div className="bg-gray-800/40 rounded p-2"><span className="text-gray-500">Country</span><br/>{result.country}</div>}
            {result.owner   && <div className="bg-gray-800/40 rounded p-2"><span className="text-gray-500">Owner</span><br/>{result.owner}</div>}
          </div>
        </div>
      )}

      {history.length > 0 && (
        <div className="glass-card overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-800/60 flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyber-400" />
            <span className="text-sm font-semibold text-gray-300">Scan History</span>
            <span className="text-xs text-gray-600 font-mono ml-auto">{history.length} entries</span>
          </div>
          {history.map((row,i) => <HistoryRow key={i} row={row} />)}
        </div>
      )}
    </div>
  );
}
