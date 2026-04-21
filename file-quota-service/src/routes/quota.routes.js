const express = require('express');
const router = express.Router();
const quotaController = require('../controllers/quota.controller');

router.post('/check', quotaController.checkQuota);

module.exports = router;
