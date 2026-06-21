const express = require('express');
const axios   = require('axios');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

async function sendTelegram(message) {
  const token  = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return { error: 'TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set in Railway Variables' };
  try {
    const { data } = await axios.post(`https://api.telegram.org/bot${token}/sendMessage`,
      { chat_id: chatId, text: message, parse_mode: 'HTML' }, { timeout: 10000 });
    return { ok: true, result: data };
  } catch (err) { return { error: err.response?.data?.description || err.message }; }
}

router.post('/test', authMiddleware, async (req, res) => {
  const result = await sendTelegram('🛡️ <b>CyberPanel Test Alert</b>\n\nYour Telegram bot is working!\n\n<i>CyberPanel SOC Dashboard</i>');
  if (result.error) return res.status(400).json({ error: result.error });
  res.json({ message: 'Telegram test sent!' });
});

router.post('/send', authMiddleware, async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'message required' });
  const result = await sendTelegram(message);
  if (result.error) return res.status(400).json({ error: result.error });
  res.json({ message: 'Sent!' });
});

router.get('/status', authMiddleware, (req, res) => {
  res.json({
    configured: !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),
    bot_token_set: !!process.env.TELEGRAM_BOT_TOKEN,
    chat_id_set:   !!process.env.TELEGRAM_CHAT_ID,
  });
});

module.exports = { router, sendTelegram };
