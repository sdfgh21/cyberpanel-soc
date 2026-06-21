import React, { useState, useEffect, useCallback } from 'react';
import { Server, Plus, Trash2, Edit3, Bug, Search, ChevronDown, ChevronUp, X, Save } from 'lucide-react';
import api from '../utils/api';
import { ScoreBadge, truncate } from '../utils/helpers.jsx';
import toast from 'react-hot-toast';

const CRIT_COLORS = { critical:'text-red-400 border-red-800/40 bg-red-900/20', high:'text-orange-400 border-orange-800/40 bg-orange-900/20', medium:'text-yellow-400 border-yellow-800/40 bg-yellow-900/20', low:'text-green-400 border-green-800/40 bg-green-900/20' };

function AssetModal({ asset, onClose, onSaved }) {
  const [form, setForm] = useState(asset || { name:'', ip:'', hostname:'', os:'', asset_type:'server', criticality:'medium', owner:'', tags:[], notes:'' });
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);

  const addTag = () => {
    if (tagInput.trim() && !form.tags.includes(tagInput.trim())) {
      setForm(f=>({...f,tags:[...f.tags,tagInput.trim()]}));
      setTagInput('');
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Name required'); return; }
    setSaving(true);
    try {
      if (asset?.id) await api.put(`/assets/${asset.id}`, form);
      else           await api.post('/assets', form);
      toast.success(asset?.id?'Asset updated':'Asset created');
      onSaved(); onClose();
    } catch (err) { toast.error(err.response?.data?.error||'Save failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="glass-card w-full max-w-lg p-6 space-y-4 fade-in-up" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">{asset?.id?'Edit Asset':'New Asset'}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="text-xs text-gray-400 font-mono mb-1 block">NAME *</label>
            <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} className="input-dark" placeholder="Web Server 01" />
          </div>
          <div><label className="text-xs text-gray-400 font-mono mb-1 block">IP</label>
            <input value={form.ip||''} onChange={e=>setForm(f=>({...f,ip:e.target.value}))} className="input-dark" placeholder="192.168.1.10" /></div>
          <div><label className="text-xs text-gray-400 font-mono mb-1 block">HOSTNAME</label>
            <input value={form.hostname||''} onChange={e=>setForm(f=>({...f,hostname:e.target.value}))} className="input-dark" placeholder="web01.local" /></div>
          <div><label className="text-xs text-gray-400 font-mono mb-1 block">OS</label>
            <input value={form.os||''} onChange={e=>setForm(f=>({...f,os:e.target.value}))} className="input-dark" placeholder="Ubuntu 22.04" /></div>
          <div><label className="text-xs text-gray-400 font-mono mb-1 block">TYPE</label>
            <select value={form.asset_type} onChange={e=>setForm(f=>({...f,asset_type:e.target.value}))} className="input-dark">
              {['server','workstation','network','cloud','iot','mobile','other'].map(t=><option key={t} value={t}>{t}</option>)}
            </select></div>
          <div><label className="text-xs text-gray-400 font-mono mb-1 block">CRITICALITY</label>
            <select value={form.criticality} onChange={e=>setForm(f=>({...f,criticality:e.target.value}))} className="input-dark">
              {['critical','high','medium','low'].map(c=><option key={c} value={c}>{c}</option>)}
            </select></div>
          <div><label className="text-xs text-gray-400 font-mono mb-1 block">OWNER</label>
            <input value={form.owner||''} onChange={e=>setForm(f=>({...f,owner:e.target.value}))} className="input-dark" placeholder="soc-team" /></div>
          <div className="col-span-2">
            <label className="text-xs text-gray-400 font-mono mb-1 block">TAGS</label>
            <div className="flex gap-2 mb-2">
              <input value={tagInput} onChange={e=>setTagInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&(e.preventDefault(),addTag())} className="input-dark flex-1" placeholder="Add tag..." />
              <button type="button" onClick={addTag} className="btn-ghost px-3">+</button>
            </div>
            <div className="flex flex-wrap gap-1">
              {form.tags.map(t=>(
                <span key={t} className="badge-info flex items-center gap-1">{t}
                  <button onClick={()=>setForm(f=>({...f,tags:f.tags.filter(x=>x!==t)}))} className="hover:text-red-400">×</button>
                </span>
              ))}
            </div>
          </div>
          <div className="col-span-2">
            <label className="text-xs text-gray-400 font-mono mb-1 block">NOTES</label>
            <textarea value={form.notes||''} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} className="input-dark resize-none" rows={2} />
          </div>
        </div>
        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="btn-ghost">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary disabled:opacity-50">
            <Save className="w-4 h-4" />{saving?'Saving...':'Save Asset'}
          </button>
        </div>
      </div>
    </div>
  );
}

