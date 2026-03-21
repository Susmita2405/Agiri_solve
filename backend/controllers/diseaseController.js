const axios = require('axios');
const pool = require('../config/database');
const fs = require('fs');

// Disease treatment database
const DISEASE_TREATMENTS = {
  'bacterial blight': {
    treatment: 'Remove infected leaves. Apply copper-based bactericide (Copper Oxychloride 50% WP) at 3g/L. Improve field drainage.',
    medicine: 'Copper Oxychloride (Blitox), Streptomycin',
    medicine_cost: '₹150-300 per acre',
    organic: 'Spray neem oil solution (3ml/L) + garlic extract'
  },
  'leaf spot': {
    treatment: 'Apply Mancozeb 75% WP at 2.5g/L or Carbendazim 50% WP at 1g/L. Remove and burn infected leaves.',
    medicine: 'Mancozeb (Dithane M-45), Carbendazim (Bavistin)',
    medicine_cost: '₹120-250 per acre',
    organic: 'Spray Bordeaux mixture (1%) or trichoderma solution'
  },
  'rust': {
    treatment: 'Apply Propiconazole 25% EC at 1ml/L or Hexaconazole 5% EC at 2ml/L. Early morning application preferred.',
    medicine: 'Propiconazole (Tilt), Hexaconazole (Contaf)',
    medicine_cost: '₹200-400 per acre',
    organic: 'Sulfur dust application or neem-based spray'
  },
  'powdery mildew': {
    treatment: 'Apply Wettable Sulphur 80% WP at 3g/L or Triadimefon 25% WP at 1g/L. Avoid overhead irrigation.',
    medicine: 'Sulphur WP (Sulfex), Triadimefon (Bayleton)',
    medicine_cost: '₹100-200 per acre',
    organic: 'Baking soda spray (5g/L) or milk spray (1:9 ratio)'
  },
  'late blight': {
    treatment: 'Apply Metalaxyl + Mancozeb (Ridomil Gold) at 2.5g/L or Cymoxanil + Mancozeb at 2g/L preventively.',
    medicine: 'Ridomil Gold MZ, Curzate M8',
    medicine_cost: '₹350-600 per acre',
    organic: 'Copper hydroxide spray, remove infected tissue immediately'
  },
  'early blight': {
    treatment: 'Apply Chlorothalonil 75% WP at 2g/L or Azoxystrobin 23% SC at 1ml/L.',
    medicine: 'Chlorothalonil (Kavach), Azoxystrobin (Amistar)',
    medicine_cost: '₹250-450 per acre',
    organic: 'Compost tea spray, copper-based fungicide'
  },
  'mosaic virus': {
    treatment: 'No direct cure. Remove and destroy infected plants. Control aphid vectors with Imidacloprid 17.8% SL at 0.5ml/L.',
    medicine: 'Imidacloprid (Confidor) for vector control',
    medicine_cost: '₹200-350 per acre',
    organic: 'Reflective mulch to repel aphids, neem oil spray'
  },
  'yellow mosaic': {
    treatment: 'Remove infected plants. Apply Thiamethoxam 25% WG at 0.2g/L to control whitefly vectors.',
    medicine: 'Thiamethoxam (Actara), Acetamiprid (Pride)',
    medicine_cost: '₹150-300 per acre',
    organic: 'Yellow sticky traps, neem-based insecticides'
  },
  'healthy': {
    treatment: 'Plant looks healthy! Continue regular monitoring and preventive care.',
    medicine: 'No treatment needed',
    medicine_cost: '₹0',
    organic: 'Maintain good agricultural practices'
  }
};

const getDefaultTreatment = (diseaseName) => {
  const name = diseaseName.toLowerCase();
  for (const [key, value] of Object.entries(DISEASE_TREATMENTS)) {
    if (name.includes(key)) return value;
  }
  return {
    treatment: 'Consult your local Agricultural Extension Officer or Krishi Vigyan Kendra (KVK). Isolate affected plants.',
    medicine: 'Consult expert for specific recommendation',
    medicine_cost: 'Variable',
    organic: 'Remove affected leaves/plants and maintain proper spacing'
  };
};

