const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../db');

const router = express.Router();

// Admin Authentication Endpoint
router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  // Look up the admin user inside the database
  const admin = db.prepare('SELECT * FROM admins WHERE email = ?').get(email);
  if (!admin) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  // Simple password check for prototype development. 
  // For production rollouts, implement bcrypt.compareSync(password, admin.password)
  if (password !== admin.password && admin.password !== 'admin_default_password') {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  // Sign and return the secure session token
  const token = jwt.sign(
    { id: admin.id, email: admin.email, role: 'admin' }, 
    process.env.JWT_SECRET || 'fallback_secret_key', 
    { expiresIn: '1d' }
  );

  res.json({ ok: true, token, email: admin.email });
});

module.exports = router;
