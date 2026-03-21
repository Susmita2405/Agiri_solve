// ============================================
// AgriMind AI — API Utility Module
// ============================================

const API_BASE = 'http://localhost:3000/api';

// Get stored token
const getToken = () => localStorage.getItem('agrimind_token');
const getUser = () => {
  try { return JSON.parse(localStorage.getItem('agrimind_user') || 'null'); } catch { return null; }
};

// Generic API request
async function apiRequest(endpoint, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  // Don't set Content-Type for FormData
  if (options.body instanceof FormData) delete headers['Content-Type'];

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
    const data = await res.json();
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    console.error(`API Error [${endpoint}]:`, err);
    return { ok: false, status: 0, data: { success: false, message: 'Network error. Please check connection.' } };
  }
}

// Auth APIs
const AuthAPI = {
  register: (body) => apiRequest('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => apiRequest('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  me: () => apiRequest('/auth/me'),
};

// Profile APIs
const ProfileAPI = {
  get: () => apiRequest('/profile'),
  update: (body) => apiRequest('/profile', { method: 'POST', body: JSON.stringify(body) }),
};

// Crop APIs
const CropAPI = {
  recommend: (body) => apiRequest('/crop/recommend', { method: 'POST', body: JSON.stringify(body) }),
};

// Disease APIs
const DiseaseAPI = {
  detect: (formData) => apiRequest('/disease/detect', { method: 'POST', body: formData }),
};

// Market APIs
const MarketAPI = {
  getPrices: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiRequest(`/market/prices${qs ? '?' + qs : ''}`);
  },
  calculateProfit: (body) => apiRequest('/market/calculate-profit', { method: 'POST', body: JSON.stringify(body) }),
};

// Schemes APIs
const SchemesAPI = {
  getAll: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiRequest(`/schemes${qs ? '?' + qs : ''}`);
  },
  checkEligibility: (body) => apiRequest('/schemes/check-eligibility', { method: 'POST', body: JSON.stringify(body) }),
};

// Marketplace APIs
const MarketplaceAPI = {
  getProducts: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiRequest(`/marketplace/products${qs ? '?' + qs : ''}`);
  },
  listProduct: (body) => apiRequest('/marketplace/products', { method: 'POST', body: JSON.stringify(body) }),
  placeOrder: (body) => apiRequest('/marketplace/orders', { method: 'POST', body: JSON.stringify(body) }),
  getMyListings: () => apiRequest('/marketplace/my-listings'),
  getMyOrders: () => apiRequest('/marketplace/my-orders'),
};

// Voice API
const VoiceAPI = {
  query: (body) => apiRequest('/voice/query', { method: 'POST', body: JSON.stringify(body) }),
};

// ============================================
// UI Utilities
// ============================================

function showToast(msg, type = 'success', duration = 3000) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.className = `toast ${type}`;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), duration);
}

function setLoading(btnId, loading) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.disabled = loading;
  const text = btn.querySelector('.btn-text');
  const loader = btn.querySelector('.btn-loader');
  if (text) text.classList.toggle('hidden', loading);
  if (loader) loader.classList.toggle('hidden', !loading);
}

function formatCurrency(amount) {
  return '₹' + Number(amount).toLocaleString('en-IN');
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}