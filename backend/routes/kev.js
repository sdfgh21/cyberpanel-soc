const express = require('express');
const axios   = require('axios');
const { getDbProxy }     = require('../database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
const db     = getDbProxy();
const CISA_KEV_URL = 'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json';

async function fetchKEV() {
  const resp = await axios.get(CISA_KEV_URL, { timeout: 15000 });
  let count = 0;
  for (const v of (resp.data.vulnerabilities || [])) {
    const existing = db.prepare('SELECT id FROM kev_cache WHERE cve_id=?').get(v.cveID);
    if (!existing) {
      db.prepare('INSERT INTO kev_cache (cve_id,vendor_project,product,vulnerability_name,date_added,short_description,required_action,due_date) VALUES (?,?,?,?,?,?,?,?)')
        .run(v.cveID, v.vendorProject, v.product, v.vulnerabilityName, v.dateAdded, v.shortDescription, v.requiredAction, v.dueDate);
      count++;
    }
  }
  console.log(`[KEV] Synced, ${count} new`);
  return count;
}

router.get('/', authMiddleware, (req, res) => {
  const { page=1, limit=20, search } = req.query;
  const offset = (parseInt(page)-1)*parseInt(limit);
  let where='1=1'; const params=[];
  if (search) { where+=' AND (cve_id LIKE ? OR vulnerability_name LIKE ? OR product LIKE ? OR vendor_project LIKE ?)'; params.push(`%${search}%`,`%${search}%`,`%${search}%`,`%${search}%`); }
  const total = db.prepare(`SELECT COUNT(*) as count FROM kev_cache WHERE ${where}`).get(...params)?.count||0;
  const kevs  = db.prepare(`SELECT * FROM kev_cache WHERE ${where} ORDER BY date_added DESC LIMIT ? OFFSET ?`).all(...params, parseInt(limit), offset);
  res.json({ kevs, total, page: parseInt(page), pages: Math.ceil(total/parseInt(limit)) });
});

router.get('/stats', authMiddleware, (req, res) => {
  const total      = db.prepare('SELECT COUNT(*) as count FROM kev_cache').get()?.count||0;
  const recent     = db.prepare("SELECT COUNT(*) as count FROM kev_cache WHERE date_added > date('now','-30 days')").get()?.count||0;
  const topVendors = db.prepare('SELECT vendor_project, COUNT(*) as count FROM kev_cache GROUP BY vendor_project ORDER BY count DESC LIMIT 10').all();
  const dueSoon    = db.prepare("SELECT * FROM kev_cache WHERE due_date BETWEEN date('now') AND date('now','+14 days') ORDER BY due_date ASC").all();
  const overdue    = db.prepare("SELECT COUNT(*) as count FROM kev_cache WHERE due_date < date('now')").get()?.count||0;
  res.json({ total, recentLast30Days: recent, topVendors, dueSoon, overdue });
});

router.post('/refresh', authMiddleware, async (req, res) => {
  try { const c = await fetchKEV(); res.json({ message: `KEV refresh done, ${c} new` }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = { router, fetchKEV };
