const express = require('express');
const db = require('../db');
const { requireAdmin, requireDeviceKey } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireDeviceKey, (req, res) => {
  const rows = db.prepare('SELECT pattern, reason FROM blocklist').all();
  res.json({ blocklist: rows });
});

router.get('/admin', requireAdmin, (req, res) => {
  const rows = db.prepare('SELECT * FROM blocklist ORDER BY created_at DESC').all();
  res.json({ blocklist: rows });
});

router.post('/admin', requireAdmin, (req, res) => {
  const { pattern, reason } = req.body || {};
  if (!pattern) return res.status(400).json({ error: 'pattern required' });
  db.prepare('INSERT OR IGNORE INTO blocklist (pattern, reason, created_at) VALUES (?, ?, ?)').run(
    pattern.trim().toLowerCase(),
    reason || null,
    Date.now()
  );
  res.json({ ok: true });
});

router.delete('/admin/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM blocklist WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
