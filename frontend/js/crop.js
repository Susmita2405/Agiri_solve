// ============================================
// AgriMind AI — Crop Recommendation Module
// ============================================

async function getCropRecommendation(e) {
  e.preventDefault();
  const btn = e.target.querySelector('button[type=submit]');
  btn.disabled = true;
  btn.textContent = '🤖 Analyzing your farm...';

  const body = {
    soil_type: document.getElementById('crop-soil').value,
    land_size: document.getElementById('crop-land').value,
    state: document.getElementById('crop-state').value,
    water_availability: document.getElementById('crop-water').value,
    season: document.getElementById('crop-season').value,
    budget: document.getElementById('crop-budget').value,
  };

  const { ok, data } = await CropAPI.recommend(body);

  btn.disabled = false;
  btn.textContent = '🤖 Get AI Crop Recommendations';

  if (!ok || !data.success) {
    showToast(data.message || 'Error getting recommendations', 'error');
    return;
  }

  const resultsDiv = document.getElementById('crop-results');
  resultsDiv.classList.remove('hidden');

  document.getElementById('crop-explanation').textContent = `ℹ️ ${data.explanation}`;

  const cardsDiv = document.getElementById('crop-cards');
  cardsDiv.innerHTML = data.recommendations.map((r, i) => `
    <div class="crop-card" style="animation-delay: ${i * 0.1}s">
      <div class="crop-card-header">
        <div>
          <div class="crop-card-name">${i === 0 ? '⭐ ' : ''}${r.crop_name}</div>
          <div style="font-size:.8rem;color:var(--text-muted);margin-top:.2rem">${r.season ? r.season.charAt(0).toUpperCase() + r.season.slice(1) + ' Season' : ''} • ${r.growth_days} days</div>
        </div>
        <span class="suitability-badge suit-${r.suitability.toLowerCase()}">${r.suitability} Match</span>
      </div>
      <div class="crop-card-stats">
        <div class="crop-stat">
          <div class="crop-stat-label">Expected Yield</div>
          <div class="crop-stat-value">${r.expected_yield}</div>
        </div>
        <div class="crop-stat">
          <div class="crop-stat-label">Estimated Cost</div>
          <div class="crop-stat-value">${r.estimated_cost}</div>
        </div>
        <div class="crop-stat">
          <div class="crop-stat-label">Expected Revenue</div>
          <div class="crop-stat-value">${r.expected_revenue}</div>
        </div>
        <div class="crop-stat">
          <div class="crop-stat-label">Expected Profit</div>
          <div class="crop-stat-value profit">${r.expected_profit}</div>
        </div>
      </div>
      <div class="crop-reasons">
        ${r.reasons.map(reason => `<div class="crop-reason">✅ <span>${reason}</span></div>`).join('')}
      </div>
      <div style="margin-top:.75rem;display:flex;gap:.5rem;flex-wrap:wrap">
        <span style="font-size:.78rem;background:var(--blue-pale);color:var(--blue);padding:.2rem .5rem;border-radius:5px;font-weight:600">💧 ${r.water_requirement} water</span>
        <span style="font-size:.78rem;background:var(--green-bg);color:var(--green-dark);padding:.2rem .5rem;border-radius:5px;font-weight:600">🌱 ${r.growth_days} days to harvest</span>
      </div>
    </div>
  `).join('');

  resultsDiv.scrollIntoView({ behavior: 'smooth' });
}