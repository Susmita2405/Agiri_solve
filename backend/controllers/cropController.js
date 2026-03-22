const pool = require('../config/database');
const Groq = require('groq-sdk');

const getCurrentSeason = () => {
  const month = new Date().getMonth() + 1;
  if (month >= 6 && month <= 9) return 'kharif';
  if (month >= 10 || month <= 2) return 'rabi';
  return 'zaid';
};

const recommend = async (req, res) => {
  try {
    const { soil_type, state, land_size, season: inputSeason, water_availability, budget } = req.body;

    if (!soil_type || !land_size) {
      return res.status(400).json({
        success: false,
        message: 'Soil type and land size are required'
      });
    }

    const season = inputSeason || getCurrentSeason();
    const farmerState = state || 'West Bengal';
    const landSize = parseFloat(land_size) || 1;

    // Get market prices from DB for context
    let marketContext = '';
    try {
      const marketResult = await pool.query(
        'SELECT crop_name, AVG(price_per_kg) as avg_price FROM market_prices GROUP BY crop_name ORDER BY crop_name'
      );
      if (marketResult.rows.length > 0) {
        marketContext = 'Current market prices: ' + marketResult.rows
          .map(r => `${r.crop_name}: ₹${parseFloat(r.avg_price).toFixed(0)}/kg`)
          .join(', ');
      }
    } catch (dbErr) {
      console.log('Market data skipped');
    }

    // Call Groq AI for recommendations
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const prompt = `You are an expert agricultural advisor for Indian farmers.

Farmer Details:
- Location: ${farmerState}
- Land Size: ${landSize} acres
- Soil Type: ${soil_type}
- Season: ${season}
- Water Availability: ${water_availability || 'medium'}
- Budget: ₹${budget || 'flexible'}
${marketContext ? `- ${marketContext}` : ''}

Give TOP 5 crop recommendations for this farmer.

Respond ONLY in this exact JSON format, nothing else:
{
  "recommendations": [
    {
      "crop_name": "Rice",
      "season": "kharif",
      "suitability": "High",
      "expected_yield": "2000 kg",
      "estimated_cost": "₹15,000",
      "expected_revenue": "₹28,000",
      "expected_profit": "₹13,000",
      "growth_days": 120,
      "water_requirement": "high",
      "reasons": ["clay soil is ideal for Rice", "kharif is right season", "West Bengal has good conditions"]
    }
  ],
  "ai_advice": "2-3 lines of farming advice for this farmer",
  "explanation": "one line summary"
}`;

    const response = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
      max_tokens: 1500,
      temperature: 0.3
    });

    const responseText = response.choices[0].message.content;
    console.log('Groq Response:', responseText);

    // Parse JSON from response
    let parsed;
    try {
      // Extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found');
      parsed = JSON.parse(jsonMatch[0]);
    } catch (parseErr) {
      console.error('Parse error:', parseErr.message);
      return res.status(500).json({
        success: false,
        message: 'AI response parsing failed. Try again.'
      });
    }

    // Log to DB if user logged in
    try {
      if (req.user) {
        await pool.query(
          'INSERT INTO recommendation_logs (user_id, input_data, recommendations) VALUES ($1, $2, $3)',
          [req.user.userId, JSON.stringify(req.body), JSON.stringify(parsed.recommendations)]
        );
      }
    } catch (logErr) {
      console.log('Log skipped');
    }

    res.json({
      success: true,
      season_detected: season,
      recommendations: parsed.recommendations || [],
      ai_advice: parsed.ai_advice || '',
      explanation: parsed.explanation || `Based on ${soil_type} soil in ${farmerState} during ${season} season.`
    });

  } catch (err) {
    console.error('Crop recommend error:', err);
    res.status(500).json({
      success: false,
      message: 'Error: ' + err.message
    });
  }
};

module.exports = { recommend };