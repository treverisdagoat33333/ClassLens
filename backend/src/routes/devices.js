const express = require('express');
const db = require('../db');
const { requireAdmin, requireDeviceKey } = require('../middleware/auth');

const router = express.Router();
const OFFLINE_THRESHOLD_MS = Number(process.env.OFFLINE_THRESHOLD_MS || 90000);

// Ensure the action column exists in the database on boot
try {
  db.prepare("ALTER TABLE devices ADD COLUMN pending_action TEXT").run();
} catch (e) {
  // Column already exists, safe to ignore
}

// Device Polling: Heartbeat + Register combined. Returns pending commands.
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

  // Send back any actions the admin requested, then clear them
  const dev = db.prepare('SELECT pending_action FROM devices WHERE id = ?').get(deviceId);
  if (dev && dev.pending_action) {
    db.prepare('UPDATE devices SET pending_action = NULL WHERE id = ?').run(deviceId);
    return res.json({ ok: true, action: JSON.parse(dev.pending_action) });
  }

  res.json({ ok: true, action: null });
});

router.post('/heartbeat', requireDeviceKey, (req, res) => {
  const { deviceId } = req.body || {};
  if (!deviceId) return res.status(400).json({ error: 'deviceId required' });
  
  db.prepare('UPDATE devices SET last_seen = ?, last_ip = ? WHERE id = ?').run(Date.now(), req.ip, deviceId);
  
  const dev = db.prepare('SELECT pending_action FROM devices WHERE id = ?').get(deviceId);
  if (dev && dev.pending_action) {
    db.prepare('UPDATE devices SET pending_action = NULL WHERE id = ?').run(deviceId);
    return res.json({ ok: true, action: JSON.parse(dev.pending_action) });
  }
  res.json({ ok: true, action: null });
});

// Admin command: Queue a tab close or tab open command
router.post('/:id/command', requireAdmin, (req, res) => {
  const { type, url } = req.body || {}; // type: 'close' or 'open'
  const actionObj = JSON.stringify({ type, url });
  db.prepare('UPDATE devices SET pending_action = ? WHERE id = ?').run(actionObj, req.params.id);
  res.json({ ok: true });
});

// Standard dashboard fetches
router.get('/', requireAdmin, (req, res) => {
  const rows = db.prepare('SELECT * FROM devices ORDER BY last_seen DESC').all();
  const now = Date.now();
  res.json({ devices: rows.map(d => ({ ...d, online: d.last_seen ? now - d.last_seen < OFFLINE_THRESHOLD_MS : false })) });
});

router.get('/:id', requireAdmin, (req, res) => {
  const device = db.prepare('SELECT * FROM devices WHERE id = ?').get(req.params.id);
  if (!device) return res.status(404).json({ error: 'Not found' });
  res.json({ device: { ...device, online: device.last_seen ? Date.now() - device.last_seen < OFFLINE_THRESHOLD_MS : false } });
});

router.delete('/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM devices WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
