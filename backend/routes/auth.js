const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { getDbProxy }     = require('../database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
const db     = getDbProxy();
const SECRET = () => process.env.JWT_SECRET || 'cyberpanel_soc_stable_secret_key_2026_do_not_change';

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  const user = db.prepare('SELECT * FROM users WHERE username=? OR email=?').get(username, username);
  if (!user || !bcrypt.compareSync(password, user.password))
    return res.status(401).json({ error: 'Invalid credentials' });
  db.prepare('UPDATE users SET last_login=CURRENT_TIMESTAMP WHERE id=?').run(user.id);
  const token = jwt.sign({ id: user.id, username: user.username, email: user.email, role: user.role }, SECRET(), { expiresIn: '24h' });
  res.json({ token, user: { id: user.id, username: user.username, email: user.email, role: user.role } });
});

router.post('/register', (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) return res.status(400).json({ error: 'All fields required' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  const existing = db.prepare('SELECT id FROM users WHERE username=? OR email=?').get(username, email);
  if (existing) return res.status(409).json({ error: 'Username or email already exists' });
  const hashed = bcrypt.hashSync(password, 10);
  const result = db.prepare('INSERT INTO users (username,email,password) VALUES (?,?,?)').run(username, email, hashed);
  const token = jwt.sign({ id: result.lastInsertRowid, username, email, role: 'analyst' }, SECRET(), { expiresIn: '24h' });
  res.status(201).json({ token, user: { id: result.lastInsertRowid, username, email, role: 'analyst' } });
});

router.get('/me', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT id,username,email,role,created_at,last_login FROM users WHERE id=?').get(req.user.id);
  res.json(user);
});

router.post('/change-password', authMiddleware, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE id=?').get(req.user.id);
  if (!bcrypt.compareSync(currentPassword, user.password))
    return res.status(401).json({ error: 'Current password incorrect' });
  db.prepare('UPDATE users SET password=? WHERE id=?').run(bcrypt.hashSync(newPassword, 10), req.user.id);
  res.json({ message: 'Password changed successfully' });
});

module.exports = router;
