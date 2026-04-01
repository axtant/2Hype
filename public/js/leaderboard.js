const REFRESH_MS = 30_000;

// ── Dummy players shown when the API returns no data ──────────────────────────
let DUMMY_PLAYERS = null; // populated after first avatar fetch

async function getDummyPlayers() {
  if (DUMMY_PLAYERS) return DUMMY_PLAYERS;
  let avatarUrl = null;
  let displayName = 'axtant';
  try {
    const r = await fetch('/api/steamprofile/axtant');
    if (r.ok) { const d = await r.json(); avatarUrl = d.avatarUrl; displayName = d.displayName || 'axtant'; }
  } catch (_) {}
  DUMMY_PLAYERS = [
    { rank: 1, displayName, avatarUrl, kills: 3840, deaths: 1102, kd: '3.48', hsp: 54, damage: 812400, isVip: false },
    { rank: 2, displayName, avatarUrl, kills: 2910, deaths: 988,  kd: '2.95', hsp: 49, damage: 653200, isVip: false },
    { rank: 3, displayName, avatarUrl, kills: 2540, deaths: 1220, kd: '2.08', hsp: 46, damage: 571000, isVip: false },
    { rank: 3, displayName, avatarUrl, kills: 2540, deaths: 1220, kd: '2.08', hsp: 46, damage: 571000, isVip: false },
    { rank: 3, displayName, avatarUrl, kills: 2540, deaths: 1220, kd: '2.08', hsp: 46, damage: 571000, isVip: false },
    { rank: 3, displayName, avatarUrl, kills: 2540, deaths: 1220, kd: '2.08', hsp: 46, damage: 571000, isVip: false },
  ];
  return DUMMY_PLAYERS;
}

// ── Render podium (top 3 square cards in staircase) ───────────────────────────
function renderPodium(players) {
  const stage = document.getElementById('podium-container');

  // Always render all 3 slots — use placeholder if no player
  const slots = [
    { player: players[0], cls: 'podium-1st', rankCls: 'gold',   num: '01', showCrown: true },
    { player: players[1], cls: 'podium-2nd', rankCls: 'silver',  num: '02', showCrown: false },
    { player: players[2], cls: 'podium-3rd', rankCls: 'bronze',  num: '03', showCrown: false },
  ];

  const rankCardCls = { gold: 'rank-gold', silver: 'rank-silver', bronze: 'rank-bronze' };

  stage.innerHTML = slots.map(({ player, cls, rankCls, num, showCrown }) => {
    if (!player) {
      return `
        <div class="podium-player ${cls}">
          <div class="podium-card podium-card--placeholder ${rankCardCls[rankCls]}">
            <span class="podium-card-rank ${rankCls}">${num}</span>
            <div class="podium-placeholder-inner">
              <div class="podium-placeholder-icon">${num}</div>
            </div>
            <div class="podium-card-footer">
              <span class="podium-name muted">No challenger yet</span>
            </div>
          </div>
        </div>`;
    }

    const kd = parseFloat(player.kd);
    const avatarHtml = player.avatarUrl
      ? `<img src="${player.avatarUrl}" alt="${escHtml(player.displayName)}" />`
      : `<div style="width:100%;height:100%;background:rgba(255,255,255,0.04);display:flex;align-items:center;justify-content:center;">
           <span style="font-family:'Rajdhani',sans-serif;font-size:2rem;font-weight:700;color:rgba(255,255,255,0.08)">${num}</span>
         </div>`;

    return `
      <div class="podium-player ${cls}">
        <div class="podium-card ${rankCardCls[rankCls]}">
          ${showCrown ? '<span class="podium-crown">👑</span>' : ''}
          <span class="podium-card-rank ${rankCls}">${num}</span>
          ${player.isVip ? '<span class="podium-vip-tag">★ VIP</span>' : ''}
          <div class="podium-avatar-area">${avatarHtml}</div>
          <div class="podium-card-footer">
            <span class="podium-name">${escHtml(player.displayName)}</span>
            <div class="podium-stat-row">
              <span class="podium-stat-kills">${player.kills} kills</span>
              <span class="${kd >= 1.5 ? 'podium-stat-kd-good' : ''}">${player.kd} K/D</span>
            </div>
          </div>
        </div>
      </div>`;
  }).join('');
}

// ── Render scrollable list (rank 4+) ─────────────────────────────────────────
function renderList(players) {
  const tbody = document.getElementById('lb-body');

  if (!players.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="lb-cell-empty">Everyone else is still grinding…</td></tr>';
    return;
  }

  tbody.innerHTML = players.map((p) => {
    const kd = parseFloat(p.kd);
    const kdClass = kd >= 1.5 ? 'lb-kd-good' : kd < 1 ? 'lb-kd-bad' : '';
    return `
      <tr class="${p.isVip ? 'lb-vip-row' : ''}">
        <td><span class="rank-badge">${p.rank}</span></td>
        <td>
          <div class="lb-cell-player">
            ${p.avatarUrl ? `<img src="${p.avatarUrl}" class="lb-cell-avatar" alt="" />` : ''}
            <span class="lb-cell-name">${escHtml(p.displayName)}</span>
            ${p.isVip ? '<span style="font-size:.55rem;padding:2px 5px;border-radius:3px;background:rgba(255,85,0,.15);color:#ff7733;border:1px solid rgba(255,85,0,.25);font-weight:700;letter-spacing:.5px">VIP</span>' : ''}
          </div>
        </td>
        <td>${p.kills}</td>
        <td>${p.deaths}</td>
        <td class="${kdClass}">${p.kd}</td>
        <td class="lb-hs">${p.hsp}%</td>
        <td>${p.damage}</td>
      </tr>`;
  }).join('');
}

// ── Fetch & refresh ───────────────────────────────────────────────────────────
async function loadLeaderboard() {
  setLive('UPDATING');
  try {
    const res = await fetch('/api/leaderboard');
    if (!res.ok) throw new Error();
    const { leaderboard } = await res.json();

    const players = leaderboard.length ? leaderboard : await getDummyPlayers();

    renderPodium(players.slice(0, 3));
    renderList(players.slice(3));

    const n = players.length;
    document.getElementById('lb-count').textContent = `${n} player${n !== 1 ? 's' : ''}`;
    setLive('LIVE');
  } catch (_) {
    // Silently stay LIVE on error; show dummy data
    const players = await getDummyPlayers();
    renderPodium(players.slice(0, 3));
    renderList(players.slice(3));
    document.getElementById('lb-count').textContent = `${players.length} players`;
    setLive('LIVE');
  }
}

function setLive(text) {
  document.getElementById('live-text').textContent = text;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── Boot ──────────────────────────────────────────────────────────────────────
loadLeaderboard();
setInterval(loadLeaderboard, REFRESH_MS);
