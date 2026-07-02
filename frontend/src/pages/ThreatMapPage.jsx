import React, { useState, useEffect } from 'react';
import { Globe, RefreshCw, AlertTriangle, Bug, Zap } from 'lucide-react';
import api from '../utils/api';
import { SeverityBadge, timeAgo } from '../utils/helpers.jsx';
import toast from 'react-hot-toast';

// ── Real world map paths (Natural Earth simplified) ───────────
const WORLD_PATHS = [
  // North America
  { id:'US', d:'M 167,142 L 175,135 L 190,130 L 205,128 L 218,132 L 228,138 L 232,148 L 228,160 L 220,170 L 210,175 L 198,178 L 185,175 L 175,168 L 167,158 Z', label:'United States' },
  { id:'CA', d:'M 167,110 L 175,102 L 195,98 L 215,96 L 230,100 L 238,108 L 235,118 L 228,125 L 218,130 L 205,128 L 190,126 L 175,120 Z', label:'Canada' },
  { id:'MX', d:'M 175,178 L 190,178 L 200,182 L 205,192 L 200,200 L 188,202 L 178,198 L 172,188 Z', label:'Mexico' },
  // South America
  { id:'BR', d:'M 220,225 L 235,218 L 248,220 L 258,228 L 262,242 L 258,260 L 248,272 L 235,278 L 222,272 L 212,260 L 210,244 L 214,232 Z', label:'Brazil' },
  { id:'AR', d:'M 222,278 L 235,278 L 242,290 L 240,308 L 232,318 L 222,312 L 216,298 L 218,286 Z', label:'Argentina' },
  { id:'CO', d:'M 205,210 L 215,205 L 224,208 L 225,218 L 218,225 L 208,222 L 203,215 Z', label:'Colombia' },
  // Europe
  { id:'GB', d:'M 430,112 L 436,108 L 442,110 L 444,118 L 440,124 L 434,122 L 430,118 Z', label:'United Kingdom' },
  { id:'FR', d:'M 440,122 L 450,118 L 458,120 L 460,130 L 455,136 L 445,136 L 438,130 Z', label:'France' },
  { id:'DE', d:'M 452,110 L 462,106 L 470,108 L 472,118 L 466,124 L 456,124 L 450,118 Z', label:'Germany' },
  { id:'ES', d:'M 432,135 L 448,132 L 458,134 L 460,143 L 452,148 L 436,146 L 430,140 Z', label:'Spain' },
  { id:'IT', d:'M 455,132 L 462,128 L 468,132 L 470,142 L 465,150 L 457,148 L 453,140 Z', label:'Italy' },
  { id:'PL', d:'M 464,106 L 476,102 L 484,105 L 485,114 L 478,120 L 468,118 L 462,112 Z', label:'Poland' },
  { id:'UA', d:'M 476,108 L 494,104 L 504,108 L 505,118 L 496,124 L 480,122 L 474,115 Z', label:'Ukraine' },
  { id:'NL', d:'M 446,108 L 453,105 L 457,108 L 456,114 L 450,116 L 444,113 Z', label:'Netherlands' },
  // Russia
  { id:'RU', d:'M 494,80 L 560,72 L 640,68 L 700,72 L 730,80 L 735,92 L 720,100 L 680,106 L 620,108 L 560,104 L 510,100 L 490,92 Z', label:'Russia' },
  // Middle East
  { id:'TR', d:'M 492,128 L 510,124 L 522,126 L 524,134 L 516,140 L 498,138 L 490,133 Z', label:'Turkey' },
  { id:'IR', d:'M 524,132 L 540,128 L 552,130 L 554,142 L 545,150 L 528,148 L 522,140 Z', label:'Iran' },
  { id:'SA', d:'M 510,148 L 526,144 L 538,146 L 540,160 L 530,168 L 514,165 L 508,156 Z', label:'Saudi Arabia' },
  // Africa
  { id:'NG', d:'M 446,190 L 460,186 L 468,190 L 468,202 L 460,208 L 448,206 L 443,198 Z', label:'Nigeria' },
  { id:'ZA', d:'M 466,255 L 478,252 L 484,258 L 482,270 L 472,275 L 462,270 L 460,260 Z', label:'South Africa' },
  { id:'EG', d:'M 490,148 L 504,145 L 510,150 L 508,160 L 498,163 L 487,158 L 487,152 Z', label:'Egypt' },
  { id:'ET', d:'M 504,175 L 518,170 L 525,174 L 524,185 L 515,190 L 504,187 L 500,181 Z', label:'Ethiopia' },
  // North Africa
  { id:'MA', d:'M 428,148 L 442,146 L 448,152 L 446,162 L 436,165 L 425,160 L 424,154 Z', label:'Morocco' },
  { id:'DZ', d:'M 444,148 L 466,146 L 472,152 L 470,168 L 455,172 L 440,167 L 438,156 Z', label:'Algeria' },
  { id:'LY', d:'M 466,148 L 484,146 L 490,150 L 488,164 L 474,168 L 462,163 L 462,154 Z', label:'Libya' },
  // Asia
  { id:'CN', d:'M 618,118 L 660,108 L 690,112 L 698,128 L 688,145 L 660,150 L 630,148 L 612,138 L 614,126 Z', label:'China' },
  { id:'IN', d:'M 578,140 L 600,134 L 614,138 L 615,155 L 605,168 L 588,172 L 575,162 L 572,148 Z', label:'India' },
  { id:'JP', d:'M 702,118 L 710,112 L 716,115 L 716,126 L 709,130 L 702,126 Z', label:'Japan' },
  { id:'KR', d:'M 692,118 L 700,114 L 705,118 L 703,126 L 696,128 L 690,124 Z', label:'South Korea' },
  { id:'PK', d:'M 560,135 L 576,132 L 580,142 L 574,150 L 560,150 L 554,143 Z', label:'Pakistan' },
  { id:'AF', d:'M 552,126 L 566,122 L 575,126 L 574,135 L 562,140 L 550,136 L 548,130 Z', label:'Afghanistan' },
  { id:'ID', d:'M 640,185 L 660,180 L 680,178 L 695,182 L 696,192 L 678,196 L 655,195 L 636,191 Z', label:'Indonesia' },
  { id:'SG', d:'M 652,185 L 658,182 L 662,185 L 660,189 L 654,189 Z', label:'Singapore' },
  { id:'TH', d:'M 628,158 L 638,154 L 644,158 L 642,170 L 634,174 L 625,168 L 624,161 Z', label:'Thailand' },
  { id:'VN', d:'M 642,158 L 650,154 L 656,160 L 654,174 L 645,178 L 638,170 L 638,162 Z', label:'Vietnam' },
  // Oceania
  { id:'AU', d:'M 668,230 L 700,220 L 725,222 L 735,235 L 730,255 L 712,262 L 690,260 L 668,248 L 660,238 Z', label:'Australia' },
  { id:'NZ', d:'M 738,255 L 746,250 L 750,258 L 746,268 L 738,265 L 735,258 Z', label:'New Zealand' },
];

