// Theme toggle functionality
const themeToggleBtn = document.getElementById('theme-toggle-btn');
const htmlElement = document.documentElement;

const API_BASE = localStorage.getItem('int216d:apiBase') || 'http://localhost:8080';
const ACCESS_TOKEN_KEY = 'int216d:accessToken';
const USER_ROLE_KEY = 'int216d:userRole';
const USER_ID_KEY = 'int216d:userId';
const DEFAULT_PAYMENT_GATEWAY = 'SIMULATED';
let cachedMembershipPlans = [];

function readAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

function readUserRole() {
  return localStorage.getItem(USER_ROLE_KEY);
}

function decodeJwtPayload(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length < 2) return null;

  try {
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const normalized = payload + '='.repeat((4 - (payload.length % 4)) % 4);
    return JSON.parse(atob(normalized));
  } catch (_) {
    return null;
  }
}

function roleFromToken(token) {
  const payload = decodeJwtPayload(token);
  return payload?.role || null;
}

function effectiveRole() {
  return readUserRole() || roleFromToken(readAccessToken()) || null;
}

function isAdminSession() {
  return effectiveRole() === 'ADMIN';
}

function writeAuthState(loginData) {
  const token = loginData?.accessToken;
  if (!token) return;

  localStorage.setItem(ACCESS_TOKEN_KEY, token);

  const role = loginData?.role || roleFromToken(token);
  if (role) {
    localStorage.setItem(USER_ROLE_KEY, role);
  }

  const userId = loginData?.userId;
  if (userId) {
    localStorage.setItem(USER_ID_KEY, String(userId));
  }
}

function clearAuthState() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(USER_ROLE_KEY);
  localStorage.removeItem(USER_ID_KEY);
}

async function apiRequest(path, options = {}) {
  const token = readAccessToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch (_) {
    payload = null;
  }

  if (response.status === 401) {
    clearAuthState();
    window.location.href = './login.html';
    return null;
  }

  if (!response.ok) {
    const message = payload?.message || payload?.error || `Request failed (${response.status})`;
    throw new Error(message);
  }

  return payload;
}

