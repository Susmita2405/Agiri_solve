const pool = require('../config/database');

// Simple NLP-based voice query processor
const processVoiceQuery = async (req, res) => {
  try {
    const { query, language = 'en' } = req.body;

    if (!query) {
      return res.status(400).json({ success: false, message: 'Query is required' });
    }

    const lowerQuery = query.toLowerCase().trim();
    let response = '';
    let data = null;
    let action = null;

    // --- Intent Detection ---

    // Market prices
    if (lowerQuery.match(/price|mandi|market|bazar|दाम|मंडी|भाव/)) {
      const cropMatch = lowerQuery.match(/rice|wheat|potato|onion|tomato|jute|mustard|maize|cauliflower|brinjal|चावल|आलू|प्याज/);
      if (cropMatch) {
        const cropMap = { 'चावल': 'rice', 'आलू': 'potato', 'प्याज': 'onion' };
        const crop = cropMap[cropMatch[0]] || cropMatch[0];
        const priceResult = await pool.query(
          'SELECT city, price_per_kg, state FROM market_prices WHERE LOWER(crop_name) = LOWER($1) ORDER BY price_per_kg DESC LIMIT 5',
          [crop]
        );
        if (priceResult.rows.length > 0) {
          const highest = priceResult.rows[0];
          const lowest = priceResult.rows[priceResult.rows.length - 1];
          response = `Current ${crop} prices: Highest in ${highest.city} at ₹${highest.price_per_kg}/kg, Lowest in ${lowest.city} at ₹${lowest.price_per_kg}/kg. Best market to sell: ${highest.city}.`;
          data = priceResult.rows;
          action = 'show_prices';
        } else {
          response = `Sorry, I don't have current prices for ${crop}. Please check the Market Prices section.`;
        }
      } else {
        response = 'Please tell me which crop price you want to know. For example: "onion price" or "potato market price".';
        action = 'navigate_market';
      }
    }

    // Weather & season
    else if (lowerQuery.match(/weather|season|crop|grow|plant|soil|मौसम|फसल/)) {
      const month = new Date().getMonth() + 1;
      let season = '';
      let seasonalCrops = '';

      if (month >= 6 && month <= 9) {
        season = 'Kharif (Monsoon)';
        seasonalCrops = 'Rice, Jute, Maize, Brinjal, Tomato';
      } else if (month >= 10 || month <= 2) {
        season = 'Rabi (Winter)';
        seasonalCrops = 'Wheat, Potato, Mustard, Cauliflower, Onion, Green Pea';
      } else {
        season = 'Zaid (Summer)';
        seasonalCrops = 'Watermelon, Cucumber, Gourd, Moong Dal';
      }
      response = `Current season is ${season}. Best crops to grow now: ${seasonalCrops}. Go to Crop Recommendation for personalized advice.`;
      action = 'navigate_crop';
    }

    // Government schemes
    else if (lowerQuery.match(/scheme|yojana|subsidy|loan|sarkar|government|किसान|योजना|सब्सिडी/)) {
      const schemeResult = await pool.query(
        "SELECT scheme_name, benefits FROM schemes WHERE status = 'active' AND state IN ('Central', 'West Bengal') ORDER BY state DESC LIMIT 3"
      );
      if (schemeResult.rows.length > 0) {
        const schemesList = schemeResult.rows.map(s => `${s.scheme_name}: ${s.benefits.substring(0, 80)}...`).join('. ');
        response = `Top government schemes for you: ${schemesList}. Check the Government Schemes section for complete list and eligibility.`;
        data = schemeResult.rows;
        action = 'navigate_schemes';
      }
    }

    // Disease
    else if (lowerQuery.match(/disease|blight|pest|fungus|sick|leaf|रोग|कीट|पत्ता/)) {
      response = 'For crop disease detection, please take a photo of the affected leaf and upload it in the Disease Detection section. I can identify the disease and suggest treatment.';
      action = 'navigate_disease';
    }

    // Marketplace
    else if (lowerQuery.match(/sell|buy|market|buyer|list|बेचना|खरीदना/)) {
      const productsResult = await pool.query(
        "SELECT crop_name, quantity, price_per_unit, district FROM products WHERE status = 'available' LIMIT 3"
      );
      if (productsResult.rows.length > 0) {
        const listings = productsResult.rows.map(p => `${p.crop_name} at ₹${p.price_per_unit}/kg`).join(', ');
        response = `Currently available in marketplace: ${listings}. Visit Marketplace to buy or list your crops.`;
        action = 'navigate_marketplace';
      } else {
        response = 'No products listed in marketplace right now. Be the first to list your crop!';
        action = 'navigate_marketplace';
      }
    }

    // PM-KISAN specific
    else if (lowerQuery.match(/pm.?kisan|kisan samman|6000/)) {
      response = 'PM-KISAN provides ₹6,000 per year to small farmers with less than 2 hectares of land, paid in 3 installments of ₹2,000. Register at pmkisan.gov.in or call 155261.';
      action = 'navigate_schemes';
    }

    // Profit calculation
    else if (lowerQuery.match(/profit|income|earn|loss|कमाई|मुनाफा/)) {
      response = 'Use the Market Prices section to calculate your profit. Enter your crop, quantity and transport cost to find the best market to sell and maximize your income.';
      action = 'navigate_market';
    }

    // Greeting
    else if (lowerQuery.match(/hello|hi|namaste|help|नमस्ते|मदद/)) {
      response = 'Namaste! I am AgriMind AI, your farming assistant. I can help you with: crop prices, disease detection, government schemes, crop recommendations, and marketplace. What do you need help with?';
    }

    // Default
    else {
      response = `I heard: "${query}". I can help with: market prices, crop recommendations, disease detection, government schemes, and marketplace. Please try asking about one of these topics.`;
    }

    res.json({
      success: true,
      query,
      response,
      language,
      action,
      data,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Voice query error:', err);
    res.status(500).json({ success: false, message: 'Error processing voice query' });
  }
};

module.exports = { processVoiceQuery };