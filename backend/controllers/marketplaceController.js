const pool = require('../config/database');

const listProduct = async (req, res) => {
  try {
    const { crop_name, quantity, quantity_unit, price_per_unit, location, district, state, description } = req.body;
    const farmerId = req.user.userId;

    if (!crop_name || !quantity || !price_per_unit) {
      return res.status(400).json({ success: false, message: 'Crop name, quantity and price are required' });
    }

    const result = await pool.query(
      `INSERT INTO products (farmer_id, crop_name, quantity, quantity_unit, price_per_unit, location, district, state, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [farmerId, crop_name, quantity, quantity_unit || 'kg', price_per_unit, location, district, state || 'West Bengal', description]
    );

    res.status(201).json({
      success: true,
      message: 'Product listed successfully!',
      product: result.rows[0]
    });
  } catch (err) {
    console.error('List product error:', err);
    res.status(500).json({ success: false, message: 'Error listing product' });
  }
};

const getProducts = async (req, res) => {
  try {
    const { crop, district, state, min_price, max_price, page = 1, limit = 20 } = req.query;

    let query = `
      SELECT p.*, u.name as farmer_name, u.phone as farmer_phone
      FROM products p
      JOIN users u ON u.id = p.farmer_id
      WHERE p.status = 'available'
    `;
    const params = [];
    let paramIdx = 1;

    if (crop) {
      query += ` AND LOWER(p.crop_name) LIKE LOWER($${paramIdx++})`;
      params.push(`%${crop}%`);
    }
    if (district) {
      query += ` AND LOWER(p.district) = LOWER($${paramIdx++})`;
      params.push(district);
    }
    if (state) {
      query += ` AND LOWER(p.state) = LOWER($${paramIdx++})`;
      params.push(state);
    }
    if (min_price) {
      query += ` AND p.price_per_unit >= $${paramIdx++}`;
      params.push(parseFloat(min_price));
    }
    if (max_price) {
      query += ` AND p.price_per_unit <= $${paramIdx++}`;
      params.push(parseFloat(max_price));
    }

    query += ` ORDER BY p.created_at DESC LIMIT $${paramIdx++} OFFSET $${paramIdx++}`;
    params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

    const result = await pool.query(query, params);

    // Count total
    let countQuery = `SELECT COUNT(*) FROM products p WHERE p.status = 'available'`;
    const countResult = await pool.query(countQuery);

    res.json({
      success: true,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      products: result.rows
    });
  } catch (err) {
    console.error('Get products error:', err);
    res.status(500).json({ success: false, message: 'Error fetching products' });
  }
};

const placeOrder = async (req, res) => {
  try {
    const { product_id, quantity, buyer_name, buyer_phone, delivery_address, notes } = req.body;
    const buyerId = req.user.userId;

    if (!product_id || !quantity || !buyer_phone || !delivery_address) {
      return res.status(400).json({ success: false, message: 'Product ID, quantity, phone and delivery address are required' });
    }

    // Get product details
    const productResult = await pool.query('SELECT * FROM products WHERE id = $1 AND status = $2', [product_id, 'available']);
    if (productResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Product not available' });
    }

    const product = productResult.rows[0];
    const qty = parseFloat(quantity);

    if (qty > product.quantity) {
      return res.status(400).json({ success: false, message: `Only ${product.quantity} ${product.quantity_unit} available` });
    }

    const totalPrice = product.price_per_unit * qty;

    // Create order
    const orderResult = await pool.query(
      `INSERT INTO orders (product_id, buyer_id, farmer_id, quantity, total_price, buyer_name, buyer_phone, delivery_address, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [product_id, buyerId, product.farmer_id, qty, totalPrice, buyer_name, buyer_phone, delivery_address, notes]
    );

    // Update product quantity
    const newQuantity = product.quantity - qty;
    const newStatus = newQuantity <= 0 ? 'sold' : 'available';
    await pool.query('UPDATE products SET quantity = $1, status = $2 WHERE id = $3', [newQuantity, newStatus, product_id]);

    res.status(201).json({
      success: true,
      message: 'Order placed successfully!',
      order: {
        ...orderResult.rows[0],
        crop_name: product.crop_name,
        price_per_unit: product.price_per_unit
      }
    });
  } catch (err) {
    console.error('Place order error:', err);
    res.status(500).json({ success: false, message: 'Error placing order' });
  }
};

const getMyListings = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM products WHERE farmer_id = $1 ORDER BY created_at DESC',
      [req.user.userId]
    );
    res.json({ success: true, products: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getMyOrders = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT o.*, p.crop_name, p.price_per_unit, u.name as farmer_name
       FROM orders o
       LEFT JOIN products p ON p.id = o.product_id
       LEFT JOIN users u ON u.id = o.farmer_id
       WHERE o.buyer_id = $1
       ORDER BY o.created_at DESC`,
      [req.user.userId]
    );
    res.json({ success: true, orders: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { listProduct, getProducts, placeOrder, getMyListings, getMyOrders };