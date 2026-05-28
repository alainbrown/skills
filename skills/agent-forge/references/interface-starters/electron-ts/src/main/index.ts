import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import { registerAgentBridge } from './agent-bridge';
import { applySettingsToEnv } from './settings';

// Forge's vite plugin emits CJS for the main bundle by default, so __dirname is available
// at runtime. If you opt the main bundle into ESM, swap in fileURLToPath(import.meta.url).

const createWindow = (): void => {
  const mainWindow = new BrowserWindow({
    width: 1100,
    height: 760,
    minWidth: 640,
    minHeight: 480,
    title: 'Agent',
    backgroundColor: '#0b1020',
    show: false,
    webPreferences: {
      // Preload sits next to main.js after Forge's vite build emits .vite/build/.
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false, // contextBridge needs node access in preload; renderer stays sandboxed-style.
    },
  });

  mainWindow.once('ready-to-show', () => mainWindow.show());

  // MAIN_WINDOW_VITE_DEV_SERVER_URL is injected at build time by @electron-forge/plugin-vite.
  if (typeof MAIN_WINDOW_VITE_DEV_SERVER_URL !== 'undefined' && MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    void mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    void mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }
};

void app.whenReady().then(() => {
  applySettingsToEnv();
  registerAgentBridge();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
