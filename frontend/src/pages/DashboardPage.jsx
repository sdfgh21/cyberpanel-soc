import React, { useState, useEffect } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, ArcElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { LayoutDashboard, Shield, AlertTriangle, Newspaper, Bug,
  TrendingUp, RefreshCw, Clock } from 'lucide-react';
import api from '../utils/api';
import { SeverityBadge, ScoreBadge, timeAgo, truncate, SEVERITY_COLORS } from '../utils/helpers.jsx';
import toast from 'react-hot-toast';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend, Filler);

const CHART_OPT = {
  plugins: {
    legend: { labels: { color:'#9ca3af', font:{ family:'JetBrains Mono', size:11 } } },
    tooltip: { backgroundColor:'#1f2937', borderColor:'#374151', borderWidth:1, titleColor:'#f9fafb', bodyColor:'#d1d5db' }
  },
  scales: {
    x: { ticks:{ color:'#6b7280', font:{ family:'JetBrains Mono', size:10 } }, grid:{ color:'#1f2937' } },
    y: { ticks:{ color:'#6b7280', font:{ family:'JetBrains Mono', size:10 } }, grid:{ color:'#1f2937' } },
  }
};

function StatCard({ icon:Icon, label, value, sub, color='cyber' }) {
  const colors = { cyber:'text-cyber-400 bg-cyber-900/30 border-cyber-800/40', red:'text-red-400 bg-red-900/20 border-red-800/30', orange:'text-orange-400 bg-orange-900/20 border-orange-800/30', blue:'text-blue-400 bg-blue-900/20 border-blue-800/30' };
  return (
    <div className="stat-card fade-in-up">
      <div className={`p-2 rounded-lg border w-fit ${colors[color]}`}><Icon className="w-4 h-4" /></div>
      <div>
        <div className="text-2xl font-bold text-white font-mono">{value ?? '—'}</div>
        <div className="text-xs text-gray-400">{label}</div>
        {sub && <div className="text-[10px] text-gray-600 font-mono mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats]     = useState(null);
  const [timeline, setTimeline] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);

  const fetchAll = async () => {
    try {
      const [s, t, v] = await Promise.all([api.get('/stats/overview'), api.get('/stats/timeline'), api.get('/stats/vendors')]);
      setStats(s.data); setTimeline(t.data); setVendors(v.data);
      setLastUpdate(new Date());
    } catch { toast.error('Failed to load dashboard'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); const t = setInterval(fetchAll, 5*60*1000); return () => clearInterval(t); }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([api.post('/news/refresh'), api.post('/cves/refresh'), api.post('/kev/refresh')]);
      await fetchAll(); toast.success('Data refreshed');
    } catch { toast.error('Refresh failed'); }
    finally { setRefreshing(false); }
  };

  const cveDonut = stats?.cves?.bySeverity ? {
    labels: ['Critical','High','Medium','Low','Unknown'],
    datasets: [{ data: ['critical','high','medium','low','unknown'].map(s => stats.cves.bySeverity.find(x=>x.severity===s)?.count||0),
      backgroundColor: [SEVERITY_COLORS.critical+'cc',SEVERITY_COLORS.high+'cc',SEVERITY_COLORS.medium+'cc',SEVERITY_COLORS.low+'cc',SEVERITY_COLORS.unknown+'cc'],
      borderColor: [SEVERITY_COLORS.critical,SEVERITY_COLORS.high,SEVERITY_COLORS.medium,SEVERITY_COLORS.low,SEVERITY_COLORS.unknown],
      borderWidth:1 }]
  } : null;

  const timelineChart = timeline?.cveTimeline?.length ? (() => {
    const days = [...new Set(timeline.cveTimeline.map(d=>d.day))].sort();
    const sevs = ['critical','high','medium','low'];
    const cols  = [SEVERITY_COLORS.critical,SEVERITY_COLORS.high,SEVERITY_COLORS.medium,SEVERITY_COLORS.low];
    return { labels: days, datasets: sevs.map((sev,i) => ({
      label: sev.charAt(0).toUpperCase()+sev.slice(1),
      data: days.map(d => timeline.cveTimeline.find(x=>x.day===d&&x.severity===sev)?.count||0),
      backgroundColor: cols[i]+'40', borderColor: cols[i], borderWidth:2, fill:true, tension:0.4, pointRadius:3,
    }))}
  })() : null;

  const vendorChart = vendors.length ? {
    labels: vendors.slice(0,10).map(v=>v.vendor_project),
    datasets: [{ label:'KEV Entries', data: vendors.slice(0,10).map(v=>v.count),
      backgroundColor:'#14b8a640', borderColor:'#14b8a6', borderWidth:1, borderRadius:4 }]
  } : null;

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <Shield className="w-8 h-8 text-cyber-400 animate-pulse mx-auto mb-2" />
        <p className="text-gray-500 font-mono text-sm">Loading<span className="blink">_</span></p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <LayoutDashboard className="w-5 h-5 text-cyber-400" /> Threat Intelligence Overview
          </h1>
          {lastUpdate && <p className="text-xs text-gray-600 font-mono mt-1 flex items-center gap-1"><Clock className="w-3 h-3" />Updated {timeAgo(lastUpdate)}</p>}
        </div>
        <button onClick={handleRefresh} disabled={refreshing} className="btn-ghost">
          <RefreshCw className={`w-4 h-4 ${refreshing?'animate-spin':''}`} /> Refresh All
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Bug} label="Critical CVEs" value={stats.cves?.critical} sub={`${stats.cves?.last24h} in last 24h`} color="red" />
          <StatCard icon={AlertTriangle} label="CISA KEV Total" value={stats.kev?.total} sub={`+${stats.kev?.recentWeek} this week`} color="orange" />
          <StatCard icon={Newspaper} label="Threat Articles" value={stats.news?.total} sub={`${stats.news?.last24h} today`} color="blue" />
          <StatCard icon={Shield} label="Active Alerts" value={stats.alerts?.unread} sub={`${stats.alerts?.critical} critical`} color={stats.alerts?.critical>0?'red':'cyber'} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 glass-card p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-cyber-400" />CVE Severity — Last 7 Days</h3>
          {timelineChart ? <Line data={timelineChart} options={{...CHART_OPT,responsive:true,interaction:{mode:'index',intersect:false}}} height={120} />
            : <p className="text-gray-600 text-sm font-mono">No data yet — click Refresh All</p>}
        </div>
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2"><Bug className="w-4 h-4 text-cyber-400" />CVE Distribution</h3>
          {cveDonut ? <Doughnut data={cveDonut} options={{...CHART_OPT,cutout:'65%',plugins:{...CHART_OPT.plugins,legend:{position:'bottom',labels:{color:'#9ca3af',font:{size:10},padding:8}}}}} />
            : <p className="text-gray-600 text-sm font-mono">No data yet</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2"><Bug className="w-4 h-4 text-red-400" />Top Critical CVEs</h3>
          <div className="space-y-2">
            {stats?.topCVEs?.map(cve => (
              <div key={cve.cve_id} className="flex items-start gap-3 p-2.5 rounded-lg bg-gray-800/30">
                <ScoreBadge score={cve.cvss_score} />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-mono text-cyber-400">{cve.cve_id}</div>
                  <div className="text-xs text-gray-400 truncate mt-0.5">{truncate(cve.description,80)}</div>
                </div>
              </div>
            ))}
            {!stats?.topCVEs?.length && <p className="text-gray-600 text-xs font-mono">No CVE data yet</p>}
          </div>
        </div>
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-orange-400" />Top Vendors in KEV</h3>
          {vendorChart ? <Bar data={vendorChart} options={{...CHART_OPT,indexAxis:'y',plugins:{...CHART_OPT.plugins,legend:{display:false}},scales:{x:{ticks:{color:'#6b7280',font:{size:10}},grid:{color:'#1f2937'}},y:{ticks:{color:'#9ca3af',font:{size:10}},grid:{display:false}}}}} height={200} />
            : <p className="text-gray-600 text-sm font-mono">No KEV data yet</p>}
        </div>
      </div>
    </div>
  );
}