function AssetRow({ asset, onEdit, onDelete }) {
  const [open, setOpen] = useState(false);
  const [cves, setCves] = useState([]);
  const [cveInput, setCveInput] = useState('');

  const loadCVEs = async () => { const {data} = await api.get(`/assets/${asset.id}/cves`); setCves(data); };
  const toggleOpen = () => { if (!open) loadCVEs(); setOpen(!open); };
  const linkCVE = async () => {
    if (!cveInput.trim()) return;
    try { await api.post(`/assets/${asset.id}/cves`, {cve_id:cveInput.trim().toUpperCase()}); setCveInput(''); loadCVEs(); toast.success('CVE linked'); }
    catch (err) { toast.error(err.response?.data?.error||'Failed'); }
  };

  return (
    <div className="border-b border-gray-800/40">
      <div className="px-4 py-3 hover:bg-gray-800/20 transition-colors">
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs px-2 py-0.5 rounded-full border font-mono ${CRIT_COLORS[asset.criticality]||''}`}>{asset.criticality}</span>
              <span className="text-sm font-semibold text-gray-200">{asset.name}</span>
              {asset.ip && <span className="text-xs font-mono text-gray-500">{asset.ip}</span>}
              <span className="text-[10px] text-gray-600 bg-gray-800/60 px-1.5 py-0.5 rounded">{asset.asset_type}</span>
            </div>
            {asset.os && <div className="text-[10px] text-gray-500 font-mono mt-0.5">OS: {asset.os}</div>}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {asset.cve_count > 0 && <span className="flex items-center gap-1 text-xs text-red-400 font-mono"><Bug className="w-3 h-3" />{asset.cve_count}</span>}
            <button onClick={()=>onEdit(asset)} className="text-gray-600 hover:text-cyber-400"><Edit3 className="w-3.5 h-3.5" /></button>
            <button onClick={()=>onDelete(asset.id)} className="text-gray-600 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
            <button onClick={toggleOpen} className="text-gray-600 hover:text-gray-300">
              {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
      {open && (
        <div className="px-4 pb-4 bg-gray-800/10 fade-in-up">
          <div className="flex gap-2 mb-3">
            <input value={cveInput} onChange={e=>setCveInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&linkCVE()}
              className="input-dark text-xs" placeholder="Link CVE-YYYY-NNNNN..." />
            <button onClick={linkCVE} className="btn-ghost text-xs px-3">Link</button>
          </div>
          {cves.length===0 ? <p className="text-xs text-gray-600 font-mono">No CVEs linked</p> : (
            <div className="space-y-1">
              {cves.map(c => (
                <div key={c.cve_id} className="flex items-center gap-3 text-xs p-2 rounded bg-gray-800/30">
                  <span className="font-mono text-cyber-400">{c.cve_id}</span>
                  {c.cvss_score && <ScoreBadge score={c.cvss_score} />}
                  <span className="text-gray-500 flex-1 truncate">{truncate(c.description,60)}</span>
                  <select value={c.status} onChange={e=>api.patch(`/assets/${asset.id}/cves/${c.cve_id}`,{status:e.target.value}).then(loadCVEs)}
                    className="bg-gray-800 border border-gray-700 rounded px-1.5 py-0.5 text-[10px] font-mono text-gray-300">
                    {['open','mitigated','patched','accepted'].map(s=><option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AssetsPage() {
  const [assets, setAssets]   = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [modal, setModal]     = useState(null);

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      const [a, s] = await Promise.all([api.get('/assets',{params}), api.get('/assets/summary')]);
      setAssets(a.data); setSummary(s.data);
    } catch { toast.error('Failed to load assets'); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { fetchAssets(); }, [fetchAssets]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete asset?')) return;
    await api.delete(`/assets/${id}`); toast.success('Deleted'); fetchAssets();
  };

  return (
    <div className="space-y-5">
      {modal && <AssetModal asset={modal==='new'?null:modal} onClose={()=>setModal(null)} onSaved={fetchAssets} />}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2"><Server className="w-5 h-5 text-cyber-400" />Asset Inventory</h1>
          <p className="text-xs text-gray-500 font-mono mt-0.5">{assets.length} assets tracked</p>
        </div>
        <button onClick={()=>setModal('new')} className="btn-primary"><Plus className="w-4 h-4" />Add Asset</button>
      </div>
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="stat-card"><div className="text-2xl font-bold text-white font-mono">{summary.total}</div><div className="text-xs text-gray-400">Total Assets</div></div>
          {summary.byCriticality?.map(c=>(
            <div key={c.criticality} className="stat-card">
              <div className={`text-2xl font-bold font-mono ${CRIT_COLORS[c.criticality]?.split(' ')[0]||'text-gray-400'}`}>{c.c}</div>
              <div className="text-xs text-gray-400 capitalize">{c.criticality}</div>
            </div>
          ))}
        </div>
      )}
      <div className="glass-card p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
          <input type="text" placeholder="Search assets..." value={search} onChange={e=>setSearch(e.target.value)} className="input-dark pl-8" />
        </div>
      </div>
      <div className="glass-card overflow-hidden">
        {loading ? <div className="flex items-center justify-center py-16"><Server className="w-6 h-6 text-cyber-400 animate-pulse" /></div>
          : assets.length===0 ? <div className="text-center py-16 text-gray-600 font-mono text-sm">No assets. Click "Add Asset".</div>
          : assets.map(a=><AssetRow key={a.id} asset={a} onEdit={setModal} onDelete={handleDelete} />)}
      </div>
    </div>
  );
}
