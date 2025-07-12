const { app, BrowserWindow } = require("electron");
const path = require("node:path");
const { dialog, ipcMain } = require("electron");
const fs = require("fs-extra");
const extract = require("extract-zip");
const os = require("os");

if (require("electron-squirrel-startup")) {
  app.quit();
}

// Track the server process
let serverProcess = null;
let isExternalProcess = false;

// Function to check if SPT-AKI server is running
const checkServerStatus = async () => {
  try {
    const { exec } = require("child_process");

    // Check for SPT server processes
    return new Promise((resolve) => {
      exec(
        'tasklist /FI "IMAGENAME eq SPT.Server.exe" /FO CSV',
        (error, stdout) => {
          if (error) {
            resolve({ isRunning: false, error: error.message });
            return;
          }

          // Check if the output contains the process
          const isRunning = stdout.includes("SPT.Server.exe");
          if (isRunning) {
            isExternalProcess = true;
          }
          resolve({ isRunning, error: null });
        }
      );
    });
  } catch (error) {
    return { isRunning: false, error: error.message };
  }
};

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

// Clean up server process when app closes
app.on("before-quit", () => {
  if (serverProcess) {
    serverProcess.kill();
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

// Check server status
ipcMain.handle("check-server-status", async () => {
  const status = await checkServerStatus();
  return status;
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

    console.log("Selected server path:", serverPath);

    // List all files in the selected directory for debugging
    const files = fs.readdirSync(serverPath);
    console.log("Files in selected directory:", files);

    // Look for the server executable in the selected folder
    const serverExePath = path.join(serverPath, "SPT.Server.exe");
    console.log("Looking for server executable at:", serverExePath);

    // Check if the server executable exists
    if (!fs.existsSync(serverExePath)) {
      // Also check for alternative server executable names
      const alternativeNames = [
        "Aki.Server.exe",
        "server.exe",
        "SPT-Server.exe",
        "AkiServer.exe",
      ];
      let foundAlternative = false;

      for (const altName of alternativeNames) {
        const altPath = path.join(serverPath, altName);
        if (fs.existsSync(altPath)) {
          console.log("Found alternative server executable:", altName);
          foundAlternative = true;
          break;
        }
      }

      if (!foundAlternative) {
        throw new Error(
          "SPT-AKI Server executable not found. Please select the correct SPT-AKI server folder."
        );
      }
    }

    console.log("Starting SPT-AKI Server...");

    // Reset external process flag since we're starting a new server
    isExternalProcess = false;

    // Start the server in a new process
    serverProcess = exec(`"${serverExePath}"`, { cwd: serverPath }, (error) => {
      if (error) {
        console.error("Server process error:", error);
      } else {
        console.log("Server process ended");
      }
      serverProcess = null;
    });

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

// IPC handler for stopping SPT-AKI server
ipcMain.handle("stop-spt-server", async () => {
  try {
    const { exec } = require("child_process");

    if (isExternalProcess) {
      // Kill external process using taskkill
      console.log("Stopping external SPT-AKI Server...");
      return new Promise((resolve) => {
        exec('taskkill /F /IM "SPT.Server.exe"', (error) => {
          if (error) {
            resolve({ success: false, error: error.message });
          } else {
            console.log("External SPT-AKI Server stopped successfully");
            isExternalProcess = false;
            resolve({ success: true });
          }
        });
      });
    } else if (serverProcess) {
      // Kill process started by launcher
      console.log("Stopping SPT-AKI Server...");
      serverProcess.kill();
      serverProcess = null;
      console.log("SPT-AKI Server stopped successfully");
      return { success: true };
    } else {
      return {
        success: false,
        error: "No server process is currently running.",
      };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
});
