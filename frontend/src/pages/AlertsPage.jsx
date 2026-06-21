import React, { useState, useEffect, useCallback } from 'react';
import { Bell, CheckCheck, Trash2, Clock } from 'lucide-react';
import api from '../utils/api';
import { SeverityBadge, timeAgo, truncate } from '../utils/helpers.jsx';
import toast from 'react-hot-toast';

export default function AlertsPage() {
  const [alerts, setAlerts]   = useState([]);
  const [total, setTotal]     = useState(0);
  const [unread, setUnread]   = useState(0);
  const [page, setPage]       = useState(1);
  const [pages, setPages]     = useState(1);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ severity:'all', acknowledged:'all' });

  const fetchAlerts = useCallback(async (p=1) => {
    setLoading(true);
    try {
      const params = { page:p, limit:30 };
      if (filters.severity !== 'all') params.severity = filters.severity;
      if (filters.acknowledged !== 'all') params.acknowledged = filters.acknowledged;
      const { data } = await api.get('/alerts', { params });
      setAlerts(data.alerts); setTotal(data.total); setUnread(data.unread); setPages(data.pages); setPage(p);
    } catch { toast.error('Failed to load alerts'); }
    finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { fetchAlerts(1); }, [fetchAlerts]);

  const acknowledge = async (id) => {
    await api.post(`/alerts/${id}/acknowledge`);
    setAlerts(a => a.map(x => x.id===id ? {...x,acknowledged:1} : x));
    setUnread(u => Math.max(0,u-1));
    toast.success('Acknowledged');
  };

  const acknowledgeAll = async () => {
    await api.post('/alerts/acknowledge-all');
    await fetchAlerts(1);
    toast.success('All acknowledged');
  };

  const deleteAlert = async (id) => {
    await api.delete(`/alerts/${id}`);
    setAlerts(a => a.filter(x => x.id!==id));
    toast.success('Deleted');
  };

  const typeIcon = { cve:'🐛', kev:'⚠️', news:'📰', system:'⚙️' };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Bell className="w-5 h-5 text-cyber-400" />Security Alerts
            {unread > 0 && <span className="bg-red-500 text-white text-xs font-bold rounded-full px-2 py-0.5 animate-pulse">{unread} new</span>}
          </h1>
          <p className="text-xs text-gray-500 font-mono mt-0.5">{total} total alerts</p>
        </div>
        {unread > 0 && (
          <button onClick={acknowledgeAll} className="btn-primary">
            <CheckCheck className="w-4 h-4" />Acknowledge All
          </button>
        )}
      </div>

      <div className="glass-card p-4 flex flex-wrap gap-3">
        <select value={filters.severity} onChange={e => setFilters(f=>({...f,severity:e.target.value}))} className="input-dark w-auto">
          {['all','critical','high','medium','low'].map(s=><option key={s} value={s}>{s==='all'?'All Severities':s}</option>)}
        </select>
        <select value={filters.acknowledged} onChange={e => setFilters(f=>({...f,acknowledged:e.target.value}))} className="input-dark w-auto">
          <option value="all">All Status</option>
          <option value="false">Unread</option>
          <option value="true">Acknowledged</option>
        </select>
      </div>

      <div className="glass-card overflow-hidden">
        {loading ? <div className="flex items-center justify-center py-16"><Bell className="w-6 h-6 text-cyber-400 animate-pulse" /></div>
          : alerts.length===0 ? <div className="text-center py-16 text-gray-600 font-mono text-sm">No alerts found</div>
          : (
            <div className="divide-y divide-gray-800/60">
              {alerts.map(alert => (
                <div key={alert.id} className={`p-4 hover:bg-gray-800/20 transition-colors ${!alert.acknowledged?'border-l-2 border-red-500/50':''}`}>
                  <div className="flex items-start gap-3">
                    <span className="text-lg flex-shrink-0">{typeIcon[alert.type]||'🔔'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2 flex-wrap">
                        <SeverityBadge severity={alert.severity} />
                        <span className="text-sm font-medium text-gray-200">{alert.title}</span>
                        {!alert.acknowledged && <span className="w-2 h-2 bg-red-500 rounded-full mt-1.5 animate-pulse" />}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{truncate(alert.message,200)}</p>
                      <div className="flex items-center gap-3 mt-2 text-[10px] font-mono text-gray-600">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{timeAgo(alert.created_at)}</span>
                        {alert.acknowledged && alert.acknowledged_by && <span className="text-green-700">✓ by {alert.acknowledged_by}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {!alert.acknowledged && (
                        <button onClick={() => acknowledge(alert.id)} className="text-gray-600 hover:text-green-400 transition-colors">
                          <CheckCheck className="w-4 h-4" />
                        </button>
                      )}
                      <button onClick={() => deleteAlert(alert.id)} className="text-gray-600 hover:text-red-400 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
      </div>
      {pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => fetchAlerts(page-1)} disabled={page===1} className="btn-ghost disabled:opacity-30">← Prev</button>
          <span className="text-sm text-gray-400 font-mono">Page {page} / {pages}</span>
          <button onClick={() => fetchAlerts(page+1)} disabled={page===pages} className="btn-ghost disabled:opacity-30">Next →</button>
        </div>
      )}
    </div>
  );
}
