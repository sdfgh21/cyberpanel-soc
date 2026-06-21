const express = require('express');
const axios   = require('axios');
const { getDbProxy }     = require('../database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
const db     = getDbProxy();

async function sendDiscordAlert(message, severity='high') {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) return;
  const colors = { critical:0xFF0000, high:0xFF6600, medium:0xFFAA00, low:0x00AA00 };
  try {
    await axios.post(webhookUrl, {
      embeds: [{ title:'🚨 CyberPanel Alert', description: message,
        color: colors[severity]||colors.high, timestamp: new Date().toISOString(),
        footer: { text: 'CyberPanel SOC Dashboard' } }]
    });
  } catch (err) { console.error('[Discord] Webhook error:', err.message); }
}

router.get('/', authMiddleware, (req, res) => {
  const { page=1, limit=30, severity, acknowledged, type } = req.query;
  const offset = (parseInt(page)-1)*parseInt(limit);
  let where='1=1'; const params=[];
  if (severity) { where+=' AND severity=?'; params.push(severity); }
  if (acknowledged !== undefined && acknowledged !== 'all') { where+=' AND acknowledged=?'; params.push(acknowledged==='true'?1:0); }
  if (type)     { where+=' AND type=?'; params.push(type); }
  const total  = db.prepare(`SELECT COUNT(*) as count FROM alerts WHERE ${where}`).get(...params)?.count||0;
  const unread = db.prepare('SELECT COUNT(*) as count FROM alerts WHERE acknowledged=0').get()?.count||0;
  const alerts = db.prepare(`SELECT * FROM alerts WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`).all(...params, parseInt(limit), offset);
  res.json({ alerts, total, unread, page: parseInt(page), pages: Math.ceil(total/parseInt(limit)) });
});

router.post('/:id/acknowledge', authMiddleware, (req, res) => {
  db.prepare('UPDATE alerts SET acknowledged=1,acknowledged_at=CURRENT_TIMESTAMP,acknowledged_by=? WHERE id=?').run(req.user.username, req.params.id);
  res.json({ message: 'Alert acknowledged' });
});

router.post('/acknowledge-all', authMiddleware, (req, res) => {
  db.prepare('UPDATE alerts SET acknowledged=1,acknowledged_at=CURRENT_TIMESTAMP,acknowledged_by=? WHERE acknowledged=0').run(req.user.username);
  res.json({ message: 'All alerts acknowledged' });
});

router.post('/test-discord', authMiddleware, async (req, res) => {
  try { await sendDiscordAlert('🔔 Test alert from CyberPanel! Discord webhook working.', 'medium'); res.json({ message: 'Discord test sent' }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', authMiddleware, (req, res) => {
  db.prepare('DELETE FROM alerts WHERE id=?').run(req.params.id);
  res.json({ message: 'Alert deleted' });
});

module.exports = { router, sendDiscordAlert };
