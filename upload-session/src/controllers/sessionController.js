const Joi = require('joi');
const sessionService = require('../services/sessionService');
const response = require('../utils/response');
const logger = require('../utils/logger');

// ── Validation schemas ──────────────────────────────────────────────────────

const startSessionSchema = Joi.object({
  owner_id: Joi.string().uuid().required(),
  filename: Joi.string().min(1).max(512).required(),
  size: Joi.number().integer().min(0).required(),
  mime_type: Joi.string().max(255).optional(),
  total_chunks: Joi.number().integer().min(1).optional(),
});

const finishSessionSchema = Joi.object({
  chunk_ids: Joi.array().items(Joi.string().uuid()).optional().default([]),
});

// ── Handlers ────────────────────────────────────────────────────────────────

/**
 * POST /uploads/start
 * Begin a new upload session — register file in File Registry, return session ID
 */
const startSession = async (req, res) => {
  const { error: valErr, value } = startSessionSchema.validate(req.body, { abortEarly: false });
  if (valErr) {
    return res.status(400).json(
      response.error('VALIDATION_ERROR', 'Invalid request body', {
        details: valErr.details.map((d) => d.message),
      })
    );
  }

  try {
    const { session, file } = await sessionService.startSession(value);
    return res.status(201).json(
      response.success({
        session_id: session.id,
        file_id: file.id,
        status: session.status,
        expires_at: session.expires_at,
      })
    );
  } catch (err) {
    if (err.code === 'FILE_REGISTRY_UNAVAILABLE') {
      return res.status(503).json(
        response.error(err.code, 'File Registry is currently unavailable. Try again.')
      );
    }
    throw err;
  }
};

/**
 * POST /uploads/:id/finish
 * Complete the upload session — validates state, publishes upload.completed
 * Client receives response immediately; 5 consumers process in background.
 */
const finishSession = async (req, res) => {
  const { id } = req.params;

  if (!id.match(/^[0-9a-f-]{36}$/i)) {
    return res.status(400).json(response.error('INVALID_ID', 'Session ID must be a valid UUID'));
  }

  const { error: valErr, value } = finishSessionSchema.validate(req.body, { abortEarly: false });
  if (valErr) {
    return res.status(400).json(
      response.error('VALIDATION_ERROR', 'Invalid request body', {
        details: valErr.details.map((d) => d.message),
      })
    );
  }

  try {
    const result = await sessionService.finishSession(id, value);
    return res.status(200).json(
      response.success({
        session_id: result.session.id,
        file_id: result.session.file_id,
        status: result.session.status,
        chunks_recorded: result.chunks.length,
        message: 'Upload completed. Processing started in background.',
      })
    );
  } catch (err) {
    const statusMap = {
      SESSION_NOT_FOUND: 404,
      SESSION_EXPIRED: 410,
      SESSION_ALREADY_COMPLETED: 409,
      SESSION_INVALID_STATE: 400,
      SESSION_COMPLETE_FAILED: 500,
    };
    const status = statusMap[err.code] || 500;
    return res.status(status).json(
      response.error(err.code || 'INTERNAL_ERROR', err.message)
    );
  }
};

/**
 * GET /uploads/:id
 * Retrieve session details
 */
const getSession = async (req, res) => {
  const { id } = req.params;
  const session = await sessionService.getSession(id);
  if (!session) {
    return res.status(404).json(response.error('SESSION_NOT_FOUND', 'Session not found'));
  }
  return res.status(200).json(response.success(session));
};

module.exports = { startSession, finishSession, getSession };
