const pool = require('../config/database');

const getProfile = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.name, u.phone, u.role, u.created_at,
              p.district, p.state, p.land_size, p.land_unit, p.soil_type,
              p.crop_history, p.irrigation_type, p.annual_income
       FROM users u
       LEFT JOIN profiles p ON p.user_id = u.id
       WHERE u.id = $1`,
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, profile: result.rows[0] });
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { district, state, land_size, land_unit, soil_type, crop_history, irrigation_type, annual_income } = req.body;
    const userId = req.user.userId;

    const existing = await pool.query('SELECT id FROM profiles WHERE user_id = $1', [userId]);

    if (existing.rows.length > 0) {
      await pool.query(
        `UPDATE profiles SET district=$1, state=$2, land_size=$3, land_unit=$4, soil_type=$5,
         crop_history=$6, irrigation_type=$7, annual_income=$8, updated_at=CURRENT_TIMESTAMP
         WHERE user_id=$9`,
        [district, state || 'West Bengal', land_size, land_unit || 'acres', soil_type,
         crop_history || [], irrigation_type, annual_income, userId]
      );
    } else {
      await pool.query(
        `INSERT INTO profiles (user_id, district, state, land_size, land_unit, soil_type, crop_history, irrigation_type, annual_income)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [userId, district, state || 'West Bengal', land_size, land_unit || 'acres', soil_type,
         crop_history || [], irrigation_type, annual_income]
      );
    }

    const result = await pool.query(
      `SELECT u.id, u.name, u.phone, p.* FROM users u LEFT JOIN profiles p ON p.user_id = u.id WHERE u.id = $1`,
      [userId]
    );

    res.json({ success: true, message: 'Profile updated successfully', profile: result.rows[0] });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getProfile, updateProfile };