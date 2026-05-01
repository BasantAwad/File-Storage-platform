const express = require('express');
const router = express.Router();
const { startSession, finishSession, getSession } = require('../controllers/sessionController');

// Start a new upload session
router.post('/start', startSession);

// Finish (complete) an upload session — triggers Kafka upload.completed
router.post('/:id/finish', finishSession);

// Query session status
router.get('/:id', getSession);

module.exports = router;
