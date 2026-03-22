const Groq = require('groq-sdk');
const pool = require('../config/database');
const fs = require('fs');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const suggestPrice = async (req, res) => {
  try {
    const { crop_name, quantity, user_suggested_price } = req.body;

    if (!crop_name) {
      return res.status(400).json({ success: false, message: 'Crop name is required' });
    }

    // Cleanup file
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    const qty = parseFloat(quantity) || 0;

    // Get market prices from DB
    const marketResult = await pool.query(
      'SELECT city, price_per_kg, state FROM market_prices WHERE LOWER(crop_name) = LOWER($1) ORDER BY price_per_kg DESC',
      [crop_name]
    );

    if (marketResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No market data for ${crop_name}. Try: Rice, Potato, Onion, Tomato`
      });
    }

    const prices = marketResult.rows.map(r => parseFloat(r.price_per_kg));
    const avgPrice = (prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(2);
    const maxPrice = Math.max(...prices);
    const minPrice = Math.min(...prices);
    const marketSummary = marketResult.rows.slice(0, 6)
      .map(m => `${m.city}: ₹${m.price_per_kg}/kg`).join(', ');

    // Ask Groq AI for price suggestion
    const prompt = `You are an expert agricultural price advisor for Indian farmers.

Crop: ${crop_name}
Quantity: ${qty} kg
Farmer's suggested price: ₹${user_suggested_price || 'not specified'}/kg
Current mandi prices: ${marketSummary}
Average price: ₹${avgPrice}/kg
Highest price: ₹${maxPrice}/kg
Lowest price: ₹${minPrice}/kg

Based on this real market data, analyze and suggest fair prices for different quality grades.

Respond ONLY in this exact JSON format, no extra text:
{
  "grade": "B",
  "quality_score": 7,
  "quality_description": "Good quality ${crop_name} based on current market standards",
  "min_price": ${Math.round(minPrice)},
  "max_price": ${Math.round(maxPrice)},
  "fair_price": ${Math.round(parseFloat(avgPrice))},
  "grade_a_price": ${Math.round(maxPrice * 1.15)},
  "grade_b_price": ${Math.round(parseFloat(avgPrice))},
  "grade_c_price": ${Math.round(parseFloat(avgPrice) * 0.8)},
  "grade_d_price": ${Math.round(parseFloat(avgPrice) * 0.6)},
  "farmer_feedback_status": "fair",
  "farmer_feedback": "Your price is fair based on current market",
  "negotiation_tip": "Sort and grade your crop before selling for 15-20% better price",
  "best_market": "${marketResult.rows[0].city}",
  "total_value": ${Math.round(parseFloat(avgPrice) * qty)}
}`;

    const response = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
      max_tokens: 500,
      temperature: 0.2
    });

    const responseText = response.choices[0].message.content;
    console.log('Groq Price Response:', responseText);

    let priceData;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON');
      priceData = JSON.parse(jsonMatch[0]);
    } catch (e) {
      priceData = {
        grade: 'B',
        quality_score: 7,
        quality_description: `Good quality ${crop_name}`,
        min_price: Math.round(minPrice),
        max_price: Math.round(maxPrice),
        fair_price: Math.round(parseFloat(avgPrice)),
        grade_a_price: Math.round(maxPrice * 1.15),
        grade_b_price: Math.round(parseFloat(avgPrice)),
        grade_c_price: Math.round(parseFloat(avgPrice) * 0.8),
        grade_d_price: Math.round(parseFloat(avgPrice) * 0.6),
        farmer_feedback_status: 'fair',
        farmer_feedback: `Fair price for ${crop_name} is ₹${avgPrice}/kg`,
        negotiation_tip: 'Sort and grade your crop before selling',
        best_market: marketResult.rows[0].city,
        total_value: Math.round(parseFloat(avgPrice) * qty)
      };
    }

    // Farmer price feedback
    let farmerPriceFeedback = null;
    if (user_suggested_price) {
      const suggested = parseFloat(user_suggested_price);
      if (suggested < priceData.grade_c_price) {
        farmerPriceFeedback = {
          status: 'too_low',
          message: `⚠️ Your price ₹${user_suggested_price}/kg is TOO LOW! Fair price is ₹${priceData.fair_price}/kg. You can earn more!`
        };
      } else if (suggested > priceData.grade_a_price * 1.2) {
        farmerPriceFeedback = {
          status: 'too_high',
          message: `📉 Your price ₹${user_suggested_price}/kg is TOO HIGH. Best market rate is ₹${priceData.max_price}/kg.`
        };
      } else {
        farmerPriceFeedback = {
          status: 'fair',
          message: `✅ Your price ₹${user_suggested_price}/kg is FAIR based on current market!`
        };
      }
    }

    res.json({
      success: true,
      crop_name,
      quantity: qty,
      analysis: {
        grade: priceData.grade,
        quality_score: priceData.quality_score,
        quality_description: priceData.quality_description,
        quality_issues: 'Upload crop photo for visual quality analysis',
        premium_factors: `Fresh ${crop_name} with good market demand`
      },
      price_suggestion: {
        min_price: priceData.min_price,
        max_price: priceData.max_price,
        fair_price: priceData.fair_price,
        price_range: `₹${priceData.min_price} - ₹${priceData.max_price} per kg`,
        recommended: `₹${priceData.fair_price} per kg`
      },
      grade_wise_prices: {
        'Grade A (Excellent)': `₹${priceData.grade_a_price}/kg`,
        'Grade B (Good)': `₹${priceData.grade_b_price}/kg`,
        'Grade C (Average)': `₹${priceData.grade_c_price}/kg`,
        'Grade D (Poor)': `₹${priceData.grade_d_price}/kg`
      },
      market_data: {
        average_market_price: avgPrice,
        highest_market_price: maxPrice,
        lowest_market_price: minPrice,
        best_market: priceData.best_market,
        markets: marketResult.rows.slice(0, 6)
      },
      farmer_price_feedback: farmerPriceFeedback,
      total_value: qty > 0 ? `₹${priceData.total_value.toLocaleString('en-IN')}` : null,
      negotiation_tip: priceData.negotiation_tip,
      powered_by: 'Groq AI (Llama 3.3)',
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    console.error('Price suggestion error:', err.message);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ success: false, message: 'Error: ' + err.message });
  }
};

module.exports = { suggestPrice };