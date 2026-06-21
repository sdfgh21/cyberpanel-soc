const express = require('express');
const axios   = require('axios');
const { getDbProxy }     = require('../database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
const db     = getDbProxy();
const NVD    = 'https://services.nvd.nist.gov/rest/json/cves/2.0';

function mapSeverity(score) {
  if (!score) return 'unknown';
  if (score >= 9.0) return 'critical';
  if (score >= 7.0) return 'high';
  if (score >= 4.0) return 'medium';
  return 'low';
}

async function fetchRecentCVEs() {
  const now  = new Date();
  const past = new Date(now.getTime() - 7*24*60*60*1000);
  const pubStartDate = past.toISOString().replace('Z','+00:00');
  const pubEndDate   = now.toISOString().replace('Z','+00:00');
  try {
    const resp = await axios.get(NVD, { params: { pubStartDate, pubEndDate, resultsPerPage: 100 }, timeout: 15000 });
    let count = 0;
    for (const v of (resp.data.vulnerabilities || [])) {
      const cve  = v.cve;
      const desc = cve.descriptions?.find(d => d.lang==='en')?.value || '';
      const m    = cve.metrics;
      let cvssScore=null, cvssVector=null;
      if (m?.cvssMetricV31?.[0])      { cvssScore=m.cvssMetricV31[0].cvssData.baseScore; cvssVector=m.cvssMetricV31[0].cvssData.vectorString; }
      else if (m?.cvssMetricV30?.[0]) { cvssScore=m.cvssMetricV30[0].cvssData.baseScore; cvssVector=m.cvssMetricV30[0].cvssData.vectorString; }
      else if (m?.cvssMetricV2?.[0])  { cvssScore=m.cvssMetricV2[0].cvssData.baseScore;  cvssVector=m.cvssMetricV2[0].cvssData.vectorString; }
      const existing = db.prepare('SELECT id FROM cve_cache WHERE cve_id=?').get(cve.id);
      if (!existing) {
        db.prepare('INSERT INTO cve_cache (cve_id,description,cvss_score,cvss_vector,severity,published_at,modified_at) VALUES (?,?,?,?,?,?,?)')
          .run(cve.id, desc, cvssScore, cvssVector, mapSeverity(cvssScore), cve.published, cve.lastModified);
        count++;
      } else {
        db.prepare('UPDATE cve_cache SET cvss_score=?,cvss_vector=?,severity=?,modified_at=? WHERE cve_id=?')
          .run(cvssScore, cvssVector, mapSeverity(cvssScore), cve.lastModified, cve.id);
      }
    }
    db.prepare("DELETE FROM cve_cache WHERE fetched_at < datetime('now','-30 days')").run();
    console.log(`[CVE] Synced, ${count} new`);
    return count;
  } catch (err) { console.error('[CVE] NVD error:', err.message); throw err; }
}

router.get('/', authMiddleware, (req, res) => {
  const { page=1, limit=20, severity, search, minScore } = req.query;
  const offset = (parseInt(page)-1)*parseInt(limit);
  let where='1=1'; const params=[];
  if (severity) { where+=' AND severity=?';                                 params.push(severity); }
  if (search)   { where+=' AND (cve_id LIKE ? OR description LIKE ?)';      params.push(`%${search}%`,`%${search}%`); }
  if (minScore) { where+=' AND cvss_score>=?';                              params.push(parseFloat(minScore)); }
  const total = db.prepare(`SELECT COUNT(*) as count FROM cve_cache WHERE ${where}`).get(...params)?.count||0;
  const cves  = db.prepare(`SELECT * FROM cve_cache WHERE ${where} ORDER BY published_at DESC LIMIT ? OFFSET ?`).all(...params, parseInt(limit), offset);
  res.json({ cves, total, page: parseInt(page), pages: Math.ceil(total/parseInt(limit)) });
});

router.get('/stats', authMiddleware, (req, res) => {
  const bySeverity  = db.prepare('SELECT severity, COUNT(*) as count FROM cve_cache GROUP BY severity').all();
  const last24h     = db.prepare("SELECT COUNT(*) as count FROM cve_cache WHERE published_at > datetime('now','-24 hours')").get()?.count||0;
  const topCritical = db.prepare('SELECT * FROM cve_cache WHERE cvss_score IS NOT NULL ORDER BY cvss_score DESC LIMIT 10').all();
  res.json({ bySeverity, last24h, topCritical });
});

router.get('/search/:cveId', authMiddleware, async (req, res) => {
  const cveId  = req.params.cveId.toUpperCase();
  const cached = db.prepare('SELECT * FROM cve_cache WHERE cve_id=?').get(cveId);
  if (cached) return res.json(cached);
  try {
    const resp  = await axios.get(NVD, { params: { cveId }, timeout: 15000 });
    const vulns = resp.data.vulnerabilities || [];
    if (!vulns.length) return res.status(404).json({ error: 'CVE not found' });
    const cve   = vulns[0].cve;
    const desc  = cve.descriptions?.find(d => d.lang==='en')?.value || '';
    const m     = cve.metrics;
    let cvssScore=null, cvssVector=null;
    if (m?.cvssMetricV31?.[0]) { cvssScore=m.cvssMetricV31[0].cvssData.baseScore; cvssVector=m.cvssMetricV31[0].cvssData.vectorString; }
    res.json({ cve_id: cve.id, description: desc, cvss_score: cvssScore, cvss_vector: cvssVector,
      severity: mapSeverity(cvssScore), published_at: cve.published, modified_at: cve.lastModified, raw: cve });
  } catch (err) { res.status(500).json({ error: 'NVD API error: ' + err.message }); }
});

router.post('/refresh', authMiddleware, async (req, res) => {
  try { const c = await fetchRecentCVEs(); res.json({ message: `CVE refresh done, ${c} new` }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = { router, fetchRecentCVEs };
