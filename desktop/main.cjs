'use strict';

const { app, BrowserWindow, ipcMain, net, protocol, session, shell } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { downloadPack } = require('./https-download.cjs');

protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true } },
]);

let mainWindow;
const APP_URL = 'app://trainer/';

function openExternal(url) {
  try {
    const target = new URL(url);
    if (target.protocol === 'https:' && !target.username && !target.password) void shell.openExternal(target.href);
  } catch { /* Invalid and non-HTTPS links are ignored. */ }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    show: !process.argv.includes('--smoke-test'),
    width: 1240,
    height: 850,
    minWidth: 360,
    minHeight: 600,
    backgroundColor: '#101720',
    title: 'Stratagem Trainer',
    icon: path.join(__dirname, 'icons', 'icon.png'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      spellcheck: false,
    },
  });
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    openExternal(url);
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(APP_URL)) {
      event.preventDefault();
      openExternal(url);
    }
  });
  void mainWindow.loadURL(APP_URL);
  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(() => {
  const webRoot = path.resolve(app.getAppPath(), 'dist');
  protocol.handle('app', (request) => {
    const url = new URL(request.url);
    if (url.hostname !== 'trainer' || !['GET', 'HEAD'].includes(request.method)) return new Response(null, { status: 403 });
    let relative;
    try { relative = decodeURIComponent(url.pathname).replace(/^\/+/, '') || 'index.html'; }
    catch { return new Response(null, { status: 400 }); }
    const filename = path.resolve(webRoot, relative);
    if (filename !== webRoot && !filename.startsWith(webRoot + path.sep)) return new Response(null, { status: 403 });
    return net.fetch(pathToFileURL(filename).href);
  });
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));
  session.defaultSession.setPermissionCheckHandler(() => false);
  ipcMain.handle('trainer:download-pack', (event, url) => {
    if (!mainWindow || event.sender !== mainWindow.webContents || event.senderFrame !== mainWindow.webContents.mainFrame || !event.senderFrame.url.startsWith(APP_URL)) {
      throw new Error('Download requests must originate from the trainer.');
    }
    return downloadPack(url);
  });
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
