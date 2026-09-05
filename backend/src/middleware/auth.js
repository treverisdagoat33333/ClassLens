const jwt = require('jsonwebtoken');

function requireAdmin(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing admin token' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Devices authenticate with a shared enrollment key (set by school IT) plus their
// own device id once registered. This is intentionally simple for a prototype;
// a production rollout should issue a unique per-device secret instead.
function requireDeviceKey(req, res, next) {
  const key = req.headers['x-enrollment-key'];
  if (!key || key !== process.env.ENROLLMENT_KEY) {
    return res.status(401).json({ error: 'Invalid enrollment key' });
  }
  next();
}

module.exports = { requireAdmin, requireDeviceKey };
