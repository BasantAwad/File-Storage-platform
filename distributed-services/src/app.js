const express = require('express');
const { v4: uuidv4 } = require('uuid');
const promClient = require('prom-client');
const swaggerUi = require('swagger-ui-express');
const logger = require('./utils/logger');
const healthRoutes = require('./routes/health');
const replicationRoutes = require('./routes/replication');
const rebalanceRoutes = require('./routes/rebalance');

const app = express();

// Initialize Prometheus metrics
const register = new promClient.Registry();
promClient.collectDefaultMetrics({ register });

const httpRequestDurationMicroseconds = new promClient.Histogram({
  name: 'http_request_duration_ms',
  help: 'Duration of HTTP requests in ms',
  labelNames: ['method', 'route', 'code'],
  buckets: [50, 100, 200, 300, 400, 500, 1000] // Used for p50/p95/p99
});

const httpRequestsTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'code']
});

const httpErrorsTotal = new promClient.Counter({
  name: 'http_errors_total',
  help: 'Total number of HTTP errors',
  labelNames: ['method', 'route', 'code']
});

register.registerMetric(httpRequestDurationMicroseconds);
register.registerMetric(httpRequestsTotal);
register.registerMetric(httpErrorsTotal);

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Swagger docs
const swaggerDocument = {
  openapi: '3.0.0',
  info: { title: 'Distributed Services API', version: '1.0.0' },
  paths: {
    '/health': { get: { summary: 'Health check', responses: { '200': { description: 'OK' } } } },
    '/ready': { get: { summary: 'Readiness check', responses: { '200': { description: 'OK' } } } },
    '/replication': { get: { summary: 'Replication data', responses: { '200': { description: 'OK' } } } },
    '/rebalance': { post: { summary: 'Trigger rebalance', responses: { '200': { description: 'OK' } } } }
  }
};
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Middleware to parse JSON body
app.use(express.json());

// Middleware to assign request ID and track metrics/logs
app.use((req, res, next) => {
  req.id = req.headers['x-request-id'] || uuidv4();
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    httpRequestDurationMicroseconds.labels(req.method, req.path, res.statusCode).observe(duration);
    httpRequestsTotal.labels(req.method, req.path, res.statusCode).inc();
    
    if (res.statusCode >= 400) {
      httpErrorsTotal.labels(req.method, req.path, res.statusCode).inc();
      logger.error('Request failed', { request_id: req.id, method: req.method, path: req.path, statusCode: res.statusCode, duration });
    } else {
      logger.info('Request successful', { request_id: req.id, method: req.method, path: req.path, statusCode: res.statusCode, duration });
    }
  });
  next();
});

// Register routes
app.use('/', healthRoutes);
app.use('/replication', replicationRoutes);
app.use('/rebalance', rebalanceRoutes);

// Error handler
app.use((err, req, res, next) => {
  logger.error(err.message, { request_id: req.id, stack: err.stack });
  res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: err.message },
    meta: { request_id: req.id }
  });
});

module.exports = app;

