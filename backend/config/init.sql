-- AgriMind AI Database Schema
-- Run this file to initialize the database

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(15) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'farmer' CHECK (role IN ('farmer', 'buyer', 'admin')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Farmer Profiles Table
CREATE TABLE IF NOT EXISTS profiles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  district VARCHAR(100),
  state VARCHAR(100) DEFAULT 'West Bengal',
  land_size DECIMAL(10,2),
  land_unit VARCHAR(20) DEFAULT 'acres',
  soil_type VARCHAR(50) CHECK (soil_type IN ('clay', 'sandy', 'loamy', 'silt', 'peaty', 'chalky', 'mixed')),
  crop_history TEXT[],
  irrigation_type VARCHAR(50),
  annual_income DECIMAL(12,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crops Reference Table
CREATE TABLE IF NOT EXISTS crops (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  season VARCHAR(50) CHECK (season IN ('kharif', 'rabi', 'zaid', 'perennial')),
  suitable_soil TEXT[],
  water_requirement VARCHAR(50),
  temperature_min INTEGER,
  temperature_max INTEGER,
  growth_days INTEGER,
  cost_per_acre DECIMAL(10,2),
  yield_per_acre DECIMAL(10,2),
  yield_unit VARCHAR(20) DEFAULT 'kg',
  description TEXT,
  states TEXT[]
);

-- Market Prices Table
CREATE TABLE IF NOT EXISTS market_prices (
  id SERIAL PRIMARY KEY,
  city VARCHAR(100) NOT NULL,
  state VARCHAR(100) NOT NULL,
  crop_name VARCHAR(100) NOT NULL,
  price_per_kg DECIMAL(10,2) NOT NULL,
  market_name VARCHAR(100),
  date_recorded DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Government Schemes Table
CREATE TABLE IF NOT EXISTS schemes (
  id SERIAL PRIMARY KEY,
  scheme_name VARCHAR(255) NOT NULL,
  description TEXT,
  eligibility TEXT,
  benefits TEXT,
  state VARCHAR(100) DEFAULT 'Central',
  category VARCHAR(100) CHECK (category IN ('loan', 'subsidy', 'insurance', 'training', 'equipment', 'seed', 'irrigation', 'income_support', 'other')),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'upcoming')),
  min_land_size DECIMAL(10,2),
  max_land_size DECIMAL(10,2),
  min_income DECIMAL(12,2),
  max_income DECIMAL(12,2),
  application_url TEXT,
  helpline VARCHAR(50),
  launch_year INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Marketplace Products Table
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  farmer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  crop_name VARCHAR(100) NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  quantity_unit VARCHAR(20) DEFAULT 'kg',
  price_per_unit DECIMAL(10,2) NOT NULL,
  location VARCHAR(200),
  district VARCHAR(100),
  state VARCHAR(100),
  description TEXT,
  status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'sold', 'reserved')),
  image_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Orders Table
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
  buyer_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  farmer_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  quantity DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(12,2) NOT NULL,
  status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')),
  buyer_name VARCHAR(100),
  buyer_phone VARCHAR(15),
  delivery_address TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Disease Detection Logs Table
CREATE TABLE IF NOT EXISTS disease_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  crop_name VARCHAR(100),
  disease_detected VARCHAR(255),
  confidence DECIMAL(5,2),
  treatment TEXT,
  image_url TEXT,
  api_response JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crop Recommendations Log
CREATE TABLE IF NOT EXISTS recommendation_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  input_data JSONB,
  recommendations JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- SEED DATA
-- ============================================

