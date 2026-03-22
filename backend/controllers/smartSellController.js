const Groq = require('groq-sdk');
const pool = require('../config/database');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Calculate distance between two cities (km)
function getDistance(city1, city2) {
  const distances = {
    'Kolkata-Howrah': 10, 'Kolkata-Durgapur': 170, 'Kolkata-Asansol': 200,
    'Kolkata-Siliguri': 570, 'Kolkata-Bhubaneswar': 440, 'Kolkata-Patna': 580,
    'Kolkata-Delhi': 1470, 'Kolkata-Mumbai': 1980,
    'Howrah-Durgapur': 160, 'Howrah-Asansol': 195,
    'Durgapur-Asansol': 35, 'Durgapur-Siliguri': 410,
    'Bhatpara-Kolkata': 35, 'Bhatpara-Howrah': 40,
    'Bardhaman-Kolkata': 105, 'Bardhaman-Durgapur': 65,
    'Midnapore-Kolkata': 115, 'Midnapore-Howrah': 110,
  };

  const key1 = `${city1}-${city2}`;
  const key2 = `${city2}-${city1}`;
  return distances[key1] || distances[key2] || 200;
}

// Calculate transport cost based on quantity and distance
function calculateTransport(quantity, distance) {
  let vehicleType, costPerKm, loadingCost;

  if (quantity <= 50) {
    vehicleType = '🛺 Auto Rickshaw';
    costPerKm = 8;
    loadingCost = 50;
  } else if (quantity <= 150) {
    vehicleType = '🚐 Tempo/Mini Van';
    costPerKm = 15;
    loadingCost = 100;
  } else if (quantity <= 500) {
    vehicleType = '🚛 Mini Truck (Tata Ace)';
    costPerKm = 22;
    loadingCost = 200;
  } else if (quantity <= 1500) {
    vehicleType = '🚚 Medium Truck';
    costPerKm = 35;
    loadingCost = 400;
  } else {
    vehicleType = '🚜 Large Truck';
    costPerKm = 50;
    loadingCost = 600;
  }

  const transportCost = Math.round((distance * costPerKm) + loadingCost);
  return { vehicleType, transportCost, distance, costPerKm, loadingCost };
}

