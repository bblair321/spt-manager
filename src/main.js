const { app, BrowserWindow } = require('electron');
const path = require('node:path');
const { dialog, ipcMain } = require("electron");
const fs = require("fs-extra");

if (require('electron-squirrel-startup')) {
  app.quit();
}

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
    },
  });

  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  mainWindow.webContents.openDevTools();
};

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Folder picker
ipcMain.handle("pick-folder", async () => {
  const result = await dialog.showOpenDialog({ properties: ["openDirectory"] });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

// Folder clone
ipcMain.handle("clone-folder", async (event, { source, dest }) => {
  try {
    await require("fs-extra").copy(source, dest, { overwrite: false, errorOnExist: true });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});