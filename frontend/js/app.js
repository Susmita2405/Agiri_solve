// ============================================
// AgriMind AI — App Controller
// ============================================

function initMainApp() {
  const user = getUser();
  if (!user) { logout(); return; }

  // Switch screens
  document.getElementById('auth-screen').classList.add('hidden');
  document.getElementById('auth-screen').classList.remove('active');
  document.getElementById('main-screen').classList.remove('hidden');

  // Set user info
  document.getElementById('dash-name').textContent = user.name.split(' ')[0];
  document.getElementById('user-avatar').textContent = user.role === 'buyer' ? '🧑‍💼' : '👨‍🌾';
  document.getElementById('sidebar-name').textContent = user.name;
  document.getElementById('sidebar-phone').textContent = user.phone;
  document.getElementById('profile-name').textContent = user.name;
  document.getElementById('profile-phone').textContent = user.phone;
  document.getElementById('profile-role').textContent = user.role === 'buyer' ? '🧑‍💼 Buyer' : '👨‍🌾 Farmer';

  // Set date
  const now = new Date();
  document.getElementById('dash-date').textContent =
    now.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  // Season badge
  const month = now.getMonth() + 1;
  const seasonBadge = document.getElementById('season-badge');
  if (month >= 6 && month <= 9) seasonBadge.textContent = '🌧️ Kharif Season';
  else if (month >= 10 || month <= 2) seasonBadge.textContent = '❄️ Rabi Season';
  else seasonBadge.textContent = '☀️ Zaid Season';

  // Show buyer section if user is buyer
  if (user.role === 'buyer') {
    const buyerSection = document.getElementById('buyer-price-section');
    if (buyerSection) buyerSection.style.display = 'block';
    // Hide farmer-only sections
    const profilePrompt = document.getElementById('profile-prompt');
    if (profilePrompt) profilePrompt.classList.add('hidden');
    // Load buyer prices
    setTimeout(() => {
      if (typeof loadMyBuyerPrices === 'function') loadMyBuyerPrices();
    }, 500);
  }

  // Check profile
  checkProfilePrompt();

  // Load dashboard data
  showPage('dashboard');
  loadDashboard();
  loadProfile();

  // Load buyer prices on market page load
  setTimeout(() => {
    if (typeof loadBuyerPrices === 'function') loadBuyerPrices();
  }, 1000);
}

function showPage(pageName) {
  // Hide all pages
  document.querySelectorAll('.page').forEach(p => {
    p.classList.remove('active');
    p.classList.add('hidden');
  });

  // Show target page
  const target = document.getElementById(`page-${pageName}`);
  if (target) {
    target.classList.add('active');
    target.classList.remove('hidden');
  }

  // Update nav active state
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.page === pageName);
  });

  // Close sidebar on mobile
  if (window.innerWidth < 768) closeSidebar();

  // Scroll to top
  window.scrollTo({ top: 0 });

  // Lazy load page data
  if (pageName === 'market') {
    loadMarketPrices();
    setTimeout(() => {
      if (typeof loadBuyerPrices === 'function') loadBuyerPrices();
    }, 500);
  }
  if (pageName === 'schemes') loadSchemes();
  if (pageName === 'marketplace') loadProducts();
  if (pageName === 'profile') {
    loadProfile();
    const user = getUser();
    if (user && user.role === 'buyer') {
      if (typeof loadMyBuyerPrices === 'function') loadMyBuyerPrices();
    }
  }
}

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  sidebar.classList.toggle('open');
  overlay.classList.toggle('visible');
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('visible');
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('active');
  }
}

async function checkProfilePrompt() {
  try {
    const user = getUser();
    if (!user || user.role === 'buyer') return;
    const { data } = await ProfileAPI.get();
    const prompt = document.getElementById('profile-prompt');
    if (prompt && (!data.profile?.district || !data.profile?.land_size)) {
      prompt.classList.remove('hidden');
    }
  } catch (err) {
    console.log('Profile check skipped');
  }
}

// Offline support
window.addEventListener('online', () => showToast('🌐 Back online!', 'success'));
window.addEventListener('offline', () => showToast('📶 You are offline. Some features may not work.', 'error', 5000));

// Init on load
document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
});