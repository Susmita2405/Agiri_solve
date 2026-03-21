const express = require('express');
const router = express.Router();
const { getSchemes, checkEligibility, getSchemeById } = require('../controllers/schemesController');
const { optionalAuth } = require('../middleware/auth');

router.get('/', getSchemes);
router.get('/:id', getSchemeById);
router.post('/check-eligibility', optionalAuth, checkEligibility);

module.exports = router;