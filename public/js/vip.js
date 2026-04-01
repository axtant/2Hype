// ── State ─────────────────────────────────────────────────────────────────────
let currentUser = null;
let currentPlan = null;

const PLAN_FEATURES = {
  HOURLY:     ['1 dedicated DM slot', 'Any map config', 'Up to 10 players', '1-hour access'],
  MONTHLY:    ['Dedicated slot all month', 'All map configs', 'Up to 16 players', 'Priority queue'],
  HOST_MATCH: ['Competitive 5v5 server', 'Custom team names', 'Any competitive map', '3-hour session'],
  VIP:        ['VIP badge on leaderboard', 'Priority server access', 'Exclusive DM configs', '30-day access'],
};

const PLAN_ICONS = {
  HOURLY:     '⚡',
  MONTHLY:    '📅',
  HOST_MATCH: '🎮',
  VIP:        '★',
};

// ── Auth ──────────────────────────────────────────────────────────────────────
async function loadUser() {
  try {
    const res = await fetch('/api/user');
    if (res.ok) {
      const data = await res.json();
      currentUser = data.user;
    }
  } catch (_) {}
}

async function loadMyPlan() {
  if (!currentUser) return;
  try {
    const res = await fetch('/api/plans/me');
    if (res.ok) {
      const data = await res.json();
      currentPlan = data.subscription;
    }
  } catch (_) {}
}

// ── Render auth section ───────────────────────────────────────────────────────
function renderAuth() {
  const section = document.getElementById('auth-section');

  if (!currentUser) {
    section.innerHTML = `
      <div class="vip-guest-card">
        <div class="vip-guest-text">
          <h3>Login to Unlock VIP</h3>
          <p>Sign in with Steam to purchase plans, track your stats, and access exclusive server features on 2Hype.</p>
        </div>
        <a href="/auth/steam" class="btn-steam-vip">
          <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
            <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.605 0 11.979 0z"/>
          </svg>
          Login via Steam
        </a>
      </div>`;
    return;
  }

  const isVip = currentUser.isVip;
  const hasActivePlan = currentPlan && currentPlan.status === 'ACTIVE';
  const expiresStr = hasActivePlan && currentPlan.expiresAt
    ? `Expires ${new Date(currentPlan.expiresAt).toLocaleDateString()}`
    : '';

  let chipHtml = '<span class="vip-plan-chip chip-none">No active plan</span>';
  if (isVip) {
    chipHtml = '<span class="vip-plan-chip chip-vip">★ VIP</span>';
  } else if (hasActivePlan) {
    chipHtml = `<span class="vip-plan-chip chip-active">${currentPlan.plan}</span>`;
  }

  // Show "Unlock VIP" CTA only when logged in but not yet VIP
  const unlockCta = !isVip ? `
    <a href="#vip-box" class="vip-unlock-cta" onclick="document.getElementById('vip-plan-card').classList.add('bento-vip--pulse');setTimeout(()=>document.getElementById('vip-plan-card').classList.remove('bento-vip--pulse'),1200)">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <polyline points="9 18 15 12 9 6"/>
      </svg>
      Check Unlock VIP
    </a>` : '';

  section.innerHTML = `
    <div class="vip-user-card ${isVip ? 'has-vip' : ''}">
      <div class="vip-user-profile">
        <div class="vip-user-avatar-wrap">
          <img class="vip-user-avatar" src="${currentUser.avatarUrl || ''}" alt="avatar" />
        </div>
        <div class="vip-user-meta">
          <span class="vip-user-name">${escHtml(currentUser.displayName)}</span>
          <div class="vip-user-sub">
            ${chipHtml}
            ${expiresStr ? `<span class="vip-plan-expires">${expiresStr}</span>` : ''}
          </div>
        </div>
      </div>
      <div class="vip-user-actions">
        ${unlockCta}
        <button class="vip-logout-btn" id="vip-logout-btn" title="Logout">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
        </button>
      </div>
    </div>`;

  document.getElementById('vip-logout-btn').addEventListener('click', async () => {
    await fetch('/logout', { method: 'POST' });
    location.reload();
  });

  // Header user chip
  document.getElementById('vip-header-user').innerHTML = `
    <div class="vip-header-user-chip">
      <img class="vip-header-avatar" src="${currentUser.avatarUrl || ''}" alt="avatar" />
      <span class="vip-header-name">${escHtml(currentUser.displayName)}</span>
      ${isVip ? '<span class="vip-tag">★ VIP</span>' : ''}
    </div>`;
}

// ── Render plans as numbered steps ───────────────────────────────────────────
// Display order: HOURLY → HOST_MATCH → VIP → MONTHLY
const PLAN_ORDER = ['HOURLY', 'HOST_MATCH', 'VIP', 'MONTHLY'];

