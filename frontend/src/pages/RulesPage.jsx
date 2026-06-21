import React, { useState, useEffect } from 'react';
import { Zap, Plus, Trash2, Edit3, ToggleLeft, ToggleRight, X, Save, CheckCircle } from 'lucide-react';
import api from '../utils/api';
import { timeAgo } from '../utils/helpers.jsx';
import toast from 'react-hot-toast';

const CONDITIONS_DEF = [
  { field:'cvss_score', label:'CVSS Score',  ops:['>=','<=','='], type:'number' },
  { field:'severity',   label:'Severity',    ops:['='],           type:'select', options:['critical','high','medium','low'] },
  { field:'vendor',     label:'Vendor',      ops:['contains','='],type:'text' },
  { field:'title',      label:'Title/Name',  ops:['contains'],    type:'text' },
];

const ACTIONS = [
  { id:'create_alert', label:'Create Dashboard Alert' },
  { id:'discord',      label:'Send Discord Alert' },
  { id:'telegram',     label:'Send Telegram Alert' },
];

function RuleModal({ rule, onClose, onSaved }) {
  const [form, setForm] = useState(rule || {
    name:'', description:'', source:'cve',
    conditions:[{ field:'cvss_score', op:'>=', value:'9' }],
    actions:['create_alert'], enabled:true
  });
  const [saving, setSaving] = useState(false);

  const addCondition    = () => setForm(f=>({...f,conditions:[...f.conditions,{field:'severity',op:'=',value:'critical'}]}));
  const removeCondition = (i) => setForm(f=>({...f,conditions:f.conditions.filter((_,idx)=>idx!==i)}));
  const updateCondition = (i,key,val) => setForm(f=>({...f,conditions:f.conditions.map((c,idx)=>idx===i?{...c,[key]:val}:c)}));
  const toggleAction    = (id) => setForm(f=>({...f,actions:f.actions.includes(id)?f.actions.filter(a=>a!==id):[...f.actions,id]}));

  const handleSave = async () => {
    if (!form.name.trim())         { toast.error('Name required'); return; }
    if (!form.conditions.length)   { toast.error('Add at least one condition'); return; }
    if (!form.actions.length)      { toast.error('Add at least one action'); return; }
    setSaving(true);
    try {
      if (rule?.id) await api.put(`/rules/${rule.id}`, form);
      else          await api.post('/rules', form);
      toast.success(rule?.id?'Rule updated':'Rule created');
      onSaved(); onClose();
    } catch (err) { toast.error(err.response?.data?.error||'Save failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="glass-card w-full max-w-lg p-6 space-y-4 fade-in-up max-h-[90vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">{rule?.id?'Edit Rule':'New Alert Rule'}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X className="w-4 h-4"/></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-400 font-mono mb-1 block">RULE NAME *</label>
            <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} className="input-dark" placeholder="Critical CVE Alert"/>
          </div>
          <div>
            <label className="text-xs text-gray-400 font-mono mb-1 block">SOURCE</label>
            <select value={form.source} onChange={e=>setForm(f=>({...f,source:e.target.value}))} className="input-dark">
              {['cve','kev','news','ioc','alert'].map(s=><option key={s} value={s}>{s.toUpperCase()}</option>)}
            </select>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-gray-400 font-mono">CONDITIONS</label>
              <button onClick={addCondition} className="text-xs text-cyber-400 hover:text-cyber-300 font-mono">+ Add</button>
            </div>
            <div className="space-y-2">
              {form.conditions.map((cond,i)=>{
                const def = CONDITIONS_DEF.find(c=>c.field===cond.field)||CONDITIONS_DEF[0];
                return (
                  <div key={i} className="flex gap-2 items-center bg-gray-800/40 rounded p-2">
                    <select value={cond.field} onChange={e=>updateCondition(i,'field',e.target.value)} className="input-dark text-xs w-28">
                      {CONDITIONS_DEF.map(c=><option key={c.field} value={c.field}>{c.label}</option>)}
                    </select>
                    <select value={cond.op} onChange={e=>updateCondition(i,'op',e.target.value)} className="input-dark text-xs w-16">
                      {def.ops.map(op=><option key={op} value={op}>{op}</option>)}
                    </select>
                    {def.type==='select'
                      ? <select value={cond.value} onChange={e=>updateCondition(i,'value',e.target.value)} className="input-dark text-xs flex-1">
                          {def.options.map(o=><option key={o} value={o}>{o}</option>)}
                        </select>
                      : <input value={cond.value} onChange={e=>updateCondition(i,'value',e.target.value)} className="input-dark text-xs flex-1" placeholder="value"/>
                    }
                    <button onClick={()=>removeCondition(i)} className="text-gray-600 hover:text-red-400"><X className="w-3.5 h-3.5"/></button>
                  </div>
                );
              })}
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400 font-mono mb-2 block">ACTIONS</label>
            <div className="space-y-1">
              {ACTIONS.map(a=>(
                <label key={a.id} className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-gray-800/40">
                  <div className={`w-4 h-4 rounded border flex items-center justify-center ${form.actions.includes(a.id)?'bg-cyber-600 border-cyber-500':'border-gray-600'}`}
                    onClick={()=>toggleAction(a.id)}>
                    {form.actions.includes(a.id) && <CheckCircle className="w-3 h-3 text-white"/>}
                  </div>
                  <span className="text-xs text-gray-300">{a.label}</span>
                </label>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <div onClick={()=>setForm(f=>({...f,enabled:!f.enabled}))}
              className={`w-10 h-5 rounded-full transition-colors relative ${form.enabled?'bg-cyber-600':'bg-gray-700'}`}>
              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${form.enabled?'translate-x-5':'translate-x-0.5'}`}/>
            </div>
            <span className="text-xs text-gray-300">{form.enabled?'Enabled':'Disabled'}</span>
          </label>
        </div>
        <div className="flex gap-3 justify-end pt-2">
          <button onClick={onClose} className="btn-ghost">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary disabled:opacity-50">
            <Save className="w-4 h-4"/>{saving?'Saving...':'Save Rule'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function RulesPage() {
  const [rules, setRules]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]   = useState(null);

  const fetchAll = async () => {
    setLoading(true);
    try { const {data} = await api.get('/rules'); setRules(data); }
    catch { toast.error('Failed to load rules'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleToggle = async (id) => { await api.patch(`/rules/${id}/toggle`); fetchAll(); };
  const handleDelete = async (id) => {
    if (!window.confirm('Delete rule?')) return;
    await api.delete(`/rules/${id}`); toast.success('Deleted'); fetchAll();
  };

  return (
    <div className="space-y-5">
      {modal && <RuleModal rule={modal==='new'?null:modal} onClose={()=>setModal(null)} onSaved={fetchAll}/>}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2"><Zap className="w-5 h-5 text-yellow-400"/>Alert Rules Engine</h1>
          <p className="text-xs text-gray-500 font-mono mt-0.5">Auto-trigger alerts based on conditions</p>
        </div>
        <button onClick={()=>setModal('new')} className="btn-primary"><Plus className="w-4 h-4"/>New Rule</button>
      </div>
      <div className="glass-card overflow-hidden">
        {loading ? <div className="flex items-center justify-center py-16"><Zap className="w-6 h-6 text-yellow-400 animate-pulse"/></div>
          : rules.length===0 ? (
            <div className="text-center py-16 space-y-3">
              <Zap className="w-10 h-10 text-gray-700 mx-auto"/>
              <p className="text-gray-500 font-mono text-sm">No rules yet</p>
              <button onClick={()=>setModal('new')} className="btn-primary mx-auto"><Plus className="w-4 h-4"/>Create first rule</button>
            </div>
          ) : (
            <div className="divide-y divide-gray-800/40">
              {rules.map(rule=>(
                <div key={rule.id} className="p-4 hover:bg-gray-800/20 transition-colors">
                  <div className="flex items-start gap-3">
                    <button onClick={()=>handleToggle(rule.id)} className="mt-0.5 flex-shrink-0">
                      {rule.enabled ? <ToggleRight className="w-5 h-5 text-cyber-400"/> : <ToggleLeft className="w-5 h-5 text-gray-600"/>}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-gray-200">{rule.name}</span>
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${rule.enabled?'text-green-400 border-green-800/40 bg-green-900/20':'text-gray-600 border-gray-700/40'}`}>
                          {rule.enabled?'ACTIVE':'DISABLED'}
                        </span>
                        <span className="text-[10px] font-mono text-cyber-700 bg-cyber-900/30 border border-cyber-800/30 px-1.5 py-0.5 rounded-full">{rule.source?.toUpperCase()}</span>
                      </div>
                      {rule.description && <p className="text-xs text-gray-500 mt-0.5">{rule.description}</p>}
                      <div className="flex flex-wrap gap-1 mt-2">
                        {rule.conditions?.map((c,i)=><span key={i} className="badge-info text-[10px]">{c.field} {c.op} {c.value}</span>)}
                      </div>
                      <div className="flex gap-2 mt-1 flex-wrap">
                        {rule.actions?.map(a=><span key={a} className="text-[10px] text-gray-500 font-mono">→ {a}</span>)}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={()=>setModal(rule)} className="text-gray-600 hover:text-cyber-400"><Edit3 className="w-4 h-4"/></button>
                      <button onClick={()=>handleDelete(rule.id)} className="text-gray-600 hover:text-red-400"><Trash2 className="w-4 h-4"/></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
      </div>
    </div>
  );
}