function ensureAuthModal() {
  if (document.getElementById('auth-modal')) return;

  const modal = document.createElement('div');
  modal.id = 'auth-modal';
  modal.style.cssText = 'position:fixed;inset:0;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.55);z-index:9999;padding:20px;';
  modal.innerHTML = `
    <div style="width:min(520px,100%);background:var(--panel);border:1px solid var(--panel-border);border-radius:16px;padding:24px;position:relative;">
      <button id="auth-close" type="button" style="position:absolute;top:12px;right:12px;border:0;background:transparent;color:var(--ink);font-size:20px;cursor:pointer;">x</button>
      <p style="margin:0 0 8px;font-size:12px;color:var(--metallic);letter-spacing:.08em;text-transform:uppercase;">Account</p>
      <h3 style="margin:0 0 16px;">Login or Register</h3>
      <form id="auth-form" style="display:grid;gap:12px;">
        <input id="auth-email" type="email" placeholder="Email" required style="width:100%;padding:12px 14px;background:transparent;border:1px solid var(--panel-border);border-radius:8px;color:var(--ink);" />
        <input id="auth-password" type="password" placeholder="Password" required style="width:100%;padding:12px 14px;background:transparent;border:1px solid var(--panel-border);border-radius:8px;color:var(--ink);" />
        <input id="auth-otp" type="text" inputmode="numeric" placeholder="OTP code (after register)" style="width:100%;padding:12px 14px;background:transparent;border:1px solid var(--panel-border);border-radius:8px;color:var(--ink);" />
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          <button id="auth-login" type="button" class="pill-btn btn-primary" style="padding:10px 18px;">Login</button>
          <button id="auth-register" type="button" class="pill-btn btn-outline" style="padding:10px 18px;">Register</button>
          <button id="auth-verify" type="button" class="pill-btn btn-outline" style="padding:10px 18px;">Verify OTP</button>
        </div>
        <p id="auth-status" style="margin:0;color:var(--metallic);font-size:13px;"></p>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  const closeBtn = modal.querySelector('#auth-close');
  const status = modal.querySelector('#auth-status');
  const email = modal.querySelector('#auth-email');
  const password = modal.querySelector('#auth-password');
  const otp = modal.querySelector('#auth-otp');

  function closeModal() {
    modal.style.display = 'none';
  }

  closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (event) => {
    if (event.target === modal) closeModal();
  });

  modal.querySelector('#auth-login').addEventListener('click', async () => {
    status.textContent = 'Logging in...';
    try {
      const payload = await apiRequest('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: email.value, password: password.value }),
      });
      writeAuthState(payload?.data);
      status.textContent = `Login successful (${effectiveRole() || 'CLIENT'}).`;
      hydrateLoginButtons();
      hydrateCurrentMembership();
      hydrateAdminDashboard();
      setTimeout(closeModal, 600);
    } catch (error) {
      status.textContent = error.message;
    }
  });

  modal.querySelector('#auth-register').addEventListener('click', async () => {
    status.textContent = 'Creating account...';
    try {
      await apiRequest('/api/v1/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email: email.value, password: password.value }),
      });
      status.textContent = 'Account created. Enter the OTP code and click Verify OTP.';
    } catch (error) {
      status.textContent = error.message;
    }
  });

  modal.querySelector('#auth-verify').addEventListener('click', async () => {
    status.textContent = 'Verifying email...';

    try {
      await apiRequest('/api/v1/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ email: email.value, otp: otp.value }),
      });
      status.textContent = 'Email verified. You can now login.';
    } catch (error) {
      status.textContent = error.message;
    }
  });
}

function openAuthModal() {
  ensureAuthModal();
  const modal = document.getElementById('auth-modal');
  if (modal) modal.style.display = 'flex';
}

function hydrateLoginButtons() {
  const token = readAccessToken();
  const loginButtons = document.querySelectorAll('#login-btn');
  const role = effectiveRole();

  loginButtons.forEach((button) => {
    if (!button) return;
    if (token) {
      button.textContent = role === 'ADMIN' ? 'Logout (Admin)' : 'Logout';
      button.setAttribute('href', '#');
      button.onclick = (event) => {
        event.preventDefault();
        clearAuthState();
        hydrateLoginButtons();
        hydrateCurrentMembership();
        hydrateAdminDashboard();
      };
      return;
    }
    button.textContent = 'Login';
    button.setAttribute('href', './login.html');
    button.onclick = null;
  });

  upsertAdminNavLink();
  upsertProfileNavLink();
}

function upsertProfileNavLink() {
  const navLinks = document.getElementById('main-nav-links');
  if (!navLinks) return;

  const existing = navLinks.querySelector('[data-profile-nav="true"]');
  if (readAccessToken()) {
    if (!existing) {
      const link = document.createElement('a');
      link.className = 'nav-link';
      link.href = './profile.html';
      link.textContent = 'Profile';
      link.setAttribute('data-profile-nav', 'true');
      navLinks.appendChild(link);
    }
    return;
  }

  if (existing) {
    existing.remove();
  }
}

function upsertAdminNavLink() {
  const navLinks = document.getElementById('main-nav-links');
  if (!navLinks) return;

  const existing = navLinks.querySelector('[data-admin-nav="true"]');
  if (isAdminSession()) {
    if (!existing) {
      const link = document.createElement('a');
      link.className = 'nav-link';
      link.href = './admin.html';
      link.textContent = 'Admin';
      link.setAttribute('data-admin-nav', 'true');
      navLinks.appendChild(link);
    }
    return;
  }

  if (existing) {
    existing.remove();
  }
}

async function hydrateMembershipPlans() {
  const plansGrid = document.getElementById('membership-plans-grid');
  if (!plansGrid) return;

  try {
    const plans = await apiRequest('/api/v1/membership/plans/active', { method: 'GET' });
    if (!Array.isArray(plans) || plans.length === 0) {
      cachedMembershipPlans = [];
      populateUpgradePlanOptions();
      const status = document.getElementById('membership-sync-status');
      if (status) {
        status.textContent = 'No active membership plans found. Ask an admin to create or activate plans.';
      }
      return;
    }

    cachedMembershipPlans = plans;
    populateUpgradePlanOptions();

    plansGrid.innerHTML = plans.map((plan) => `
      <div class="membership-card">
        <h3 class="card-title">${plan.name}</h3>
        <p class="card-desc">${plan.description || ''}</p>
        <div class="price-row">
          <div class="price-main">R${Number(plan.monthlyPrice || 0).toFixed(2)}</div>
          <div class="price-month">/month</div>
        </div>
        <ul class="feature-list">
          <li class="feature-item"><div class="feature-dot"></div><span>${plan.freeWashes || 0} free washes</span></li>
          <li class="feature-item"><div class="feature-dot"></div><span>${plan.creditsPerMonth || 0} monthly credits</span></li>
          <li class="feature-item"><div class="feature-dot"></div><span>${plan.discountPercentage || 0}% service discount</span></li>
        </ul>
        <button type="button" class="pill-btn join-btn" data-plan-id="${plan.id}">Join ${plan.name}</button>
      </div>
    `).join('');
  } catch (error) {
    const status = document.getElementById('membership-sync-status');
    if (status) {
      status.textContent = `Could not load live plans (${error.message}). Showing static plans.`;
    }
  }
}

function populateUpgradePlanOptions() {
  const select = document.getElementById('membership-upgrade-plan');
  if (!select) return;

  if (!Array.isArray(cachedMembershipPlans) || cachedMembershipPlans.length === 0) {
    select.innerHTML = '<option value="">No active plans available</option>';
    return;
  }

  select.innerHTML = cachedMembershipPlans
    .map((plan) => `<option value="${plan.id}">${plan.name} - R${Number(plan.monthlyPrice || 0).toFixed(2)}</option>`)
    .join('');
}

function resolvePlanPrice(planId) {
  for (var i = 0; i < cachedMembershipPlans.length; i++) {
    if (cachedMembershipPlans[i].id === planId) {
      return cachedMembershipPlans[i].monthlyPrice || 0;
    }
  }
  return 0;
}

function bindMembershipActions() {
  const plansGrid = document.getElementById('membership-plans-grid');
  if (!plansGrid) return;

  plansGrid.addEventListener('click', async (event) => {
    const button = event.target.closest('.join-btn, [data-plan-id]');
    if (!button) return;
    event.preventDefault();

    const status = document.getElementById('membership-sync-status');
    const planId = resolvePlanIdFromJoinButton(button, plansGrid);

    if (!planId || Number.isNaN(planId)) {
      if (status) status.textContent = 'No active plan is available to subscribe. Please contact an admin.';
      return;
    }

    if (!readAccessToken()) {
      if (status) status.textContent = 'Please login first to subscribe.';
      window.location.href = './login.html';
      return;
    }

    // Redirect to checkout with membership details
    var planName = '';
    for (var i = 0; i < cachedMembershipPlans.length; i++) {
      if (cachedMembershipPlans[i].id === planId) {
        planName = cachedMembershipPlans[i].name;
        break;
      }
    }
    var params = new URLSearchParams({
      type: 'membership',
      id: planId,
      name: planName,
      price: resolvePlanPrice(planId)
    });
    window.location.href = './checkout.html?' + params.toString();
  });
}

function resolvePlanIdFromJoinButton(button, plansGrid) {
  const directId = Number(button.getAttribute('data-plan-id'));
  if (directId && !Number.isNaN(directId)) return directId;

  const fallbackIndex = Number(button.getAttribute('data-plan-fallback-index'));
  if (!Number.isNaN(fallbackIndex) && cachedMembershipPlans[fallbackIndex]?.id) {
    return Number(cachedMembershipPlans[fallbackIndex].id);
  }

  const fallbackButtons = Array.from(plansGrid.querySelectorAll('.join-btn'));
  const index = fallbackButtons.indexOf(button);
  if (index >= 0 && cachedMembershipPlans[index]?.id) {
    return Number(cachedMembershipPlans[index].id);
  }

  return null;
}

function setAdminStat(elementId, value, suffix = '') {
  const element = document.getElementById(elementId);
  if (!element) return;
  element.textContent = `${value ?? 0}${suffix}`;
}

function money(value) {
  return `R${Number(value || 0).toFixed(2)}`;
}

async function hydrateAdminDashboard() {
  const panel = document.getElementById('admin-dashboard-page');
  if (!panel) return;

  const status = document.getElementById('admin-dashboard-status');
  if (!readAccessToken()) {
    if (status) status.textContent = 'Login as an admin to access dashboard data.';
    return;
  }

  if (!isAdminSession()) {
    if (status) status.textContent = 'Your current account is not an admin account.';
    return;
  }

  if (status) status.textContent = 'Loading dashboard...';

  try {
    const dashboard = await apiRequest('/api/v1/admin/dashboard', { method: 'GET' });
    const breakdown = await apiRequest('/api/v1/admin/memberships/status-breakdown', { method: 'GET' });
    const planAnalytics = await apiRequest('/api/v1/admin/plans/analytics', { method: 'GET' });
    const membershipsPage = await apiRequest('/api/v1/admin/memberships?page=0&size=20', { method: 'GET' });

    setAdminStat('admin-total-members', dashboard?.totalMembers);
    setAdminStat('admin-active-memberships', dashboard?.totalActiveMemberships);
    setAdminStat('admin-monthly-revenue', money(dashboard?.totalMonthlyRevenue));
    setAdminStat('admin-active-plans', dashboard?.activePlans);

    setAdminStat('admin-breakdown-active', breakdown?.activeMemberships);
    setAdminStat('admin-breakdown-expired', breakdown?.expiredMemberships);
    setAdminStat('admin-breakdown-suspended', breakdown?.suspendedMemberships);
    setAdminStat('admin-breakdown-cancelled', breakdown?.cancelledMemberships);

    const plansTableBody = document.getElementById('admin-plan-analytics-body');
    if (plansTableBody) {
      const rows = Array.isArray(planAnalytics) ? planAnalytics : [];
      plansTableBody.innerHTML = rows.length === 0
        ? '<tr><td colspan="5" style="padding:12px;color:var(--metallic);">No plan analytics available.</td></tr>'
        : rows.map((row) => `
            <tr>
              <td style="padding:10px 12px;">${row.planName || 'N/A'}</td>
              <td style="padding:10px 12px;">${money(row.monthlyPrice)}</td>
              <td style="padding:10px 12px;">${row.activeSubscriptions ?? 0}</td>
              <td style="padding:10px 12px;">${row.totalSubscriptions ?? 0}</td>
              <td style="padding:10px 12px;">${money(row.totalMonthlyRevenue)}</td>
            </tr>
          `).join('');
    }

    const membershipsTableBody = document.getElementById('admin-memberships-body');
    if (membershipsTableBody) {
      const rows = Array.isArray(membershipsPage?.content) ? membershipsPage.content : [];
      membershipsTableBody.innerHTML = rows.length === 0
        ? '<tr><td colspan="6" style="padding:12px;color:var(--metallic);">No membership records found.</td></tr>'
        : rows.map((row) => `
            <tr>
              <td style="padding:10px 12px;">${row.clientId ?? 'N/A'}</td>
              <td style="padding:10px 12px;">${row.planName || 'N/A'}</td>
              <td style="padding:10px 12px;">${row.status || 'UNKNOWN'}</td>
              <td style="padding:10px 12px;">${row.creditsRemaining ?? 0}</td>
              <td style="padding:10px 12px;">${row.daysUntilExpiry ?? 0}</td>
              <td style="padding:10px 12px;">${row.autoRenew ? 'Yes' : 'No'}</td>
            </tr>
          `).join('');
    }

    if (status) status.textContent = 'Dashboard synchronized.';
  } catch (error) {
    if (status) status.textContent = `Could not load dashboard: ${error.message}`;
  }
}

async function hydrateCurrentMembership() {
  const panel = document.getElementById('membership-current-summary');
  const status = document.getElementById('membership-current-status');
  if (!panel || !status) return;

  if (!readAccessToken()) {
    panel.innerHTML = '';
    status.textContent = 'Login to view your current membership details.';
    return;
  }

  try {
    const membership = await apiRequest('/api/v1/membership', { method: 'GET' });
    const planName = membership?.plan?.name || 'Unknown';
    const statusValue = membership?.status || 'UNKNOWN';
    const credits = membership?.creditsRemaining ?? 0;
    const days = membership?.daysUntilExpiry ?? 0;
    const expiry = membership?.expiryDate ? new Date(membership.expiryDate).toLocaleString() : 'N/A';

    panel.innerHTML = [
      { label: 'Plan', value: planName },
      { label: 'Status', value: statusValue },
      { label: 'Credits', value: String(credits) },
      { label: 'Days Left', value: String(days) },
      { label: 'Expires', value: expiry },
      { label: 'Payment Ref', value: membership?.latestPaymentReference || 'N/A' },
    ].map((item) => `
      <div style="border:1px solid var(--panel-border);border-radius:10px;padding:12px;">
        <p style="margin:0 0 4px;color:var(--metallic);font-size:12px;">${item.label}</p>
        <p style="margin:0;font-weight:600;font-size:14px;word-break:break-word;">${item.value}</p>
      </div>
    `).join('');

    status.textContent = 'Membership profile loaded.';
  } catch (error) {
    panel.innerHTML = '';
    status.textContent = error.message;
  }
}

function bindMembershipManagementActions() {
  const renewButton = document.getElementById('membership-renew-btn');
  const upgradeButton = document.getElementById('membership-upgrade-btn');
  const status = document.getElementById('membership-manage-status');

  if (renewButton) {
    renewButton.addEventListener('click', async () => {
      if (!readAccessToken()) {
        window.location.href = './login.html';
        return;
      }

      try {
        var planName = '';
        for (var i = 0; i < cachedMembershipPlans.length; i++) {
          if (cachedMembershipPlans[i].id === (parseInt(document.getElementById('membership-upgrade-plan')?.value) || 0)) {
            planName = cachedMembershipPlans[i].name;
            break;
          }
        }
    // ── Save vehicle + address to user profile ──
    var token = readAccessToken();
    if (token) {
      var vehicleTypeMap = {'Sedan':'SEDAN','SUV':'SUV','Truck':'TRUCK','Van':'VAN','Hatchback':'HATCHBACK'};
      var vt = vehicleTypeMap[bookingData.vehicleType] || 'SEDAN';
      fetch(API_BASE + '/api/v1/clients/me/vehicles', {
        method: 'POST',
        headers: {'Content-Type':'application/json','Authorization':'Bearer '+token},
        body: JSON.stringify({vehicleMake: (bookingData.vehicleType||'Car'), vehicleModel: 'Standard', licensePlate: 'N/A', vehicleType: vt})
      }).catch(function(){});

      fetch(API_BASE + '/api/v1/clients/me/addresses', {
        method: 'POST',
        headers: {'Content-Type':'application/json','Authorization':'Bearer '+token},
        body: JSON.stringify({street: bookingData.location || 'Unknown', city: 'Johannesburg', province: 'Gauteng', postalCode: '2000', primary: true})
      }).catch(function(){});
    }

    var params = new URLSearchParams({
          type: 'membership',
          id: (parseInt(document.getElementById('membership-upgrade-plan')?.value) || 0),
          name: planName || 'Membership Renewal',
          price: 0
        });
        window.location.href = './checkout.html?' + params.toString();
      } catch (error) {
        if (status) status.textContent = error.message;
      }
    });
  }

  if (upgradeButton) {
    upgradeButton.addEventListener('click', async () => {
      if (!readAccessToken()) {
        window.location.href = './login.html';
        return;
      }

      const planSelect = document.getElementById('membership-upgrade-plan');
      const selectedPlanId = Number(planSelect?.value || 0);
      if (!selectedPlanId || Number.isNaN(selectedPlanId)) {
        if (status) status.textContent = 'Select a valid plan to upgrade.';
        return;
      }

      var planName = '';
      for (var i = 0; i < cachedMembershipPlans.length; i++) {
        if (cachedMembershipPlans[i].id === selectedPlanId) {
          planName = cachedMembershipPlans[i].name;
          break;
        }
      }
      var params = new URLSearchParams({
        type: 'membership',
        id: selectedPlanId,
        name: planName || 'Upgrade Plan',
        price: resolvePlanPrice(selectedPlanId)
      });
      window.location.href = './checkout.html?' + params.toString();
    });
  }
}

function normalizedAddOnCodes(rawCodes) {
  return rawCodes
    .map((code) => String(code || '').trim())
    .filter((code) => code.length > 0)
    .map((code) => code.replace(/-/g, '_').toUpperCase());
}

function paymentPayloadFromForm(form) {
  const data = new FormData(form);
  const gateway = String(data.get('paymentGateway') || DEFAULT_PAYMENT_GATEWAY).trim().toUpperCase();
  const paymentMethodToken = String(data.get('paymentMethodToken') || '').trim();

  if (!paymentMethodToken) {
    throw new Error('Please provide a payment token to continue.');
  }

  return {
    gateway,
    paymentMethodToken,
  };
}

function membershipPaymentPayload() {
  const gatewayInput = document.getElementById('membership-payment-gateway');
  const tokenInput = document.getElementById('membership-payment-token');
  const gateway = String(gatewayInput?.value || DEFAULT_PAYMENT_GATEWAY).trim().toUpperCase();
  const paymentMethodToken = String(tokenInput?.value || '').trim();

  if (!paymentMethodToken) {
    throw new Error('Enter your membership payment token before subscribing.');
  }

  return {
    gateway,
    paymentMethodToken,
  };
}

function bookingPayloadFromForm(form, isMobile) {
  const data = new FormData(form);
  const date = data.get('preferredDate');
  const time = data.get('preferredTime');
  const location = isMobile ? data.get('serviceAddress') : data.get('location');
  const payment = paymentPayloadFromForm(form);

  return {
    serviceType: isMobile ? 'MOBILE' : 'BAY',
    packageCode: String(data.get('service') || '').toUpperCase(),
    fullName: data.get('fullName'),
    email: data.get('email'),
    phone: data.get('phone'),
    vehicleType: data.get('vehicleType'),
    location: location,
    scheduledAt: date && time ? `${date}T${time}:00` : null,
    notes: data.get('notes') || null,
    addOns: normalizedAddOnCodes(data.getAll('addOns')),
    payment,
  };
}

function bindBookingForm(formId, statusId, isMobile) {
  const form = document.getElementById(formId);
  const status = document.getElementById(statusId);
  if (!form) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = new FormData(form);

    var serviceOption = data.get('serviceOption') || 'bring_car';
    var service = data.get('service') || 'BASIC_WASH';
    var date = data.get('preferredDate') || new Date().toISOString().slice(0,10);
    var time = data.get('preferredTime') || '10:00';
    var location = data.get('location') || (isMobile ? 'Mobile Service' : 'Bay Service');

    // Fetch prices from catalogue API
    var servicePrice = 399;
    var optionPrice = serviceOption === 'collection' ? 150 : 0;
    try {
      var catalogueServices = await apiRequest('/api/v1/catalogue/services?activeOnly=true');
      if (Array.isArray(catalogueServices)) {
        var found = catalogueServices.find(function(s) { return s.code === service; });
        if (found) servicePrice = Number(found.basePrice) || 399;
      }
    } catch(e) {
      var prices = {
        'BASIC_WASH': 99,
        'DELUXE_WASH': 199,
        'PREMIUM_WASH': 349,
        'MOBILE_WASH': 449,
        'WAX_POLISH': 499,
        'CERAMIC_COAT': 1499
      };
      servicePrice = prices[service] || 399;
    }
    var total = servicePrice + optionPrice;

    var bookingData = {
      serviceType: isMobile ? 'MOBILE' : 'BAY',
      packageCode: service,
      fullName: data.get('fullName') || 'Customer',
      email: data.get('email') || 'customer@test.com',
      phone: data.get('phone') || '0820000000',
      vehicleType: data.get('vehicleType') || 'Sedan',
      location: location,
      scheduledAt: date + 'T' + time + ':00',
      notes: data.get('notes') || '',
      addOns: []
    };

    var params = new URLSearchParams({
      type: 'booking',
      id: service,
      name: (isMobile ? 'Mobile ' : 'Bay ') + service.replace(/_/g, ' ').replace(/\b\w/g, function(l) { return l.toUpperCase(); }),
      price: total,
      data: JSON.stringify(bookingData)
    });

    window.location.href = './checkout.html?' + params.toString();
  });
}

// Initialize theme from localStorage
function initTheme() {
  const savedTheme = localStorage.getItem('int216d-theme') || 'dark';
  htmlElement.setAttribute('data-theme', savedTheme);
  updateThemeButton(savedTheme);
}

function updateThemeButton(theme) {
  if (theme === 'light') {
    themeToggleBtn.textContent = 'Dark';
  } else {
    themeToggleBtn.textContent = 'Light';
  }
}

function toggleTheme() {
  const currentTheme = htmlElement.getAttribute('data-theme') || 'dark';
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  htmlElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('int216d-theme', newTheme);
  updateThemeButton(newTheme);
}

themeToggleBtn.addEventListener('click', toggleTheme);

// Menu toggle functionality
const menuToggleBtn = document.getElementById('menu-toggle-btn');
const mainNav = document.getElementById('main-nav');
const navLinks = document.getElementById('main-nav-links');

menuToggleBtn.addEventListener('click', () => {
  const isOpen = mainNav.classList.contains('menu-open');
  if (isOpen) {
    mainNav.classList.remove('menu-open');
    menuToggleBtn.setAttribute('aria-expanded', 'false');
  } else {
    mainNav.classList.add('menu-open');
    menuToggleBtn.setAttribute('aria-expanded', 'true');
  }
});

// Close menu when link is clicked
if (navLinks) {
  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      mainNav.classList.remove('menu-open');
      menuToggleBtn.setAttribute('aria-expanded', 'false');
    });
  });
}

// Scroll to top functionality
const brandLink = document.querySelector('.brand');
if (brandLink && brandLink.dataset.scrollTop === 'true') {
  brandLink.addEventListener('click', (e) => {
    if (brandLink.getAttribute('href') === '#') {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });
}

// Initialize theme on page load
initTheme();

// Update copyright year dynamically
document.querySelectorAll('.footer-copy').forEach(el => {
  el.innerHTML = el.innerHTML.replace(/\d{4}/, new Date().getFullYear());
});

// Contact form handler
const contactForm = document.getElementById('contact-form');
if (contactForm) {
  const statusDiv = document.createElement('div');
  statusDiv.id = 'contact-status';
  statusDiv.style.cssText = 'margin-top: 1rem; padding: 0.75rem; border-radius: 0.375rem; display: none;';
  contactForm.appendChild(statusDiv);
  
  contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = contactForm.querySelector('button[type="submit"]');
    const originalText = btn.textContent;
    
    const formData = new FormData(contactForm);
    const body = {
      name: formData.get('name')?.trim(),
      email: formData.get('email')?.trim(),
      phone: formData.get('phone')?.trim(),
      subject: formData.get('subject')?.trim(),
      message: formData.get('message')?.trim()
    };
    
    statusDiv.style.display = 'none';
    
    if (!body.name || !body.email || !body.message) {
      statusDiv.textContent = 'Please fill in all required fields (Name, Email, Message).';
      statusDiv.style.cssText += 'background-color: #fee2e2; color: #991b1b; display: block;';
      return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      statusDiv.textContent = 'Please enter a valid email address.';
      statusDiv.style.cssText += 'background-color: #fee2e2; color: #991b1b; display: block;';
      return;
    }
    
    btn.textContent = 'Sending...';
    btn.disabled = true;
    statusDiv.textContent = 'Sending your message...';
    statusDiv.style.cssText += 'background-color: #dbeafe; color: #1e40af; display: block;';

    try {
      const response = await fetch(`${API_BASE}/api/v1/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (response.ok) {
        statusDiv.textContent = 'Message sent successfully! We will get back to you soon.';
        statusDiv.style.cssText = 'margin-top: 1rem; padding: 0.75rem; border-radius: 0.375rem; background-color: #dcfce7; color: #166534; display: block;';
        contactForm.reset();
      } else {
        statusDiv.textContent = 'Failed to send message. Please try again later.';
        statusDiv.style.cssText += 'background-color: #fee2e2; color: #991b1b; display: block;';
      }
    } catch {
      statusDiv.textContent = 'Network error. Please check your connection and try again.';
      statusDiv.style.cssText += 'background-color: #fee2e2; color: #991b1b; display: block;';
    } finally {
      btn.textContent = originalText;
      btn.disabled = false;
    }
  });
}
hydrateLoginButtons();
hydrateMembershipPlans();
hydrateCurrentMembership();
bindMembershipActions();
bindMembershipManagementActions();
hydrateAdminDashboard();
bindBookingForm('bay-booking-form', 'bay-booking-status', false);
bindBookingForm('mobile-booking-form', 'mobile-booking-status', true);

