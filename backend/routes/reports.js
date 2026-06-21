const express = require('express');
const { getDbProxy }     = require('../database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
const db     = getDbProxy();

function buildReportData(type='weekly') {
  const days       = type==='weekly'?7:30;
  const cveCritical= db.prepare(`SELECT * FROM cve_cache WHERE severity='critical' AND published_at > datetime('now','-${days} days') ORDER BY cvss_score DESC LIMIT 20`).all();
  const cveHigh    = db.prepare(`SELECT * FROM cve_cache WHERE severity='high' AND published_at > datetime('now','-${days} days') ORDER BY cvss_score DESC LIMIT 20`).all();
  const kevNew     = db.prepare(`SELECT * FROM kev_cache WHERE date_added > date('now','-${days} days') ORDER BY date_added DESC`).all();
  const topNews    = db.prepare(`SELECT * FROM news_cache WHERE severity IN ('critical','high') AND fetched_at > datetime('now','-${days} days') ORDER BY published_at DESC LIMIT 15`).all();
  const alerts     = db.prepare(`SELECT * FROM alerts WHERE created_at > datetime('now','-${days} days') ORDER BY created_at DESC LIMIT 20`).all();
  return { period: type, days, generated: new Date().toISOString(),
    summary: { cve_critical: cveCritical.length, cve_high: cveHigh.length, kev_new: kevNew.length, news_high: topNews.length, alerts: alerts.length },
    cveCritical, cveHigh, kevNew, topNews, alerts };
}

function renderHTML(data) {
  const sev = s => ({critical:'#ef4444',high:'#f97316',medium:'#eab308',low:'#22c55e'})[s]||'#6b7280';
  const fmtDate = d => d ? new Date(d).toLocaleDateString('fr-FR') : '—';
  const cveRows = [...data.cveCritical, ...data.cveHigh].slice(0,25).map(c => `
    <tr><td style="font-family:monospace;color:#14b8a6">${c.cve_id}</td>
    <td><span style="background:${sev(c.severity)}22;color:${sev(c.severity)};padding:2px 8px;border-radius:9999px;font-size:11px">${c.severity}</span></td>
    <td style="font-family:monospace;font-weight:bold">${c.cvss_score?.toFixed(1)||'N/A'}</td>
    <td style="font-size:12px;color:#9ca3af">${(c.description||'').slice(0,100)}…</td>
    <td style="font-size:11px;color:#6b7280;font-family:monospace">${fmtDate(c.published_at)}</td></tr>`).join('');
  const kevRows = data.kevNew.slice(0,15).map(k => `
    <tr><td style="font-family:monospace;color:#f97316">${k.cve_id}</td>
    <td>${k.vendor_project||'—'}</td><td>${k.product||'—'}</td>
    <td style="font-size:12px">${(k.vulnerability_name||'').slice(0,60)}</td>
    <td style="font-family:monospace;font-size:11px">${fmtDate(k.date_added)}</td></tr>`).join('');
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>CyberPanel Report</title>
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',Arial,sans-serif;background:#0f172a;color:#e2e8f0;padding:40px}
.header{background:linear-gradient(135deg,#042f2e,#0f172a);border:1px solid #14b8a640;border-radius:16px;padding:32px;margin-bottom:32px;display:flex;justify-content:space-between;align-items:center}
h1{font-size:28px;font-weight:800;color:#fff}.accent{color:#14b8a6}.meta{font-size:12px;color:#64748b;font-family:monospace;text-align:right}
.grid{display:grid;grid-template-columns:repeat(5,1fr);gap:16px;margin-bottom:32px}
.card{background:#1e293b;border:1px solid #334155;border-radius:12px;padding:20px;text-align:center}
.card-val{font-size:32px;font-weight:800;font-family:monospace}.card-lbl{font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.05em;margin-top:4px}
.section{background:#1e293b;border:1px solid #334155;border-radius:12px;padding:24px;margin-bottom:24px}
h2{font-size:16px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.1em;margin-bottom:16px;padding-bottom:8px;border-bottom:1px solid #334155}
table{width:100%;border-collapse:collapse}th{text-align:left;font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.1em;padding:8px 12px;background:#0f172a}
td{padding:8px 12px;border-bottom:1px solid #1e293b22;font-size:13px;vertical-align:top}tr:hover td{background:#ffffff08}
.footer{text-align:center;color:#334155;font-size:11px;font-family:monospace;margin-top:32px}</style></head>
<body>
<div class="header">
  <div><h1>Cyber<span class="accent">Panel</span> — SOC Report</h1>
    <div style="color:#64748b;font-size:13px;margin-top:4px">${data.period==='weekly'?'Weekly':'Monthly'} Threat Intelligence Summary</div>
  </div>
  <div class="meta">Generated: ${new Date(data.generated).toLocaleString('fr-FR')}<br>Period: Last ${data.days} days</div>
</div>
<div class="grid">
  <div class="card"><div class="card-val" style="color:#ef4444">${data.summary.cve_critical}</div><div class="card-lbl">Critical CVEs</div></div>
  <div class="card"><div class="card-val" style="color:#f97316">${data.summary.cve_high}</div><div class="card-lbl">High CVEs</div></div>
  <div class="card"><div class="card-val" style="color:#f97316">${data.summary.kev_new}</div><div class="card-lbl">New KEV</div></div>
  <div class="card"><div class="card-val" style="color:#3b82f6">${data.summary.news_high}</div><div class="card-lbl">Threat Articles</div></div>
  <div class="card"><div class="card-val" style="color:#14b8a6">${data.summary.alerts}</div><div class="card-lbl">Alerts</div></div>
</div>
${cveRows?`<div class="section"><h2>🐛 Top CVEs</h2><table><thead><tr><th>CVE ID</th><th>Severity</th><th>CVSS</th><th>Description</th><th>Published</th></tr></thead><tbody>${cveRows}</tbody></table></div>`:''}
${kevRows?`<div class="section"><h2>⚠️ CISA KEV Entries</h2><table><thead><tr><th>CVE ID</th><th>Vendor</th><th>Product</th><th>Vulnerability</th><th>Added</th></tr></thead><tbody>${kevRows}</tbody></table></div>`:''}
<div class="footer">CyberPanel SOC Dashboard — Confidential — ${new Date().toLocaleDateString('fr-FR')}</div>
</body></html>`;
}

router.get('/', authMiddleware, (req, res) => {
  const reports = db.prepare('SELECT id,title,type,generated_by,created_at FROM reports ORDER BY created_at DESC LIMIT 20').all();
  res.json(reports);
});

router.post('/generate', authMiddleware, (req, res) => {
  const { type='weekly', title } = req.body;
  const data   = buildReportData(type);
  const html   = renderHTML(data);
  const rTitle = title || `${type==='weekly'?'Weekly':'Monthly'} Report — ${new Date().toLocaleDateString('fr-FR')}`;
  const result = db.prepare('INSERT INTO reports (title,type,content,generated_by) VALUES (?,?,?,?)').run(rTitle, type, html, req.user.username);
  res.json({ id: result.lastInsertRowid, title: rTitle, message: 'Report generated' });
});

router.get('/:id/html', authMiddleware, (req, res) => {
  const report = db.prepare('SELECT * FROM reports WHERE id=?').get(req.params.id);
  if (!report) return res.status(404).json({ error: 'Report not found' });
  res.setHeader('Content-Type', 'text/html');
  res.send(report.content);
});

router.delete('/:id', authMiddleware, (req, res) => {
  db.prepare('DELETE FROM reports WHERE id=?').run(req.params.id);
  res.json({ message: 'Report deleted' });
});

module.exports = { router };