const getSmartSellSuggestion = async (req, res) => {
  try {
    const { crop_name, quantity, farmer_city, farmer_district } = req.body;
    const userId = req.user?.userId;

    if (!crop_name || !quantity) {
      return res.status(400).json({
        success: false,
        message: 'Crop name and quantity are required'
      });
    }

    const qty = parseFloat(quantity);
    const farmerCity = farmer_city || farmer_district || 'Kolkata';

    // Get all active buyer prices for this crop
    const buyerResult = await pool.query(`
      SELECT 
        bp.id, bp.price_per_kg, bp.min_quantity, bp.max_quantity,
        bp.date_updated, bp.crop_name,
        b.company_name, b.city, b.district, b.state, b.phone,
        u.name as buyer_name, u.phone as buyer_phone
      FROM buyer_prices bp
      JOIN buyers b ON b.id = bp.buyer_id
      JOIN users u ON u.id = bp.user_id
      WHERE LOWER(bp.crop_name) = LOWER($1)
        AND bp.is_active = true
        AND bp.date_updated >= CURRENT_DATE - INTERVAL '3 days'
      ORDER BY bp.price_per_kg DESC
    `, [crop_name]);

    // Also get mandi prices as fallback
    const mandiResult = await pool.query(`
      SELECT city, state, price_per_kg, market_name
      FROM market_prices
      WHERE LOWER(crop_name) = LOWER($1)
      ORDER BY price_per_kg DESC
    `, [crop_name]);

    // Combine buyers and mandi data
    const allOptions = [];

    // Add real buyers
    buyerResult.rows.forEach(buyer => {
      const distance = getDistance(farmerCity, buyer.city);
      const transport = calculateTransport(qty, distance);
      const totalRevenue = buyer.price_per_kg * qty;
      const netProfit = totalRevenue - transport.transportCost;

      // Check quantity requirements
      const meetsMinQty = !buyer.min_quantity || qty >= buyer.min_quantity;
      const meetsMaxQty = !buyer.max_quantity || qty <= buyer.max_quantity;

      allOptions.push({
        type: 'buyer',
        name: buyer.company_name || buyer.buyer_name,
        city: buyer.city,
        state: buyer.state,
        phone: buyer.phone || buyer.buyer_phone,
        price_per_kg: parseFloat(buyer.price_per_kg),
        total_revenue: totalRevenue,
        transport: transport,
        net_profit: netProfit,
        is_profitable: netProfit > 0,
        meets_quantity: meetsMinQty && meetsMaxQty,
        min_quantity: buyer.min_quantity,
        max_quantity: buyer.max_quantity,
        price_updated: buyer.date_updated,
        badge: '🏪 Direct Buyer'
      });
    });

    // Add mandi options
    mandiResult.rows.forEach(mandi => {
      const distance = getDistance(farmerCity, mandi.city);
      const transport = calculateTransport(qty, distance);
      const totalRevenue = mandi.price_per_kg * qty;
      const netProfit = totalRevenue - transport.transportCost;

      allOptions.push({
        type: 'mandi',
        name: mandi.market_name || `${mandi.city} Mandi`,
        city: mandi.city,
        state: mandi.state,
        phone: '1800-270-0224',
        price_per_kg: parseFloat(mandi.price_per_kg),
        total_revenue: totalRevenue,
        transport: transport,
        net_profit: netProfit,
        is_profitable: netProfit > 0,
        meets_quantity: true,
        price_updated: new Date().toISOString().split('T')[0],
        badge: '🏛️ Mandi'
      });
    });

    // Sort by net profit
    allOptions.sort((a, b) => b.net_profit - a.net_profit);

    const bestOption = allOptions[0];
    const profitableOptions = allOptions.filter(o => o.is_profitable);

    // Ask Groq AI for smart advice
    const topOptions = allOptions.slice(0, 4).map(o =>
      `${o.name} (${o.city}): Price=₹${o.price_per_kg}/kg, Transport=${o.transport.vehicleType} ₹${o.transport.transportCost}, Net Profit=₹${o.net_profit}`
    ).join('\n');

    let aiAdvice = '';
    try {
      const response = await groq.chat.completions.create({
        messages: [{
          role: 'user',
          content: `Indian farmer wants to sell ${qty}kg of ${crop_name} from ${farmerCity}.

Top options:
${topOptions}

Give 3 lines of practical advice: which option is best and why, best time to sell, one negotiation tip. Be specific with numbers.`
        }],
        model: 'llama-3.3-70b-versatile',
        max_tokens: 200,
        temperature: 0.3
      });
      aiAdvice = response.choices[0].message.content;
    } catch (aiErr) {
      console.log('Groq advice skipped:', aiErr.message);
      aiAdvice = `Best option: Sell to ${bestOption?.name} in ${bestOption?.city} for maximum profit of ₹${bestOption?.net_profit?.toLocaleString('en-IN')}.`;
    }

    res.json({
      success: true,
      crop: crop_name,
      quantity: qty,
      farmer_location: farmerCity,
      best_option: bestOption,
      all_options: allOptions.slice(0, 8),
      profitable_count: profitableOptions.length,
      ai_advice: aiAdvice,
      summary: {
        total_options: allOptions.length,
        direct_buyers: buyerResult.rows.length,
        mandi_options: mandiResult.rows.length,
        best_profit: bestOption?.net_profit || 0,
        best_location: bestOption?.city || 'N/A'
      },
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    console.error('Smart sell error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Error: ' + err.message
    });
  }
};

// Buyer updates their daily price
const updateBuyerPrice = async (req, res) => {
  try {
    const { crop_name, price_per_kg, min_quantity, max_quantity } = req.body;
    const userId = req.user.userId;

    if (!crop_name || !price_per_kg) {
      return res.status(400).json({
        success: false,
        message: 'Crop name and price are required'
      });
    }

    // Get or create buyer profile
    let buyerResult = await pool.query(
      'SELECT id FROM buyers WHERE user_id = $1', [userId]
    );

    if (buyerResult.rows.length === 0) {
      // Get user info
      const userResult = await pool.query(
        'SELECT name, phone FROM users WHERE id = $1', [userId]
      );
      const user = userResult.rows[0];

      // Create buyer profile
      const newBuyer = await pool.query(
        `INSERT INTO buyers (user_id, company_name, city, state, phone)
         VALUES ($1, $2, 'Kolkata', 'West Bengal', $3) RETURNING id`,
        [userId, user.name + ' Trading', user.phone]
      );
      buyerResult = { rows: [{ id: newBuyer.rows[0].id }] };
    }

    const buyerId = buyerResult.rows[0].id;

    // Deactivate old prices for this crop
    await pool.query(
      `UPDATE buyer_prices SET is_active = false
       WHERE buyer_id = $1 AND LOWER(crop_name) = LOWER($2)`,
      [buyerId, crop_name]
    );

    // Insert new price
    await pool.query(
      `INSERT INTO buyer_prices (buyer_id, user_id, crop_name, price_per_kg, min_quantity, max_quantity)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [buyerId, userId, crop_name, price_per_kg, min_quantity || 0, max_quantity || null]
    );

    res.json({
      success: true,
      message: `Price updated: ${crop_name} at ₹${price_per_kg}/kg`
    });

  } catch (err) {
    console.error('Update price error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Error: ' + err.message
    });
  }
};

// Get all buyer prices (for farmers to see)
const getBuyerPrices = async (req, res) => {
  try {
    const { crop } = req.query;

    let query = `
      SELECT 
        bp.crop_name, bp.price_per_kg, bp.min_quantity, bp.max_quantity,
        bp.date_updated,
        b.company_name, b.city, b.district, b.state, b.phone
      FROM buyer_prices bp
      JOIN buyers b ON b.id = bp.buyer_id
      WHERE bp.is_active = true
        AND bp.date_updated >= CURRENT_DATE - INTERVAL '3 days'
    `;
    const params = [];

    if (crop) {
      query += ` AND LOWER(bp.crop_name) = LOWER($1)`;
      params.push(crop);
    }

    query += ' ORDER BY bp.price_per_kg DESC';

    const result = await pool.query(query, params);

    res.json({
      success: true,
      prices: result.rows,
      total: result.rows.length
    });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get buyer profile
const getBuyerProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const result = await pool.query(
      'SELECT * FROM buyers WHERE user_id = $1', [userId]
    );

    if (result.rows.length === 0) {
      return res.json({ success: true, buyer: null });
    }

    const prices = await pool.query(
      `SELECT * FROM buyer_prices WHERE buyer_id = $1 AND is_active = true ORDER BY date_updated DESC`,
      [result.rows[0].id]
    );

    res.json({
      success: true,
      buyer: result.rows[0],
      active_prices: prices.rows
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Update buyer profile
const updateBuyerProfile = async (req, res) => {
  try {
    const { company_name, city, district, state, address, phone } = req.body;
    const userId = req.user.userId;

    const existing = await pool.query('SELECT id FROM buyers WHERE user_id = $1', [userId]);

    if (existing.rows.length > 0) {
      await pool.query(
        `UPDATE buyers SET company_name=$1, city=$2, district=$3, state=$4, address=$5, phone=$6
         WHERE user_id=$7`,
        [company_name, city, district, state || 'West Bengal', address, phone, userId]
      );
    } else {
      await pool.query(
        `INSERT INTO buyers (user_id, company_name, city, district, state, address, phone)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [userId, company_name, city, district, state || 'West Bengal', address, phone]
      );
    }

    res.json({ success: true, message: 'Buyer profile updated!' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getSmartSellSuggestion,
  updateBuyerPrice,
  getBuyerPrices,
  getBuyerProfile,
  updateBuyerProfile
};