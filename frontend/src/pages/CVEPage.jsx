// ── CVEPage ───────────────────────────────────────────────────
import React, { useState, useEffect, useCallback } from 'react';
import { Bug, RefreshCw, Search, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../utils/api';
import { SeverityBadge, ScoreBadge, formatDate, truncate } from '../utils/helpers.jsx';
import toast from 'react-hot-toast';

function CVERow({ cve }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="border-b border-gray-800/60 hover:bg-gray-800/20 transition-colors">
      <div className="p-4 flex items-start gap-3 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <ScoreBadge score={cve.cvss_score} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-mono font-semibold text-cyber-400">{cve.cve_id}</span>
            <SeverityBadge severity={cve.severity} />
            {cve.cvss_vector && <span className="text-[10px] font-mono text-gray-600 hidden lg:inline">{cve.cvss_vector}</span>}
          </div>
          <p className="text-xs text-gray-400 mt-1">{truncate(cve.description, expanded?9999:160)}</p>
          <div className="text-[10px] text-gray-600 font-mono mt-1">{formatDate(cve.published_at)}</div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <a href={`https://nvd.nist.gov/vuln/detail/${cve.cve_id}`} target="_blank" rel="noopener noreferrer"
            onClick={e=>e.stopPropagation()} className="text-gray-600 hover:text-cyber-400">
            <ExternalLink className="w-4 h-4" />
          </a>
          {expanded ? <ChevronUp className="w-4 h-4 text-gray-600" /> : <ChevronDown className="w-4 h-4 text-gray-600" />}
        </div>
      </div>
    </div>
  );
}

export function CVEPage() {
  const [cves, setCves]       = useState([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [pages, setPages]     = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState({ severity:'all', search:'', minScore:'' });

  const fetchCVEs = useCallback(async (p=1) => {
    setLoading(true);
    try {
      const params = { page:p, limit:30 };
      if (filters.severity !== 'all') params.severity = filters.severity;
      if (filters.search)              params.search   = filters.search;
      if (filters.minScore)            params.minScore = filters.minScore;
      const { data } = await api.get('/cves', { params });
      setCves(data.cves); setTotal(data.total); setPages(data.pages); setPage(p);
    } catch { toast.error('Failed to load CVEs'); }
    finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { fetchCVEs(1); }, [fetchCVEs]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try { await api.post('/cves/refresh'); await fetchCVEs(1); toast.success('CVE feed refreshed'); }
    catch { toast.error('Refresh failed'); }
    finally { setRefreshing(false); }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2"><Bug className="w-5 h-5 text-red-400" />CVE Feed</h1>
          <p className="text-xs text-gray-500 font-mono mt-0.5">{total} vulnerabilities</p>
        </div>
        <button onClick={handleRefresh} disabled={refreshing} className="btn-ghost">
          <RefreshCw className={`w-4 h-4 ${refreshing?'animate-spin':''}`} />Sync NVD
        </button>
      </div>
      <div className="glass-card p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
          <input type="text" placeholder="Search CVE-ID or description..." value={filters.search}
            onChange={e => setFilters(f=>({...f,search:e.target.value}))} className="input-dark pl-8" />
        </div>
        <select value={filters.severity} onChange={e => setFilters(f=>({...f,severity:e.target.value}))} className="input-dark w-auto">
          {['all','critical','high','medium','low'].map(s=><option key={s} value={s}>{s==='all'?'All Severities':s}</option>)}
        </select>
        <select value={filters.minScore} onChange={e => setFilters(f=>({...f,minScore:e.target.value}))} className="input-dark w-auto">
          <option value="">Any Score</option>
          <option value="9">≥ 9.0 Critical</option>
          <option value="7">≥ 7.0 High+</option>
          <option value="4">≥ 4.0 Medium+</option>
        </select>
      </div>
      <div className="glass-card overflow-hidden">
        <div className="px-4 py-2.5 bg-gray-800/30 border-b border-gray-800/60 text-[10px] font-mono text-gray-500 uppercase">CVSS · CVE ID / Description</div>
        {loading ? <div className="flex items-center justify-center py-16"><Bug className="w-6 h-6 text-red-400 animate-pulse" /></div>
          : cves.length===0 ? <div className="text-center py-16 text-gray-600 font-mono text-sm">No CVEs. Click "Sync NVD".</div>
          : cves.map(cve => <CVERow key={cve.id} cve={cve} />)}
      </div>
      {pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => fetchCVEs(page-1)} disabled={page===1} className="btn-ghost disabled:opacity-30">← Prev</button>
          <span className="text-sm text-gray-400 font-mono">Page {page} / {pages}</span>
          <button onClick={() => fetchCVEs(page+1)} disabled={page===pages} className="btn-ghost disabled:opacity-30">Next →</button>
        </div>
      )}
    </div>
  );
}

export default CVEPage;
