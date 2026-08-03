import { app, BrowserWindow, ipcMain } from 'electron';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import { READ_DIR_CHANNEL } from '../shared/ipc-channels';
import { sortDirEntries } from '../shared/dir';
import type { DirListing } from '../shared/api';
import type { WslClient } from './wsl/wsl-client';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

const createWindow = (): void => {
  const mainWindow = new BrowserWindow({
    width: 960,
    height: 680,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools();
  }
};

const readHomeDir = async (): Promise<DirListing> => {
  const dir = os.homedir();
  const dirents = await fs.promises.readdir(dir, { withFileTypes: true });
  return {
    path: dir,
    entries: sortDirEntries(
      dirents.map((entry) => ({
        name: entry.name,
        isDirectory: entry.isDirectory(),
      })),
    ),
  };
};

let wslClient: WslClient | null = null;

ipcMain.handle(READ_DIR_CHANNEL, async () => {
  // Windows + WSL2: read the WSL $HOME via the helper server. Everything else:
  // read the local home directory directly. The WSL module is imported lazily,
  // so it is never loaded on macOS/Linux. ⚠️ The WSL path is runtime-verified
  // on Windows — see src/main/wsl/wsl-client.ts.
  if (process.platform === 'win32') {
    if (!wslClient) {
      const { WslClient: WslClientImpl } = await import('./wsl/wsl-client');
      wslClient = await WslClientImpl.start();
    }
    return wslClient.listDir();
  }
  return readHomeDir();
});

app.on('before-quit', () => {
  wslClient?.stop();
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
