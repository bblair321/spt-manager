const { app, BrowserWindow } = require("electron");
const path = require("node:path");
const { dialog, ipcMain } = require("electron");
const fs = require("fs-extra");
const extract = require("extract-zip");
const os = require("os");

if (require("electron-squirrel-startup")) {
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

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// Folder picker
ipcMain.handle("pick-folder", async () => {
  const result = await dialog.showOpenDialog({ properties: ["openDirectory"] });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

// Destination folder picker
ipcMain.handle("pick-dest-folder", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openDirectory", "createDirectory"],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

// Folder clone
ipcMain.handle("clone-folder", async (event, { source, dest }) => {
  try {
    await require("fs-extra").copy(source, dest, {
      overwrite: false,
      errorOnExist: true,
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// IPC handler for downloading and extracting SPT-AKI
ipcMain.handle("download-spt", async (event, { installPath }) => {
  try {
    const fetch = (await import("node-fetch")).default;

    // 1. Get releases array from GitHub
    const apiUrl = "https://api.github.com/repos/SPT-AKI/SPT-AKI/releases";
    const response = await fetch(apiUrl);
    const releases = await response.json();
    console.log("Full releases array:", releases);

    if (!Array.isArray(releases) || releases.length === 0) {
      throw new Error("No releases found in GitHub response.");
    }

    const data = releases[0]; // Most recent release
    console.log("GitHub API response (first release):", data);

    if (!data.assets) {
      throw new Error(
        data.message || "No assets found in GitHub release response."
      );
    }

    const asset = data.assets.find((a) => a.name.endsWith(".zip"));
    if (!asset) throw new Error("No ZIP asset found in latest release.");

    // 2. Download the ZIP
    const zipPath = path.join(os.tmpdir(), asset.name);
    const res = await fetch(asset.browser_download_url);
    const fileStream = fs.createWriteStream(zipPath);
    await new Promise((resolve, reject) => {
      res.body.pipe(fileStream);
      res.body.on("error", reject);
      fileStream.on("finish", resolve);
    });

    // 3. Extract ZIP to installPath
    await extract(zipPath, { dir: installPath });

    // 4. Clean up ZIP
    await fs.remove(zipPath);

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
