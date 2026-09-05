const express = require('express');
const db = require('../db');
const { requireAdmin, requireDeviceKey } = require('../middleware/auth');

const router = express.Router();

const OFFLINE_THRESHOLD_MS = Number(process.env.OFFLINE_THRESHOLD_MS || 90000);

router.post('/register', requireDeviceKey, (req, res) => {
  const { deviceId, label, studentName, classroom } = req.body || {};
  if (!deviceId) return res.status(400).json({ error: 'deviceId required' });

  const existing = db.prepare('SELECT * FROM devices WHERE id = ?').get(deviceId);
  const now = Date.now();
  const ip = req.ip;

  if (existing) {
    db.prepare(
      `UPDATE devices SET label = ?, student_name = ?, classroom = ?, last_seen = ?, last_ip = ? WHERE id = ?`
    ).run(label || existing.label, studentName ?? existing.student_name, classroom ?? existing.classroom, now, ip, deviceId);
  } else {
    db.prepare(
      `INSERT INTO devices (id, label, student_name, classroom, registered_at, last_seen, last_ip)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(deviceId, label || deviceId, studentName || null, classroom || null, now, now, ip);
  }
  res.json({ ok: true });
});

router.post('/heartbeat', requireDeviceKey, (req, res) => {
  const { deviceId } = req.body || {};
  if (!deviceId) return res.status(400).json({ error: 'deviceId required' });
  db.prepare('UPDATE devices SET last_seen = ?, last_ip = ? WHERE id = ?').run(Date.now(), req.ip, deviceId);
  res.json({ ok: true });
});

router.get('/', requireAdmin, (req, res) => {
  const rows = db.prepare('SELECT * FROM devices ORDER BY last_seen DESC').all();
  const now = Date.now();
  const devices = rows.map((d) => ({
    ...d,
    online: d.last_seen ? now - d.last_seen < OFFLINE_THRESHOLD_MS : false,
  }));
  res.json({ devices });
});

router.get('/:id', requireAdmin, (req, res) => {
  const device = db.prepare('SELECT * FROM devices WHERE id = ?').get(req.params.id);
  if (!device) return res.status(404).json({ error: 'Not found' });
  const now = Date.now();
  res.json({ device: { ...device, online: device.last_seen ? now - device.last_seen < OFFLINE_THRESHOLD_MS : false } });
});

router.delete('/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM devices WHERE id = ?').run(req.params.id);
  db.prepare('DELETE FROM activity WHERE device_id = ?').run(req.params.id);
  db.prepare('DELETE FROM screenshots WHERE device_id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
