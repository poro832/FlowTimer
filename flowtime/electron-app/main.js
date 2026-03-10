/**
 * FlowTimer — Electron Main Process
 */

const { app, BrowserWindow, Tray, Menu, globalShortcut, ipcMain, nativeImage, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

let mainWindow = null;
let tray = null;
let isQuitting = false;
let windowVisible = true;
let isAlwaysOnTop = false;

// ── 디버그 로그 (홈 디렉토리 flowtimer-debug.log) ──
const LOG_PATH = path.join(os.homedir(), 'flowtimer-debug.log');
function log(msg) {
  try { fs.appendFileSync(LOG_PATH, new Date().toISOString() + ' ' + msg + '\n'); } catch(e) {}
}

function getIconDir() {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'icons')
    : path.join(__dirname, '..', 'chrome-extension', 'icons');
}

function hideWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  log('hideWindow called');
  windowVisible = false;
  mainWindow.setOpacity(0);
  mainWindow.setIgnoreMouseEvents(true);
  mainWindow.setSkipTaskbar(true);
  log('hideWindow done. isVisible=' + mainWindow.isVisible());
}

function showWindow() {
  log('showWindow called. mainWindow=' + !!mainWindow + (mainWindow ? ' destroyed=' + mainWindow.isDestroyed() : ''));

  if (!mainWindow || mainWindow.isDestroyed()) {
    log('mainWindow missing — recreating');
    createWindow();
    return;
  }

  windowVisible = true;
  mainWindow.setSkipTaskbar(false);
  mainWindow.setIgnoreMouseEvents(false);
  mainWindow.setOpacity(1);
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();

  // Windows에서 투명 창을 앞으로 가져오는 가장 확실한 방법
  mainWindow.moveTop();
  mainWindow.focus();

  // Windows GPU 컴포지터 캐시 강제 초기화: 1px 리사이즈 트릭
  const b = mainWindow.getBounds();
  mainWindow.setBounds({ ...b, width: b.width + 1 });
  mainWindow.setBounds(b);

  setTimeout(() => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    mainWindow.webContents.invalidate();
    log('showWindow post-delay. isVisible=' + mainWindow.isVisible() + ' opacity=' + mainWindow.getOpacity());
  }, 150);

  log('showWindow done. isVisible=' + mainWindow.isVisible() + ' opacity=' + mainWindow.getOpacity());
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 260,
    height: 310,
    frame: false,
    transparent: true,
    resizable: false,
    skipTaskbar: false,
    icon: path.join(getIconDir(), 'icon128.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  mainWindow.on('close', (e) => {
    log('close event. isQuitting=' + isQuitting);
    if (!isQuitting) {
      e.preventDefault();
      hideWindow();
    }
  });

  mainWindow.on('closed', () => {
    log('mainWindow closed — set to null');
    mainWindow = null;
  });

  mainWindow.webContents.on('did-finish-load', () => { log('did-finish-load'); });
  mainWindow.webContents.on('did-fail-load', (e, code, desc) => { log('did-fail-load: ' + code + ' ' + desc); });
  mainWindow.webContents.on('render-process-gone', (event, details) => {
    log('render-process-gone: reason=' + details.reason + ' exitCode=' + details.exitCode);
    mainWindow = null;
  });

  log('createWindow done');
}

function buildContextMenu() {
  return Menu.buildFromTemplate([
    { label: 'FlowTimer 열기', click: () => { log('menu: 열기 clicked'); setTimeout(() => showWindow(), 200); } },
    { type: 'separator' },
    {
      label: '최상단 고정',
      type: 'checkbox',
      checked: isAlwaysOnTop,
      click: (menuItem) => {
        isAlwaysOnTop = menuItem.checked;
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.setAlwaysOnTop(isAlwaysOnTop);
        }
        log('always-on-top: ' + isAlwaysOnTop);
      },
    },
    { type: 'separator' },
    { label: '종료', click: () => { isQuitting = true; app.quit(); } },
  ]);
}

function createTray() {
  const iconPath = path.join(getIconDir(), 'icon128.png');
  const icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
  tray = new Tray(icon);

  tray.setToolTip('FlowTimer');
  tray.on('click', () => { log('tray: left click'); setTimeout(() => showWindow(), 100); });
  tray.on('right-click', () => { tray.popUpContextMenu(buildContextMenu()); });
}

function registerGlobalShortcut() {
  globalShortcut.register('Ctrl+Shift+T', () => {
    if (!mainWindow) return;
    if (windowVisible) hideWindow();
    else showWindow();
  });
}

ipcMain.on('window-minimize', () => { mainWindow?.minimize(); });
ipcMain.on('window-close', () => { log('IPC window-close'); hideWindow(); });

app.whenReady().then(() => {
  log('app ready. isPackaged=' + app.isPackaged);
  createWindow();
  createTray();
  registerGlobalShortcut();
});

app.on('window-all-closed', () => {});
app.on('activate', () => { if (mainWindow === null) createWindow(); else showWindow(); });
app.on('before-quit', () => { log('before-quit'); isQuitting = true; });
app.on('will-quit', () => { globalShortcut.unregisterAll(); });
