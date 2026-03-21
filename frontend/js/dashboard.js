// ============================================
// AgriMind AI — Dashboard Module
// ============================================

async function loadDashboard() {
  loadDashboardPrices();
  loadSeasonTips();
  loadDashboardStats();
}

async function loadDashboardStats() {
  const { data } = await SchemesAPI.getAll({ status: 'active' });
  if (data.success) {
    document.getElementById('stat-schemes').textContent = data.total;
  }
  const { data: mData } = await MarketAPI.getPrices();
  if (mData.success) {
    const uniqueCrops = [...new Set(mData.prices.map(p => p.crop_name))].length;
    document.getElementById('stat-crops').textContent = uniqueCrops;
  }
  const { data: mpData } = await MarketplaceAPI.getProducts();
  if (mpData.success) {
    document.getElementById('stat-listings').textContent = mpData.total || 0;
  }
}

async function loadDashboardPrices() {
  const container = document.getElementById('dash-prices');
  const { data } = await MarketAPI.getPrices({ state: 'West Bengal' });

  if (!data.success || !data.prices.length) {
    container.innerHTML = '<div class="ticker-loading">Could not load prices</div>';
    return;
  }

  // Show a few representative prices
  const sample = data.prices.slice(0, 12);
  container.innerHTML = `
    <div class="ticker-inner">
      ${sample.map(p => `
        <div class="ticker-item">
          <span class="ticker-crop">${p.crop_name}</span>
          <span class="ticker-price">₹${p.price_per_kg}/kg</span>
          <span class="ticker-city">${p.city}</span>
        </div>
      `).join('')}
    </div>
  `;
}

function loadSeasonTips() {
  const container = document.getElementById('season-tips');
  const month = new Date().getMonth() + 1;
  let tips = [];

  if (month >= 6 && month <= 9) {
    tips = [
      { title: '🌧️ Kharif Season Active', text: 'Sow Rice, Jute, Maize. Ensure field drainage before heavy rains.' },
      { title: '🐛 Pest Alert', text: 'Monitor for stem borer in rice. Apply Chlorpyriphos if needed.' },
      { title: '💧 Water Management', text: 'Maintain 2-3 cm water level in paddy fields for best yield.' },
      { title: '🌿 Fertilizer Tip', text: 'Apply basal dose of NPK (80:40:40 kg/ha) before transplanting rice.' }
    ];
  } else if (month >= 10 || month <= 2) {
    tips = [
      { title: '❄️ Rabi Season Active', text: 'Sow Wheat, Potato, Mustard. Ideal time for winter vegetables.' },
      { title: '🥔 Potato Season', text: 'West Bengal is prime potato season. Use certified seeds for best yield.' },
      { title: '💡 Government Tip', text: 'Apply for PM-KISAN installment due this month. Check pmkisan.gov.in' },
      { title: '🚜 Soil Prep', text: 'Add well-decomposed FYM (10 t/ha) before rabi crop sowing.' }
    ];
  } else {
    tips = [
      { title: '☀️ Summer/Zaid Season', text: 'Grow Watermelon, Cucumber, Bitter Gourd for high summer demand.' },
      { title: '💧 Irrigation Critical', text: 'Water stress in summer reduces yield by 30-50%. Irrigate regularly.' },
      { title: '🌱 Nursery Prep', text: 'Prepare nursery beds for Kharif crops like Rice and Jute in advance.' },
      { title: '🏛️ Scheme Alert', text: 'Check PM-KUSUM scheme for solar pump subsidy for irrigation.' }
    ];
  }

  container.innerHTML = tips.map(t => `
    <div class="tip-card">
      <strong>${t.title}</strong>
      ${t.text}
    </div>
  `).join('');
}