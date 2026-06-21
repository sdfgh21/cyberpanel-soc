import React, { useState, useEffect } from 'react';
import { Globe, RefreshCw, AlertTriangle, Bug, Zap } from 'lucide-react';
import api from '../utils/api';
import { SeverityBadge, timeAgo } from '../utils/helpers.jsx';
import toast from 'react-hot-toast';

const HOTSPOTS = [
  {name:'New York',   x:220,y:110,country:'US',base:15},{name:'Los Angeles',x:160,y:125,country:'US',base:12},
  {name:'London',     x:455,y:80, country:'GB',base:18},{name:'Moscow',    x:540,y:70, country:'RU',base:22},
  {name:'Beijing',    x:670,y:100,country:'CN',base:25},{name:'Shanghai',  x:685,y:115,country:'CN',base:20},
  {name:'Tokyo',      x:730,y:110,country:'JP',base:16},{name:'Frankfurt', x:480,y:85, country:'DE',base:14},
  {name:'Amsterdam',  x:465,y:78, country:'NL',base:13},{name:'Seoul',     x:710,y:105,country:'KR',base:14},
  {name:'Singapore',  x:660,y:190,country:'SG',base:11},{name:'SaoPaulo', x:235,y:270,country:'BR',base:10},
  {name:'Mumbai',     x:600,y:155,country:'IN',base:12},{name:'Sydney',    x:720,y:280,country:'AU',base:9},
  {name:'Tehran',     x:565,y:115,country:'IR',base:16},{name:'Kyiv',      x:520,y:83, country:'UA',base:13},
  {name:'Toronto',    x:213,y:100,country:'CA',base:11},{name:'Paris',     x:458,y:85, country:'FR',base:13},
];

const CONTINENTS = [
  "M 150,80 L 220,70 L 260,90 L 280,120 L 270,160 L 240,180 L 200,190 L 170,170 L 140,150 L 120,120 L 130,100 Z",
  "M 200,200 L 240,195 L 260,220 L 265,260 L 250,300 L 230,330 L 210,320 L 195,290 L 185,250 L 190,220 Z",
  "M 440,60 L 480,55 L 510,65 L 520,85 L 505,100 L 480,110 L 455,105 L 435,90 L 430,75 Z",
  "M 450,120 L 500,115 L 530,130 L 540,170 L 535,220 L 510,260 L 480,270 L 455,255 L 440,210 L 435,165 L 440,140 Z",
  "M 530,55 L 650,45 L 720,60 L 750,90 L 740,130 L 700,155 L 650,160 L 590,150 L 550,130 L 525,100 L 530,75 Z",
  "M 680,230 L 730,225 L 750,245 L 740,270 L 710,275 L 685,260 L 678,245 Z",
  "M 520,30 L 680,20 L 750,40 L 760,65 L 720,70 L 660,60 L 590,55 L 540,60 L 520,50 Z",
];