const detectDisease = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload a crop image' });
    }

    const apiKey = process.env.PLANT_ID_API_KEY;
    
    // Read the uploaded image
    const imageData = fs.readFileSync(req.file.path);
    const base64Image = imageData.toString('base64');

    let diseaseResult;
    let isApiSuccess = false;

    if (apiKey && apiKey !== 'your_plantid_api_key_here') {
      try {
        // Call Plant.id API v3
        const response = await axios.post(
          'https://api.plant.id/v2/health_assessment',
          {
            images: [base64Image],
            modifiers: ['crops_fast', 'similar_images'],
            disease_details: ['description', 'treatment', 'classification', 'common_names', 'url']
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'Api-Key': apiKey
            },
            timeout: 15000
          }
        );

        const data = response.data;
        isApiSuccess = true;

        if (data.health_assessment && data.health_assessment.diseases) {
          const topDisease = data.health_assessment.diseases[0];
          const isHealthy = data.health_assessment.is_healthy;

          if (isHealthy || (topDisease && topDisease.probability < 0.2)) {
            diseaseResult = {
              disease_name: 'Healthy Plant',
              confidence: Math.round((1 - (topDisease?.probability || 0)) * 100),
              is_healthy: true,
              treatment: DISEASE_TREATMENTS.healthy.treatment,
              medicine: DISEASE_TREATMENTS.healthy.medicine,
              medicine_cost: DISEASE_TREATMENTS.healthy.medicine_cost,
              organic_treatment: DISEASE_TREATMENTS.healthy.organic,
              source: 'Plant.id API'
            };
          } else {
            const treatment = getDefaultTreatment(topDisease.name);
            const apiTreatment = topDisease.disease_details?.treatment;

            diseaseResult = {
              disease_name: topDisease.name,
              confidence: Math.round(topDisease.probability * 100),
              is_healthy: false,
              description: topDisease.disease_details?.description?.split('.')[0] || '',
              treatment: apiTreatment?.biological?.[0] || treatment.treatment,
              chemical_treatment: apiTreatment?.chemical?.[0] || treatment.treatment,
              medicine: treatment.medicine,
              medicine_cost: treatment.medicine_cost,
              organic_treatment: treatment.organic,
              prevention: topDisease.disease_details?.treatment?.prevention?.[0] || 'Maintain good field hygiene',
              source: 'Plant.id API',
              similar_diseases: data.health_assessment.diseases.slice(1, 3).map(d => ({
                name: d.name,
                confidence: Math.round(d.probability * 100)
              }))
            };
          }
        }
      } catch (apiErr) {
        console.error('Plant.id API error:', apiErr.message);
        isApiSuccess = false;
      }
    }

    // Fallback: Rule-based detection using filename hints or return mock
    if (!isApiSuccess) {
      // Simulate a demo result for testing without API key
      const mockDiseases = [
        { name: 'Leaf Blight (Demo)', probability: 0.78 },
        { name: 'Fungal Spot', probability: 0.45 },
        { name: 'Healthy', probability: 0.22 }
      ];
      const randomDisease = mockDiseases[Math.floor(Math.random() * mockDiseases.length)];
      const treatment = getDefaultTreatment(randomDisease.name);

      diseaseResult = {
        disease_name: randomDisease.name + ' [Demo Mode]',
        confidence: Math.round(randomDisease.probability * 100),
        is_healthy: randomDisease.name.toLowerCase() === 'healthy',
        treatment: treatment.treatment,
        medicine: treatment.medicine,
        medicine_cost: treatment.medicine_cost,
        organic_treatment: treatment.organic,
        source: 'Demo Mode - Add PLANT_ID_API_KEY for real detection',
        note: 'Please configure Plant.id API key for accurate disease detection'
      };
    }

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    // Log to database
    if (req.user) {
      await pool.query(
        'INSERT INTO disease_logs (user_id, disease_detected, confidence, treatment, api_response) VALUES ($1, $2, $3, $4, $5)',
        [req.user.userId, diseaseResult.disease_name, diseaseResult.confidence, diseaseResult.treatment, JSON.stringify(diseaseResult)]
      );
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
    res.status(500).json({ success: false, message: 'Error during disease detection' });
  }
};

module.exports = { detectDisease };