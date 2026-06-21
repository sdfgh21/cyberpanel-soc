import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Shield, LayoutDashboard, Newspaper, AlertTriangle, Bell, Search,
         Settings, LogOut, ChevronLeft, ChevronRight, Bug, Server,
         FileText, Globe, Eye, Zap, Map } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.jsx';
import api from '../utils/api';

const NAV = [
  { path:'/',           icon:LayoutDashboard, label:'Dashboard'     },
  { path:'/news',       icon:Newspaper,       label:'Threat News'   },
  { path:'/cves',       icon:Bug,             label:'CVE Feed'      },
  { path:'/kev',        icon:AlertTriangle,   label:'CISA KEV'      },
  { path:'/ioc',        icon:Globe,           label:'IOC Feed'      },
  { path:'/virustotal', icon:Eye,             label:'VirusTotal'    },
  { path:'/threatmap',  icon:Map,             label:'Threat Map'    },
  { path:'/scanner',    icon:Search,          label:'Web Scanner'   },
  { path:'/alerts',     icon:Bell,            label:'Alerts', badge:true },
  { path:'/rules',      icon:Zap,             label:'Alert Rules'   },
  { path:'/search',     icon:Search,          label:'CVE Search'    },
  { path:'/assets',     icon:Server,          label:'Assets'        },
  { path:'/reports',    icon:FileText,        label:'Reports'       },
  { path:'/settings',   icon:Settings,        label:'Settings'      },
];

export default function Sidebar({ collapsed, setCollapsed, onOpenPalette }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    const fetch = () => api.get('/alerts?limit=1').then(r => setUnread(r.data.unread||0)).catch(()=>{});
    fetch();
    const t = setInterval(fetch, 60000);
    return () => clearInterval(t);
  }, []);

  return (
    <aside className={`fixed left-0 top-0 h-full z-40 flex flex-col bg-gray-900/95 backdrop-blur-md border-r border-gray-800/60 transition-all duration-200 ${collapsed?'w-16':'w-60'}`}>
      <div className={`flex items-center gap-3 px-4 py-4 border-b border-gray-800/60 ${collapsed?'justify-center':''}`}>
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-cyber-900/80 border border-cyber-700/50 flex items-center justify-center">
          <Shield className="w-4 h-4 text-cyber-400" />
        </div>
        {!collapsed && (
          <div>
            <div className="font-bold text-white text-sm tracking-tight">Cyber<span className="text-cyber-400">Panel</span></div>
            <div className="text-gray-600 text-[10px] font-mono">SOC Intelligence v2</div>
          </div>
        )}
      </div>

      {!collapsed && (
        <button onClick={onOpenPalette}
          className="mx-3 my-2 flex items-center gap-2 bg-gray-800/60 border border-gray-700/40 rounded-lg px-3 py-1.5 text-xs text-gray-500 hover:text-gray-300 hover:border-gray-600 transition-colors">
          <Search className="w-3 h-3" />
          <span className="flex-1 text-left font-mono">Search...</span>
          <kbd className="text-[9px] bg-gray-700 px-1 py-0.5 rounded font-mono">Ctrl+K</kbd>
        </button>
      )}

      {!collapsed && (
        <div className="px-4 py-1.5 border-b border-gray-800/40">
          <div className="flex items-center gap-2 text-xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
            <span className="text-green-400 font-mono">LIVE MONITORING</span>
          </div>
        </div>
      )}

      <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto">
        {NAV.map(({ path, icon: Icon, label, badge }) => {
          const isActive = location.pathname === path;
          const count    = badge ? unread : 0;
          return (
            <button key={path+label} onClick={() => navigate(path)} title={collapsed ? label : undefined}
              className={`sidebar-link w-full relative ${isActive?'active':''} ${collapsed?'justify-center px-2':''}`}>
              <Icon className={`w-4 h-4 flex-shrink-0 ${isActive?'text-cyber-400':''}`} />
              {!collapsed && <span className="flex-1 text-left">{label}</span>}
              {!collapsed && count > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {count > 9 ? '9+' : count}
                </span>
              )}
              {collapsed && count > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />}
            </button>
          );
        })}
      </nav>

      <div className={`border-t border-gray-800/60 p-3 ${collapsed?'flex justify-center':''}`}>
        {!collapsed ? (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 px-2">
              <div className="w-7 h-7 rounded-full bg-cyber-800/60 border border-cyber-700/40 flex items-center justify-center">
                <span className="text-cyber-400 font-bold text-xs uppercase">{user?.username?.[0]}</span>
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium text-gray-200 truncate">{user?.username}</div>
                <div className="text-[10px] text-gray-500 font-mono uppercase">{user?.role}</div>
              </div>
            </div>
            <button onClick={() => { logout(); navigate('/login'); }}
              className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-gray-500 hover:text-red-400 transition-colors rounded-lg hover:bg-red-900/10">
              <LogOut className="w-3.5 h-3.5" /> Sign out
            </button>
          </div>
        ) : (
          <button onClick={() => { logout(); navigate('/login'); }} title="Sign out" className="text-gray-600 hover:text-red-400">
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>

      <button onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 w-6 h-6 bg-gray-800 border border-gray-700 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700 transition-colors">
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>
    </aside>
  );
}
