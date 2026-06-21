import React, { useState, useEffect, useCallback } from 'react';
import { Shield, RefreshCw, Search, Globe, Hash, Link } from 'lucide-react';
import api from '../utils/api';
import { timeAgo } from '../utils/helpers.jsx';
import toast from 'react-hot-toast';

const TYPE_COLORS = {
  ip:     'text-blue-400 bg-blue-900/20 border-blue-800/30',
  hash:   'text-purple-400 bg-purple-900/20 border-purple-800/30',
  domain: 'text-orange-400 bg-orange-900/20 border-orange-800/30',
  url:    'text-red-400 bg-red-900/20 border-red-800/30',
  unknown:'text-gray-400 bg-gray-800/30 border-gray-700/30',
};

function ConfBadge({ score }) {
  const s = parseInt(score)||0;
  if (s>=75) return <span className="badge-critical">{s}%</span>;
  if (s>=50) return <span className="badge-high">{s}%</span>;
  if (s>=25) return <span className="badge-medium">{s}%</span>;
  return <span className="badge-low">{s}%</span>;
}

export default function IOCPage() {
  const [iocs, setIocs]       = useState([]);
  const [total, setTotal]     = useState(0);
  const [stats, setStats]     = useState(null);
  const [page, setPage]       = useState(1);
  const [pages, setPages]     = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch]   = useState('');
  const [typeFilter, setType] = useState('all');
  const [lookup, setLookup]   = useState('');
  const [lookupResult, setLookupResult] = useState(null);
  const [looking, setLooking] = useState(false);

  const fetchIOCs = useCallback(async (p=1) => {
    setLoading(true);
    try {
      const params = { page:p, limit:30 };
      if (search) params.search = search;
      if (typeFilter !== 'all') params.type = typeFilter;
      const [iocRes, statRes] = await Promise.all([api.get('/ioc', {params}), api.get('/ioc/stats')]);
      setIocs(iocRes.data.iocs); setTotal(iocRes.data.total); setPages(iocRes.data.pages); setPage(p);
      setStats(statRes.data);
    } catch { toast.error('Failed to load IOCs'); }
    finally { setLoading(false); }
  }, [search, typeFilter]);

  useEffect(() => { fetchIOCs(1); }, [fetchIOCs]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try { await api.post('/ioc/refresh'); await fetchIOCs(1); toast.success('IOC feeds refreshed'); }
    catch { toast.error('Refresh failed'); }
    finally { setRefreshing(false); }
  };

  const handleLookup = async (e) => {
    e.preventDefault();
    if (!lookup.trim()) return;
    setLooking(true); setLookupResult(null);
    try {
      const { data } = await api.post('/ioc/lookup', { indicator: lookup.trim() });
      setLookupResult(data); toast.success('Lookup complete');
    } catch (err) { toast.error(err.response?.data?.error||'Lookup failed'); }
    finally { setLooking(false); }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2"><Shield className="w-5 h-5 text-cyber-400" />IOC Feed</h1>
          <p className="text-xs text-gray-500 font-mono mt-0.5">{total} indicators — ThreatFox + URLhaus</p>
        </div>
        <button onClick={handleRefresh} disabled={refreshing} className="btn-ghost">
          <RefreshCw className={`w-4 h-4 ${refreshing?'animate-spin':''}`} />Refresh Feeds
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="stat-card"><div className="text-2xl font-bold text-white font-mono">{total}</div><div className="text-xs text-gray-400">Total IOCs</div></div>
          <div className="stat-card"><div className="text-2xl font-bold text-red-400 font-mono">{stats.highConfidence}</div><div className="text-xs text-gray-400">High Confidence ≥75%</div></div>
          <div className="stat-card"><div className="text-2xl font-bold text-cyber-400 font-mono">{stats.last24h}</div><div className="text-xs text-gray-400">Last 24h</div></div>
          <div className="stat-card">
            <div className="flex flex-wrap gap-1">
              {stats.byType?.map(t => (
                <span key={t.type} className={`text-xs px-2 py-0.5 rounded-full border ${TYPE_COLORS[t.type]||'badge-info'}`}>{t.type}: {t.count}</span>
              ))}
            </div>
            <div className="text-xs text-gray-400 mt-1">By Type</div>
          </div>
        </div>
      )}

      {/* Lookup */}
      <div className="glass-card p-5 space-y-3">
        <h2 className="text-sm font-semibold text-gray-300 flex items-center gap-2"><Search className="w-4 h-4 text-cyber-400" />Quick Lookup</h2>
        <form onSubmit={handleLookup} className="flex gap-3">
          <input type="text" value={lookup} onChange={e => setLookup(e.target.value)}
            placeholder="IP, domain, hash..." className="input-dark flex-1" />
          <button type="submit" disabled={looking||!lookup.trim()} className="btn-primary disabled:opacity-50">
            {looking ? <span className="font-mono text-xs">Checking<span className="blink">_</span></span> : <><Search className="w-4 h-4" />Lookup</>}
          </button>
        </form>
        {lookupResult && (
          <div className="bg-gray-800/40 rounded-lg p-4 space-y-2 fade-in-up">
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-0.5 rounded-full border font-mono ${TYPE_COLORS[lookupResult.type]||'badge-info'}`}>{lookupResult.type}</span>
              <span className="text-sm font-mono text-cyber-400">{lookupResult.indicator}</span>
            </div>
            {lookupResult.results?.abuseipdb && (
              <div className="text-xs font-mono space-y-0.5">
                <div className="text-gray-500 uppercase text-[10px]">AbuseIPDB</div>
                <div className="text-orange-400">Confidence: {lookupResult.results.abuseipdb.abuseConfidenceScore}%</div>
                <div className="text-gray-400">Reports: {lookupResult.results.abuseipdb.totalReports} · ISP: {lookupResult.results.abuseipdb.isp}</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="glass-card p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
          <input type="text" placeholder="Search IOCs..." value={search} onChange={e => setSearch(e.target.value)} className="input-dark pl-8" />
        </div>
        <select value={typeFilter} onChange={e => setType(e.target.value)} className="input-dark w-auto">
          {['all','ip','domain','hash','url'].map(t => <option key={t} value={t}>{t==='all'?'All Types':t.toUpperCase()}</option>)}
        </select>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="hidden lg:grid grid-cols-12 px-4 py-2.5 bg-gray-800/30 border-b border-gray-800/60 text-[10px] font-mono text-gray-500 uppercase">
          <span className="col-span-1">Type</span><span className="col-span-5">Value</span>
          <span className="col-span-2">Threat</span><span className="col-span-2">Source</span>
          <span className="col-span-1">Conf.</span><span className="col-span-1">Seen</span>
        </div>
        {loading ? <div className="flex items-center justify-center py-16"><Shield className="w-6 h-6 text-cyber-400 animate-pulse" /></div>
          : iocs.length===0 ? <div className="text-center py-16 text-gray-600 font-mono text-sm">No IOCs. Click "Refresh Feeds".</div>
          : (
            <div className="divide-y divide-gray-800/40">
              {iocs.map(ioc => (
                <div key={ioc.id} className="px-4 py-3 hover:bg-gray-800/20 transition-colors">
                  <div className="lg:grid lg:grid-cols-12 lg:items-center gap-2 flex flex-wrap gap-y-1">
                    <div className="col-span-1">
                      <span className={`text-xs px-1.5 py-0.5 rounded border font-mono ${TYPE_COLORS[ioc.type]||'badge-info'}`}>{ioc.type}</span>
                    </div>
                    <div className="col-span-5 font-mono text-xs text-gray-200 break-all">{ioc.value}</div>
                    <div className="col-span-2 text-xs text-gray-400">{ioc.threat_type||'—'}</div>
                    <div className="col-span-2">
                      <span className="text-[10px] font-mono text-cyber-700 bg-cyber-900/30 border border-cyber-800/30 px-1.5 py-0.5 rounded-full">{ioc.source||'—'}</span>
                    </div>
                    <div className="col-span-1"><ConfBadge score={ioc.confidence} /></div>
                    <div className="col-span-1 text-[10px] text-gray-600 font-mono">{timeAgo(ioc.last_seen||ioc.fetched_at)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
      </div>
      {pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => fetchIOCs(page-1)} disabled={page===1} className="btn-ghost disabled:opacity-30">← Prev</button>
          <span className="text-sm text-gray-400 font-mono">Page {page} / {pages}</span>
          <button onClick={() => fetchIOCs(page+1)} disabled={page===pages} className="btn-ghost disabled:opacity-30">Next →</button>
        </div>
      )}
    </div>
  );
}