// Draw iridescent canvas if present
const iridescentCanvas = document.getElementById('iridescent-canvas');
if (iridescentCanvas) {
  const ctx = iridescentCanvas.getContext('2d');
  const container = iridescentCanvas.parentElement;

  function resizeCanvas() {
    iridescentCanvas.width = container.offsetWidth;
    iridescentCanvas.height = container.offsetHeight;
  }

  function drawIridescent() {
    const width = iridescentCanvas.width;
    const height = iridescentCanvas.height;

    // Clear canvas
    ctx.fillStyle = 'rgba(0, 0, 0, 0)';
    ctx.fillRect(0, 0, width, height);

    // Draw iridescent gradient
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, 'rgba(18, 179, 166, 0.1)');
    gradient.addColorStop(0.5, 'rgba(18, 179, 166, 0.05)');
    gradient.addColorStop(1, 'rgba(18, 179, 166, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  resizeCanvas();
  drawIridescent();

  window.addEventListener('resize', () => {
    resizeCanvas();
    drawIridescent();
  });
}

// Draw beam canvas if present
const beamCanvas = document.getElementById('beam-canvas');
if (beamCanvas) {
  const ctx = beamCanvas.getContext('2d');
  const container = beamCanvas.parentElement;

  function resizeBeamCanvas() {
    beamCanvas.width = container.offsetWidth;
    beamCanvas.height = container.offsetHeight;
  }

  function drawBeam() {
    const width = beamCanvas.width;
    const height = beamCanvas.height;

    // Clear canvas
    ctx.fillStyle = 'rgba(0, 0, 0, 0)';
    ctx.fillRect(0, 0, width, height);

    // Draw beam effect
    const gradient = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(width, height));
    gradient.addColorStop(0, 'rgba(18, 179, 166, 0.15)');
    gradient.addColorStop(0.5, 'rgba(18, 179, 166, 0.05)');
    gradient.addColorStop(1, 'rgba(18, 179, 166, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  resizeBeamCanvas();
  drawBeam();

  window.addEventListener('resize', () => {
    resizeBeamCanvas();
    drawBeam();
  });
}

// Hero section background fade in
const heroBg = document.getElementById('hero-three');
if (heroBg) {
  setTimeout(() => {
    heroBg.classList.add('loaded');
  }, 100);
}

// Fade in hero content
const heroSubtitle = document.getElementById('hero-subtitle');
const heroCta = document.getElementById('hero-cta');

if (heroSubtitle) {
  setTimeout(() => {
    heroSubtitle.style.opacity = '1';
    heroSubtitle.style.transition = 'opacity 1s ease-out';
  }, 200);
}

if (heroCta) {
  setTimeout(() => {
    heroCta.style.opacity = '1';
    heroCta.style.transition = 'opacity 1s ease-out';
  }, 400);
}
