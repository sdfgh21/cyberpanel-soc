const express = require('express');
const { getDbProxy }     = require('../database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
const db     = getDbProxy();

router.get('/summary', authMiddleware, (req, res) => {
  const total       = db.prepare('SELECT COUNT(*) as c FROM assets').get()?.c||0;
  const byCrit      = db.prepare('SELECT criticality, COUNT(*) as c FROM assets GROUP BY criticality').all();
  const byType      = db.prepare('SELECT asset_type, COUNT(*) as c FROM assets GROUP BY asset_type').all();
  const mostExposed = db.prepare('SELECT a.*,COUNT(l.id) as cve_count FROM assets a LEFT JOIN asset_cve_links l ON a.id=l.asset_id AND l.status="open" GROUP BY a.id ORDER BY cve_count DESC LIMIT 5').all();
  res.json({ total, byCriticality: byCrit, byType, mostExposed });
});

router.get('/', authMiddleware, (req, res) => {
  const { search, criticality } = req.query;
  let where='1=1'; const params=[];
  if (search)      { where+=' AND (name LIKE ? OR ip LIKE ? OR hostname LIKE ?)'; params.push(`%${search}%`,`%${search}%`,`%${search}%`); }
  if (criticality) { where+=' AND criticality=?'; params.push(criticality); }
  const assets = db.prepare(`SELECT * FROM assets WHERE ${where} ORDER BY criticality DESC, name ASC`).all(...params);
  const enriched = assets.map(a => ({
    ...a, tags: JSON.parse(a.tags||'[]'),
    cve_count: db.prepare('SELECT COUNT(*) as c FROM asset_cve_links WHERE asset_id=? AND status="open"').get(a.id)?.c||0
  }));
  res.json(enriched);
});

router.post('/', authMiddleware, (req, res) => {
  const { name, ip, hostname, os, asset_type, criticality, owner, tags, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const result = db.prepare('INSERT INTO assets (name,ip,hostname,os,asset_type,criticality,owner,tags,notes,created_by) VALUES (?,?,?,?,?,?,?,?,?,?)')
    .run(name, ip||null, hostname||null, os||null, asset_type||'server', criticality||'medium', owner||null, JSON.stringify(tags||[]), notes||null, req.user.username);
  res.status(201).json({ id: result.lastInsertRowid, message: 'Asset created' });
});

router.put('/:id', authMiddleware, (req, res) => {
  const { name, ip, hostname, os, asset_type, criticality, owner, tags, notes } = req.body;
  db.prepare('UPDATE assets SET name=?,ip=?,hostname=?,os=?,asset_type=?,criticality=?,owner=?,tags=?,notes=?,updated_at=CURRENT_TIMESTAMP WHERE id=?')
    .run(name, ip||null, hostname||null, os||null, asset_type||'server', criticality||'medium', owner||null, JSON.stringify(tags||[]), notes||null, req.params.id);
  res.json({ message: 'Asset updated' });
});

router.delete('/:id', authMiddleware, (req, res) => {
  db.prepare('DELETE FROM asset_cve_links WHERE asset_id=?').run(req.params.id);
  db.prepare('DELETE FROM assets WHERE id=?').run(req.params.id);
  res.json({ message: 'Asset deleted' });
});

router.get('/:id/cves', authMiddleware, (req, res) => {
  const links = db.prepare('SELECT l.*,c.description,c.cvss_score,c.severity FROM asset_cve_links l LEFT JOIN cve_cache c ON l.cve_id=c.cve_id WHERE l.asset_id=? ORDER BY c.cvss_score DESC').all(req.params.id);
  res.json(links);
});

router.post('/:id/cves', authMiddleware, (req, res) => {
  const { cve_id } = req.body;
  if (!cve_id) return res.status(400).json({ error: 'cve_id required' });
  const ex = db.prepare('SELECT id FROM asset_cve_links WHERE asset_id=? AND cve_id=?').get(req.params.id, cve_id);
  if (ex) return res.status(409).json({ error: 'Already linked' });
  db.prepare('INSERT INTO asset_cve_links (asset_id,cve_id) VALUES (?,?)').run(req.params.id, cve_id);
  res.status(201).json({ message: 'CVE linked' });
});

router.patch('/:id/cves/:cveId', authMiddleware, (req, res) => {
  db.prepare('UPDATE asset_cve_links SET status=? WHERE asset_id=? AND cve_id=?').run(req.body.status, req.params.id, req.params.cveId);
  res.json({ message: 'Status updated' });
});

module.exports = { router };
