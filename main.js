'use strict';

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const localtunnel = require('localtunnel');

// ─── State ────────────────────────────────────────────────────────────────────
let mainWindow = null;
const tunnels = new Map();

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Extract port number from a URL string.
 * Accepts:  http://localhost:3000  |  localhost:3000  |  3000
 * Returns:  { port: Number } or { error: String }
 */
function extractPort(raw) {
  const trimmed = (raw || '').trim();
  if (!trimmed) return { error: 'URL is empty.' };

  // Try parsing as a full URL first
  try {
    const url = new URL(trimmed.startsWith('http') ? trimmed : `http://${trimmed}`);
    const port = parseInt(url.port, 10);
    if (!isNaN(port) && port > 0 && port <= 65535) return { port };
    // URL parsed fine but no explicit port – derive from protocol
    if (url.protocol === 'http:') return { port: 80 };
    if (url.protocol === 'https:') return { port: 443 };
    return { error: 'Could not determine port from URL.' };
  } catch (_) {
    // Maybe user typed just a number
    const num = parseInt(trimmed, 10);
    if (!isNaN(num) && num > 0 && num <= 65535) return { port: num };
    return { error: 'Invalid URL or port number.' };
  }
}

function log(...args) {
  console.log('[local2live]', ...args);
}

function sendStatus(tunnelId, status, message, publicUrl) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('tunnel:status', { tunnelId, status, message, publicUrl });
  }
}

// ─── Tunnel Management ────────────────────────────────────────────────────────

async function startTunnel(tunnelId, port, subdomain) {
  let session = tunnels.get(tunnelId);
  if (session && session.instance) {
    await stopTunnel(tunnelId, false);
  }

  session = tunnels.get(tunnelId) || {
    instance: null,
    reconnectTimer: null,
    isIntentionallyStopped: false,
    port,
    subdomain
  };
  session.isIntentionallyStopped = false;
  tunnels.set(tunnelId, session);

  log(`[${tunnelId}] Opening tunnel on port ${port}${subdomain ? ` with subdomain "${subdomain}"` : ''}...`);
  sendStatus(tunnelId, 'starting', `Connecting tunnel on port ${port}…`, null);

  try {
    const options = { port };
    if (subdomain && subdomain.trim()) options.subdomain = subdomain.trim();

    const tunnel = await localtunnel(options);
    session.instance = tunnel;

    log(`[${tunnelId}] Tunnel active: ${tunnel.url}`);
    sendStatus(tunnelId, 'running', 'Tunnel is live!', tunnel.url);

    // ── Tunnel closed unexpectedly → auto-reconnect ──
    tunnel.on('close', () => {
      if (session.isIntentionallyStopped) return;
      log(`[${tunnelId}] Tunnel closed unexpectedly. Attempting reconnect in 3 s…`);
      sendStatus(tunnelId, 'starting', 'Tunnel dropped. Reconnecting in 3 s…', null);
      session.reconnectTimer = setTimeout(() => startTunnel(tunnelId, port, subdomain), 3000);
    });

    tunnel.on('error', (err) => {
      log(`[${tunnelId}] Tunnel error:`, err.message);
      sendStatus(tunnelId, 'error', `Tunnel error: ${err.message}`, null);
    });

  } catch (err) {
    log(`[${tunnelId}] Failed to open tunnel:`, err.message);
    sendStatus(tunnelId, 'error', `Failed to start tunnel: ${err.message}`, null);
    session.instance = null;
  }
}

async function stopTunnel(tunnelId, intentional = true) {
  const session = tunnels.get(tunnelId);
  if (!session) return;

  session.isIntentionallyStopped = intentional;
  if (session.reconnectTimer) {
    clearTimeout(session.reconnectTimer);
    session.reconnectTimer = null;
  }
  if (session.instance) {
    try {
      session.instance.removeAllListeners();
      session.instance.close();
      log(`[${tunnelId}] Tunnel stopped.`);
    } catch (e) {
      log(`[${tunnelId}] Error closing tunnel:`, e.message);
    }
    session.instance = null;
  }
  if (intentional) {
    sendStatus(tunnelId, 'stopped', 'Tunnel stopped.', null);
  }
}

async function stopAllTunnels() {
  const promises = [];
  for (const tunnelId of tunnels.keys()) {
    promises.push(stopTunnel(tunnelId, true));
  }
  await Promise.all(promises);
}

// ─── IPC Handlers ─────────────────────────────────────────────────────────────

ipcMain.handle('tunnel:start', async (_event, { tunnelId, rawUrl, subdomain }) => {
  const { port, error } = extractPort(rawUrl);
  if (error) return { success: false, error };
  await startTunnel(tunnelId, port, subdomain);
  return { success: true };
});

ipcMain.handle('tunnel:stop', async (_event, { tunnelId }) => {
  await stopTunnel(tunnelId, true);
  return { success: true };
});

ipcMain.handle('window:minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.handle('window:maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.handle('window:close', () => {
  if (mainWindow) mainWindow.close();
});

// ─── Window ───────────────────────────────────────────────────────────────────

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 620,
    minWidth: 680,
    minHeight: 500,
    title: 'local2live',
    frame: false,
    icon: path.join(__dirname, 'icon.png'),
    backgroundColor: '#0d1117',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile('index.html');
  mainWindow.setMenuBarVisibility(false);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ─── App lifecycle ────────────────────────────────────────────────────────────

app.whenReady().then(createWindow);

app.on('window-all-closed', async () => {
  await stopAllTunnels();
  app.quit();
});

app.on('before-quit', async () => {
  await stopAllTunnels();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
