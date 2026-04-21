const express = require('express');
const router = express.Router();
const urlController = require('../controllers/url.controller');

router.post('/generate', urlController.generateUrl);

module.exports = router;
