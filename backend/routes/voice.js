const express = require('express');
const router = express.Router();
const { processVoiceQuery } = require('../controllers/voiceController');
const { optionalAuth } = require('../middleware/auth');

router.post('/query', optionalAuth, processVoiceQuery);

module.exports = router;