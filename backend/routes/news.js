const express = require('express');
const Parser  = require('rss-parser');
const { getDbProxy }     = require('../database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
const db     = getDbProxy();
const parser = new Parser({ timeout: 10000, headers: { 'User-Agent': 'CyberPanel/2.1 RSS Reader' } });

const RSS_SOURCES = [
  { name: 'BleepingComputer',     url: 'https://www.bleepingcomputer.com/feed/' },
  { name: 'The Hacker News',      url: 'https://feeds.feedburner.com/TheHackersNews' },
  { name: 'Dark Reading',         url: 'https://www.darkreading.com/rss.xml' },
  { name: 'CISA Alerts',          url: 'https://www.cisa.gov/news.xml' },
  { name: 'Krebs on Security',    url: 'https://krebsonsecurity.com/feed/' },
  { name: 'Schneier on Security', url: 'https://www.schneier.com/feed/atom' },
];

function guessSeverity(title, summary) {
  const text = (title + ' ' + (summary || '')).toLowerCase();
  if (text.match(/critical|zero.?day|actively exploit|ransomware|nation.?state|apt/)) return 'critical';
  if (text.match(/high|remote code|rce|privilege escal|data breach|malware/)) return 'high';
  if (text.match(/medium|vulnerab|patch|cve|exploit/)) return 'medium';
  return 'low';
}

async function fetchAndCacheNews() {
  let totalNew = 0;
  for (const source of RSS_SOURCES) {
    try {
      const feed = await parser.parseURL(source.url);
      for (const item of feed.items.slice(0, 30)) {
        const existing = db.prepare('SELECT id FROM news_cache WHERE link=?').get(item.link);
        if (!existing) {
          db.prepare('INSERT INTO news_cache (source,title,link,summary,published_at,severity) VALUES (?,?,?,?,?,?)')
            .run(source.name, item.title, item.link, item.contentSnippet?.slice(0,500)||'',
              item.pubDate||new Date().toISOString(), guessSeverity(item.title, item.contentSnippet));
          totalNew++;
        }
      }
      console.log(`[News] ✓ ${source.name}`);
    } catch (err) { console.error(`[News] ✗ ${source.name}:`, err.message); }
  }
  db.prepare("DELETE FROM news_cache WHERE fetched_at < datetime('now','-7 days')").run();
  return totalNew;
}

router.get('/', authMiddleware, (req, res) => {
  const { page=1, limit=20, source, severity, search } = req.query;
  const offset = (parseInt(page)-1)*parseInt(limit);
  let where='1=1'; const params=[];
  if (source)   { where+=' AND source=?';                             params.push(source); }
  if (severity) { where+=' AND severity=?';                           params.push(severity); }
  if (search)   { where+=' AND (title LIKE ? OR summary LIKE ?)';     params.push(`%${search}%`,`%${search}%`); }
  const total = db.prepare(`SELECT COUNT(*) as count FROM news_cache WHERE ${where}`).get(...params)?.count||0;
  const news  = db.prepare(`SELECT * FROM news_cache WHERE ${where} ORDER BY published_at DESC LIMIT ? OFFSET ?`).all(...params, parseInt(limit), offset);
  res.json({ news, total, page: parseInt(page), pages: Math.ceil(total/parseInt(limit)) });
});

router.post('/refresh', authMiddleware, async (req, res) => {
  try { const c = await fetchAndCacheNews(); res.json({ message: `Refreshed, ${c} new articles` }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/sources', authMiddleware, (req, res) => res.json(RSS_SOURCES.map(s => s.name)));

module.exports = { router, fetchAndCacheNews };
