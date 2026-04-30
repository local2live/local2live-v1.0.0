'use strict';

// ── Element refs ─────────────────────────────────────────────────────────────
const inputUrl      = document.getElementById('input-url');
const btnStart      = document.getElementById('btn-start');
const btnStop       = document.getElementById('btn-stop');
const btnCopy       = document.getElementById('btn-copy');
const btnClearLog   = document.getElementById('btn-clear-log');
const btnTheme      = document.getElementById('btn-theme');
const themeIcon     = document.getElementById('theme-icon');
const themeLabel    = document.getElementById('theme-label');
const statusText    = document.getElementById('status-text');
const cursorBlink   = document.getElementById('cursor-blink');
const urlCard       = document.getElementById('url-card');
const publicUrlEl   = document.getElementById('public-url');
const logBody       = document.getElementById('log-body');
const infoPort      = document.getElementById('info-port');
const infoStatus    = document.getElementById('info-status');
const infoUptime    = document.getElementById('info-uptime');
const sessionListEl = document.getElementById('session-list');
const btnAddTunnel  = document.getElementById('btn-add-tunnel');
const btnWinMin     = document.getElementById('win-min');
const btnWinMax     = document.getElementById('win-max');
const btnWinClose   = document.getElementById('win-close');

// ── Window Controls ───────────────────────────────────────────────────────────
if (btnWinMin) btnWinMin.addEventListener('click', () => window.tunnelAPI.minimize());
if (btnWinMax) btnWinMax.addEventListener('click', () => window.tunnelAPI.maximize());
if (btnWinClose) btnWinClose.addEventListener('click', () => window.tunnelAPI.close());

// ── Theme ─────────────────────────────────────────────────────────────────────
let isDark = true;
function applyTheme(dark) {
  isDark = dark;
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  themeIcon.textContent  = dark ? '☀' : '☾';
  themeLabel.textContent = dark ? 'Light' : 'Dark';
  if (window.tunnelAPI && window.tunnelAPI.updateTheme) {
    window.tunnelAPI.updateTheme(dark);
  }
}
btnTheme.addEventListener('click', () => applyTheme(!isDark));

// ── State for Multiple Tunnels ───────────────────────────────────────────────
let sessions = [];
let currentSessionId = null;