-- Insert Crops Data
INSERT INTO crops (name, season, suitable_soil, water_requirement, temperature_min, temperature_max, growth_days, cost_per_acre, yield_per_acre, yield_unit, description, states) VALUES
('Rice', 'kharif', ARRAY['clay', 'loamy', 'silt'], 'high', 20, 40, 120, 15000, 2000, 'kg', 'Staple crop of India, needs high water and warm climate', ARRAY['West Bengal', 'Bihar', 'Odisha', 'Tamil Nadu', 'Andhra Pradesh']),
('Wheat', 'rabi', ARRAY['loamy', 'clay', 'mixed'], 'medium', 5, 25, 110, 12000, 1800, 'kg', 'Major rabi crop grown in winter season', ARRAY['Punjab', 'Haryana', 'Uttar Pradesh', 'Madhya Pradesh', 'Rajasthan']),
('Potato', 'rabi', ARRAY['loamy', 'sandy', 'mixed'], 'medium', 10, 20, 90, 20000, 8000, 'kg', 'Cash crop with high market demand', ARRAY['West Bengal', 'Uttar Pradesh', 'Bihar', 'Gujarat', 'Punjab']),
('Onion', 'rabi', ARRAY['loamy', 'sandy'], 'low', 13, 35, 120, 18000, 5000, 'kg', 'High-value vegetable with year-round demand', ARRAY['Maharashtra', 'Karnataka', 'Madhya Pradesh', 'Andhra Pradesh', 'West Bengal']),
('Tomato', 'kharif', ARRAY['loamy', 'sandy', 'mixed'], 'medium', 15, 30, 75, 22000, 6000, 'kg', 'Popular vegetable, good market prices', ARRAY['Andhra Pradesh', 'Karnataka', 'Tamil Nadu', 'Maharashtra', 'West Bengal']),
('Mustard', 'rabi', ARRAY['loamy', 'clay', 'mixed'], 'low', 5, 25, 90, 8000, 1200, 'kg', 'Oil seed crop, good for dry regions', ARRAY['Rajasthan', 'Uttar Pradesh', 'Haryana', 'West Bengal', 'Madhya Pradesh']),
('Jute', 'kharif', ARRAY['loamy', 'clay', 'silt'], 'high', 24, 38, 120, 16000, 2500, 'kg', 'Fiber crop, Bengal specialty', ARRAY['West Bengal', 'Bihar', 'Assam', 'Odisha']),
('Maize', 'kharif', ARRAY['loamy', 'sandy', 'mixed'], 'medium', 18, 35, 90, 10000, 2500, 'kg', 'Versatile crop for food and feed', ARRAY['Karnataka', 'Rajasthan', 'Andhra Pradesh', 'Bihar', 'Uttar Pradesh']),
('Sugarcane', 'perennial', ARRAY['loamy', 'clay', 'mixed'], 'high', 20, 38, 365, 35000, 40000, 'kg', 'Cash crop with guaranteed pricing', ARRAY['Uttar Pradesh', 'Maharashtra', 'Karnataka', 'Tamil Nadu', 'Andhra Pradesh']),
('Cauliflower', 'rabi', ARRAY['loamy', 'sandy'], 'medium', 10, 22, 60, 25000, 4000, 'kg', 'Popular vegetable, cold weather crop', ARRAY['West Bengal', 'Bihar', 'Odisha', 'Haryana', 'Uttar Pradesh']),
('Brinjal', 'kharif', ARRAY['loamy', 'sandy', 'mixed'], 'medium', 20, 35, 75, 18000, 5000, 'kg', 'Year-round vegetable crop', ARRAY['West Bengal', 'Odisha', 'Karnataka', 'Andhra Pradesh', 'Maharashtra']),
('Green Pea', 'rabi', ARRAY['loamy', 'sandy'], 'low', 8, 22, 70, 15000, 2000, 'kg', 'Winter vegetable with good market demand', ARRAY['West Bengal', 'Uttar Pradesh', 'Himachal Pradesh', 'Punjab', 'Haryana'])
ON CONFLICT DO NOTHING;

