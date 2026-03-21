const express = require('express');
const router = express.Router();
const { recommend } = require('../controllers/cropController');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

router.post('/recommend', optionalAuth, recommend);

module.exports = router;