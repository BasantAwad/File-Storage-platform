const sessionRepository = require('../repositories/sessionRepository');
const kafka = require('../kafka/producer');
const logger = require('../utils/logger');
const axios = require('axios');

const FILE_REGISTRY_URL = process.env.FILE_REGISTRY_URL || 'http://localhost:3007';
const CHUNK_CATALOG_URL = process.env.CHUNK_CATALOG_URL || 'http://localhost:3009';
const SESSION_TTL_MINUTES = parseInt(process.env.SESSION_TTL_MINUTES) || 60;

class UploadSessionService {
  /**
   * Start a new upload session.
   * 1. Register file in File Registry (REST → returns file_id)
   * 2. Create upload_session row tied to that file_id
   * Returns session info to client immediately.
   */
  async startSession({ owner_id, filename, size, mime_type, total_chunks }) {
    // Step 1: Register the file (status=pending) in File Registry
    let file;
    try {
      const response = await axios.post(
        `${FILE_REGISTRY_URL}/files`,
        { owner_id, filename, size, mime_type },
        { timeout: 8000 }
      );
      file = response.data?.data;
      if (!file?.id) throw new Error('Invalid response from File Registry');
    } catch (err) {
      logger.error('File Registry call failed during session start', { error: err.message });
      throw Object.assign(new Error('FILE_REGISTRY_UNAVAILABLE'), {
        code: 'FILE_REGISTRY_UNAVAILABLE',
        statusCode: 503,
      });
    }

    // Step 2: Compute session expiry
    const expires_at = new Date(
      Date.now() + SESSION_TTL_MINUTES * 60 * 1000
    ).toISOString();

    // Step 3: Create session record
    const session = await sessionRepository.create({
      file_id: file.id,
      owner_id,
      filename,
      total_size: size,
      total_chunks: total_chunks || null,
      expires_at,
    });

    logger.info('Upload session started', {
      session_id: session.id,
      file_id: file.id,
      owner_id,
    });

    return { session, file };
  }

  /**
   * Finish an upload session.
   * Validates session exists and is still active, then:
   * 1. Verifies chunks via Chunk Catalog (REST)
   * 2. Marks session as completed
   * 3. Publishes `upload.completed` to Kafka (triggers 5 parallel consumers)
   * Client gets response immediately — consumers run in background.
   */
  async finishSession(sessionId, { chunk_ids = [] } = {}) {
    // Fetch session
    const session = await sessionRepository.findById(sessionId);
    if (!session) {
      throw Object.assign(new Error('Session not found'), {
        code: 'SESSION_NOT_FOUND',
        statusCode: 404,
      });
    }

    if (session.status === 'expired') {
      throw Object.assign(new Error('Upload session has expired'), {
        code: 'SESSION_EXPIRED',
        statusCode: 410,
      });
    }

    if (session.status === 'completed') {
      throw Object.assign(new Error('Session already completed'), {
        code: 'SESSION_ALREADY_COMPLETED',
        statusCode: 409,
      });
    }

    if (session.status !== 'active') {
      throw Object.assign(new Error(`Session in invalid state: ${session.status}`), {
        code: 'SESSION_INVALID_STATE',
        statusCode: 400,
      });
    }

    // Optional: verify chunks via Chunk Catalog
    let chunks = [];
    if (chunk_ids.length > 0) {
      chunks = await this._verifyChunks(session.file_id, chunk_ids);
    } else {
      chunks = await this._getChunks(session.file_id);
    }

    // Mark session complete
    const completed = await sessionRepository.complete(sessionId);
    if (!completed) {
      throw Object.assign(new Error('Failed to complete session'), {
        code: 'SESSION_COMPLETE_FAILED',
        statusCode: 500,
      });
    }

    // === HYBRID PATTERN: Respond to client, publish Kafka in background ===
    // We publish AFTER updating the DB but before sending the HTTP response.
    // All 5 downstream consumers react independently:
    //   → Replication Planner (#20)
    //   → Integrity Checker (#24)
    //   → Notification (#28)
    //   → Search Index (#16)
    //   → Access Analytics (#39)
    await kafka.publish(
      'upload.completed',
      {
        event: 'upload.completed',
        session_id: completed.id,
        file_id: completed.file_id,
        owner_id: completed.owner_id,
        filename: completed.filename,
        total_size: completed.total_size,
        total_chunks: chunks.length || completed.total_chunks,
        chunk_ids: chunks.map((c) => c.id),
        completed_at: new Date().toISOString(),
      },
      completed.file_id // partition key keeps file events ordered
    );

    // Audit event
    await kafka.publish('audit.event', {
      event: 'audit.event',
      actor: completed.owner_id,
      action: 'UPLOAD_COMPLETED',
      entity: completed.file_id,
      entity_type: 'file',
      session_id: completed.id,
    });

    logger.info('Upload completed and events published', {
      session_id: sessionId,
      file_id: completed.file_id,
    });

    return { session: completed, chunks };
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId) {
    return sessionRepository.findById(sessionId);
  }

  /**
   * Fetch chunks from Chunk Catalog
   */
  async _getChunks(fileId) {
    try {
      const response = await axios.get(`${CHUNK_CATALOG_URL}/chunks`, {
        params: { file_id: fileId },
        timeout: 5000,
      });
      return response.data?.data || [];
    } catch (err) {
      logger.warn('Chunk Catalog unavailable (non-fatal)', { error: err.message });
      return [];
    }
  }

  /**
   * Verify specific chunk IDs belong to this file
   */
  async _verifyChunks(fileId, chunkIds) {
    const chunks = await this._getChunks(fileId);
    const found = chunks.filter((c) => chunkIds.includes(c.id));
    return found;
  }

  /**
   * Expire stale sessions (called by Scheduler or cron)
   */
  async expireStale() {
    const expired = await sessionRepository.expireStale();
    logger.info(`Expired ${expired.length} stale sessions`);
    return expired;
  }
}

module.exports = new UploadSessionService();
