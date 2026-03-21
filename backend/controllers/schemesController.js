const pool = require('../config/database');

const getSchemes = async (req, res) => {
  try {
    const { state, category, status = 'active', search } = req.query;

    let query = 'SELECT * FROM schemes WHERE 1=1';
    const params = [];
    let paramIdx = 1;

    if (status) {
      query += ` AND status = $${paramIdx++}`;
      params.push(status);
    }
    if (state) {
      query += ` AND (state = $${paramIdx++} OR state = 'Central')`;
      params.push(state);
    }
    if (category) {
      query += ` AND category = $${paramIdx++}`;
      params.push(category);
    }
    if (search) {
      query += ` AND (LOWER(scheme_name) LIKE LOWER($${paramIdx}) OR LOWER(description) LIKE LOWER($${paramIdx}))`;
      params.push(`%${search}%`);
      paramIdx++;
    }

    query += ' ORDER BY state = \'Central\' DESC, scheme_name ASC';

    const result = await pool.query(query, params);

    // Get categories for filter
    const categoriesResult = await pool.query('SELECT DISTINCT category FROM schemes ORDER BY category');

    res.json({
      success: true,
      total: result.rows.length,
      schemes: result.rows,
      categories: categoriesResult.rows.map(r => r.category)
    });
  } catch (err) {
    console.error('Get schemes error:', err);
    res.status(500).json({ success: false, message: 'Error fetching schemes' });
  }
};

const checkEligibility = async (req, res) => {
  try {
    const { land_size, state, annual_income, farmer_type, age, crops } = req.body;

    if (!land_size) {
      return res.status(400).json({ success: false, message: 'Land size is required for eligibility check' });
    }

    const landSize = parseFloat(land_size);
    const income = annual_income ? parseFloat(annual_income) : null;
    const farmerState = state || 'West Bengal';

    // Get all active schemes
    const result = await pool.query(
      "SELECT * FROM schemes WHERE status = 'active' ORDER BY scheme_name"
    );

    const eligibleSchemes = [];
    const ineligibleSchemes = [];

    result.rows.forEach(scheme => {
      const reasons = [];
      const eligibilityNotes = [];
      let isEligible = true;

      // State check: Central schemes are available to all, state schemes only to that state
      if (scheme.state !== 'Central' && scheme.state !== farmerState) {
        isEligible = false;
        eligibilityNotes.push(`This scheme is only for ${scheme.state} residents`);
      } else {
        if (scheme.state === 'Central') {
          reasons.push('✅ Available to all Indian farmers');
        } else {
          reasons.push(`✅ You are a ${farmerState} farmer, eligible for this state scheme`);
        }
      }

      // Land size check
      if (scheme.max_land_size && landSize > scheme.max_land_size) {
        isEligible = false;
        eligibilityNotes.push(`Requires land ≤ ${scheme.max_land_size} hectares (you have ${landSize} acres)`);
      } else if (scheme.max_land_size) {
        reasons.push(`✅ Your land size (${landSize} acres ≈ ${(landSize * 0.405).toFixed(2)} ha) is within limit of ${scheme.max_land_size} ha`);
      }

      if (scheme.min_land_size && landSize < scheme.min_land_size) {
        isEligible = false;
        eligibilityNotes.push(`Requires minimum ${scheme.min_land_size} acres of land`);
      }

      // Income check
      if (income !== null && scheme.max_income && income > scheme.max_income) {
        isEligible = false;
        eligibilityNotes.push(`Income limit: ₹${scheme.max_income.toLocaleString('en-IN')}/year`);
      } else if (income !== null && scheme.max_income) {
        reasons.push(`✅ Your income is within the scheme's limit`);
      }

      // Special checks
      // PM-KISAN: land < 2 hectares (approx 5 acres)
      if (scheme.scheme_name.includes('PM-KISAN')) {
        const landInHectares = landSize * 0.405;
        if (landInHectares <= 2) {
          reasons.push(`✅ You qualify as small/marginal farmer (< 2 ha)`);
        } else {
          isEligible = false;
          eligibilityNotes.push('PM-KISAN is only for small/marginal farmers with ≤ 2 hectares');
        }
      }

      if (isEligible) {
        eligibleSchemes.push({
          ...scheme,
          eligibility_reasons: reasons,
          action: 'Apply Now'
        });
      } else {
        ineligibleSchemes.push({
          ...scheme,
          ineligibility_reasons: eligibilityNotes
        });
      }
    });

    res.json({
      success: true,
      farmer_profile: {
        land_size: landSize,
        state: farmerState,
        annual_income: income,
        farmer_type: farmer_type || 'General'
      },
      eligible_count: eligibleSchemes.length,
      eligible_schemes: eligibleSchemes,
      ineligible_schemes: ineligibleSchemes,
      summary: `You are eligible for ${eligibleSchemes.length} government schemes based on your profile!`
    });
  } catch (err) {
    console.error('Check eligibility error:', err);
    res.status(500).json({ success: false, message: 'Error checking eligibility' });
  }
};

const getSchemeById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM schemes WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Scheme not found' });
    }
    res.json({ success: true, scheme: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getSchemes, checkEligibility, getSchemeById };