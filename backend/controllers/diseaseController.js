const { GoogleGenerativeAI } = require('@google/generative-ai');
const pool = require('../config/database');
const fs = require('fs');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const DISEASE_TREATMENTS = {
  'early blight': {
    treatment: 'Remove infected leaves immediately. Apply Mancozeb 75% WP at 2.5g/L water every 7 days.',
    medicine: 'Mancozeb (Dithane M-45), Chlorothalonil (Kavach)',
    medicine_cost: '₹200-350 per acre',
    organic: 'Spray neem oil (3ml/L) + baking soda (5g/L) mixture'
  },
  'late blight': {
    treatment: 'Apply Metalaxyl + Mancozeb (Ridomil Gold) at 2.5g/L. Remove all infected plants.',
    medicine: 'Ridomil Gold MZ, Curzate M8, Acrobat MZ',
    medicine_cost: '₹400-700 per acre',
    organic: 'Copper hydroxide spray, remove infected tissue immediately'
  },
  'leaf spot': {
    treatment: 'Apply Carbendazim 50% WP at 1g/L or Mancozeb 75% WP at 2.5g/L every 10 days.',
    medicine: 'Carbendazim (Bavistin), Mancozeb (Dithane M-45)',
    medicine_cost: '₹150-300 per acre',
    organic: 'Bordeaux mixture (1%), trichoderma solution spray'
  },
  'powdery mildew': {
    treatment: 'Apply Wettable Sulphur 80% WP at 3g/L. Ensure good air circulation in field.',
    medicine: 'Sulphur WP (Sulfex), Hexaconazole (Contaf)',
    medicine_cost: '₹120-250 per acre',
    organic: 'Baking soda spray (5g/L) or diluted milk spray (1:9)'
  },
  'bacterial blight': {
    treatment: 'Apply Copper Oxychloride 50% WP at 3g/L. Remove infected leaves and burn them.',
    medicine: 'Copper Oxychloride (Blitox), Streptomycin + Tetracycline',
    medicine_cost: '₹200-400 per acre',
    organic: 'Neem oil spray, remove infected parts, improve drainage'
  },
  'rust': {
    treatment: 'Apply Propiconazole 25% EC at 1ml/L or Tebuconazole 25.9% EC at 1ml/L.',
    medicine: 'Propiconazole (Tilt), Tebuconazole (Folicur)',
    medicine_cost: '₹250-450 per acre',
    organic: 'Sulfur dust, neem-based fungicide spray'
  },
  'mosaic virus': {
    treatment: 'No direct cure. Remove infected plants. Control aphid/whitefly vectors with insecticide.',
    medicine: 'Imidacloprid (Confidor) for vector control, Thiamethoxam (Actara)',
    medicine_cost: '₹200-350 per acre',
    organic: 'Yellow sticky traps, neem oil spray to control vectors'
  },
  'nutrient deficiency': {
    treatment: 'Apply balanced NPK fertilizer. Get soil tested for specific deficiency.',
    medicine: 'NPK 19:19:19, Micronutrient mixture, Zinc Sulphate',
    medicine_cost: '₹300-600 per acre',
    organic: 'Compost, vermicompost, green manure application'
  },
  'healthy': {
    treatment: 'Plant looks healthy! Continue current practices and monitor regularly.',
    medicine: 'No treatment needed',
    medicine_cost: '₹0',
    organic: 'Continue good agricultural practices'
  }
};

function getDefaultTreatment(diseaseName) {
  if (!diseaseName) return DISEASE_TREATMENTS['healthy'];
  const name = diseaseName.toLowerCase();
  for (const [key, value] of Object.entries(DISEASE_TREATMENTS)) {
    if (name.includes(key)) return value;
  }
  return {
    treatment: 'Consult your local KVK (Krishi Vigyan Kendra) immediately. Isolate affected plants.',
    medicine: 'Consult agricultural expert for specific medicine recommendation',
    medicine_cost: '₹200-500 per acre (estimated)',
    organic: 'Remove affected leaves/plants. Improve field hygiene and drainage.'
  };
}

