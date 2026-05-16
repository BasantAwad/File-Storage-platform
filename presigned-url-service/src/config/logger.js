const winston = require('winston');

// Structured JSON logger — every entry includes timestamp, service, level, message
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'presigned-url-service' },
  transports: [
    new winston.transports.Console()
  ]
});

// Middleware: attaches request_id to every incoming request log
function requestLogger(req, res, next) {
  const requestId = req.headers['x-request-id'] || require('crypto').randomUUID();
  req.requestId = requestId;
  res.setHeader('x-request-id', requestId);

  logger.info('Incoming request', {
    request_id: requestId,
    method: req.method,
    path: req.path,
    ip: req.ip
  });

  res.on('finish', () => {
    logger.info('Request completed', {
      request_id: requestId,
      method: req.method,
      path: req.path,
      status_code: res.statusCode
    });
  });

  next();
}

module.exports = { logger, requestLogger };
