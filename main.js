const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const fs = require('fs');
const chokidar = require('chokidar');
const { compileSource, runBinaryOnInput } = require('./tools/compile');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// IPC: open folder
ipcMain.handle('dialog:openFolder', async () => {
  const res = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory'] });
  if (res.canceled || !res.filePaths.length) return null;
  return res.filePaths[0];
});

// IPC: read file
ipcMain.handle('fs:readFile', async (event, filePath) => {
  return fs.promises.readFile(filePath, 'utf8');
});

// IPC: write file
ipcMain.handle('fs:writeFile', async (event, filePath, content) => {
  await fs.promises.writeFile(filePath, content, 'utf8');
  return true;
});

// IPC: list dir
ipcMain.handle('fs:listDir', async (event, dirPath) => {
  const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
  return entries.map(e => ({ name: e.name, isDirectory: e.isDirectory(), path: path.join(dirPath, e.name) }));
});

ipcMain.handle('fs:createFile', async (event, filePath, content = '') => {
  await fs.promises.writeFile(filePath, content, 'utf8');
  return true;
});

ipcMain.handle('fs:mkdir', async (event, dirPath) => {
  await fs.promises.mkdir(dirPath, { recursive: true });
  return true;
});

ipcMain.handle('fs:exists', async (event, p) => {
  try {
    await fs.promises.access(p);
    return true;
  } catch (e) { return false }
});

ipcMain.handle('fs:deletePath', async (event, p) => {
  const stat = await fs.promises.stat(p);
  if (stat.isDirectory()) {
    await fs.promises.rmdir(p, { recursive: true });
  } else {
    await fs.promises.unlink(p);
  }
  return true;
});

ipcMain.handle('fs:renamePath', async (event, oldP, newP) => {
  await fs.promises.rename(oldP, newP);
  return true;
});

// Watch folder changes
const watchers = new Map();
ipcMain.on('watch:folder', (event, dirPath) => {
  if (watchers.has(dirPath)) return;
  const watcher = chokidar.watch(dirPath, { ignoreInitial: true, depth: 5 });
  watcher.on('all', (ev, p) => {
    mainWindow.webContents.send('fs:changed', { event: ev, path: p });
  });
  watchers.set(dirPath, watcher);
});

// Debug file watch/streaming removed

// Compile source
ipcMain.handle('compile:file', async (event, srcPath) => {
  try {
    const { success, errors, binaryPath } = await compileSource(srcPath);
    return { success, errors, binaryPath };
  } catch (err) {
    return { success: false, errors: [{ message: err.message }] };
  }
});

// Run binary on input
ipcMain.handle('run:binary', async (event, binaryPath, input) => {
  try {
    const { stdout, stderr, timedOut, debug } = await runBinaryOnInput(binaryPath, input);
    return { stdout, stderr, timedOut, debug };
  } catch (err) {
    return { stdout: '', stderr: err.message, debug: '' };
  }
});

// expose main cwd for the renderer (useful in dev mode)
ipcMain.handle('app:getCwd', async () => {
  return process.cwd();
});