function AnimatedMap({ cveStats, mapPoints }) {
  const [attacks, setAttacks] = useState([]);
  const critCount = cveStats?.find(s=>s.severity==='critical')?.count||0;
  const highCount = cveStats?.find(s=>s.severity==='high')?.count||0;

  const enriched = HOTSPOTS.map(h => {
    const ioc = mapPoints?.find(p=>p.country===h.country);
    return {...h, level: ioc ? h.base+ioc.count : h.base, hasIOC: !!ioc};
  });

  useEffect(() => {
    const t = setInterval(() => {
      const src = enriched[Math.floor(Math.random()*enriched.length)];
      const dst = enriched[Math.floor(Math.random()*enriched.length)];
      if (src.name===dst.name) return;
      const id = Date.now();
      setAttacks(prev => [...prev.slice(-6), {id,src,dst,color:src.level>20?'#ef4444':'#f97316'}]);
      setTimeout(() => setAttacks(prev=>prev.filter(a=>a.id!==id)), 2500);
    }, 900);
    return () => clearInterval(t);
  }, []);

  return (
    <svg viewBox="0 0 960 500" className="w-full h-full">
      <defs>
        <filter id="glow2"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      {[0,1,2,3,4].map(i=><line key={`h${i}`} x1={0} y1={i*125} x2={960} y2={i*125} stroke="#14b8a610" strokeWidth="1"/>)}
      {[0,1,2,3,4,5,6].map(i=><line key={`v${i}`} x1={i*160} y1={0} x2={i*160} y2={500} stroke="#14b8a610" strokeWidth="1"/>)}
      {CONTINENTS.map((d,i)=><path key={i} d={d} fill="#1e293b" stroke="#334155" strokeWidth="1" opacity="0.8"/>)}
      {attacks.map(a=>(
        <g key={a.id}>
          <line x1={a.src.x} y1={a.src.y} x2={a.dst.x} y2={a.dst.y} stroke={a.color} strokeWidth="0.8" strokeDasharray="4 4" opacity="0.5">
            <animate attributeName="stroke-dashoffset" from="0" to="-20" dur="0.5s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values="0.5;0;0.5" dur="2.5s"/>
          </line>
          <circle r="2" fill={a.color} filter="url(#glow2)">
            <animateMotion dur="2s" fill="freeze" path={`M${a.src.x},${a.src.y} L${a.dst.x},${a.dst.y}`}/>
            <animate attributeName="opacity" values="1;0" dur="2s" fill="freeze"/>
          </circle>
        </g>
      ))}
      {enriched.map((h,i)=>{
        const r     = Math.max(3, Math.min(14, h.level/4));
        const color = h.level>25?'#ef4444':h.level>18?'#f97316':'#eab308';
        return (
          <g key={h.name}>
            <circle cx={h.x} cy={h.y} r={r} fill={color} opacity="0.85" filter="url(#glow2)">
              <animate attributeName="opacity" values="0.85;0.5;0.85" dur="2s" repeatCount="indefinite"/>
            </circle>
            <circle cx={h.x} cy={h.y} r={r+4} fill="none" stroke={color} strokeWidth="0.8" opacity="0.3">
              <animate attributeName="r" values={`${r+2};${r+8};${r+2}`} dur={`${2+i*0.05}s`} repeatCount="indefinite"/>
              <animate attributeName="opacity" values="0.4;0;0.4" dur={`${2+i*0.05}s`} repeatCount="indefinite"/>
            </circle>
            {h.hasIOC && <circle cx={h.x+r} cy={h.y-r} r="2" fill="#14b8a6"/>}
          </g>
        );
      })}
      {(critCount+highCount) > 0 && (
        <g>
          <rect x="10" y="10" width="200" height="36" rx="4" fill="#0f172a" opacity="0.85"/>
          <text x="18" y="24" fill="#ef4444" fontSize="10" fontFamily="monospace">ACTIVE THREATS</text>
          <text x="18" y="38" fill="#f9fafb" fontSize="11" fontFamily="monospace" fontWeight="bold">
            {critCount} CRITICAL · {highCount} HIGH
          </text>
        </g>
      )}
    </svg>
  );
}

