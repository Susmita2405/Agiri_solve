// ============================================
// AgriMind AI — Government Schemes Module
// ============================================

let allSchemes = [];
let currentFilter = 'all';

async function loadSchemes() {
  const { data } = await SchemesAPI.getAll({ status: 'active' });
  if (!data.success) { showToast('Could not load schemes', 'error'); return; }
  allSchemes = data.schemes;
  renderSchemes(allSchemes);
}

function renderSchemes(schemes) {
  const grid = document.getElementById('schemes-grid');
  if (!schemes.length) {
    grid.innerHTML = '<div class="empty-msg"><div class="empty-icon">🏛️</div><h3>No schemes found</h3><p>Try different filters</p></div>';
    return;
  }

  grid.innerHTML = schemes.map(s => `
    <div class="scheme-card">
      <div class="scheme-card-header">
        <div class="scheme-name">${s.scheme_name}</div>
        <div style="display:flex;flex-direction:column;gap:.25rem;align-items:flex-end;flex-shrink:0">
          <span class="scheme-badge badge-${s.status}">${s.status === 'active' ? '✅ Active' : '⏸️ Inactive'}</span>
        </div>
      </div>
      <div class="scheme-meta">
        <span class="scheme-badge badge-${s.state === 'Central' ? 'central' : 'wb'}">
          ${s.state === 'Central' ? '🇮🇳 Central' : `🏡 ${s.state}`}
        </span>
        <span class="scheme-badge badge-${s.category}">
          ${getCategoryIcon(s.category)} ${s.category?.replace('_', ' ') || 'Other'}
        </span>
        ${s.launch_year ? `<span class="scheme-badge" style="background:var(--border-light);color:var(--text-muted)">Since ${s.launch_year}</span>` : ''}
      </div>
      <p class="scheme-description">${s.description?.substring(0, 150)}${s.description?.length > 150 ? '...' : ''}</p>
      <div class="scheme-benefits">💰 ${s.benefits?.substring(0, 120)}${s.benefits?.length > 120 ? '...' : ''}</div>
      <div class="scheme-actions">
        ${s.application_url ? `<a href="${s.application_url}" target="_blank" class="btn-primary" style="font-size:.82rem;padding:.45rem .9rem">🔗 Apply Now</a>` : ''}
        ${s.helpline ? `<a href="tel:${s.helpline}" class="btn-secondary" style="font-size:.82rem;padding:.45rem .9rem">📞 ${s.helpline}</a>` : ''}
        <button onclick="showSchemeDetails(${s.id})" class="btn-secondary" style="font-size:.82rem;padding:.45rem .9rem">ℹ️ Details</button>
      </div>
    </div>
  `).join('');
}

function getCategoryIcon(cat) {
  const icons = {
    loan: '💳', subsidy: '💊', insurance: '🛡️', training: '📚',
    equipment: '🚜', seed: '🌱', irrigation: '💧',
    income_support: '💵', other: '📋'
  };
  return icons[cat] || '📋';
}

function filterSchemes(category) {
  currentFilter = category;
  document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  event.target.classList.add('active');

  const search = document.getElementById('scheme-search').value.toLowerCase();
  let filtered = allSchemes;
  if (category !== 'all') filtered = filtered.filter(s => s.category === category);
  if (search) filtered = filtered.filter(s =>
    s.scheme_name.toLowerCase().includes(search) ||
    s.description?.toLowerCase().includes(search)
  );
  renderSchemes(filtered);
}

function searchSchemes() {
  const search = document.getElementById('scheme-search').value.toLowerCase();
  let filtered = allSchemes;
  if (currentFilter !== 'all') filtered = filtered.filter(s => s.category === currentFilter);
  if (search) filtered = filtered.filter(s =>
    s.scheme_name.toLowerCase().includes(search) ||
    s.description?.toLowerCase().includes(search) ||
    s.benefits?.toLowerCase().includes(search)
  );
  renderSchemes(filtered);
}

async function checkEligibility() {
  const land_size = document.getElementById('elig-land').value;
  const state = document.getElementById('elig-state').value;
  const annual_income = document.getElementById('elig-income').value;

  if (!land_size) { showToast('Please enter your land size', 'error'); return; }

  const btn = event.target;
  btn.disabled = true; btn.textContent = '🔍 Checking...';

  const { ok, data } = await SchemesAPI.checkEligibility({ land_size, state, annual_income });
  btn.disabled = false; btn.textContent = '🔍 Check Eligibility';

  if (!ok || !data.success) { showToast('Error checking eligibility', 'error'); return; }

  const resultDiv = document.getElementById('eligibility-result');
  resultDiv.classList.remove('hidden');

  resultDiv.innerHTML = `
    <div class="eligibility-summary">
      🎉 ${data.summary}
    </div>
    <div class="eligibility-result-grid">
      ${data.eligible_schemes.slice(0, 8).map(s => `
        <div class="elig-item">
          <div class="elig-name">✅ ${s.scheme_name}</div>
          <div class="elig-reasons">
            ${s.eligibility_reasons?.map(r => `<div class="elig-reason">${r}</div>`).join('') || ''}
          </div>
          <div style="font-size:.82rem;font-weight:600;color:var(--orange);margin-top:.25rem">
            💰 ${s.benefits?.substring(0, 80)}...
          </div>
          ${s.application_url ? `<a href="${s.application_url}" target="_blank" class="btn-small" style="margin-top:.5rem;display:inline-block">Apply →</a>` : ''}
        </div>
      `).join('')}
    </div>
    ${data.ineligible_schemes.length ? `
      <details style="margin-top:1rem">
        <summary style="cursor:pointer;font-size:.9rem;color:var(--text-muted)">
          ❌ ${data.ineligible_schemes.length} schemes you don't qualify for
        </summary>
        <div style="margin-top:.5rem;display:grid;gap:.5rem">
          ${data.ineligible_schemes.slice(0, 5).map(s => `
            <div class="elig-item ineligible">
              <div class="elig-name" style="color:var(--red)">❌ ${s.scheme_name}</div>
              <div class="elig-reasons">${s.ineligibility_reasons?.join(' • ') || ''}</div>
            </div>
          `).join('')}
        </div>
      </details>
    ` : ''}
  `;

  resultDiv.scrollIntoView({ behavior: 'smooth' });
}

async function showSchemeDetails(id) {
  const { data } = await SchemesAPI.getAll();
  const scheme = data.schemes?.find(s => s.id === id);
  if (!scheme) return;

  // Simple inline expansion — could be modal
  showToast(`${scheme.scheme_name}: ${scheme.helpline ? 'Call ' + scheme.helpline : 'Check application URL'}`, 'success', 5000);
}