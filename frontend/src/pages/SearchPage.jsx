import React, { useState } from 'react';
import { Search, Bug, ExternalLink, Shield } from 'lucide-react';
import api from '../utils/api';
import { SeverityBadge, ScoreBadge, formatDate } from '../utils/helpers.jsx';
import toast from 'react-hot-toast';

export default function SearchPage() {
  const [query, setQuery]   = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true); setSearched(true);
    try {
      const { data } = await api.get(`/cves/search/${query.trim().toUpperCase()}`);
      setResult(data);
    } catch (err) {
      if (err.response?.status===404) { setResult(null); toast.error('CVE not found'); }
      else toast.error('Search failed: ' + (err.response?.data?.error||err.message));
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2"><Search className="w-5 h-5 text-cyber-400" />CVE Lookup</h1>
        <p className="text-xs text-gray-500 font-mono mt-0.5">Search any CVE directly from NVD</p>
      </div>
      <div className="glass-card p-5">
        <form onSubmit={handleSearch} className="flex gap-3">
          <div className="relative flex-1">
            <Bug className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input type="text" value={query} onChange={e => setQuery(e.target.value)}
              placeholder="CVE-2024-12345" className="input-dark pl-9 text-base" autoFocus />
          </div>
          <button type="submit" disabled={loading||!query.trim()} className="btn-primary px-6 disabled:opacity-50">
            {loading ? <span className="font-mono text-xs">Searching<span className="blink">_</span></span> : <><Search className="w-4 h-4" />Search</>}
          </button>
        </form>
        <p className="text-xs text-gray-600 font-mono mt-2">Format: CVE-YYYY-NNNNN</p>
      </div>

      {searched && !loading && !result && (
        <div className="glass-card p-8 text-center">
          <Bug className="w-10 h-10 text-gray-700 mx-auto mb-2" />
          <p className="text-gray-500 font-mono">No CVE found for "{query}"</p>
        </div>
      )}

      {result && (
        <div className="glass-card p-6 fade-in-up space-y-5">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-xl font-bold font-mono text-cyber-400">{result.cve_id}</h2>
            <SeverityBadge severity={result.severity} />
            <ScoreBadge score={result.cvss_score} />
          </div>
          <p className="text-sm text-gray-300 leading-relaxed">{result.description}</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-800/40 rounded-lg p-3">
              <div className="text-[10px] text-gray-500 font-mono uppercase mb-1">Published</div>
              <div className="text-xs text-gray-300 font-mono">{formatDate(result.published_at)}</div>
            </div>
            <div className="bg-gray-800/40 rounded-lg p-3">
              <div className="text-[10px] text-gray-500 font-mono uppercase mb-1">Last Modified</div>
              <div className="text-xs text-gray-300 font-mono">{formatDate(result.modified_at)}</div>
            </div>
          </div>
          {result.cvss_vector && (
            <div className="bg-gray-800/40 rounded-lg p-3">
              <div className="text-[10px] text-gray-500 font-mono uppercase mb-1">CVSS Vector</div>
              <div className="text-xs text-cyber-400 font-mono">{result.cvss_vector}</div>
            </div>
          )}
          {result.raw?.references?.length > 0 && (
            <div>
              <div className="text-xs text-gray-500 font-mono uppercase mb-2">References</div>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {result.raw.references.slice(0,8).map((ref,i) => (
                  <a key={i} href={ref.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs text-cyber-600 hover:text-cyber-400">
                    <ExternalLink className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{ref.url}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
          <a href={`https://nvd.nist.gov/vuln/detail/${result.cve_id}`} target="_blank" rel="noopener noreferrer"
            className="btn-primary w-full justify-center">
            <Shield className="w-4 h-4" />View on NVD
          </a>
        </div>
      )}
    </div>
  );
}
