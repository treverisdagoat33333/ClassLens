require('dotenv').config();
const express = require('express');
const cors = require('cors');

require('./db'); // initializes schema + seeds admin on boot

const authRoutes = require('./routes/auth');
const deviceRoutes = require('./routes/devices');
const activityRoutes = require('./routes/activity');
const screenshotRoutes = require('./routes/screenshots');
const blocklistRoutes = require('./routes/blocklist');

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' })); // screenshots route sets its own larger limit

app.get('/api/health', (req, res) => res.json({ ok: true, service: 'classlens-backend' }));

app.use('/api/auth', authRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/screenshots', screenshotRoutes);
app.use('/api/blocklist', blocklistRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`[classlens] backend listening on http://localhost:${PORT}`);
});
