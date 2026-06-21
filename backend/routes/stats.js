const express = require('express');
const { getDbProxy }     = require('../database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
const db     = getDbProxy();

router.get('/overview', authMiddleware, (req, res) => {
  const newsTotal    = db.prepare('SELECT COUNT(*) as c FROM news_cache').get()?.c||0;
  const newsLast24h  = db.prepare("SELECT COUNT(*) as c FROM news_cache WHERE fetched_at > datetime('now','-24 hours')").get()?.c||0;
  const cveTotal     = db.prepare('SELECT COUNT(*) as c FROM cve_cache').get()?.c||0;
  const cveCritical  = db.prepare("SELECT COUNT(*) as c FROM cve_cache WHERE severity='critical'").get()?.c||0;
  const cveHigh      = db.prepare("SELECT COUNT(*) as c FROM cve_cache WHERE severity='high'").get()?.c||0;
  const cveLast24h   = db.prepare("SELECT COUNT(*) as c FROM cve_cache WHERE published_at > datetime('now','-24 hours')").get()?.c||0;
  const bySeverity   = db.prepare('SELECT severity, COUNT(*) as count FROM cve_cache GROUP BY severity').all();
  const kevTotal     = db.prepare('SELECT COUNT(*) as c FROM kev_cache').get()?.c||0;
  const kevRecent    = db.prepare("SELECT COUNT(*) as c FROM kev_cache WHERE date_added > date('now','-7 days')").get()?.c||0;
  const alertsTotal  = db.prepare('SELECT COUNT(*) as c FROM alerts').get()?.c||0;
  const alertsUnread = db.prepare('SELECT COUNT(*) as c FROM alerts WHERE acknowledged=0').get()?.c||0;
  const alertsCrit   = db.prepare("SELECT COUNT(*) as c FROM alerts WHERE severity='critical' AND acknowledged=0").get()?.c||0;
  const topCVEs      = db.prepare('SELECT * FROM cve_cache WHERE cvss_score IS NOT NULL ORDER BY cvss_score DESC LIMIT 5').all();
  const recentKEV    = db.prepare('SELECT * FROM kev_cache ORDER BY date_added DESC LIMIT 5').all();
  const recentAlerts = db.prepare('SELECT * FROM alerts ORDER BY created_at DESC LIMIT 5').all();
  res.json({
    news:   { total: newsTotal, last24h: newsLast24h },
    cves:   { total: cveTotal, critical: cveCritical, high: cveHigh, last24h: cveLast24h, bySeverity },
    kev:    { total: kevTotal, recentWeek: kevRecent },
    alerts: { total: alertsTotal, unread: alertsUnread, critical: alertsCrit },
    topCVEs, recentKEV, recentAlerts,
  });
});

router.get('/timeline', authMiddleware, (req, res) => {
  const cveTimeline  = db.prepare("SELECT date(published_at) as day, severity, COUNT(*) as count FROM cve_cache WHERE published_at > datetime('now','-7 days') GROUP BY day, severity ORDER BY day ASC").all();
  const newsTimeline = db.prepare("SELECT date(fetched_at) as day, COUNT(*) as count FROM news_cache WHERE fetched_at > datetime('now','-7 days') GROUP BY day ORDER BY day ASC").all();
  res.json({ cveTimeline, newsTimeline });
});

router.get('/vendors', authMiddleware, (req, res) => {
  const vendors = db.prepare('SELECT vendor_project, COUNT(*) as count FROM kev_cache GROUP BY vendor_project ORDER BY count DESC LIMIT 15').all();
  res.json(vendors);
});

router.get('/severity', authMiddleware, (req, res) => {
  const cveSev  = db.prepare('SELECT severity, COUNT(*) as count FROM cve_cache GROUP BY severity').all();
  const newsSev = db.prepare('SELECT severity, COUNT(*) as count FROM news_cache GROUP BY severity').all();
  res.json({ cve: cveSev, news: newsSev });
});

module.exports = router;
