// ============================================
// AgriMind AI — Market Module
// ============================================

let allPrices = [];
let availableCrops = [];

async function loadMarketPrices() {
  const { data } = await MarketAPI.getPrices();
  if (!data.success) { showToast('Could not load prices', 'error'); return; }

  allPrices = data.prices;
  availableCrops = data.available_crops;

  // Populate crop filter dropdowns
  const cropFilterEl = document.getElementById('market-crop-filter');
  const profitCropEl = document.getElementById('profit-crop');

  availableCrops.forEach(crop => {
    cropFilterEl.innerHTML += `<option value="${crop}">${crop}</option>`;
    profitCropEl.innerHTML += `<option value="${crop}">${crop}</option>`;
  });

  renderPricesTable(allPrices);
  buildTransportInputs(data.available_cities);
}

function renderPricesTable(prices) {
  const tbody = document.getElementById('prices-tbody');
  if (!prices.length) {
    tbody.innerHTML = '<tr><td colspan="4" class="loading-row">No prices found</td></tr>';
    return;
  }

  tbody.innerHTML = prices.map(p => `
    <tr>
      <td><strong>${p.city}</strong><br/><span style="font-size:.75rem;color:var(--text-muted)">${p.state}</span></td>
      <td>${p.crop_name}</td>
      <td class="price-cell">₹${p.price_per_kg}</td>
      <td style="font-size:.82rem;color:var(--text-muted)">${p.market_name || '—'}</td>
    </tr>
  `).join('');
}

function filterPrices() {
  const crop = document.getElementById('market-crop-filter').value;
  const state = document.getElementById('market-state-filter').value;

  let filtered = allPrices;
  if (crop) filtered = filtered.filter(p => p.crop_name === crop);
  if (state) filtered = filtered.filter(p => p.state === state);
  renderPricesTable(filtered);
}

function buildTransportInputs(cities) {
  const container = document.getElementById('transport-inputs');
  if (!cities || !cities.length) return;

  container.innerHTML = cities.slice(0, 8).map(c => `
    <div class="transport-item">
      <label>${c.city}</label>
      <input type="number" id="transport-${c.city.replace(/\s/g,'_')}"
        placeholder="₹ transport cost" min="0" value="0" />
    </div>
  `).join('');
}

