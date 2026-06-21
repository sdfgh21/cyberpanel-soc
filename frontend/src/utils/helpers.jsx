export function SeverityBadge({ severity }) {
  const map = { critical:'badge-critical', high:'badge-high', medium:'badge-medium', low:'badge-low', info:'badge-info', unknown:'badge-unknown' };
  return <span className={map[severity?.toLowerCase()]||'badge-unknown'}>{severity||'unknown'}</span>;
}

export function ScoreBadge({ score }) {
  if (score === null || score === undefined) return <span className="badge-unknown">N/A</span>;
  const s = parseFloat(score);
  let cls = s>=9?'badge-critical':s>=7?'badge-high':s>=4?'badge-medium':'badge-low';
  return <span className={cls}>{s.toFixed(1)}</span>;
}

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  try { return new Date(dateStr).toLocaleDateString('fr-FR', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }); }
  catch { return dateStr; }
}

export function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Math.floor((new Date() - new Date(dateStr)) / 1000);
  if (diff < 60)    return `${diff}s ago`;
  if (diff < 3600)  return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
  return `${Math.floor(diff/86400)}d ago`;
}

export function truncate(str, len=120) {
  if (!str) return '';
  return str.length > len ? str.slice(0, len) + '…' : str;
}

export const SEVERITY_COLORS = {
  critical:'#ef4444', high:'#f97316', medium:'#eab308', low:'#22c55e', info:'#3b82f6', unknown:'#6b7280'
};
