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