const express = require('express');
const db = require('../db');
const { requireAdmin, requireDeviceKey } = require('../middleware/auth');

const router = express.Router();

// Device reports a tab-focus / navigation / block event.
router.post('/', requireDeviceKey, (req, res) => {
  const { deviceId, url, title, eventType } = req.body || {};
  if (!deviceId || !eventType) return res.status(400).json({ error: 'deviceId and eventType required' });

  db.prepare(
    `INSERT INTO activity (device_id, url, title, event_type, ts) VALUES (?, ?, ?, ?, ?)`
  ).run(deviceId, url || null, title || null, eventType, Date.now());

  db.prepare('UPDATE devices SET last_seen = ? WHERE id = ?').run(Date.now(), deviceId);
  res.json({ ok: true });
});

// Admin: activity log for one device
router.get('/:deviceId', requireAdmin, (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 200, 1000);
  const rows = db
    .prepare('SELECT * FROM activity WHERE device_id = ? ORDER BY ts DESC LIMIT ?')
    .all(req.params.deviceId, limit);
  res.json({ activity: rows });
});

// Admin: recent blocked-site alerts across all devices
router.get('/', requireAdmin, (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 100, 500);
  const rows = db
    .prepare(
      `SELECT activity.*, devices.label AS device_label FROM activity
       JOIN devices ON devices.id = activity.device_id
       WHERE event_type = 'blocked'
       ORDER BY ts DESC LIMIT ?`
    )
    .all(limit);
  res.json({ alerts: rows });
});

module.exports = router;
