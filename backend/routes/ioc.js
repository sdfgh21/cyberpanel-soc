const express = require('express');
const axios   = require('axios');
const { getDbProxy }     = require('../database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
const db     = getDbProxy();

async function fetchThreatFoxRecent() {
  try {
    const { data } = await axios.post('https://threatfox-api.abuse.ch/api/v1/', { query:'get_iocs', days:3 }, { timeout:15000 });
    let count = 0;
    for (const ioc of (data.data||[])) {
      if (!ioc.ioc_value) continue;
      const ex = db.prepare('SELECT id FROM ioc_cache WHERE value=?').get(ioc.ioc_value);
      if (!ex) {
        db.prepare('INSERT INTO ioc_cache (type,value,source,threat_type,confidence,last_seen) VALUES (?,?,?,?,?,?)')
          .run(ioc.ioc_type||'unknown', ioc.ioc_value, 'ThreatFox', ioc.threat_type||'', ioc.confidence_level||50, ioc.first_seen||new Date().toISOString());
        count++;
      }
    }
    db.prepare("DELETE FROM ioc_cache WHERE fetched_at < datetime('now','-14 days')").run();
    return count;
  } catch (err) { console.error('[IOC] ThreatFox error:', err.message); return 0; }
}

router.get('/', authMiddleware, (req, res) => {
  const { page=1, limit=30, type, search } = req.query;
  const offset = (parseInt(page)-1)*parseInt(limit);
  let where='1=1'; const params=[];
  if (type)   { where+=' AND type=?';                                             params.push(type); }
  if (search) { where+=' AND (value LIKE ? OR threat_type LIKE ?)';               params.push(`%${search}%`,`%${search}%`); }
  const total = db.prepare(`SELECT COUNT(*) as count FROM ioc_cache WHERE ${where}`).get(...params)?.count||0;
  const iocs  = db.prepare(`SELECT * FROM ioc_cache WHERE ${where} ORDER BY fetched_at DESC LIMIT ? OFFSET ?`).all(...params, parseInt(limit), offset);
  res.json({ iocs, total, page: parseInt(page), pages: Math.ceil(total/parseInt(limit)) });
});

router.get('/stats', authMiddleware, (req, res) => {
  const byType   = db.prepare('SELECT type, COUNT(*) as count FROM ioc_cache GROUP BY type').all();
  const bySource = db.prepare('SELECT source, COUNT(*) as count FROM ioc_cache GROUP BY source ORDER BY count DESC').all();
  const highConf = db.prepare('SELECT COUNT(*) as count FROM ioc_cache WHERE confidence>=75').get()?.count||0;
  const recent   = db.prepare("SELECT COUNT(*) as count FROM ioc_cache WHERE fetched_at > datetime('now','-24 hours')").get()?.count||0;
  res.json({ byType, bySource, highConfidence: highConf, last24h: recent });
});

router.post('/lookup', authMiddleware, async (req, res) => {
  const { indicator } = req.body;
  if (!indicator) return res.status(400).json({ error: 'indicator required' });
  const results = {};
  const isIP   = /^\d{1,3}(\.\d{1,3}){3}$/.test(indicator);
  const isHash = /^[a-fA-F0-9]{32,64}$/.test(indicator);
  const key    = process.env.ABUSEIPDB_API_KEY;
  if (isIP && key) {
    try {
      const { data } = await axios.get('https://api.abuseipdb.com/api/v2/check',
        { headers: { Key: key, Accept: 'application/json' }, params: { ipAddress: indicator, maxAgeInDays: 90 }, timeout: 10000 });
      results.abuseipdb = data.data;
    } catch (e) { results.abuseipdb = { error: e.message }; }
  }
  res.json({ indicator, type: isIP?'ip':isHash?'hash':'domain', results });
});

router.post('/refresh', authMiddleware, async (req, res) => {
  try { const c = await fetchThreatFoxRecent(); res.json({ message: `IOC refresh done, ${c} new` }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = { router, fetchThreatFoxRecent };
