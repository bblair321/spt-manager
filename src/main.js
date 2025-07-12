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

// IPC handler for downloading SPT-AKI installer
ipcMain.handle("download-spt-installer", async (event, { downloadPath }) => {
  try {
    const fetch = (await import("node-fetch")).default;
    const { exec } = require("child_process");

    // Download the SPT-AKI installer
    const installerUrl = "https://ligma.waffle-lord.net/SPTInstaller.exe";
    const installerPath = path.join(downloadPath, "SPTInstaller.exe");

    console.log("Downloading SPT-AKI installer...");
    const response = await fetch(installerUrl);

    if (!response.ok) {
      throw new Error(
        `Failed to download installer: ${response.status} ${response.statusText}`
      );
    }

    const fileStream = fs.createWriteStream(installerPath);
    await new Promise((resolve, reject) => {
      response.body.pipe(fileStream);
      response.body.on("error", reject);
      fileStream.on("finish", resolve);
    });

    console.log("SPT-AKI installer downloaded successfully");

    // Auto-run the installer
    console.log("Launching SPT-AKI installer...");
    exec(`"${installerPath}"`, (error) => {
      if (error) {
        console.error("Failed to run installer:", error);
      } else {
        console.log("Installer launched successfully");
      }
    });

    return { success: true, path: installerPath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// IPC handler for starting SPT-AKI server
ipcMain.handle("start-spt-server", async (event, { serverPath }) => {
  try {
    const { exec } = require("child_process");
    const path = require("path");

    // Look for the server executable in the selected folder
    const serverExePath = path.join(serverPath, "Aki.Server.exe");

    // Check if the server executable exists
    if (!fs.existsSync(serverExePath)) {
      throw new Error(
        "SPT-AKI Server executable not found. Please select the correct SPT-AKI server folder."
      );
    }

    console.log("Starting SPT-AKI Server...");

    // Start the server in a new process
    const serverProcess = exec(
      `"${serverExePath}"`,
      { cwd: serverPath },
      (error) => {
        if (error) {
          console.error("Server process error:", error);
        } else {
          console.log("Server process ended");
        }
      }
    );

    // Log server output
    serverProcess.stdout.on("data", (data) => {
      console.log("Server output:", data.toString());
    });

    serverProcess.stderr.on("data", (data) => {
      console.error("Server error:", data.toString());
    });

    console.log("SPT-AKI Server started successfully");
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