function ts() {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function extractPortDisplay(raw) {
  const trimmed = (raw || '').trim();
  try {
    const url = new URL(trimmed.startsWith('http') ? trimmed : `http://${trimmed}`);
    return url.port || (url.protocol === 'https:' ? '443' : '80');
  } catch (_) {
    const num = parseInt(trimmed, 10);
    return isNaN(num) ? '?' : String(num);
  }
}

// Create a new tunnel session
function createSession() {
  const id = crypto.randomUUID();
  sessions.push({
    id,
    rawUrl: '',
    port: '—',
    status: 'stopped', // 'stopped', 'starting', 'running', 'error'
    message: 'Waiting for input…',
    publicUrl: null,
    uptimeStart: null,
    logs: [
      { ts: ts(), level: 'dim', msg: 'local2live ready.' },
      { ts: ts(), level: 'dim', msg: 'Enter a local URL and press Generate.' }
    ]
  });
  switchSession(id);
}

// Delete a tunnel session
async function deleteSession(id) {
  const index = sessions.findIndex(s => s.id === id);
  if (index === -1) return;

  // Attempt to stop the tunnel in the background
  window.tunnelAPI.stop(id).catch(err => console.error(err));

  sessions.splice(index, 1);

  if (sessions.length === 0) {
    createSession(); // always keep at least one
  } else if (currentSessionId === id) {
    const nextIndex = Math.min(index, sessions.length - 1);
    switchSession(sessions[nextIndex].id);
  } else {
    renderSidebar();
  }
}

// Switch to a tunnel session
function switchSession(id) {
  currentSessionId = id;
  renderSidebar();
  renderMain();
}

function getSession(id) {
  return sessions.find(s => s.id === id);
}

// Update the active session and re-render if it's the active one
function updateSession(id, updates) {
  const session = getSession(id);
  if (!session) return;
  Object.assign(session, updates);
  renderSidebar();
  if (currentSessionId === id) {
    renderMain();
  }
}

// Add a log to a session
function addLog(id, message, level = 'info') {
  const session = getSession(id);
  if (!session) return;
  session.logs.push({ ts: ts(), level, msg: message });
  if (currentSessionId === id) {
    renderLogs();
  }
}

// ── Rendering ─────────────────────────────────────────────────────────────────

function renderSidebar() {
  sessionListEl.innerHTML = '';
  sessions.forEach((session, index) => {
    const id = session.id;
    const displayName = `tunnel-${String(index + 1).padStart(2, '0')}`;
    
    const item = document.createElement('div');
    item.className = `sidebar-item ${id === currentSessionId ? 'active' : ''}`;
    item.style.cursor = 'pointer';
    item.style.display = 'flex';
    item.style.justifyContent = 'space-between';
    item.style.alignItems = 'center';
    item.style.paddingRight = '10px';
    
    const leftDiv = document.createElement('div');
    leftDiv.style.display = 'flex';
    leftDiv.style.alignItems = 'center';
    leftDiv.style.gap = '8px';
    leftDiv.innerHTML = `
      <div class="dot-sm ${session.status}"></div>
      <span>${displayName}</span>
    `;

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.style.background = 'none';
    closeBtn.style.border = 'none';
    closeBtn.style.color = 'var(--text-dim)';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.fontSize = '16px';
    closeBtn.style.lineHeight = '1';
    closeBtn.style.padding = '0 4px';
    closeBtn.title = 'Remove Tunnel';
    
    closeBtn.onmouseenter = () => closeBtn.style.color = 'var(--red)';
    closeBtn.onmouseleave = () => closeBtn.style.color = 'var(--text-dim)';
    
    closeBtn.onclick = (e) => {
      e.stopPropagation();
      deleteSession(id);
    };

    item.onclick = () => switchSession(id);
    
    item.appendChild(leftDiv);
    item.appendChild(closeBtn);
    
    sessionListEl.appendChild(item);
  });
}

function renderLogs() {
  const session = getSession(currentSessionId);
  if (!session) return;
  
  logBody.innerHTML = session.logs.map(l => `
    <div class="log-line">
      <span class="log-ts">${l.ts}</span>
      <span class="log-msg ${l.level}">${escHtml(l.msg)}</span>
    </div>
  `).join('');
  logBody.scrollTop = logBody.scrollHeight;
}

function renderMain() {
  const session = getSession(currentSessionId);
  if (!session) return;

  // Input
  inputUrl.value = session.rawUrl;
  
  // Status info
  statusText.className = `status-msg ${session.status}`;
  statusText.textContent = session.message;
  cursorBlink.style.display = (session.status === 'starting') ? 'inline-block' : 'none';
  
  infoStatus.textContent = session.status;
  infoPort.textContent = session.port;

  // URL Card
  if (session.status === 'running' && session.publicUrl) {
    publicUrlEl.textContent = session.publicUrl;
    urlCard.classList.add('visible');
    resetCopyBtn();
  } else {
    urlCard.classList.remove('visible');
  }

  // Buttons
  const busy = session.status === 'running' || session.status === 'starting';
  btnStart.disabled = busy;
  btnStop.disabled = !busy;
  inputUrl.disabled = busy;

  renderLogs();
  renderUptime(); // force immediate uptime update
}

function resetCopyBtn() {
  btnCopy.textContent = '[ copy ]';
  btnCopy.classList.remove('copied');
}

// ── Uptime Timer ──────────────────────────────────────────────────────────────
setInterval(renderUptime, 1000);

function renderUptime() {
  if (!currentSessionId) return;
  const session = getSession(currentSessionId);
  if (!session) return;

  if (session.status === 'running' && session.uptimeStart) {
    const elapsed = Math.floor((Date.now() - session.uptimeStart) / 1000);
    const h = Math.floor(elapsed / 3600);
    const m = Math.floor((elapsed % 3600) / 60);
    const s = elapsed % 60;
    infoUptime.textContent =
      h > 0
        ? `${h}h ${String(m).padStart(2,'0')}m ${String(s).padStart(2,'0')}s`
        : m > 0
        ? `${m}m ${String(s).padStart(2,'0')}s`
        : `${s}s`;
  } else {
    infoUptime.textContent = '—';
  }
}

// ── Events ────────────────────────────────────────────────────────────────────
btnAddTunnel.addEventListener('click', createSession);

btnStart.addEventListener('click', async () => {
  const session = getSession(currentSessionId);
  if (!session) return;

  const rawUrl = inputUrl.value.trim();
  if (!rawUrl) {
    addLog(currentSessionId, 'No URL provided. Example: http://localhost:3000', 'error');
    updateSession(currentSessionId, { status: 'error', message: 'No URL provided.' });
    inputUrl.focus();
    return;
  }

  const port = extractPortDisplay(rawUrl);
  updateSession(currentSessionId, {
    rawUrl,
    port,
    status: 'starting',
    message: 'Requesting tunnel from localtunnel.me…'
  });
  addLog(currentSessionId, `Starting tunnel for port ${port}…`, 'info');

  const result = await window.tunnelAPI.start(currentSessionId, rawUrl, '');
  if (!result.success) {
    const err = result.error || 'Failed to start tunnel.';
    addLog(currentSessionId, err, 'error');
    updateSession(currentSessionId, { status: 'error', message: err });
  }
});

btnStop.addEventListener('click', async () => {
  if (!currentSessionId) return;
  addLog(currentSessionId, 'Stopping tunnel…', 'warn');
  updateSession(currentSessionId, { status: 'stopped', message: 'Tunnel stopped.', port: '—', uptimeStart: null });
  await window.tunnelAPI.stop(currentSessionId);
});

btnCopy.addEventListener('click', async () => {
  const url = publicUrlEl.textContent;
  if (!url) return;
  try {
    await navigator.clipboard.writeText(url);
    btnCopy.textContent = '[ copied! ]';
    btnCopy.classList.add('copied');
    addLog(currentSessionId, 'URL copied to clipboard.', 'dim');
    setTimeout(resetCopyBtn, 2000);
  } catch (_) {
    addLog(currentSessionId, 'Clipboard access denied.', 'error');
  }
});

inputUrl.addEventListener('input', (e) => {
  if (currentSessionId) {
    const session = getSession(currentSessionId);
    if (session) session.rawUrl = e.target.value;
  }
});

inputUrl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !btnStart.disabled) btnStart.click();
});

btnClearLog.addEventListener('click', () => {
  if (!currentSessionId) return;
  const session = getSession(currentSessionId);
  if (session) {
    session.logs = [];
    addLog(currentSessionId, 'Log cleared.', 'dim');
  }
});

// ── Status updates from main process ─────────────────────────────────────────
const removeListener = window.tunnelAPI.onStatus(({ tunnelId, status, message, publicUrl }) => {
  const session = getSession(tunnelId);
  if (!session) return;

  const updates = { status, message, publicUrl };
  
  if (status === 'running' && !session.uptimeStart) {
    updates.uptimeStart = Date.now();
    addLog(tunnelId, `Tunnel live → ${publicUrl}`, 'success');
  } else if (status === 'stopped') {
    updates.port = '—';
    updates.uptimeStart = null;
    addLog(tunnelId, 'Tunnel closed.', 'warn');
  } else if (status === 'error') {
    updates.uptimeStart = null;
    addLog(tunnelId, `Error: ${message}`, 'error');
  } else if (status === 'starting') {
    addLog(tunnelId, message, 'warn');
  }

  updateSession(tunnelId, updates);
});

window.addEventListener('beforeunload', removeListener);

// ── Init ──────────────────────────────────────────────────────────────────────
createSession();