export default function ThreatMapPage() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try { const {data:d} = await api.get('/threatmap/data'); setData(d); }
    catch { toast.error('Failed to load threat map'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); const t = setInterval(fetchData,60000); return ()=>clearInterval(t); }, []);

  const cveStats  = data?.cveStats||[];
  const critCount = cveStats.find(s=>s.severity==='critical')?.count||0;
  const highCount = cveStats.find(s=>s.severity==='high')?.count||0;
  const medCount  = cveStats.find(s=>s.severity==='medium')?.count||0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2"><Globe className="w-5 h-5 text-cyber-400" />Global Threat Map</h1>
          <p className="text-xs text-gray-500 font-mono mt-0.5">{data?.totalIOCs||0} IOCs · {data?.totalCVEs||0} CVEs · {data?.totalKEV||0} KEV</p>
        </div>
        <button onClick={fetchData} disabled={loading} className="btn-ghost"><RefreshCw className={`w-4 h-4 ${loading?'animate-spin':''}`}/>Refresh</button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card"><div className="text-2xl font-bold text-red-400 font-mono">{data?.criticalCVEs||0}</div><div className="text-xs text-gray-400">Critical CVEs</div></div>
        <div className="stat-card"><div className="text-2xl font-bold text-orange-400 font-mono">{data?.totalKEV||0}</div><div className="text-xs text-gray-400">KEV Entries</div></div>
        <div className="stat-card"><div className="text-2xl font-bold text-blue-400 font-mono">{data?.totalIOCs||0}</div><div className="text-xs text-gray-400">IOC Indicators</div></div>
        <div className="stat-card"><div className="text-2xl font-bold text-cyber-400 font-mono">{data?.totalCVEs||0}</div><div className="text-xs text-gray-400">Total CVEs</div></div>
      </div>

      <div className="glass-card p-2">
        <div className="relative bg-gray-950 rounded-xl overflow-hidden border border-gray-800/40" style={{height:'420px'}}>
          {loading ? (
            <div className="flex items-center justify-center h-full flex-col gap-3">
              <Globe className="w-10 h-10 text-cyber-400 animate-pulse"/>
              <p className="text-gray-600 font-mono text-sm">Loading threat data<span className="blink">_</span></p>
            </div>
          ) : (
            <>
              <AnimatedMap cveStats={data?.cveStats} mapPoints={data?.mapPoints||[]}/>
              <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-gray-900/90 border border-gray-700/40 rounded-full px-3 py-1">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"/>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"/>
                </span>
                <span className="text-[10px] font-mono text-red-400">LIVE</span>
              </div>
              <div className="absolute bottom-3 left-3 bg-gray-900/90 border border-gray-700/40 rounded-lg p-2.5 text-[10px] font-mono space-y-1">
                <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-red-500"/>Critical</div>
                <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-orange-500"/>High</div>
                <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-yellow-500"/>Moderate</div>
                <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-cyber-500"/>IOC data</div>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="glass-card p-4">
          <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2"><Bug className="w-4 h-4 text-red-400"/>CVE Severity (7 days)</h3>
          {[['Critical',critCount,'bg-red-500','text-red-400'],['High',highCount,'bg-orange-500','text-orange-400'],['Medium',medCount,'bg-yellow-500','text-yellow-400']].map(([l,c,bg,tx])=>(
            <div key={l} className="flex items-center gap-3 mb-2">
              <span className={`text-xs font-mono w-14 ${tx}`}>{l}</span>
              <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                <div className={`h-full ${bg} rounded-full`} style={{width:`${Math.min(100,(c/Math.max(1,critCount+highCount+medCount))*100)}%`}}/>
              </div>
              <span className="text-xs font-mono text-gray-400 w-8 text-right">{c}</span>
            </div>
          ))}
        </div>
        <div className="glass-card p-4">
          <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2"><Globe className="w-4 h-4 text-blue-400"/>Top IOC Countries</h3>
          {!data?.mapPoints?.length ? <p className="text-xs text-gray-600 font-mono">No IOC geo data yet — Refresh IOC Feed</p>
            : data.mapPoints.slice(0,6).map((p,i)=>(
              <div key={i} className="flex items-center gap-2 mb-2">
                <span className="text-[10px] text-gray-600 font-mono w-4">{i+1}</span>
                <span className="text-xs font-mono text-cyber-400 w-8">{p.country}</span>
                <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{width:`${Math.min(100,p.intensity*100)}%`}}/>
                </div>
                <span className="text-[10px] font-mono text-gray-500">{p.count}</span>
              </div>
            ))
          }
        </div>
        <div className="glass-card p-4">
          <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2"><Zap className="w-4 h-4 text-yellow-400"/>Recent Alerts</h3>
          {!data?.recentThreats?.length ? <p className="text-xs text-gray-600 font-mono">No critical alerts yet</p>
            : data.recentThreats.slice(0,5).map((t,i)=>(
              <div key={i} className="flex items-start gap-2 p-2 rounded bg-gray-800/30 mb-1">
                <SeverityBadge severity={t.severity}/>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-300 truncate">{t.title}</p>
                  <p className="text-[10px] text-gray-600 font-mono">{timeAgo(t.created_at)}</p>
                </div>
              </div>
            ))
          }
        </div>
      </div>

      {data?.kevVendors?.length > 0 && (
        <div className="glass-card p-4">
          <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-orange-400"/>Most Targeted Vendors (CISA KEV)</h3>
          <div className="flex flex-wrap gap-2">
            {data.kevVendors.map((v,i)=>(
              <div key={i} className="flex items-center gap-2 bg-gray-800/40 border border-gray-700/30 rounded-lg px-3 py-1.5">
                <span className="text-xs text-gray-300">{v.vendor_project}</span>
                <span className="text-xs font-mono text-orange-400 bg-orange-900/20 px-1.5 py-0.5 rounded-full">{v.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