-- Insert Market Prices (West Bengal + Major Cities)
INSERT INTO market_prices (city, state, crop_name, price_per_kg, market_name) VALUES
('Kolkata', 'West Bengal', 'Rice', 28, 'Koley Market'),
('Kolkata', 'West Bengal', 'Potato', 18, 'Koley Market'),
('Kolkata', 'West Bengal', 'Onion', 35, 'Koley Market'),
('Kolkata', 'West Bengal', 'Tomato', 25, 'Koley Market'),
('Kolkata', 'West Bengal', 'Cauliflower', 22, 'Koley Market'),
('Kolkata', 'West Bengal', 'Brinjal', 20, 'Koley Market'),
('Kolkata', 'West Bengal', 'Jute', 45, 'Kolkata Jute Market'),
('Kolkata', 'West Bengal', 'Mustard', 55, 'Koley Market'),
('Durgapur', 'West Bengal', 'Rice', 26, 'Durgapur Mandi'),
('Durgapur', 'West Bengal', 'Potato', 15, 'Durgapur Mandi'),
('Durgapur', 'West Bengal', 'Onion', 30, 'Durgapur Mandi'),
('Durgapur', 'West Bengal', 'Tomato', 20, 'Durgapur Mandi'),
('Durgapur', 'West Bengal', 'Cauliflower', 18, 'Durgapur Mandi'),
('Durgapur', 'West Bengal', 'Brinjal', 16, 'Durgapur Mandi'),
('Durgapur', 'West Bengal', 'Mustard', 50, 'Durgapur Mandi'),
('Asansol', 'West Bengal', 'Rice', 27, 'Asansol Mandi'),
('Asansol', 'West Bengal', 'Potato', 16, 'Asansol Mandi'),
('Asansol', 'West Bengal', 'Onion', 32, 'Asansol Mandi'),
('Asansol', 'West Bengal', 'Tomato', 22, 'Asansol Mandi'),
('Asansol', 'West Bengal', 'Cauliflower', 20, 'Asansol Mandi'),
('Siliguri', 'West Bengal', 'Rice', 30, 'Siliguri Mandi'),
('Siliguri', 'West Bengal', 'Potato', 20, 'Siliguri Mandi'),
('Siliguri', 'West Bengal', 'Onion', 38, 'Siliguri Mandi'),
('Siliguri', 'West Bengal', 'Tomato', 28, 'Siliguri Mandi'),
('Howrah', 'West Bengal', 'Rice', 29, 'Howrah Mandi'),
('Howrah', 'West Bengal', 'Potato', 17, 'Howrah Mandi'),
('Howrah', 'West Bengal', 'Onion', 34, 'Howrah Mandi'),
('Howrah', 'West Bengal', 'Tomato', 24, 'Howrah Mandi'),
('Delhi', 'Delhi', 'Rice', 32, 'Azadpur Mandi'),
('Delhi', 'Delhi', 'Potato', 22, 'Azadpur Mandi'),
('Delhi', 'Delhi', 'Onion', 40, 'Azadpur Mandi'),
('Delhi', 'Delhi', 'Tomato', 30, 'Azadpur Mandi'),
('Mumbai', 'Maharashtra', 'Rice', 35, 'APMC Vashi'),
('Mumbai', 'Maharashtra', 'Potato', 25, 'APMC Vashi'),
('Mumbai', 'Maharashtra', 'Onion', 42, 'APMC Vashi'),
('Mumbai', 'Maharashtra', 'Tomato', 35, 'APMC Vashi'),
('Bhubaneswar', 'Odisha', 'Rice', 25, 'Bhubaneswar Mandi'),
('Bhubaneswar', 'Odisha', 'Potato', 14, 'Bhubaneswar Mandi'),
('Patna', 'Bihar', 'Rice', 26, 'Patna Mandi'),
('Patna', 'Bihar', 'Wheat', 24, 'Patna Mandi'),
('Patna', 'Bihar', 'Potato', 14, 'Patna Mandi'),
('Patna', 'Bihar', 'Maize', 18, 'Patna Mandi')
ON CONFLICT DO NOTHING;

