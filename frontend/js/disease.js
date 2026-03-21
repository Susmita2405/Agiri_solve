// ============================================
// AgriMind AI — Disease Detection Module
// ============================================

function previewImage(e) {
  const file = e.target.files[0];
  if (!file) return;

  const uploadZone = document.getElementById('upload-zone');
  const previewDiv = document.getElementById('image-preview');
  const previewImg = document.getElementById('preview-img');

  const reader = new FileReader();
  reader.onload = (ev) => {
    previewImg.src = ev.target.result;
    uploadZone.classList.add('hidden');
    previewDiv.classList.remove('hidden');
  };
  reader.readAsDataURL(file);
}

function clearImage() {
  document.getElementById('disease-image').value = '';
  document.getElementById('upload-zone').classList.remove('hidden');
  document.getElementById('image-preview').classList.add('hidden');
  document.getElementById('disease-result').classList.add('hidden');
  document.getElementById('preview-img').src = '';
}

async function detectDisease() {
  const fileInput = document.getElementById('disease-image');
  if (!fileInput.files[0]) {
    showToast('Please upload a crop leaf photo first', 'error');
    return;
  }

  const btn = document.getElementById('detect-btn');
  btn.disabled = true;
  btn.textContent = '🔬 Analyzing...';

  const formData = new FormData();
  formData.append('image', fileInput.files[0]);
  formData.append('crop_name', document.getElementById('disease-crop').value || '');

  const { ok, data } = await DiseaseAPI.detect(formData);

  btn.disabled = false;
  btn.textContent = '🔬 Analyze Disease';

  if (!ok || !data.success) {
    showToast(data.message || 'Detection failed', 'error');
    return;
  }

  const result = data.result;
  const resultDiv = document.getElementById('disease-result');
  const contentDiv = document.getElementById('disease-result-content');

  const confidence = result.confidence;
  const confClass = confidence >= 70 ? 'conf-high' : confidence >= 40 ? 'conf-medium' : 'conf-low';
  const isHealthy = result.is_healthy;

  contentDiv.innerHTML = `
    <div class="disease-header">
      <div class="disease-icon">${isHealthy ? '✅' : '🔴'}</div>
      <div>
        <div class="disease-name" style="color:${isHealthy ? 'var(--green-main)' : 'var(--red)'}">${result.disease_name}</div>
        <div style="font-size:.85rem;color:var(--text-muted)">Confidence: ${confidence}%</div>
        <div class="confidence-bar"><div class="confidence-fill ${confClass}" style="width:${confidence}%"></div></div>
      </div>
    </div>

    ${result.description ? `<p style="font-size:.9rem;color:var(--text-muted);margin-bottom:.75rem">${result.description}</p>` : ''}

    <div class="treatment-section">
      <h4>💊 Treatment Recommendation</h4>
      <p style="font-size:.9rem;color:var(--text-main);margin-bottom:.75rem">${result.treatment}</p>

      ${result.medicine !== 'No treatment needed' ? `
        <div style="margin-bottom:.5rem">
          <strong style="font-size:.82rem;color:var(--text-muted)">Recommended Medicines:</strong><br/>
          ${result.medicine.split(',').map(m => `<span class="medicine-tag">${m.trim()}</span>`).join('')}
        </div>
        <div style="background:var(--orange-pale);border-radius:6px;padding:.5rem .75rem;font-size:.85rem;color:#7a4500">
          💰 Estimated Medicine Cost: <strong>${result.medicine_cost}</strong>
        </div>
      ` : ''}
    </div>

    ${result.organic_treatment ? `
      <div style="background:var(--green-bg);border-radius:var(--radius-sm);padding:.75rem;margin-top:.75rem">
        <strong style="color:var(--green-dark);font-size:.9rem">🌿 Organic Alternative:</strong>
        <p style="font-size:.85rem;color:var(--text-muted);margin-top:.25rem">${result.organic_treatment}</p>
      </div>
    ` : ''}

    ${result.similar_diseases?.length ? `
      <div style="margin-top:.75rem">
        <strong style="font-size:.85rem;color:var(--text-muted)">Similar possibilities:</strong>
        <div style="display:flex;gap:.4rem;flex-wrap:wrap;margin-top:.35rem">
          ${result.similar_diseases.map(d => `
            <span style="background:var(--border-light);border-radius:6px;padding:.2rem .5rem;font-size:.78rem">${d.name} (${d.confidence}%)</span>
          `).join('')}
        </div>
      </div>
    ` : ''}

    ${result.note ? `
      <div style="background:var(--blue-pale);border-radius:6px;padding:.5rem .75rem;margin-top:.75rem;font-size:.82rem;color:var(--blue)">
        ℹ️ ${result.note}
      </div>
    ` : ''}

    <div style="margin-top:1rem;padding-top:.75rem;border-top:1px solid var(--border-light);font-size:.75rem;color:var(--text-light)">
      Source: ${result.source} • ${new Date().toLocaleString('en-IN')}
    </div>
  `;

  resultDiv.classList.remove('hidden');
  resultDiv.scrollIntoView({ behavior: 'smooth' });
}