async function calculateProfit() {
  const crop = document.getElementById('profit-crop').value;
  const qty = document.getElementById('profit-qty').value;

  if (!crop) { showToast('Please select a crop', 'error'); return; }
  if (!qty || qty <= 0) { showToast('Please enter quantity', 'error'); return; }

  // Collect transport costs
  const transport_costs = {};
  document.querySelectorAll('.transport-item').forEach(item => {
    const input = item.querySelector('input');
    const label = item.querySelector('label').textContent;
    if (input) transport_costs[label] = parseFloat(input.value) || 0;
  });

  const { ok, data } = await MarketAPI.calculateProfit({ crop, quantity: qty, transport_costs });

  if (!ok || !data.success) {
    showToast(data.message || 'Calculation failed', 'error');
    return;
  }

  const resultDiv = document.getElementById('profit-result');
  const contentDiv = document.getElementById('profit-result-content');

  contentDiv.innerHTML = `
    <div class="recommendation-box">
      ${data.recommendation}
    </div>
    <div class="profit-result-grid">
      ${data.calculations.map((calc, i) => `
        <div class="profit-row ${i === 0 && calc.net_profit > 0 ? 'best' : ''} ${calc.net_profit < 0 ? 'loss' : ''}">
          <div>
            <div class="profit-city">
              ${i === 0 && calc.net_profit > 0 ? '🏆 ' : ''}${calc.city}
              ${i === 0 && calc.net_profit > 0 ? '<span class="best-badge">BEST</span>' : ''}
            </div>
            <div class="profit-formula">₹${calc.price_per_kg}/kg × ${qty}kg - ₹${calc.transport_cost} transport = </div>
          </div>
          <div class="profit-amount ${calc.net_profit >= 0 ? 'profit-pos' : 'profit-neg'}">
            ${calc.net_profit >= 0 ? '+' : ''}₹${Math.abs(calc.net_profit).toLocaleString('en-IN')}
          </div>
        </div>
      `).join('')}
    </div>
    <div style="background:var(--card-bg);border-radius:var(--radius-sm);padding:.75rem;margin-top:.75rem;font-size:.85rem;border:1px solid var(--border-light)">
      <strong>Summary for ${crop} (${qty} kg):</strong><br/>
      📈 Best market: ${data.summary.best_profit_city} | Max profit: ₹${data.summary.max_profit.toLocaleString('en-IN')}<br/>
      📊 Highest price: ${data.summary.highest_price_city}
    </div>
  `;

  resultDiv.classList.remove('hidden');
  resultDiv.scrollIntoView({ behavior: 'smooth' });
}
async function getAISuggestion() {
  const crop = document.getElementById('ai-crop').value;
  const quantity = document.getElementById('ai-qty').value;
  const location = document.getElementById('ai-location').value;
  const budget = document.getElementById('ai-budget').value;

  if (!crop || !quantity) {
    showToast('Please enter crop and quantity', 'error');
    return;
  }

  const btn = document.getElementById('ai-suggest-btn');
  btn.disabled = true;
  btn.textContent = '🤖 Gemini AI thinking...';

  const { ok, data } = await apiRequest('/aimarket/suggest', {
    method: 'POST',
    body: JSON.stringify({ crop, quantity, location, transport_budget: budget })
  });

  btn.disabled = false;
  btn.textContent = '🤖 Get AI Suggestion';

  if (!ok || !data.success) {
    showToast(data.message || 'Error getting suggestion', 'error');
    return;
  }

  const resultDiv = document.getElementById('ai-result');
  resultDiv.classList.remove('hidden');
  resultDiv.innerHTML = `
    <div style="background:linear-gradient(135deg,#1a4d1a,#2d6a2d);color:#fff;border-radius:14px;padding:1.25rem;margin-bottom:1rem">
      <h3 style="margin-bottom:.5rem">🏆 Best Market: ${data.best_market.city}</h3>
      <div style="font-size:1.1rem;font-weight:700">
        ₹${data.best_market.price_per_kg}/kg × ${data.quantity}kg =
        <span style="color:#ffd700">₹${data.best_market.total_revenue.toLocaleString('en-IN')}</span>
      </div>
      <div style="font-size:.85rem;opacity:.8;margin-top:.25rem">
        Transport: ~₹${data.best_market.estimated_transport} |
        Net Profit: <strong>₹${data.best_market.net_profit.toLocaleString('en-IN')}</strong>
      </div>
    </div>

    <div style="background:#fff;border:2px solid #c8e6c9;border-radius:14px;padding:1.25rem;margin-bottom:1rem">
      <h4 style="color:#1a4d1a;margin-bottom:.75rem">🤖 Gemini AI Advice:</h4>
      <div style="font-size:.9rem;line-height:1.7;color:#2c3e2c;white-space:pre-wrap">${data.ai_recommendation}</div>
    </div>

    <div style="background:#fff;border-radius:14px;padding:1rem;border:1px solid #e8f5e9">
      <h4 style="color:#1a4d1a;margin-bottom:.75rem">📊 All Markets:</h4>
      ${data.all_markets.map((m, i) => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:.6rem;border-bottom:1px solid #f0f7f0;${i===0 ? 'background:#f0f7f0;border-radius:8px;' : ''}">
          <div>
            <strong>${i === 0 ? '🏆 ' : ''}${m.city}</strong>
            <div style="font-size:.75rem;color:#6c8c6c">${m.market_name || m.state}</div>
          </div>
          <div style="text-align:right">
            <div style="font-weight:700;color:#e67e22">₹${m.price_per_kg}/kg</div>
            <div style="font-size:.78rem;color:${m.net_profit >= 0 ? '#2d6a2d' : '#c0392b'}">
              Profit: ₹${m.net_profit.toLocaleString('en-IN')}
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
  resultDiv.scrollIntoView({ behavior: 'smooth' });
}

// ============================================
// SMART SELL SYSTEM
// ============================================

async function getSmartSellSuggestion() {
  const crop = document.getElementById('ss-crop').value;
  const qty = document.getElementById('ss-qty').value;
  const city = document.getElementById('ss-city').value;

  if (!crop || !qty) {
    showToast('Please enter crop and quantity', 'error');
    return;
  }

  const btn = document.getElementById('ss-btn');
  btn.disabled = true;
  btn.textContent = '🤖 AI Finding Best Buyer...';

  const token = localStorage.getItem('agrimind_token');
  try {
    const res = await fetch('http://localhost:3000/api/smartsell/suggest', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ crop_name: crop, quantity: qty, farmer_city: city })
    });

    const data = await res.json();
    btn.disabled = false;
    btn.textContent = '🎯 Find Best Buyer & Max Profit';

    if (!data.success) {
      showToast(data.message || 'Error', 'error');
      return;
    }

    const resultDiv = document.getElementById('ss-result');
    resultDiv.style.display = 'block';

    const best = data.best_option;

    resultDiv.innerHTML = `
      <!-- Best Option -->
      <div style="background:linear-gradient(135deg,#1a4d1a,#2d6a2d);color:#fff;border-radius:14px;padding:1.25rem;margin-bottom:1rem">
        <div style="font-size:.85rem;opacity:.8;margin-bottom:.35rem">🏆 BEST OPTION FOR ${qty}kg ${crop.toUpperCase()}</div>
        <div style="font-size:1.3rem;font-weight:800">${best.name}</div>
        <div style="font-size:.9rem;opacity:.85">${best.badge} • ${best.city}, ${best.state}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:.75rem;margin-top:1rem">
          <div style="background:rgba(255,255,255,.15);border-radius:8px;padding:.6rem;text-align:center">
            <div style="font-size:.72rem;opacity:.8">PRICE</div>
            <div style="font-size:1.1rem;font-weight:800">₹${best.price_per_kg}/kg</div>
          </div>
          <div style="background:rgba(255,255,255,.15);border-radius:8px;padding:.6rem;text-align:center">
            <div style="font-size:.72rem;opacity:.8">TRANSPORT</div>
            <div style="font-size:.9rem;font-weight:700">₹${best.transport.transportCost}</div>
            <div style="font-size:.65rem;opacity:.7">${best.transport.vehicleType}</div>
          </div>
          <div style="background:rgba(255,255,255,.15);border-radius:8px;padding:.6rem;text-align:center">
            <div style="font-size:.72rem;opacity:.8">NET PROFIT</div>
            <div style="font-size:1.1rem;font-weight:800;color:#ffd700">₹${best.net_profit.toLocaleString('en-IN')}</div>
          </div>
        </div>
        ${best.phone ? `<div style="margin-top:.75rem;font-size:.85rem">📞 Contact: <strong>${best.phone}</strong></div>` : ''}
      </div>

      <!-- AI Advice -->
      <div style="background:#fff;border:2px solid #c8e6c9;border-radius:12px;padding:1rem;margin-bottom:1rem">
        <h4 style="color:#1a4d1a;margin-bottom:.5rem">🤖 Groq AI Advice</h4>
        <p style="font-size:.9rem;line-height:1.6;color:#2c3e2c;white-space:pre-wrap">${data.ai_advice}</p>
      </div>

      <!-- All Options -->
      <div style="background:#fff;border-radius:12px;padding:1rem;border:1px solid #e8f5e9">
        <h4 style="color:#1a4d1a;margin-bottom:.75rem">📊 All Options Compared</h4>
        ${data.all_options.map((opt, i) => `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:.75rem;border-bottom:1px solid #f0f7f0;border-radius:8px;${i===0?'background:#f0f7f0;':''}">
            <div style="flex:1">
              <div style="font-weight:700;font-size:.9rem">${i===0?'🏆 ':''}${opt.name}</div>
              <div style="font-size:.75rem;color:#6c8c6c">${opt.badge} • ${opt.city} • ${opt.transport.vehicleType}</div>
              <div style="font-size:.75rem;color:#6c8c6c">
                ₹${opt.price_per_kg}/kg × ${qty}kg - ₹${opt.transport.transportCost} transport
              </div>
            </div>
            <div style="text-align:right;margin-left:1rem">
              <div style="font-weight:800;color:${opt.net_profit >= 0 ? '#2d6a2d' : '#c0392b'};font-size:1rem">
                ₹${opt.net_profit.toLocaleString('en-IN')}
              </div>
              <div style="font-size:.72rem;color:#6c8c6c">net profit</div>
            </div>
          </div>
        `).join('')}
      </div>

      <div style="text-align:center;font-size:.75rem;color:#95b895;margin-top:.75rem">
        ${data.summary.direct_buyers} direct buyers + ${data.summary.mandi_options} mandis compared
      </div>
    `;

    resultDiv.scrollIntoView({ behavior: 'smooth' });

  } catch (err) {
    btn.disabled = false;
    btn.textContent = '🎯 Find Best Buyer & Max Profit';
    showToast('Network error. Is backend running?', 'error');
  }
}

async function loadBuyerPrices() {
  const crop = document.getElementById('bp-filter')?.value || '';
  const url = crop
    ? `http://localhost:3000/api/smartsell/buyer/prices?crop=${crop}`
    : `http://localhost:3000/api/smartsell/buyer/prices`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    const container = document.getElementById('buyer-prices-list');
    if (!container) return;

    if (!data.success || data.prices.length === 0) {
      container.innerHTML = '<div class="loading-msg">No buyer prices found. Buyers need to update their prices.</div>';
      return;
    }

    container.innerHTML = `
      <table class="prices-table">
        <thead>
          <tr>
            <th>Buyer</th>
            <th>Crop</th>
            <th>Price</th>
            <th>Min Qty</th>
            <th>City</th>
            <th>Updated</th>
          </tr>
        </thead>
        <tbody>
          ${data.prices.map(p => `
            <tr>
              <td><strong>${p.company_name}</strong></td>
              <td>${p.crop_name}</td>
              <td class="price-cell">₹${p.price_per_kg}/kg</td>
              <td>${p.min_quantity || 0} kg</td>
              <td>${p.city}</td>
              <td style="font-size:.78rem;color:#6c8c6c">${p.date_updated}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } catch (err) {
    console.log('Buyer prices error:', err);
  }
}