-- Insert Government Schemes
INSERT INTO schemes (scheme_name, description, eligibility, benefits, state, category, status, min_land_size, max_land_size, max_income, application_url, helpline, launch_year) VALUES
('PM-KISAN (Pradhan Mantri Kisan Samman Nidhi)', 'Direct income support to small and marginal farmers. Under this scheme, ₹6000 per year is provided to eligible farmer families in three equal installments of ₹2000.', 'All small and marginal farmer families with cultivable land up to 2 hectares.', '₹6,000 per year in 3 installments of ₹2,000 directly credited to bank account via DBT', 'Central', 'income_support', 'active', 0.01, 2.00, 1500000, 'https://pmkisan.gov.in', '155261', 2019),
('Pradhan Mantri Fasal Bima Yojana (PMFBY)', 'Crop insurance scheme to provide financial support to farmers suffering crop loss/damage due to unforeseen events like natural calamities, pests and diseases.', 'All farmers growing notified crops in notified areas.', 'Insurance coverage against crop loss. Premium: 2% for Kharif, 1.5% for Rabi, 5% for annual commercial crops.', 'Central', 'insurance', 'active', NULL, NULL, NULL, 'https://pmfby.gov.in', '14447', 2016),
('Kisan Credit Card (KCC)', 'Provides farmers with timely credit for their agricultural operations and short-term credit requirements.', 'All farmers, sharecroppers, tenant farmers, and self-help groups.', 'Credit up to ₹3 lakh at subsidized interest rate of 4% per annum. No collateral for loans up to ₹1.6 lakh.', 'Central', 'loan', 'active', NULL, NULL, NULL, 'https://www.nabard.org/kisan-credit-card', '1800-180-1551', 1998),
('PM Krishi Sinchayee Yojana (PMKSY)', 'Scheme for expanding cultivable area under assured irrigation and improving water use efficiency.', 'All farmers, especially those in water-stressed areas.', 'Subsidized drip/sprinkler irrigation systems. 55% subsidy for small and marginal farmers.', 'Central', 'irrigation', 'active', NULL, NULL, NULL, 'https://pmksy.gov.in', '1800-180-1551', 2015),
('Soil Health Card Scheme', 'Provides soil health cards to farmers which carry crop-wise recommendations of nutrients and fertilizers.', 'All farmers with agricultural land. Soil testing done every 2 years.', 'Free soil health card with nutrient status and recommendations. Helps optimize fertilizer use.', 'Central', 'other', 'active', NULL, NULL, NULL, 'https://soilhealth.dac.gov.in', '1800-180-1551', 2015),
('National Agriculture Market (eNAM)', 'Pan-India electronic trading portal that networks existing APMC mandis to create a unified national market.', 'Farmers registered with their local APMC mandi. Need Aadhaar card and bank account.', 'Better price discovery, reduced transaction costs, wider market access, direct payment to bank account.', 'Central', 'other', 'active', NULL, NULL, NULL, 'https://www.enam.gov.in', '1800-270-0224', 2016),
('Pradhan Mantri Kisan Maandhan Yojana', 'Voluntary and contributory pension scheme for small and marginal farmers.', 'Small and marginal farmers aged 18-40 years with cultivable land up to 2 hectares.', 'Monthly pension of ₹3,000 after age 60. Matching contribution by government. Life coverage of ₹2 lakh.', 'Central', 'other', 'active', NULL, 2.00, NULL, 'https://maandhan.in', '1800-267-6888', 2019),
('Agriculture Infrastructure Fund', 'Financing facility for investment in viable projects for post-harvest management infrastructure.', 'Farmers, FPOs, PACS, Marketing Cooperative Societies, SHGs, Agri-entrepreneurs.', 'Interest subvention of 3% per annum for loans up to ₹2 crore. Credit Guarantee coverage through CGTMSE.', 'Central', 'loan', 'active', NULL, NULL, NULL, 'https://agriinfra.dac.gov.in', '1551', 2020),
('Bangla Shasya Bima (BSB)', 'State crop insurance scheme by West Bengal government to provide financial assistance for crop losses.', 'All farmers in West Bengal. Free insurance for small and marginal farmers.', 'Free crop insurance for small farmers. Coverage against natural disasters, drought, flood, cyclone.', 'West Bengal', 'insurance', 'active', NULL, NULL, NULL, 'https://wb.gov.in/agri', '18001030204', 2019),
('Krishak Bandhu Scheme (West Bengal)', 'West Bengal government scheme providing financial assistance to farmers and death benefit.', 'All farmers in West Bengal with minimum 1 bigha land.', '₹10,000 per year for farmers with 1 acre+. ₹2 lakh death benefit. Paid in two installments.', 'West Bengal', 'income_support', 'active', 0.33, NULL, NULL, 'https://krishakbandhu.net', '18001800110', 2019),
('West Bengal Sabar Shasya Bima', 'Additional crop insurance for farmers in West Bengal covering crops not covered under central schemes.', 'Farmers in West Bengal growing notified crops. Small and marginal farmers exempted from premium.', 'Coverage for additional crops. Zero premium for small and marginal farmers. Quick claim settlement.', 'West Bengal', 'insurance', 'active', NULL, NULL, NULL, 'https://wb.gov.in/agri', '18001030204', 2020),
('RKVY (Rashtriya Krishi Vikas Yojana)', 'Scheme to incentivize states to increase public investment in agriculture and allied sectors.', 'All farmers and farming communities. State governments identify beneficiaries based on need.', 'Assistance for farming infrastructure, technology adoption, post-harvest management.', 'Central', 'subsidy', 'active', NULL, NULL, NULL, 'https://rkvy.nic.in', '1800-180-1551', 2007),
('Paramparagat Krishi Vikas Yojana (PKVY)', 'Scheme to promote organic farming to improve soil health and increase net income of farmers.', 'Farmers willing to adopt organic farming practices. Cluster approach with minimum 50 farmers.', 'Financial assistance of ₹50,000 per hectare over 3 years. Support for certification and marketing.', 'Central', 'subsidy', 'active', NULL, NULL, NULL, 'https://pgsindia-ncof.gov.in', '1800-180-1551', 2015),
('Sub-Mission on Agricultural Mechanization (SMAM)', 'Scheme for increasing farm power availability and bringing more area under mechanized cultivation.', 'All farmers. Higher subsidy for small, marginal, SC/ST farmers.', 'Subsidy on agricultural machinery: 40-50% for general farmers, 50-80% for SC/ST/small/marginal farmers.', 'Central', 'equipment', 'active', NULL, NULL, NULL, 'https://farmech.dac.gov.in', '1800-180-1551', 2014),
('Pradhan Mantri Kisan SAMPADA Yojana', 'Comprehensive package aimed at creating modern infrastructure with efficient supply chain management.', 'Farmers, FPOs, cooperatives, entrepreneurs in food processing sector.', 'Grant and loans for food processing infrastructure, cold chain, modernization of abattoirs.', 'Central', 'other', 'active', NULL, NULL, NULL, 'https://mofpi.gov.in', '1800-11-8034', 2017),
('Pradhan Mantri Kisan Urja Suraksha evam Utthaan Mahabhiyan (PM-KUSUM)', 'Scheme to boost incomes of farmers by setting up solar pumps and grid-connected solar power plants.', 'Farmers with agricultural land. Cooperative societies, Water User Associations, FPOs also eligible.', '60% central subsidy + 30% bank loan = only 10% farmer contribution for solar pumps.', 'Central', 'irrigation', 'active', NULL, NULL, NULL, 'https://mnre.gov.in/pm-kusum', '1800-180-3333', 2019),
('Bangla Krishi Sech Yojana', 'West Bengal scheme for providing irrigation facilities to farmers in drought-prone areas.', 'Small and marginal farmers in West Bengal. Priority to SC/ST farmers.', 'Free bore-well installation, diesel pump subsidy, water channel construction support.', 'West Bengal', 'irrigation', 'active', NULL, 2.00, NULL, 'https://wb.gov.in/agri', '18001800110', 2016),
('Mukhyamantri Krishak Sahay Yojana', 'West Bengal Chief Minister scheme to provide relief to farmers who lose crops due to natural calamities.', 'All farmers in West Bengal affected by natural calamities.', '₹10,000 per acre for crop damage. Maximum ₹20,000 per farmer. Amount credited within 1 month.', 'West Bengal', 'insurance', 'active', NULL, NULL, NULL, 'https://wb.gov.in/agri', '18001030204', 2020),
('National Horticulture Mission (NHM)', 'Comprehensive scheme for holistic development of horticulture sector including fruits and vegetables.', 'All farmers growing horticultural crops. Preference to small and marginal farmers.', 'Subsidy on quality planting material, protected cultivation (50% for polyhouse), post-harvest infrastructure.', 'Central', 'subsidy', 'active', NULL, NULL, NULL, 'https://nhb.gov.in', '0124-2342992', 2005),
('Interest Subvention Scheme for Short-Term Credit', 'Provides subsidized short-term crop loans to farmers to ensure credit at concessional interest rates.', 'Farmers who take short-term crop loans up to ₹3 lakh from scheduled commercial banks.', '7% interest rate on crop loans. Additional 3% discount for prompt repayment (effective rate 4%).', 'Central', 'loan', 'active', NULL, NULL, NULL, 'https://agricoop.gov.in', '1800-180-1551', 2006)
ON CONFLICT DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_market_prices_crop ON market_prices(crop_name);
CREATE INDEX IF NOT EXISTS idx_market_prices_city ON market_prices(city);
CREATE INDEX IF NOT EXISTS idx_schemes_state ON schemes(state);
CREATE INDEX IF NOT EXISTS idx_schemes_category ON schemes(category);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_crop ON products(crop_name);