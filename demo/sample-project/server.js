const express = require('express');
const { Pool } = require('pg');
const Redis = require('ioredis');
require('dotenv').config();

// ── App Configuration ──
const app = express();
const port = process.env.PORT || 3000;

// ── Database Connection ──
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// ── Redis Connection ──
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100,
});

// ── Middleware ──
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration_ms: duration,
      service: 'sample-project',
    }));
  });
  next();
});

// ── Health Check ──
app.get('/health', async (req, res) => {
  try {
    // Check database connectivity
    await pool.query('SELECT 1');
    // Check Redis connectivity
    await redis.ping();
    res.status(200).json({
      status: 'healthy',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      checks: {
        database: 'connected',
        cache: 'connected',
      },
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
    });
  }
});

// ── API Routes ──
app.use('/api', require('./routes/api'));

// ── Error Handler ──
app.use((err, req, res, next) => {
  console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'error',
    message: err.message,
    stack: err.stack,
    service: 'sample-project',
  }));
  res.status(500).json({ error: 'Internal Server Error' });
});

// ── Graceful Shutdown ──
const server = app.listen(port, () => {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'info',
    message: `Server listening on port ${port}`,
    service: 'sample-project',
  }));
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received. Starting graceful shutdown...');
  server.close(() => {
    pool.end();
    redis.quit();
    process.exit(0);
  });
});
