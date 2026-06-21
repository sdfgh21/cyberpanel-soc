import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, RefreshCw, Search, ExternalLink, Clock } from 'lucide-react';
import api from '../utils/api';
import { truncate } from '../utils/helpers.jsx';
import toast from 'react-hot-toast';

function DueBadge({ dueDate }) {
  if (!dueDate) return null;
  const diff = Math.ceil((new Date(dueDate) - new Date()) / (1000*60*60*24));
  if (diff < 0)   return <span className="badge-critical">OVERDUE</span>;
  if (diff <= 7)  return <span className="badge-high">{diff}d</span>;
  if (diff <= 14) return <span className="badge-medium">{diff}d</span>;
  return <span className="badge-low">{diff}d</span>;
}

export default function KEVPage() {
  const [kevs, setKevs]       = useState([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [pages, setPages]     = useState(1);
  const [loading, setLoading] = useState(true);
  const [stats, setStats]     = useState(null);
  const [search, setSearch]   = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const fetchKEV = useCallback(async (p=1) => {
    setLoading(true);
    try {
      const params = { page:p, limit:30 };
      if (search) params.search = search;
      const [kev, s] = await Promise.all([api.get('/kev', {params}), api.get('/kev/stats')]);
      setKevs(kev.data.kevs); setTotal(kev.data.total); setPages(kev.data.pages); setPage(p);
      setStats(s.data);
    } catch { toast.error('Failed to load KEV'); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { fetchKEV(1); }, [fetchKEV]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try { await api.post('/kev/refresh'); await fetchKEV(1); toast.success('CISA KEV synced'); }
    catch { toast.error('Sync failed'); }
    finally { setRefreshing(false); }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-orange-400" />CISA Known Exploited Vulnerabilities</h1>
          <p className="text-xs text-gray-500 font-mono mt-0.5">{total} actively exploited vulnerabilities</p>
        </div>
        <button onClick={handleRefresh} disabled={refreshing} className="btn-ghost">
          <RefreshCw className={`w-4 h-4 ${refreshing?'animate-spin':''}`} />Sync CISA
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="stat-card"><div className="text-2xl font-bold text-white font-mono">{stats.total}</div><div className="text-xs text-gray-400">Total KEV</div></div>
          <div className="stat-card"><div className="text-2xl font-bold text-orange-400 font-mono">{stats.recentLast30Days}</div><div className="text-xs text-gray-400">Last 30 Days</div></div>
          <div className="stat-card"><div className="text-2xl font-bold text-red-400 font-mono">{stats.overdue}</div><div className="text-xs text-gray-400">Overdue</div></div>
          <div className="stat-card"><div className="text-2xl font-bold text-yellow-400 font-mono">{stats.dueSoon?.length||0}</div><div className="text-xs text-gray-400">Due in 14 Days</div></div>
        </div>
      )}

      <div className="glass-card p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
          <input type="text" placeholder="Search CVE, vendor, product..." value={search}
            onChange={e => setSearch(e.target.value)} className="input-dark pl-8" />
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="hidden lg:grid grid-cols-12 px-4 py-2.5 bg-gray-800/30 border-b border-gray-800/60 text-[10px] font-mono text-gray-500 uppercase">
          <span className="col-span-2">CVE ID</span><span className="col-span-2">Vendor</span>
          <span className="col-span-2">Product</span><span className="col-span-3">Vulnerability</span>
          <span className="col-span-1">Added</span><span className="col-span-1">Due</span><span className="col-span-1">Link</span>
        </div>
        {loading ? <div className="flex items-center justify-center py-16"><AlertTriangle className="w-6 h-6 text-orange-400 animate-pulse" /></div>
          : kevs.length===0 ? <div className="text-center py-16 text-gray-600 font-mono text-sm">No KEV data. Click "Sync CISA".</div>
          : (
            <div className="divide-y divide-gray-800/40">
              {kevs.map(kev => (
                <div key={kev.id} className="px-4 py-3 hover:bg-gray-800/20 transition-colors">
                  <div className="lg:grid lg:grid-cols-12 lg:items-center gap-2 flex flex-wrap gap-y-1">
                    <div className="col-span-2 text-xs font-mono text-cyber-400">{kev.cve_id}</div>
                    <div className="col-span-2 text-xs text-gray-300">{kev.vendor_project}</div>
                    <div className="col-span-2 text-xs text-gray-400">{kev.product}</div>
                    <div className="col-span-3 text-xs text-gray-300">{truncate(kev.vulnerability_name,60)}</div>
                    <div className="col-span-1 text-[10px] font-mono text-gray-500">{kev.date_added?new Date(kev.date_added).toLocaleDateString('fr-FR'):'—'}</div>
                    <div className="col-span-1"><DueBadge dueDate={kev.due_date} /></div>
                    <div className="col-span-1 flex justify-end">
                      <a href={`https://nvd.nist.gov/vuln/detail/${kev.cve_id}`} target="_blank" rel="noopener noreferrer"
                        className="text-gray-600 hover:text-cyber-400"><ExternalLink className="w-3.5 h-3.5" /></a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
      </div>
      {pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => fetchKEV(page-1)} disabled={page===1} className="btn-ghost disabled:opacity-30">← Prev</button>
          <span className="text-sm text-gray-400 font-mono">Page {page} / {pages}</span>
          <button onClick={() => fetchKEV(page+1)} disabled={page===pages} className="btn-ghost disabled:opacity-30">Next →</button>
        </div>
      )}
    </div>
  );
}
