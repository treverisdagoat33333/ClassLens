const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../db');

const router = express.Router();

router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  const admin = db.prepare('SELECT * FROM admins WHERE email = ?').get(email);
  if (!admin) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const isPasswordValid = bcrypt.compareSync(password, admin.password_hash);
  if (!isPasswordValid) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = jwt.sign(
    { id: admin.id, email: admin.email, role: 'admin' }, 
    process.env.JWT_SECRET || 'fallback_secret_key', 
    { expiresIn: '1d' }
  );

  res.json({ ok: true, token, email: admin.email });
});

module.exports = router;
