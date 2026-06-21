import React, { useState, useEffect, useCallback } from 'react';
import { Newspaper, RefreshCw, ExternalLink, Search, Clock } from 'lucide-react';
import api from '../utils/api';
import { SeverityBadge, timeAgo, truncate } from '../utils/helpers.jsx';
import toast from 'react-hot-toast';

const SEVERITIES = ['all','critical','high','medium','low'];
const SOURCES = ['all','BleepingComputer','The Hacker News','Dark Reading','CISA Alerts','Krebs on Security','Schneier on Security'];

export default function NewsPage() {
  const [news, setNews]       = useState([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [pages, setPages]     = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState({ severity:'all', source:'all', search:'' });

  const fetchNews = useCallback(async (p=1) => {
    setLoading(true);
    try {
      const params = { page:p, limit:25 };
      if (filters.severity !== 'all') params.severity = filters.severity;
      if (filters.source   !== 'all') params.source   = filters.source;
      if (filters.search)              params.search   = filters.search;
      const { data } = await api.get('/news', { params });
      setNews(data.news); setTotal(data.total); setPages(data.pages); setPage(p);
    } catch { toast.error('Failed to load news'); }
    finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { fetchNews(1); }, [fetchNews]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try { await api.post('/news/refresh'); await fetchNews(1); toast.success('News refreshed'); }
    catch { toast.error('Refresh failed'); }
    finally { setRefreshing(false); }
  };

  const dotColor = { critical:'bg-red-500', high:'bg-orange-500', medium:'bg-yellow-500', low:'bg-green-500', info:'bg-blue-500' };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2"><Newspaper className="w-5 h-5 text-cyber-400" />Threat Intelligence News</h1>
          <p className="text-xs text-gray-500 font-mono mt-0.5">{total} articles</p>
        </div>
        <button onClick={handleRefresh} disabled={refreshing} className="btn-ghost">
          <RefreshCw className={`w-4 h-4 ${refreshing?'animate-spin':''}`} />Refresh
        </button>
      </div>

      <div className="glass-card p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
          <input type="text" placeholder="Search articles..." value={filters.search}
            onChange={e => setFilters(f=>({...f,search:e.target.value}))} className="input-dark pl-8" />
        </div>
        <select value={filters.severity} onChange={e => setFilters(f=>({...f,severity:e.target.value}))} className="input-dark w-auto">
          {SEVERITIES.map(s=><option key={s} value={s}>{s==='all'?'All Severities':s}</option>)}
        </select>
        <select value={filters.source} onChange={e => setFilters(f=>({...f,source:e.target.value}))} className="input-dark w-auto">
          {SOURCES.map(s=><option key={s} value={s}>{s==='all'?'All Sources':s}</option>)}
        </select>
      </div>

      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Newspaper className="w-6 h-6 text-cyber-400 animate-pulse" /></div>
        ) : news.length === 0 ? (
          <div className="text-center py-16 text-gray-600 font-mono text-sm">No articles found</div>
        ) : (
          <div className="divide-y divide-gray-800/60">
            {news.map(article => (
              <div key={article.id} className="p-4 hover:bg-gray-800/20 transition-colors group">
                <div className="flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${dotColor[article.severity]||'bg-gray-500'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 justify-between">
                      <a href={article.link} target="_blank" rel="noopener noreferrer"
                        className="text-sm font-medium text-gray-200 hover:text-cyber-400 transition-colors leading-snug">
                        {article.title}
                      </a>
                      <ExternalLink className="w-3.5 h-3.5 text-gray-600 group-hover:text-cyber-400 flex-shrink-0 mt-0.5" />
                    </div>
                    {article.summary && <p className="text-xs text-gray-500 mt-1">{truncate(article.summary,180)}</p>}
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-[10px] font-mono text-cyber-700 bg-cyber-900/30 border border-cyber-800/30 px-2 py-0.5 rounded-full">{article.source}</span>
                      <SeverityBadge severity={article.severity} />
                      <span className="text-[10px] text-gray-600 font-mono flex items-center gap-1"><Clock className="w-3 h-3" />{timeAgo(article.published_at)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => fetchNews(page-1)} disabled={page===1} className="btn-ghost disabled:opacity-30">← Prev</button>
          <span className="text-sm text-gray-400 font-mono">Page {page} / {pages}</span>
          <button onClick={() => fetchNews(page+1)} disabled={page===pages} className="btn-ghost disabled:opacity-30">Next →</button>
        </div>
      )}
    </div>
  );
}
