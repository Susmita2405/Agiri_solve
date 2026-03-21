// ============================================
// AgriMind AI — Marketplace Module
// ============================================

let currentProductId = null;

function switchMarketTab(tab) {
  document.querySelectorAll('.market-tab').forEach((t, i) => {
    const tabs = ['browse', 'sell', 'myorders'];
    t.classList.toggle('active', tabs[i] === tab);
  });
  document.querySelectorAll('.market-tab-content').forEach(c => {
    c.classList.remove('active-tab');
    c.classList.add('hidden');
  });
  const target = document.getElementById(`mt-${tab}`);
  if (target) { target.classList.remove('hidden'); target.classList.add('active-tab'); }

  if (tab === 'sell') { loadMyListings(); }
  if (tab === 'myorders') { loadMyOrders(); }
}

async function loadProducts(params = {}) {
  const search = document.getElementById('mp-search')?.value;
  const district = document.getElementById('mp-district')?.value;
  if (search) params.crop = search;
  if (district) params.district = district;

  const { data } = await MarketplaceAPI.getProducts(params);
  const grid = document.getElementById('products-grid');

  if (!data.success) { grid.innerHTML = '<div class="loading-msg">Could not load products</div>'; return; }

  if (!data.products.length) {
    grid.innerHTML = `
      <div class="empty-msg" style="grid-column:1/-1">
        <div class="empty-icon">🌾</div>
        <h3>No crops listed yet</h3>
        <p>Be the first to list your crop for sale!</p>
        <button onclick="switchMarketTab('sell')" class="btn-primary" style="margin-top:1rem">+ List Your Crop</button>
      </div>
    `;
    return;
  }

  grid.innerHTML = data.products.map(p => `
    <div class="product-card">
      <div class="product-header">
        <div class="product-crop">${p.crop_name}</div>
        <div class="product-price">₹${p.price_per_unit}/kg</div>
      </div>
      <div class="product-meta">
        <span>⚖️ ${p.quantity} ${p.quantity_unit} available</span>
        <span>📍 ${p.district || p.location || 'Location not set'}, ${p.state || ''}</span>
        ${p.description ? `<span>📝 ${p.description.substring(0, 60)}...</span>` : ''}
      </div>
      <div class="product-farmer">
        👨‍🌾 ${p.farmer_name} • 📱 ${p.farmer_phone}
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span class="status-available">✅ Available</span>
        <button onclick="openOrderModal(${p.id}, '${p.crop_name}', ${p.price_per_unit}, ${p.quantity})"
          class="btn-primary" style="font-size:.85rem;padding:.45rem .9rem">
          🛒 Buy Now
        </button>
      </div>
    </div>
  `).join('');
}

function searchProducts() {
  clearTimeout(window._searchTimer);
  window._searchTimer = setTimeout(() => loadProducts(), 400);
}

async function listProduct(e) {
  e.preventDefault();
  const body = {
    crop_name: document.getElementById('sell-crop').value,
    quantity: document.getElementById('sell-qty').value,
    price_per_unit: document.getElementById('sell-price').value,
    district: document.getElementById('sell-district').value,
    state: 'West Bengal',
    description: document.getElementById('sell-desc').value,
  };

  const btn = e.target.querySelector('button[type=submit]');
  btn.disabled = true; btn.textContent = '⏳ Listing...';

  const { ok, data } = await MarketplaceAPI.listProduct(body);
  btn.disabled = false; btn.textContent = '📢 List for Sale';

  if (!ok || !data.success) { showToast(data.message || 'Error listing product', 'error'); return; }

  showToast('✅ Crop listed successfully!', 'success');
  e.target.reset();
  loadMyListings();
  loadProducts();
}

async function loadMyListings() {
  const { data } = await MarketplaceAPI.getMyListings();
  const grid = document.getElementById('my-listings-grid');
  if (!data.success || !data.products.length) {
    grid.innerHTML = '<div class="loading-msg">No listings yet</div>';
    return;
  }
  grid.innerHTML = data.products.map(p => `
    <div class="product-card">
      <div class="product-header">
        <div class="product-crop">${p.crop_name}</div>
        <div class="product-price">₹${p.price_per_unit}/kg</div>
      </div>
      <div class="product-meta">
        <span>⚖️ ${p.quantity} kg</span>
        <span>📍 ${p.district || '—'}</span>
      </div>
      <span class="status-${p.status}">${p.status === 'available' ? '✅ Available' : p.status === 'sold' ? '🔴 Sold' : '⏸️ Reserved'}</span>
    </div>
  `).join('');
}

async function loadMyOrders() {
  const { data } = await MarketplaceAPI.getMyOrders();
  const grid = document.getElementById('my-orders-grid');
  if (!data.success || !data.orders.length) {
    grid.innerHTML = '<div class="empty-msg"><div class="empty-icon">📦</div><h3>No orders yet</h3><p>Browse marketplace and place your first order!</p></div>';
    return;
  }
  grid.innerHTML = data.orders.map(o => `
    <div class="card" style="margin-bottom:.75rem">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div>
          <strong>${o.crop_name || 'Product'}</strong> • ${o.quantity} kg
        </div>
        <span style="font-family:var(--font-display);font-weight:800;color:var(--orange)">₹${Number(o.total_price).toLocaleString('en-IN')}</span>
      </div>
      <div style="font-size:.82rem;color:var(--text-muted);margin-top:.35rem">
        Farmer: ${o.farmer_name || '—'} • Status: <strong>${o.status}</strong>
      </div>
      <div style="font-size:.78rem;color:var(--text-light);margin-top:.25rem">
        Ordered on ${formatDate(o.created_at)}
      </div>
    </div>
  `).join('');
}

function openOrderModal(productId, cropName, price, quantity) {
  currentProductId = productId;
  document.getElementById('order-product-id').value = productId;
  document.getElementById('order-product-info').innerHTML = `
    <strong>🌾 ${cropName}</strong> at ₹${price}/kg<br/>
    <span style="font-size:.85rem;color:var(--text-muted)">Available: ${quantity} kg</span>
  `;
  document.getElementById('order-qty').max = quantity;

  const user = getUser();
  if (user) {
    document.getElementById('order-buyer-name').value = user.name || '';
    document.getElementById('order-phone').value = user.phone || '';
  }

  const modal = document.getElementById('order-modal');
  modal.classList.remove('hidden');
  modal.classList.add('active');
}

async function submitOrder(e) {
  e.preventDefault();
  const body = {
    product_id: document.getElementById('order-product-id').value,
    quantity: document.getElementById('order-qty').value,
    buyer_name: document.getElementById('order-buyer-name').value,
    buyer_phone: document.getElementById('order-phone').value,
    delivery_address: document.getElementById('order-address').value,
  };

  const btn = e.target.querySelector('button[type=submit]');
  btn.disabled = true; btn.textContent = '⏳ Placing order...';

  const { ok, data } = await MarketplaceAPI.placeOrder(body);
  btn.disabled = false; btn.textContent = '✅ Confirm Order';

  if (!ok || !data.success) { showToast(data.message || 'Order failed', 'error'); return; }

  showToast('🎉 Order placed successfully!', 'success');
  closeModal('order-modal');
  e.target.reset();
  loadProducts();
}