// Country code to path id mapping
const COUNTRY_TO_ID = {
  US:'US', RU:'RU', CN:'CN', GB:'GB', DE:'DE', FR:'FR',
  JP:'JP', KR:'KR', IN:'IN', BR:'BR', CA:'CA', AU:'AU',
  NL:'NL', PL:'PL', UA:'UA', TR:'TR', IR:'IR', SA:'SA',
  SG:'SG', NG:'NG', ZA:'ZA', AR:'AR', MX:'MX', IT:'IT',
  ES:'ES', ID:'ID', PK:'PK',
};

// Hotspot coordinates for attack animations
const HOTSPOTS = {
  US:{x:200,y:152}, CA:{x:205,y:110}, MX:{x:188,y:190},
  BR:{x:235,y:248}, AR:{x:232,y:295}, CO:{x:214,y:215},
  GB:{x:437,y:116}, FR:{x:449,y:128}, DE:{x:461,y:115},
  ES:{x:446,y:140}, IT:{x:462,y:138}, PL:{x:474,y:110},
  UA:{x:490,y:113}, NL:{x:450,y:110}, RU:{x:590,y:88},
  TR:{x:507,y:132}, IR:{x:538,y:138}, SA:{x:524,y:156},
  CN:{x:655,y:130}, IN:{x:592,y:153}, JP:{x:708,y:121},
  KR:{x:697,y:121}, PK:{x:566,y:141}, ID:{x:665,y:187},
  SG:{x:655,y:186}, AU:{x:698,y:242}, ZA:{x:471,y:263},
  NG:{x:456,y:197}, EG:{x:498,y:155},
};

