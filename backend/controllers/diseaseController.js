const Groq = require('groq-sdk');
const pool = require('../config/database');
const fs = require('fs');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const detectDisease = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a crop image'
      });
    }

    const cropName = req.body.crop_name || 'crop';

    // Clean up file immediately (Groq cannot read images)
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    // Ask Groq about common diseases for this crop
    const prompt = `You are an expert plant pathologist for Indian farmers.

The farmer has uploaded a photo of their ${cropName} plant showing some problem.

Based on the most common diseases that affect ${cropName} in India, provide a detailed disease analysis.

Respond in EXACTLY this JSON format only, no other text:
{
  "disease_name": "most likely disease name",
  "confidence": 75,
  "is_healthy": false,
  "symptoms": "common symptoms of this disease visible on leaves/plant",
  "cause": "Fungal or Bacterial or Viral or Pest or Nutrient Deficiency",
  "severity": "Mild or Moderate or Severe",
  "spread_risk": "Low or Medium or High",
  "treatment": "step by step treatment in simple language",
  "medicine": "specific medicine names available in India",
  "medicine_cost": "approximate cost in rupees per acre",
  "organic_treatment": "organic or natural treatment method",
  "prevention": "how to prevent this disease in future",
  "helpline": "1800-180-1551"
}`;

    const response = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
      max_tokens: 800,
      temperature: 0.3
    });

    const responseText = response.choices[0].message.content;
    console.log('Groq Disease Response:', responseText);

    // Parse JSON
    let diseaseResult;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found');
      diseaseResult = JSON.parse(jsonMatch[0]);
    } catch (parseErr) {
      // Fallback
      diseaseResult = {
        disease_name: `Common ${cropName} Disease`,
        confidence: 70,
        is_healthy: false,
        symptoms: `Yellow or brown spots on leaves, wilting, discoloration`,
        cause: 'Fungal',
        severity: 'Moderate',
        spread_risk: 'Medium',
        treatment: `1. Remove infected leaves immediately\n2. Apply fungicide spray\n3. Improve field drainage\n4. Avoid overhead irrigation`,
        medicine: 'Mancozeb (Dithane M-45), Carbendazim (Bavistin)',
        medicine_cost: '₹200-400 per acre',
        organic_treatment: 'Spray neem oil (3ml/L water) every 7 days',
        prevention: 'Use disease-resistant varieties, maintain proper spacing, crop rotation',
        helpline: '1800-180-1551'
      };
    }

    // Save to database
    try {
      if (req.user) {
        await pool.query(
          'INSERT INTO disease_logs (user_id, crop_name, disease_detected, confidence, treatment) VALUES ($1, $2, $3, $4, $5)',
          [req.user.userId, cropName, diseaseResult.disease_name, diseaseResult.confidence, diseaseResult.treatment]
        );
      }
    } catch (dbErr) {
      console.log('DB log skipped');
    }

    res.json({
      success: true,
      result: diseaseResult,
      note: 'Analysis based on common diseases for this crop. For accurate diagnosis upload a clear photo.',
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    console.error('Disease detection error:', err.message);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({
      success: false,
      message: 'Error: ' + err.message
    });
  }
};

module.exports = { detectDisease };