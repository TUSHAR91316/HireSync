/**
 * HireSync Express Server Entry Point (`src/server.js`)
 *
 * Mounts all route modules, runs DB fail-fast probe on startup,
 * and registers a global error handler.
 */

const express = require('express');
const config = require('./config');
const { connectWithFailFast } = require('./db/pool');
const authRoutes = require('./routes/authRoutes');
const profileRoutes = require('./routes/profileRoutes');
const resumeRoutes = require('./routes/resumeRoutes');
const jobRoutes = require('./routes/jobRoutes');
const applicationRoutes = require('./routes/applicationRoutes');

const path = require('path');
const app = express();

// ─────────────────────────────────────────────
// Core Middleware
// ─────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static frontend assets and uploaded resumes
app.use(express.static(path.join(__dirname, '../public')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// CORS header (basic — replace with cors package for production)
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', config.corsOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// ─────────────────────────────────────────────
// Health Check
// ─────────────────────────────────────────────
app.get('/health', (_req, res) =>
  res.status(200).json({ status: 'ok', app: config.appName, env: config.env })
);

// ─────────────────────────────────────────────
// Route Mounts
// ─────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api', profileRoutes);
app.use('/api/candidate/resume', resumeRoutes);
app.use('/api', jobRoutes);
app.use('/api', applicationRoutes);

// ─────────────────────────────────────────────
// Global Error Handler
// ─────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[ERROR]', err.message);
  res.status(500).json({
    success: false,
    error: 'INTERNAL_SERVER_ERROR',
    message: config.isProduction ? 'An unexpected error occurred.' : err.message,
  });
});

// ─────────────────────────────────────────────
// Startup
// ─────────────────────────────────────────────
async function start() {
  await connectWithFailFast(); // Fail-fast DB probe before accepting requests
  app.listen(config.port, config.host, () => {
    console.log(
      `[SERVER] ✅ ${config.appName} running on http://${config.host}:${config.port} (${config.env})`
    );
  });
}

start();

module.exports = app; // Export for test environments (supertest)
