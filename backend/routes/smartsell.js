const express = require('express');
const router = express.Router();
const {
  getSmartSellSuggestion,
  updateBuyerPrice,
  getBuyerPrices,
  getBuyerProfile,
  updateBuyerProfile
} = require('../controllers/smartSellController');
const { authenticateToken } = require('../middleware/auth');

router.post('/suggest', authenticateToken, getSmartSellSuggestion);
router.post('/buyer/price', authenticateToken, updateBuyerPrice);
router.get('/buyer/prices', getBuyerPrices);
router.get('/buyer/profile', authenticateToken, getBuyerProfile);
router.post('/buyer/profile', authenticateToken, updateBuyerProfile);

module.exports = router;