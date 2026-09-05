const express = require('express');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { requireAdmin, requireDeviceKey } = require('../middleware/auth');

const router = express.Router();

const SCREENSHOT_DIR = path.resolve(process.env.SCREENSHOT_DIR || './data/screenshots');
if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

// Device uploads a screenshot as a base64 JPEG/PNG data URL.
// Kept as periodic snapshots (not a live stream) to keep bandwidth/CPU low on
// 8GB Chromebooks and to make it obvious in the code that this isn't screen mirroring.
router.post('/', requireDeviceKey, express.json({ limit: '6mb' }), (req, res) => {
  const { deviceId, imageDataUrl, url } = req.body || {};
  if (!deviceId || !imageDataUrl) return res.status(400).json({ error: 'deviceId and imageDataUrl required' });

  const match = /^data:image\/(png|jpeg);base64,(.+)$/.exec(imageDataUrl);
  if (!match) return res.status(400).json({ error: 'imageDataUrl must be a base64 PNG or JPEG data URL' });

  const ext = match[1] === 'jpeg' ? 'jpg' : 'png';
  const buffer = Buffer.from(match[2], 'base64');
  const filename = `${deviceId}_${Date.now()}_${uuidv4().slice(0, 8)}.${ext}`;
  fs.writeFileSync(path.join(SCREENSHOT_DIR, filename), buffer);

  db.prepare(
    `INSERT INTO screenshots (device_id, filename, url, ts) VALUES (?, ?, ?, ?)`
  ).run(deviceId, filename, url || null, Date.now());

  db.prepare('UPDATE devices SET last_seen = ? WHERE id = ?').run(Date.now(), deviceId);
  res.json({ ok: true });
});

// Admin: list screenshot metadata for a device (most recent first)
router.get('/:deviceId', requireAdmin, (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const rows = db
    .prepare('SELECT * FROM screenshots WHERE device_id = ? ORDER BY ts DESC LIMIT ?')
    .all(req.params.deviceId, limit);
  res.json({ screenshots: rows });
});

// Admin: fetch the actual image bytes for one screenshot (auth-gated, not public static).
router.get('/file/:filename', requireAdmin, (req, res) => {
  const filename = req.params.filename;
  if (filename.includes('..') || filename.includes('/')) return res.status(400).end();
  const filepath = path.join(SCREENSHOT_DIR, filename);
  if (!fs.existsSync(filepath)) return res.status(404).end();
  res.sendFile(filepath);
});

module.exports = router;