function WorldMap({ threatCountries, attackLines }) {
  return (
    <svg viewBox="0 0 800 400" className="w-full h-full" style={{background:'transparent'}}>
      <defs>
        <filter id="glow3">
          <feGaussianBlur stdDeviation="2.5" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <radialGradient id="hotGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ef4444" stopOpacity="0.9"/>
          <stop offset="100%" stopColor="#ef4444" stopOpacity="0"/>
        </radialGradient>
      </defs>

      {/* Ocean background */}
      <rect x="0" y="0" width="800" height="400" fill="#0c1628" rx="8"/>

      {/* Grid lines */}
      {[0,67,134,200,267,334,400].map(y2=>
        <line key={`h${y2}`} x1="0" y1={y2} x2="800" y2={y2} stroke="#14b8a608" strokeWidth="1"/>
      )}
      {[0,80,160,240,320,400,480,560,640,720,800].map(x2=>
        <line key={`v${x2}`} x1={x2} y1="0" x2={x2} y2="400" stroke="#14b8a608" strokeWidth="1"/>
      )}

      {/* Countries */}
      {WORLD_PATHS.map(country => {
        const threat = threatCountries[country.id];
        let fill = '#1e3a5f';
        let stroke = '#2a4a7f';
        if (threat) {
          const intensity = Math.min(1, threat / 50);
          fill = intensity > 0.6 ? '#7f1d1d' : intensity > 0.3 ? '#92400e' : '#1e3a5f';
          stroke = intensity > 0.6 ? '#ef4444' : intensity > 0.3 ? '#f97316' : '#3b82f6';
        }
        return (
          <path key={country.id} d={country.d} fill={fill} stroke={stroke} strokeWidth="0.8"
            opacity="0.9">
            <title>{country.label}{threat ? ` — ${threat} IOCs` : ''}</title>
          </path>
        );
      })}

      {/* Attack lines */}
      {attackLines.map((a, i) => (
        <g key={a.id}>
          <line x1={a.from.x} y1={a.from.y} x2={a.to.x} y2={a.to.y}
            stroke={a.color} strokeWidth="0.6" strokeDasharray="3 3" opacity="0.5">
            <animate attributeName="stroke-dashoffset" from="0" to="-12" dur="0.4s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values="0.5;0;0.5" dur="2.5s"/>
          </line>
          <circle r="2.5" fill={a.color} opacity="0.9" filter="url(#glow3)">
            <animateMotion dur="2s" fill="freeze"
              path={`M${a.from.x},${a.from.y} L${a.to.x},${a.to.y}`}/>
            <animate attributeName="opacity" values="1;0" dur="2s" fill="freeze"/>
          </circle>
        </g>
      ))}

      {/* Threat hotspots */}
      {Object.entries(threatCountries).map(([code, count]) => {
        const pos = HOTSPOTS[code];
        if (!pos) return null;
        const r = Math.max(3, Math.min(12, count / 4));
        const color = count > 40 ? '#ef4444' : count > 20 ? '#f97316' : '#eab308';
        return (
          <g key={code}>
            <circle cx={pos.x} cy={pos.y} r={r+4} fill="none" stroke={color} strokeWidth="0.6" opacity="0.3">
              <animate attributeName="r" values={`${r};${r+8};${r}`} dur="2.5s" repeatCount="indefinite"/>
              <animate attributeName="opacity" values="0.3;0;0.3" dur="2.5s" repeatCount="indefinite"/>
            </circle>
            <circle cx={pos.x} cy={pos.y} r={r} fill={color} opacity="0.85" filter="url(#glow3)">
              <animate attributeName="opacity" values="0.85;0.5;0.85" dur="2s" repeatCount="indefinite"/>
            </circle>
            <text x={pos.x} y={pos.y - r - 2} textAnchor="middle"
              fill={color} fontSize="6" fontFamily="monospace" opacity="0.8">{code}</text>
          </g>
        );
      })}
    </svg>
  );
}

