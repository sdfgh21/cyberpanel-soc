import React, { useState, useEffect } from 'react';
import { FileText, Plus, Trash2, Eye, Download, RefreshCw } from 'lucide-react';
import api from '../utils/api';
import { formatDate } from '../utils/helpers.jsx';
import toast from 'react-hot-toast';

export default function ReportsPage() {
  const [reports, setReports]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [generating, setGenerating] = useState(false);
  const [type, setType]         = useState('weekly');
  const [title, setTitle]       = useState('');
  const [preview, setPreview]   = useState(null);
  const BACKEND = import.meta.env.VITE_API_URL || '';

  const fetchReports = async () => {
    setLoading(true);
    try { const {data} = await api.get('/reports'); setReports(data); }
    catch { toast.error('Failed to load reports'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchReports(); }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await api.post('/reports/generate', { type, title: title.trim()||undefined });
      toast.success('Report generated!'); setTitle(''); fetchReports();
    } catch { toast.error('Generation failed'); }
    finally { setGenerating(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete report?')) return;
    await api.delete(`/reports/${id}`); toast.success('Deleted'); fetchReports();
  };

  const handleDownload = async (report) => {
    try {
      const {data} = await api.get(`/reports/${report.id}/html`, {responseType:'text'});
      const blob = new Blob([data], {type:'text/html'});
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = `${report.title.replace(/[^a-z0-9]/gi,'_')}.html`; a.click();
      URL.revokeObjectURL(url); toast.success('Downloaded');
    } catch { toast.error('Download failed'); }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2"><FileText className="w-5 h-5 text-cyber-400" />SOC Reports</h1>
        <p className="text-xs text-gray-500 font-mono mt-0.5">Generate & download threat intelligence reports</p>
      </div>

      <div className="glass-card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-300 flex items-center gap-2"><Plus className="w-4 h-4 text-cyber-400" />Generate New Report</h2>
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-48">
            <label className="text-xs text-gray-400 font-mono mb-1 block">TITLE (optional)</label>
            <input value={title} onChange={e=>setTitle(e.target.value)} className="input-dark" placeholder="Weekly SOC Summary" />
          </div>
          <div>
            <label className="text-xs text-gray-400 font-mono mb-1 block">PERIOD</label>
            <select value={type} onChange={e=>setType(e.target.value)} className="input-dark">
              <option value="weekly">Weekly (7 days)</option>
              <option value="monthly">Monthly (30 days)</option>
            </select>
          </div>
        </div>
        <button onClick={handleGenerate} disabled={generating} className="btn-primary disabled:opacity-50">
          {generating ? <><RefreshCw className="w-4 h-4 animate-spin" />Generating...</> : <><FileText className="w-4 h-4" />Generate Report</>}
        </button>
      </div>

      {preview && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={()=>setPreview(null)}>
          <div className="w-full max-w-5xl h-[85vh] glass-card overflow-hidden" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800/60">
              <span className="text-sm font-semibold text-gray-200">Report Preview</span>
              <button onClick={()=>setPreview(null)} className="text-gray-500 hover:text-white text-lg">×</button>
            </div>
            <iframe src={`${BACKEND}/api/reports/${preview}/html`} className="w-full h-full" title="Report Preview" />
          </div>
        </div>
      )}

      <div className="glass-card overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-800/60 flex items-center gap-2">
          <FileText className="w-4 h-4 text-cyber-400" />
          <span className="text-sm font-semibold text-gray-300">Generated Reports</span>
          <span className="text-xs text-gray-600 font-mono ml-auto">{reports.length} reports</span>
        </div>
        {loading ? <div className="flex items-center justify-center py-16"><FileText className="w-6 h-6 text-cyber-400 animate-pulse" /></div>
          : reports.length===0 ? <div className="text-center py-16 text-gray-600 font-mono text-sm">No reports yet. Generate one above.</div>
          : (
            <div className="divide-y divide-gray-800/40">
              {reports.map(report => (
                <div key={report.id} className="px-4 py-3 hover:bg-gray-800/20 transition-colors flex items-center gap-4">
                  <div className="w-8 h-8 rounded-lg bg-gray-800/60 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4 h-4 text-cyber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-200 truncate">{report.title}</div>
                    <div className="text-[10px] font-mono text-gray-600">{report.type} · by {report.generated_by} · {formatDate(report.created_at)}</div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={()=>setPreview(report.id)} className="text-gray-500 hover:text-cyber-400" title="Preview"><Eye className="w-4 h-4" /></button>
                    <button onClick={()=>handleDownload(report)} className="text-gray-500 hover:text-green-400" title="Download"><Download className="w-4 h-4" /></button>
                    <button onClick={()=>handleDelete(report.id)} className="text-gray-500 hover:text-red-400" title="Delete"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
      </div>
    </div>
  );
}
