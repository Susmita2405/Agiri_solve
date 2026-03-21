// ============================================
// AgriMind AI — Profile Module
// ============================================

async function loadProfile() {
  const { data } = await ProfileAPI.get();
  if (!data.success) return;

  const p = data.profile;

  // Update header info
  if (p.name) {
    document.getElementById('profile-name').textContent = p.name;
    document.getElementById('profile-phone').textContent = p.phone || '—';
  }

  // Fill form fields
  if (p.district) document.getElementById('p-district').value = p.district;
  if (p.state) document.getElementById('p-state').value = p.state;
  if (p.land_size) document.getElementById('p-land').value = p.land_size;
  if (p.soil_type) document.getElementById('p-soil').value = p.soil_type;
  if (p.irrigation_type) document.getElementById('p-irrigation').value = p.irrigation_type;
  if (p.annual_income) document.getElementById('p-income').value = p.annual_income;

  // Auto-fill crop recommendation form
  if (p.soil_type && document.getElementById('crop-soil')) {
    document.getElementById('crop-soil').value = p.soil_type;
  }
  if (p.land_size && document.getElementById('crop-land')) {
    document.getElementById('crop-land').value = p.land_size;
  }
  if (p.state && document.getElementById('crop-state')) {
    document.getElementById('crop-state').value = p.state;
  }
  if (p.state && document.getElementById('elig-state')) {
    document.getElementById('elig-state').value = p.state;
  }
  if (p.land_size && document.getElementById('elig-land')) {
    document.getElementById('elig-land').value = p.land_size;
  }
  if (p.annual_income && document.getElementById('elig-income')) {
    document.getElementById('elig-income').value = p.annual_income;
  }

  // Hide profile prompt if complete
  if (p.district && p.land_size) {
    const prompt = document.getElementById('profile-prompt');
    if (prompt) prompt.classList.add('hidden');
  }
}

async function saveProfile(e) {
  e.preventDefault();

  const body = {
    district: document.getElementById('p-district').value,
    state: document.getElementById('p-state').value,
    land_size: document.getElementById('p-land').value,
    soil_type: document.getElementById('p-soil').value,
    irrigation_type: document.getElementById('p-irrigation').value,
    annual_income: document.getElementById('p-income').value,
  };

  const btn = e.target.querySelector('button[type=submit]');
  btn.disabled = true; btn.textContent = '⏳ Saving...';

  const { ok, data } = await ProfileAPI.update(body);
  btn.disabled = false; btn.textContent = '💾 Save Profile';

  if (!ok || !data.success) { showToast(data.message || 'Error saving profile', 'error'); return; }

  showToast('✅ Profile saved!', 'success');
  const prompt = document.getElementById('profile-prompt');
  if (prompt) prompt.classList.add('hidden');
}