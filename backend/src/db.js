const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

// On Render (or any host with an ephemeral filesystem), set DATA_DIR to a mounted
// persistent disk path (e.g. /data) so the database and screenshots survive deploys/restarts.
// Locally this defaults to backend/data, same as before.
const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, 'classlens.db'));
db.pragma('journal_mode = WAL'); // better concurrent read/write perf, low memory overhead

db.exec(`
CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS devices (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  student_name TEXT,
  classroom TEXT,
  registered_at INTEGER NOT NULL,
  last_seen INTEGER,
  last_ip TEXT
);

CREATE TABLE IF NOT EXISTS activity (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id TEXT NOT NULL,
  url TEXT,
  title TEXT,
  event_type TEXT NOT NULL, -- 'tab_active' | 'tab_closed' | 'blocked'
  ts INTEGER NOT NULL,
  FOREIGN KEY(device_id) REFERENCES devices(id)
);
CREATE INDEX IF NOT EXISTS idx_activity_device_ts ON activity(device_id, ts);

CREATE TABLE IF NOT EXISTS screenshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  url TEXT,
  ts INTEGER NOT NULL,
  FOREIGN KEY(device_id) REFERENCES devices(id)
);
CREATE INDEX IF NOT EXISTS idx_screenshots_device_ts ON screenshots(device_id, ts);

CREATE TABLE IF NOT EXISTS blocklist (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pattern TEXT UNIQUE NOT NULL, -- domain or substring
  reason TEXT,
  created_at INTEGER NOT NULL
);
`);

// Seed an initial admin if none exist yet, using env vars.
function seedAdmin() {
  const count = db.prepare('SELECT COUNT(*) AS c FROM admins').get().c;
  if (count === 0) {
    const email = process.env.ADMIN_EMAIL || 'admin@example.edu';
    const password = process.env.ADMIN_PASSWORD || 'change-me-now';
    const hash = bcrypt.hashSync(password, 10);
    db.prepare('INSERT INTO admins (email, password_hash, created_at) VALUES (?, ?, ?)')
      .run(email, hash, Date.now());
    console.log(`[classlens] Seeded initial admin account: ${email}`);
  }
}
seedAdmin();

// Seed a small default blocklist so the demo has something to show.
function seedBlocklist() {
  const count = db.prepare('SELECT COUNT(*) AS c FROM blocklist').get().c;
  if (count === 0) {
    const defaults = [
      ['example-betting-site.com', 'Gambling'],
    ];
    const insert = db.prepare('INSERT OR IGNORE INTO blocklist (pattern, reason, created_at) VALUES (?, ?, ?)');
    for (const [pattern, reason] of defaults) insert.run(pattern, reason, Date.now());
  }
}
seedBlocklist();

module.exports = db;
