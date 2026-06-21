// ── Alert Rules ───────────────────────────────────────────────
const express = require('express');
const { getDbProxy }     = require('../database');
const { authMiddleware } = require('../middleware/auth');

const rulesRouter    = express.Router();
const threatmapRouter= express.Router();
const db             = getDbProxy();

// ── Rules ─────────────────────────────────────────────────────
rulesRouter.get('/', authMiddleware, (req, res) => {
  const rules = db.prepare('SELECT * FROM alert_rules ORDER BY created_at DESC').all();
  res.json(rules.map(r => ({ ...r, conditions: JSON.parse(r.conditions||'[]'), actions: JSON.parse(r.actions||'[]') })));
});

rulesRouter.post('/', authMiddleware, (req, res) => {
  const { name, description, source, conditions, actions, enabled } = req.body;
  if (!name||!conditions||!actions) return res.status(400).json({ error: 'name, conditions, actions required' });
  const result = db.prepare('INSERT INTO alert_rules (name,description,source,conditions,actions,enabled,created_by) VALUES (?,?,?,?,?,?,?)')
    .run(name, description||'', source||'cve', JSON.stringify(conditions), JSON.stringify(actions), enabled?1:0, req.user.username);
  res.status(201).json({ id: result.lastInsertRowid, message: 'Rule created' });
});

rulesRouter.put('/:id', authMiddleware, (req, res) => {
  const { name, description, source, conditions, actions, enabled } = req.body;
  db.prepare('UPDATE alert_rules SET name=?,description=?,source=?,conditions=?,actions=?,enabled=?,updated_at=CURRENT_TIMESTAMP WHERE id=?')
    .run(name, description||'', source||'cve', JSON.stringify(conditions), JSON.stringify(actions), enabled?1:0, req.params.id);
  res.json({ message: 'Rule updated' });
});

rulesRouter.delete('/:id', authMiddleware, (req, res) => {
  db.prepare('DELETE FROM alert_rules WHERE id=?').run(req.params.id);
  res.json({ message: 'Rule deleted' });
});

rulesRouter.patch('/:id/toggle', authMiddleware, (req, res) => {
  const rule = db.prepare('SELECT * FROM alert_rules WHERE id=?').get(req.params.id);
  if (!rule) return res.status(404).json({ error: 'Rule not found' });
  db.prepare('UPDATE alert_rules SET enabled=? WHERE id=?').run(rule.enabled?0:1, req.params.id);
  res.json({ message: `Rule ${rule.enabled?'disabled':'enabled'}`, enabled: !rule.enabled });
});

rulesRouter.get('/logs', authMiddleware, (req, res) => {
  const logs = db.prepare('SELECT * FROM rule_logs ORDER BY triggered_at DESC LIMIT 100').all();
  res.json(logs);
});

// ── Threat Map ────────────────────────────────────────────────
const COUNTRY_COORDS = {
  US:{lat:37.09,lng:-95.71},CN:{lat:35.86,lng:104.19},RU:{lat:61.52,lng:105.31},
  DE:{lat:51.16,lng:10.45},GB:{lat:55.37,lng:-3.43},FR:{lat:46.22,lng:2.21},
  NL:{lat:52.13,lng:5.29},JP:{lat:36.20,lng:138.25},KR:{lat:35.90,lng:127.76},
  BR:{lat:-14.23,lng:-51.92},IN:{lat:20.59,lng:78.96},CA:{lat:56.13,lng:-106.34},
  AU:{lat:-25.27,lng:133.77},SG:{lat:1.35,lng:103.81},UA:{lat:48.37,lng:31.16},
  IR:{lat:32.42,lng:53.68},TR:{lat:38.96,lng:35.24},PL:{lat:51.91,lng:19.14},
};

threatmapRouter.get('/data', authMiddleware, (req, res) => {
  const iocByCountry = db.prepare('SELECT country, COUNT(*) as count, SUM(CASE WHEN confidence>=75 THEN 1 ELSE 0 END) as high_conf FROM ioc_cache WHERE country IS NOT NULL AND country != "" GROUP BY country ORDER BY count DESC LIMIT 30').all();
  const kevStats     = db.prepare('SELECT vendor_project, COUNT(*) as count FROM kev_cache GROUP BY vendor_project ORDER BY count DESC LIMIT 15').all();
  const cveStats     = db.prepare("SELECT severity, COUNT(*) as count FROM cve_cache WHERE published_at > datetime('now','-7 days') GROUP BY severity").all();
  const recentThreats= db.prepare("SELECT type,title,severity,created_at FROM alerts WHERE severity IN ('critical','high') ORDER BY created_at DESC LIMIT 10").all();
  const mapPoints    = iocByCountry.filter(c => COUNTRY_COORDS[c.country]).map(c => ({
    country: c.country, lat: COUNTRY_COORDS[c.country].lat, lng: COUNTRY_COORDS[c.country].lng,
    count: c.count, highConf: c.high_conf, intensity: Math.min(1, c.count/50),
  }));
  res.json({
    mapPoints, kevStats, cveStats, recentThreats,
    totalIOCs:    db.prepare('SELECT COUNT(*) as c FROM ioc_cache').get()?.c||0,
    totalCVEs:    db.prepare('SELECT COUNT(*) as c FROM cve_cache').get()?.c||0,
    totalKEV:     db.prepare('SELECT COUNT(*) as c FROM kev_cache').get()?.c||0,
    criticalCVEs: db.prepare("SELECT COUNT(*) as c FROM cve_cache WHERE severity='critical'").get()?.c||0,
  });
});

module.exports = { rulesRouter, threatmapRouter };