async function updateBuyerPrice() {
  const crop = document.getElementById('bp-crop').value;
  const price = document.getElementById('bp-price').value;
  const minQty = document.getElementById('bp-min-qty').value;
  const maxQty = document.getElementById('bp-max-qty').value;

  if (!crop || !price) {
    showToast('Enter crop name and price', 'error');
    return;
  }

  const token = localStorage.getItem('agrimind_token');
  const res = await fetch('http://localhost:3000/api/smartsell/buyer/price', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      crop_name: crop,
      price_per_kg: price,
      min_quantity: minQty,
      max_quantity: maxQty
    })
  });

  const data = await res.json();
  if (data.success) {
    showToast('✅ Price updated successfully!', 'success');
    document.getElementById('bp-result').innerHTML =
      `<div style="background:#e8f5e9;padding:.6rem;border-radius:8px;color:#1a4d1a;font-size:.9rem">✅ ${data.message}</div>`;
    loadMyBuyerPrices();
    loadBuyerPrices();
  } else {
    showToast(data.message || 'Error updating price', 'error');
  }
}

async function loadMyBuyerPrices() {
  const token = localStorage.getItem('agrimind_token');
  if (!token) return;

  const res = await fetch('http://localhost:3000/api/smartsell/buyer/profile', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await res.json();
  const container = document.getElementById('my-buyer-prices');
  if (!container) return;

  if (!data.active_prices || data.active_prices.length === 0) {
    container.innerHTML = '<p style="color:#6c8c6c;font-size:.85rem">No active prices yet</p>';
    return;
  }

  container.innerHTML = data.active_prices.map(p => `
    <div style="display:flex;justify-content:space-between;padding:.5rem;background:#f9fdf9;border-radius:6px;margin-bottom:.35rem">
      <span>${p.crop_name}</span>
      <strong style="color:#e67e22">₹${p.price_per_kg}/kg</strong>
    </div>
  `).join('');
}