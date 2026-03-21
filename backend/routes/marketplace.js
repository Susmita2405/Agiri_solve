const express = require('express');
const router = express.Router();
const { listProduct, getProducts, placeOrder, getMyListings, getMyOrders } = require('../controllers/marketplaceController');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

router.get('/products', getProducts);
router.post('/products', authenticateToken, listProduct);
router.get('/my-listings', authenticateToken, getMyListings);
router.post('/orders', authenticateToken, placeOrder);
router.get('/my-orders', authenticateToken, getMyOrders);

module.exports = router;