function renderPlans(plans) {
  const grid = document.getElementById('vip-plans-grid');

  // Sort plans into desired step order; append any unknown keys at the end
  const ordered = [
    ...PLAN_ORDER.filter((k) => plans[k]).map((k) => [k, plans[k]]),
    ...Object.entries(plans).filter(([k]) => !PLAN_ORDER.includes(k)),
  ];

  grid.innerHTML = ordered.map(([key, plan], idx) => {
    const isVipPlan = key === 'VIP';
    const features = PLAN_FEATURES[key] || [];
    const icon = PLAN_ICONS[key] || '🔸';
    const stepNum = String(idx + 1).padStart(2, '0');
    const duration = plan.durationHours < 24
      ? `${plan.durationHours} hr${plan.durationHours > 1 ? 's' : ''}`
      : `${plan.durationHours / 24} days`;

    const buyBtn = currentUser
      ? `<button class="vip-buy-btn" data-plan="${key}" data-price="${plan.price}" data-label="${escHtml(plan.label)}">Buy Now</button>`
      : `<button class="vip-login-prompt-btn" onclick="location.href='/auth/steam'">Login to Buy</button>`;

    return `
      <div class="vip-step ${isVipPlan ? 'step-vip' : ''}">
        <div class="vip-step-indicator">
          <div class="vip-step-num">${stepNum}</div>
          <div class="vip-step-line"></div>
        </div>
        <div class="vip-step-card-wrap">
          <div class="vip-plan-card ${isVipPlan ? 'plan-vip-card' : ''}">
            <div class="vip-plan-head">
              <div class="vip-plan-icon">${icon}</div>
              <div class="vip-plan-name">${escHtml(plan.label)}</div>
              <div class="vip-plan-duration">${duration}</div>
            </div>
            <div class="vip-plan-body">
              <ul class="vip-plan-features">
                ${features.map((f) => `<li>${escHtml(f)}</li>`).join('')}
              </ul>
            </div>
            <div class="vip-plan-action">
              <div>
                <div class="vip-plan-price-row">
                  <span class="vip-plan-currency">$</span>
                  <span class="vip-plan-amount">${plan.price}</span>
                </div>
              </div>
              ${buyBtn}
            </div>
          </div>
        </div>
      </div>`;
  }).join('');

  // Attach buy handlers
  grid.querySelectorAll('.vip-buy-btn').forEach((btn) => {
    btn.addEventListener('click', () => handleBuy(btn));
  });
}

// ── Razorpay checkout flow ────────────────────────────────────────────────────
async function handleBuy(btn) {
  const plan = btn.dataset.plan;
  const label = btn.dataset.label;
  btn.disabled = true;
  btn.textContent = 'Processing…';

  try {
    // Try to create a Razorpay order via backend
    const orderRes = await fetch('/api/payment/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan }),
    });

    if (orderRes.ok) {
      const { order, key } = await orderRes.json();
      await openRazorpay(order, key, plan, label, btn);
    } else {
      // Razorpay not configured — fallback to direct purchase
      await directBuy(plan, label, btn);
    }
  } catch (_) {
    await directBuy(plan, label, btn);
  }
}

function loadRazorpayScript() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) { resolve(); return; }
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = resolve;
    s.onerror = reject;
    document.body.appendChild(s);
  });
}

async function openRazorpay(order, key, plan, label, btn) {
  await loadRazorpayScript();
  const options = {
    key,
    amount: order.amount,
    currency: order.currency,
    name: '2Hype CS2 Servers',
    description: label,
    image: '/img/2h%20logo.png',
    order_id: order.id,
    handler: async (response) => {
      // Payment successful — record purchase
      await directBuy(plan, label, btn);
    },
    prefill: {
      name: currentUser?.displayName || '',
    },
    theme: { color: '#ff5500' },
    modal: {
      ondismiss: () => {
        btn.disabled = false;
        btn.textContent = 'Buy Now';
      },
    },
  };

  const rzp = new window.Razorpay(options);
  rzp.open();
}

async function directBuy(plan, label, btn) {
  try {
    const res = await fetch('/api/plans/buy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan }),
    });
    const data = await res.json();

    if (data.success) {
      showToast(`✓ ${label} activated!`, 'success');
      await loadMyPlan();
      renderAuth();
    } else {
      showToast(data.error || 'Purchase failed', 'error');
    }
  } catch (_) {
    showToast('Purchase failed — try again', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Buy Now';
  }
}

// ── Toast ─────────────────────────────────────────────────────────────────────
let toastTimer = null;
function showToast(msg, type = '') {
  const el = document.getElementById('vip-toast');
  el.textContent = msg;
  el.className = `vip-toast show ${type ? 'toast-' + type : ''}`;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3500);
}

// XSS-safe text insertion
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Boot ──────────────────────────────────────────────────────────────────────
async function init() {
  await loadUser();
  await loadMyPlan();
  renderAuth();

  // Wire the static VIP buy button in HTML
  const vipBtn = document.getElementById('vip-buy-btn');
  if (vipBtn) {
    vipBtn.addEventListener('click', () => handleBuy(vipBtn));
  }

  // ── Server status dropdown ────────────────────────────────────────────────
  const pill = document.getElementById('vip-status-pill');
  const dropdown = document.getElementById('vip-status-dropdown');
  if (pill && dropdown) {
    pill.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = pill.getAttribute('aria-expanded') === 'true';
      pill.setAttribute('aria-expanded', String(!open));
      dropdown.setAttribute('aria-hidden', String(open));
    });
    document.addEventListener('click', () => {
      pill.setAttribute('aria-expanded', 'false');
      dropdown.setAttribute('aria-hidden', 'true');
    });
    dropdown.addEventListener('click', (e) => e.stopPropagation());
  }
}

init();