const detectDisease = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a crop image'
      });
    }

    const cropName = req.body.crop_name || 'crop';
    const imageData = fs.readFileSync(req.file.path);
    const base64Image = imageData.toString('base64');
    const mimeType = req.file.mimetype || 'image/jpeg';

    let diseaseResult;

    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

      const prompt = `You are an expert plant pathologist AI specialized in Indian crops.

Carefully examine this ${cropName} plant/leaf image and diagnose any disease or health issue.

Provide your analysis in EXACTLY this format (no extra text):

DISEASE: [exact disease name or "Healthy Plant"]
CONFIDENCE: [number between 0-100]
HEALTHY: [yes or no]
SYMPTOMS: [describe exactly what you see in the image - color changes, spots, lesions, wilting etc]
CAUSE: [Fungal / Bacterial / Viral / Pest damage / Nutrient deficiency / Environmental stress]
SEVERITY: [Mild / Moderate / Severe]
TREATMENT: [Step by step treatment in simple language]
MEDICINE: [Specific medicine names available in Indian markets]
COST: [Approximate medicine cost in Indian Rupees per acre]
ORGANIC: [Natural/organic alternative treatment]
PREVENTION: [How to prevent this disease in future]
SPREAD_RISK: [Low / Medium / High - risk of spreading to other plants]`;

      const result = await model.generateContent([
        {
          inlineData: {
            mimeType: mimeType,
            data: base64Image
          }
        },
        prompt
      ]);

      const responseText = result.response.text();
      console.log('Gemini Disease Response:', responseText);

      // Parse response line by line
      const lines = responseText.split('\n');
      const getValue = (key) => {
        const line = lines.find(l => l.trim().startsWith(key + ':'));
        return line ? line.replace(key + ':', '').trim() : '';
      };

      const diseaseName = getValue('DISEASE') || 'Unable to determine';
      const confidence = parseInt(getValue('CONFIDENCE')) || 70;
      const isHealthy = getValue('HEALTHY').toLowerCase().includes('yes');
      const severity = getValue('SEVERITY') || 'Moderate';
      const treatment = getDefaultTreatment(diseaseName);

      diseaseResult = {
        disease_name: diseaseName,
        confidence: confidence,
        is_healthy: isHealthy,
        symptoms: getValue('SYMPTOMS') || 'Analysis complete - see treatment below',
        cause: getValue('CAUSE') || 'Unknown',
        severity: severity,
        spread_risk: getValue('SPREAD_RISK') || 'Medium',
        treatment: getValue('TREATMENT') || treatment.treatment,
        medicine: getValue('MEDICINE') || treatment.medicine,
        medicine_cost: getValue('COST') || treatment.medicine_cost,
        organic_treatment: getValue('ORGANIC') || treatment.organic,
        prevention: getValue('PREVENTION') || 'Maintain good field hygiene and crop rotation',
        source: 'Gemini Vision AI'
      };

    } catch (aiErr) {
      console.error('Gemini Vision error:', aiErr.message);

      // Smart fallback based on common diseases
      diseaseResult = {
        disease_name: 'Analysis Error - Retake Photo',
        confidence: 0,
        is_healthy: false,
        symptoms: 'Could not analyze image. Please retake in good daylight.',
        cause: 'Unknown',
        severity: 'Unknown',
        spread_risk: 'Unknown',
        treatment: 'Please retake photo in bright natural light and try again.',
        medicine: 'Cannot determine without proper image analysis',
        medicine_cost: 'Variable',
        organic_treatment: 'Remove visibly damaged leaves as precaution',
        prevention: 'Take photo in good lighting for accurate analysis',
        source: 'Error: ' + aiErr.message.substring(0, 100)
      };
    }

    // Clean up uploaded file
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    // Log to database if user is logged in
    try {
      if (req.user) {
        await pool.query(
          'INSERT INTO disease_logs (user_id, crop_name, disease_detected, confidence, treatment) VALUES ($1, $2, $3, $4, $5)',
          [req.user.userId, cropName, diseaseResult.disease_name, diseaseResult.confidence, diseaseResult.treatment]
        );
      }
    } catch (dbErr) {
      console.error('DB log error:', dbErr.message);
    }

    res.json({
      success: true,
      result: diseaseResult,
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    console.error('Disease detection error:', err);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({
      success: false,
      message: 'Error during disease detection: ' + err.message
    });
  }
};

module.exports = { detectDisease };