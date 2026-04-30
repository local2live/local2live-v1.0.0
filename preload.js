'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('tunnelAPI', {
  /**
   * Start a tunnel.
   * @param {string} tunnelId
   * @param {string} rawUrl  - e.g. "http://localhost:3000"
   * @param {string} subdomain - optional custom subdomain
   * @returns {Promise<{ success: boolean, error?: string }>}
   */
  start: (tunnelId, rawUrl, subdomain) =>
    ipcRenderer.invoke('tunnel:start', { tunnelId, rawUrl, subdomain }),

  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  close: () => ipcRenderer.invoke('window:close'),

  /**
   * Stop the active tunnel.
   * @param {string} tunnelId
   * @returns {Promise<{ success: boolean }>}
   */
  stop: (tunnelId) => ipcRenderer.invoke('tunnel:stop', { tunnelId }),

  /**
   * Register a callback for status updates pushed from the main process.
   * @param {(data: { tunnelId: string, status: string, message: string, publicUrl: string|null }) => void} callback
   * @returns {() => void}  call this to remove the listener
   */
  onStatus: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('tunnel:status', handler);
    // Return a cleanup function
    return () => ipcRenderer.removeListener('tunnel:status', handler);
  },
});
