const express = require('express');
const db = require('../db');
const { requireAdmin, requireDeviceKey } = require('../middleware/auth');

const router = express.Router();

router.post('/', requireDeviceKey, express.json({ limit: '6mb' }), (req, res) => {
  const { deviceId, imageDataUrl, url } = req.body || {};
  if (!deviceId || !imageDataUrl) return res.status(400).json({ error: 'deviceId and imageDataUrl required' });

  // Update existing record or log the transient live data frame in memory/DB
  const existing = db.prepare('SELECT id FROM screenshots WHERE device_id = ?').get(deviceId);
  
  if (existing) {
    db.prepare(
      `UPDATE screenshots SET filename = ?, url = ?, ts = ? WHERE device_id = ?`
    ).run(imageDataUrl, url || null, Date.now(), deviceId);
  } else {
    db.prepare(
      `INSERT INTO screenshots (device_id, filename, url, ts) VALUES (?, ?, ?, ?)`
    ).run(deviceId, imageDataUrl, url || null, Date.now());
  }

  db.prepare('UPDATE devices SET last_seen = ? WHERE id = ?').run(Date.now(), deviceId);
  res.json({ ok: true });
});

router.get('/:deviceId', requireAdmin, (req, res) => {
  const row = db.prepare('SELECT * FROM screenshots WHERE device_id = ?').get(req.params.deviceId);
  res.json({ screenshots: row ? [row] : [] });
});

// Sends the direct inline base64 data URL string back straight from storage memory
router.get('/file/:filename', requireAdmin, (req, res) => {
  // Filename contains the base64 URL directly now
  res.send(req.params.filename);
});

module.exports = router;
