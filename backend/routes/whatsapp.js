const express = require('express');
const router = express.Router();
const { handleWhatsApp } = require('../controllers/whatsappController');

router.post('/webhook', handleWhatsApp);

module.exports = router;