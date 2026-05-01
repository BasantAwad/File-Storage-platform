require('dotenv').config();
require('express-async-errors');

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const { v4: uuidv4 } = require('uuid');

const fileRoutes = require('./routes/files');
const response = require('./utils/response');
const logger = require('./utils/logger');
const db = require('./db');

const createApp = () => {
  const app = express();

  // ── Security & middleware ──────────────────────────────────────────────────
  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Request ID propagation
  app.use((req, _res, next) => {
    req.requestId = req.headers['x-request-id'] || uuidv4();
    next();
  });

  // HTTP request logging
  app.use(
    morgan('combined', {
      stream: { write: (msg) => logger.http(msg.trim()) },
    })
  );

  // ── Health & readiness ─────────────────────────────────────────────────────
  app.get('/health', (_req, res) => {
    res.status(200).json({
      success: true,
      data: { status: 'healthy', service: 'file-registry', uptime: process.uptime() },
    });
  });

  app.get('/ready', async (_req, res) => {
    try {
      await db.query('SELECT 1');
      res.status(200).json({
        success: true,
        data: { status: 'ready', db: 'connected' },
      });
    } catch (err) {
      logger.error('Readiness probe failed', { error: err.message });
      res.status(503).json({
        success: false,
        data: { status: 'not ready', db: 'disconnected' },
      });
    }
  });

  // ── API routes ─────────────────────────────────────────────────────────────
  app.use('/files', fileRoutes);

  // ── 404 handler ───────────────────────────────────────────────────────────
  app.use((req, res) => {
    res.status(404).json(
      response.error('NOT_FOUND', `Route ${req.method} ${req.path} not found`)
    );
  });

  // ── Global error handler ──────────────────────────────────────────────────
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, _next) => {
    logger.error('Unhandled error', {
      error: err.message,
      stack: err.stack,
      path: req.path,
    });
    res.status(err.statusCode || 500).json(
      response.error(
        err.code || 'INTERNAL_SERVER_ERROR',
        err.message || 'An unexpected error occurred'
      )
    );
  });

  return app;
};

module.exports = createApp;