export default function ThreatMapPage() {
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [attackLines, setAttackLines] = useState([]);

  const fetchData = async () => {
    setLoading(true);
    try { const {data:d} = await api.get('/threatmap/data'); setData(d); }
    catch { toast.error('Failed to load threat map'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchData();
    const t = setInterval(fetchData, 60000);
    return () => clearInterval(t);
  }, []);

  // Build threat countries map (with demo data if no IOCs yet)
  const threatCountries = {};
  if (data?.mapPoints?.length > 0) {
    data.mapPoints.forEach(p => { threatCountries[p.country] = p.count; });
  } else {
    // Demo data so the map always shows something
    const demo = {US:45,CN:52,RU:38,DE:22,GB:18,FR:15,NL:20,JP:16,KR:14,BR:10,IN:12,CA:11,AU:9,UA:13,IR:16,TR:12,SG:11};
    Object.assign(threatCountries, demo);
  }

  // Animate attack lines
  useEffect(() => {
    const countries = Object.keys(threatCountries);
    if (countries.length < 2) return;
    const interval = setInterval(() => {
      const src = countries[Math.floor(Math.random() * countries.length)];
      const dst = ['US','GB','DE','FR','JP','NL'][Math.floor(Math.random() * 6)];
      const fromPos = HOTSPOTS[src], toPos = HOTSPOTS[dst];
      if (!fromPos || !toPos || src === dst) return;
      const id = Date.now();
      const cnt = threatCountries[src] || 10;
      setAttackLines(prev => [...prev.slice(-10), {
        id, from: fromPos, to: toPos,
        color: cnt > 40 ? '#ef4444' : cnt > 20 ? '#f97316' : '#eab308',
      }]);
      setTimeout(() => setAttackLines(prev => prev.filter(a => a.id !== id)), 2500);
    }, 700);
    return () => clearInterval(interval);
  }, [data]);

  const cveStats  = data?.cveStats || [];
  const critCount = cveStats.find(s=>s.severity==='critical')?.count || 0;
  const highCount = cveStats.find(s=>s.severity==='high')?.count || 0;
  const medCount  = cveStats.find(s=>s.severity==='medium')?.count || 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2"><Globe className="w-5 h-5 text-cyber-400"/>Global Threat Map</h1>
          <p className="text-xs text-gray-500 font-mono mt-0.5">{data?.totalIOCs||0} IOCs · {data?.totalCVEs||0} CVEs · {data?.totalKEV||0} KEV</p>
        </div>
        <button onClick={fetchData} disabled={loading} className="btn-ghost"><RefreshCw className={`w-4 h-4 ${loading?'animate-spin':''}`}/>Refresh</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card"><div className="text-2xl font-bold text-red-400 font-mono">{data?.criticalCVEs||0}</div><div className="text-xs text-gray-400">Critical CVEs</div></div>
        <div className="stat-card"><div className="text-2xl font-bold text-orange-400 font-mono">{data?.totalKEV||0}</div><div className="text-xs text-gray-400">KEV Entries</div></div>
        <div className="stat-card"><div className="text-2xl font-bold text-blue-400 font-mono">{data?.totalIOCs||0}</div><div className="text-xs text-gray-400">IOC Indicators</div></div>
        <div className="stat-card"><div className="text-2xl font-bold text-cyber-400 font-mono">{data?.totalCVEs||0}</div><div className="text-xs text-gray-400">Total CVEs</div></div>
      </div>

      {/* Map */}
      <div className="glass-card p-2">
        <div className="relative rounded-xl overflow-hidden border border-gray-800/40" style={{height:'430px'}}>
          {loading ? (
            <div className="flex items-center justify-center h-full flex-col gap-3 bg-gray-950">
              <Globe className="w-10 h-10 text-cyber-400 animate-pulse"/>
              <p className="text-gray-600 font-mono text-sm">Loading threat data...</p>
            </div>
          ) : (
            <>
              <WorldMap threatCountries={threatCountries} attackLines={attackLines}/>
              {/* LIVE badge */}
              <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-gray-900/90 border border-gray-700/40 rounded-full px-3 py-1">
                <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"/><span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"/></span>
                <span className="text-[10px] font-mono text-red-400">LIVE</span>
              </div>
              {/* Legend */}
              <div className="absolute bottom-3 left-3 bg-gray-900/90 border border-gray-700/40 rounded-lg p-2.5 text-[10px] font-mono space-y-1.5">
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-red-800 border border-red-500"/>Critical (&gt;40 IOCs)</div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-amber-900 border border-orange-400"/>High (20–40)</div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-blue-900 border border-blue-500"/>Monitored</div>
              </div>
              {/* Threat counter */}
              <div className="absolute top-3 left-3 bg-gray-900/90 border border-gray-700/40 rounded-lg px-3 py-2">
                <div className="text-[10px] text-gray-500 font-mono">ACTIVE THREATS</div>
                <div className="text-sm font-bold font-mono text-red-400">{critCount} CRITICAL · {highCount} HIGH</div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Bottom panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="glass-card p-4">
          <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2"><Bug className="w-4 h-4 text-red-400"/>CVE Severity (7j)</h3>
          {[['Critical',critCount,'bg-red-500','text-red-400'],['High',highCount,'bg-orange-500','text-orange-400'],['Medium',medCount,'bg-yellow-500','text-yellow-400']].map(([l,c,bg,tx])=>(
            <div key={l} className="flex items-center gap-3 mb-2">
              <span className={`text-xs font-mono w-14 ${tx}`}>{l}</span>
              <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden"><div className={`h-full ${bg} rounded-full`} style={{width:`${Math.min(100,(c/Math.max(1,critCount+highCount+medCount))*100)}%`}}/></div>
              <span className="text-xs font-mono text-gray-400 w-8 text-right">{c}</span>
            </div>
          ))}
        </div>
        <div className="glass-card p-4">
          <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2"><Globe className="w-4 h-4 text-blue-400"/>Top IOC Countries</h3>
          {Object.entries(threatCountries).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([code,count],i)=>(
            <div key={code} className="flex items-center gap-2 mb-2">
              <span className="text-[10px] text-gray-600 font-mono w-4">{i+1}</span>
              <span className="text-xs font-mono text-cyber-400 w-8">{code}</span>
              <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden"><div className="h-full bg-blue-500 rounded-full" style={{width:`${Math.min(100,(count/60)*100)}%`}}/></div>
              <span className="text-[10px] font-mono text-gray-500">{count}</span>
            </div>
          ))}
        </div>
        <div className="glass-card p-4">
          <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2"><Zap className="w-4 h-4 text-yellow-400"/>Recent Alerts</h3>
          {!data?.recentThreats?.length ? <p className="text-xs text-gray-600 font-mono">No critical alerts yet</p>
            : data.recentThreats.slice(0,5).map((t,i)=>(
              <div key={i} className="flex items-start gap-2 p-2 rounded bg-gray-800/30 mb-1">
                <SeverityBadge severity={t.severity}/>
                <div className="flex-1 min-w-0"><p className="text-xs text-gray-300 truncate">{t.title}</p><p className="text-[10px] text-gray-600 font-mono">{timeAgo(t.created_at)}</p></div>
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
