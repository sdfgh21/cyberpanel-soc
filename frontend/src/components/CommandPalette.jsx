import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bug, Newspaper, AlertTriangle, Bell, Globe, Shield,
         Server, FileText, Settings, Zap, Map, LayoutDashboard, Eye } from 'lucide-react';
import api from '../utils/api';

const CMDS = [
  { id:'dashboard',   label:'Dashboard',      icon:LayoutDashboard, path:'/'           },
  { id:'news',        label:'Threat News',    icon:Newspaper,       path:'/news'       },
  { id:'cves',        label:'CVE Feed',       icon:Bug,             path:'/cves'       },
  { id:'kev',         label:'CISA KEV',       icon:AlertTriangle,   path:'/kev'        },
  { id:'ioc',         label:'IOC Feed',       icon:Globe,           path:'/ioc'        },
  { id:'vt',          label:'VirusTotal',     icon:Eye,             path:'/virustotal' },
  { id:'map',         label:'Threat Map',     icon:Map,             path:'/threatmap'  },
  { id:'alerts',      label:'Alerts',         icon:Bell,            path:'/alerts'     },
  { id:'rules',       label:'Alert Rules',    icon:Zap,             path:'/rules'      },
  { id:'search',      label:'CVE Search',     icon:Search,          path:'/search'     },
  { id:'assets',      label:'Assets',         icon:Server,          path:'/assets'     },
  { id:'reports',     label:'Reports',        icon:FileText,        path:'/reports'    },
  { id:'settings',    label:'Settings',       icon:Settings,        path:'/settings'   },
];

export default function CommandPalette({ open, onClose }) {
  const [query, setQuery]       = useState('');
  const [results, setResults]   = useState(CMDS);
  const [cveResults, setCveResults] = useState([]);
  const [selected, setSelected] = useState(0);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (open) { setQuery(''); setSelected(0); setResults(CMDS); setTimeout(() => inputRef.current?.focus(), 50); }
  }, [open]);

  useEffect(() => {
    if (!query.trim()) { setResults(CMDS); setCveResults([]); return; }
    const q = query.toLowerCase();
    setResults(CMDS.filter(c => c.label.toLowerCase().includes(q)));
    const t = setTimeout(async () => {
      try { const { data } = await api.get('/cves', { params: { search: query, limit: 5 } }); setCveResults(data.cves||[]); }
      catch { setCveResults([]); }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const allResults = [
    ...results,
    ...cveResults.map(c => ({ id: c.cve_id, label: c.cve_id, description: c.description?.slice(0,80), icon: Bug, path: '/search', badge: c.severity }))
  ];

  const execute = useCallback((item) => { navigate(item.path); onClose(); }, [navigate, onClose]);

  useEffect(() => {
    const h = (e) => {
      if (e.key==='ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s+1, allResults.length-1)); }
      if (e.key==='ArrowUp')   { e.preventDefault(); setSelected(s => Math.max(s-1, 0)); }
      if (e.key==='Enter' && allResults[selected]) execute(allResults[selected]);
      if (e.key==='Escape') onClose();
    };
    if (open) window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, selected, allResults, execute, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center pt-24 px-4" onClick={onClose}>
      <div className="w-full max-w-xl glass-card overflow-hidden shadow-2xl fade-in-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-800/60">
          <Search className="w-4 h-4 text-gray-500" />
          <input ref={inputRef} type="text" value={query}
            onChange={e => { setQuery(e.target.value); setSelected(0); }}
            placeholder="Search pages, CVEs, commands..."
            className="flex-1 bg-transparent text-gray-200 placeholder-gray-600 outline-none text-sm font-mono" />
          <kbd className="text-[10px] text-gray-600 font-mono bg-gray-800 px-1.5 py-0.5 rounded">ESC</kbd>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {allResults.length === 0 ? (
            <div className="text-center py-8 text-gray-600 font-mono text-sm">No results</div>
          ) : (
            allResults.map((item, i) => {
              const Icon = item.icon || Search;
              return (
                <div key={item.id}
                  className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${i===selected?'bg-cyber-900/40 text-white':'hover:bg-gray-800/40 text-gray-300'}`}
                  onClick={() => execute(item)} onMouseEnter={() => setSelected(i)}>
                  <Icon className={`w-4 h-4 flex-shrink-0 ${i===selected?'text-cyber-400':'text-gray-500'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{item.label}</div>
                    {item.description && <div className="text-[10px] text-gray-500 truncate">{item.description}</div>}
                  </div>
                  {item.badge && <span className={`badge-${item.badge} text-[10px]`}>{item.badge}</span>}
                </div>
              );
            })
          )}
        </div>
        <div className="px-4 py-2 border-t border-gray-800/40 flex gap-4 text-[10px] text-gray-600 font-mono">
          <span>↑↓ navigate</span><span>↵ select</span><span>esc close</span>
          <span className="ml-auto">Ctrl+K to open</span>
        </div>
      </div>
    </div>
  );
}
