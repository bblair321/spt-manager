const { app, BrowserWindow } = require("electron");
const path = require("node:path");
const { dialog, ipcMain } = require("electron");
const fs = require("fs-extra");
const extract = require("extract-zip");
const os = require("os");

if (require("electron-squirrel-startup")) {
  app.quit();
}

// Settings management
const settingsPath = path.join(app.getPath("userData"), "settings.json");

const loadSettings = async () => {
  try {
    if (await fs.pathExists(settingsPath)) {
      const settingsData = await fs.readJson(settingsPath);
      return settingsData;
    }
  } catch (error) {
    console.error("Error loading settings:", error);
  }
  return {
    serverPath: "",
    clientPath: "",
    downloadPath: "",
    lastUpdateCheck: null,
    lastInstallerVersion: null,
    autoUpdateEnabled: true,
  };
};

const saveSettings = async (settings) => {
  try {
    await fs.ensureDir(path.dirname(settingsPath));
    await fs.writeJson(settingsPath, settings, { spaces: 2 });
    return { success: true };
  } catch (error) {
    console.error("Error saving settings:", error);
    return { success: false, error: error.message };
  }
};

// Auto-detect common SPT installation paths
const detectSPTPaths = async () => {
  const commonPaths = [
    path.join(os.homedir(), "Desktop", "SPT-AKI"),
    path.join(os.homedir(), "Documents", "SPT-AKI"),
    path.join(os.homedir(), "Downloads", "SPT-AKI"),
    path.join("C:", "SPT-AKI"),
    path.join("D:", "SPT-AKI"),
    path.join("C:", "Games", "SPT-AKI"),
    path.join("D:", "Games", "SPT-AKI"),
  ];

  const detectedPaths = {
    serverPath: "",
    clientPath: "",
  };

  for (const basePath of commonPaths) {
    if (await fs.pathExists(basePath)) {
      // Check for server executable
      const serverExes = ["Aki.Server.exe", "SPT.Server.exe", "server.exe"];
      for (const exe of serverExes) {
        const serverPath = path.join(basePath, exe);
        if (await fs.pathExists(serverPath)) {
          detectedPaths.serverPath = serverPath; // Return full file path
          break;
        }
      }

      // Check for client launcher
      const clientExes = [
        "spt.launcher.exe",
        "SPT-Launcher.exe",
        "launcher.exe",
      ];
      for (const exe of clientExes) {
        const clientPath = path.join(basePath, exe);
        if (await fs.pathExists(clientPath)) {
          detectedPaths.clientPath = clientPath; // Return full file path
          break;
        }
      }
    }
  }

  return detectedPaths;
};

// Track the server process
let serverProcess = null;
let isExternalProcess = false;

// Function to check if SPT-AKI server is running
const checkServerStatus = async () => {
  try {
    const { exec } = require("child_process");

    // Check for SPT server processes with multiple possible names
    const serverExecutables = [
      "SPT.Server.exe",
      "Aki.Server.exe",
      "server.exe",
      "SPT-Server.exe",
      "AkiServer.exe",
    ];

    return new Promise((resolve) => {
      // Check each possible executable name
      let foundProcess = false;
      let checkedCount = 0;

      serverExecutables.forEach((exeName) => {
        exec(
          `tasklist /FI "IMAGENAME eq ${exeName}" /FO CSV`,
          (error, stdout) => {
            checkedCount++;

            if (!error && stdout.includes(exeName)) {
              foundProcess = true;
              isExternalProcess = true;
              console.log(`Found running server process: ${exeName}`);
            }

            // Resolve when all checks are complete
            if (checkedCount === serverExecutables.length) {
              resolve({ isRunning: foundProcess, error: null });
            }
          }
        );
      });
    });
  } catch (error) {
    return { isRunning: false, error: error.message };
  }
};

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    frame: false,
    transparent: false,
    resizable: true,
    backgroundColor: "#1a1a2e",
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  // Remove dev tools for production
  // mainWindow.webContents.openDevTools();
};

// Window control handlers
ipcMain.handle("window-minimize", () => {
  const window = BrowserWindow.getFocusedWindow();
  if (window) window.minimize();
});

ipcMain.handle("window-maximize", () => {
  const window = BrowserWindow.getFocusedWindow();
  if (window) {
    if (window.isMaximized()) {
      window.unmaximize();
    } else {
      window.maximize();
    }
  }
});

ipcMain.handle("window-close", () => {
  const window = BrowserWindow.getFocusedWindow();
  if (window) window.close();
});

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

// File picker for server executable
ipcMain.handle("pick-server-exe", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openFile"],
    filters: [
      { name: "Server Executables", extensions: ["exe"] },
      { name: "All Files", extensions: ["*"] },
    ],
    title: "Select SPT-AKI Server Executable",
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

// File picker for client launcher executable
ipcMain.handle("pick-client-exe", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openFile"],
    filters: [
      { name: "Launcher Executables", extensions: ["exe"] },
      { name: "All Files", extensions: ["*"] },
    ],
    title: "Select SPT-AKI Client Launcher",
  });
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

// Settings management IPC handlers
ipcMain.handle("load-settings", async () => {
  const settings = await loadSettings();
  return settings;
});

ipcMain.handle("save-settings", async (event, settings) => {
  const result = await saveSettings(settings);
  return result;
});

ipcMain.handle("detect-spt-paths", async () => {
  const detectedPaths = await detectSPTPaths();
  return detectedPaths;
});

ipcMain.handle("validate-path", async (event, { path: filePath, type }) => {
  try {
    if (!(await fs.pathExists(filePath))) {
      return { valid: false, error: "File does not exist" };
    }

    // Check if it's a file (not a directory)
    const stats = await fs.stat(filePath);
    if (!stats.isFile()) {
      return { valid: false, error: "Selected path is not a file" };
    }

    // Get the filename
    const fileName = path.basename(filePath);

    if (type === "server") {
      const serverExes = ["Aki.Server.exe", "SPT.Server.exe", "server.exe"];
      const isValidServerExe = serverExes.some(
        (exe) => fileName.toLowerCase() === exe.toLowerCase()
      );
      return {
        valid: isValidServerExe,
        error: isValidServerExe
          ? null
          : `Invalid server executable. Expected one of: ${serverExes.join(
              ", "
            )}`,
      };
    } else if (type === "client") {
      const clientExes = [
        "spt.launcher.exe",
        "SPT-Launcher.exe",
        "launcher.exe",
      ];
      const isValidClientExe = clientExes.some(
        (exe) => fileName.toLowerCase() === exe.toLowerCase()
      );
      return {
        valid: isValidClientExe,
        error: isValidClientExe
          ? null
          : `Invalid client launcher. Expected one of: ${clientExes.join(
              ", "
            )}`,
      };
    }

    return { valid: true };
  } catch (error) {
    return { valid: false, error: error.message };
  }
});

// Update management IPC handlers
ipcMain.handle("check-for-updates", async () => {
  const updateInfo = await checkForUpdates();
  return updateInfo;
});

ipcMain.handle(
  "download-update",
  async (event, { downloadUrl, downloadPath }) => {
    const result = await downloadUpdate(downloadUrl, downloadPath);
    return result;
  }
);

ipcMain.handle("toggle-auto-update", async (event, { enabled }) => {
  try {
    const currentSettings = await loadSettings();
    const newSettings = { ...currentSettings, autoUpdateEnabled: enabled };
    await saveSettings(newSettings);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Check server status
ipcMain.handle("check-server-status", async () => {
  const status = await checkServerStatus();
  return status;
});

// Check if port 6969 is in use
ipcMain.handle("check-port-6969", async () => {
  try {
    const { exec } = require("child_process");

    return new Promise((resolve) => {
      exec("netstat -ano | findstr :6969", (error, stdout) => {
        if (error || !stdout.trim()) {
          resolve({ inUse: false, processId: null });
        } else {
          // Parse the netstat output to get the PID
          const lines = stdout.trim().split("\n");
          const processIds = new Set();

          lines.forEach((line) => {
            const parts = line.trim().split(/\s+/);
            if (parts.length >= 5) {
              const pid = parts[parts.length - 1];
              if (pid && !isNaN(pid) && parseInt(pid) > 4) {
                // Filter out system processes (PID 0-4 are critical system processes)
                processIds.add(pid);
              }
            }
          });

          resolve({
            inUse: true,
            processIds: Array.from(processIds),
            details: stdout.trim(),
          });
        }
      });
    });
  } catch (error) {
    return { inUse: false, error: error.message };
  }
});

// Force kill process by PID
ipcMain.handle("kill-process-by-pid", async (event, { pid }) => {
  try {
    const { exec } = require("child_process");

    return new Promise((resolve) => {
      exec(`taskkill /F /PID ${pid}`, (error) => {
        if (error) {
          resolve({ success: false, error: error.message });
        } else {
          resolve({ success: true });
        }
      });
    });
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// IPC handler for launching SPT-AKI client
ipcMain.handle("launch-spt-client", async (event, { clientPath }) => {
  try {
    const { exec } = require("child_process");
    const path = require("path");

    console.log("Selected client launcher:", clientPath);

    // Check if the client launcher exists
    if (!fs.existsSync(clientPath)) {
      throw new Error(
        "SPT-AKI Client launcher not found. Please select the correct client launcher executable."
      );
    }

    // Get the directory containing the executable
    const clientDir = path.dirname(clientPath);
    console.log("Client directory:", clientDir);

    console.log("Launching SPT-AKI Launcher...");

    // Launch the SPT launcher in a new process
    exec(`"${clientPath}"`, { cwd: clientDir }, (error) => {
      if (error) {
        console.error("Launcher process error:", error);
      } else {
        console.log("Launcher process ended");
      }
    });

    console.log("SPT-AKI Launcher launched successfully");
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
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

    console.log("Selected server executable:", serverPath);

    // Check if the server executable exists
    if (!fs.existsSync(serverPath)) {
      throw new Error(
        "SPT-AKI Server executable not found. Please select the correct server executable."
      );
    }

    // Get the directory containing the executable
    const serverDir = path.dirname(serverPath);
    console.log("Server directory:", serverDir);

    console.log("Starting SPT-AKI Server...");

    // Reset external process flag since we're starting a new server
    isExternalProcess = false;

    // Start the server in a new process
    serverProcess = exec(`"${serverPath}"`, { cwd: serverDir }, (error) => {
      if (error) {
        console.error("Server process error:", error);
        // Send error to renderer
        BrowserWindow.getAllWindows()[0].webContents.send(
          "server-error",
          error.message
        );
      } else {
        console.log("Server process ended");
        // Send process end message to renderer
        BrowserWindow.getAllWindows()[0].webContents.send(
          "server-log",
          "Server process ended"
        );
      }
      serverProcess = null;
    });

    // Log server output and send to renderer
    serverProcess.stdout.on("data", (data) => {
      const logMessage = data.toString();
      console.log("Server stdout raw:", logMessage);

      // Split by lines and send each non-empty line
      const lines = logMessage.split("\n").filter((line) => line.trim());
      lines.forEach((line) => {
        console.log("Server output line:", line);
        const window = BrowserWindow.getAllWindows()[0];
        if (window && window.webContents) {
          window.webContents.send("server-log", line);
        }
      });
    });

    serverProcess.stderr.on("data", (data) => {
      const errorMessage = data.toString();
      console.error("Server stderr raw:", errorMessage);

      // Split by lines and send each non-empty line
      const lines = errorMessage.split("\n").filter((line) => line.trim());
      lines.forEach((line) => {
        console.error("Server error line:", line);
        const window = BrowserWindow.getAllWindows()[0];
        if (window && window.webContents) {
          window.webContents.send("server-error", line);
        }
      });
    });

    // Also try to read from log files if they exist
    const logFiles = [
      path.join(serverDir, "logs", "server.log"),
      path.join(serverDir, "logs", "aki.log"),
      path.join(serverDir, "user", "logs", "server.log"),
      path.join(serverDir, "user", "logs", "aki.log"),
      path.join(serverDir, "user", "logs", "spt.log"),
      path.join(serverDir, "logs", "spt.log"),
    ];

    // Debug: List all files in the server directory to see what's there
    console.log("Server directory contents:");
    try {
      const allFiles = fs.readdirSync(serverPath, { recursive: true });
      console.log("All files:", allFiles);
    } catch (error) {
      console.error("Error reading server directory:", error);
    }

    // Check for existing log files and start watching them
    logFiles.forEach((logFile) => {
      console.log("Checking for log file:", logFile);
      if (fs.existsSync(logFile)) {
        console.log("Found log file:", logFile);

        // Read existing content
        try {
          const existingContent = fs.readFileSync(logFile, "utf8");
          const lines = existingContent
            .split("\n")
            .filter((line) => line.trim());
          // Send last 10 lines to renderer
          lines.slice(-10).forEach((line) => {
            BrowserWindow.getAllWindows()[0].webContents.send(
              "server-log",
              line
            );
          });
        } catch (error) {
          console.error("Error reading log file:", error);
        }

        // Watch for new content
        const logWatcher = fs.watch(logFile, (eventType, filename) => {
          if (eventType === "change") {
            try {
              const stats = fs.statSync(logFile);
              const buffer = Buffer.alloc(1024);
              const fd = fs.openSync(logFile, "r");
              fs.readSync(fd, buffer, 0, 1024, Math.max(0, stats.size - 1024));
              fs.closeSync(fd);

              const newContent = buffer.toString().trim();
              if (newContent) {
                const lines = newContent
                  .split("\n")
                  .filter((line) => line.trim());
                lines.forEach((line) => {
                  BrowserWindow.getAllWindows()[0].webContents.send(
                    "server-log",
                    line
                  );
                });
              }
            } catch (error) {
              console.error("Error reading new log content:", error);
            }
          }
        });

        // Store watcher reference for cleanup
        if (!serverProcess.logWatchers) {
          serverProcess.logWatchers = [];
        }
        serverProcess.logWatchers.push(logWatcher);
      }
    });

    console.log("SPT-AKI Server started successfully");

    // Send a test message to verify IPC is working
    setTimeout(() => {
      console.log("Sending test message to renderer...");
      const window = BrowserWindow.getAllWindows()[0];
      if (window && window.webContents) {
        window.webContents.send(
          "server-log",
          "=== Server started successfully ==="
        );
        console.log("Test message sent");
      } else {
        console.error("No window found to send message to");
      }
    }, 1000);

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// IPC handler for stopping SPT-AKI server
ipcMain.handle("stop-spt-server", async () => {
  try {
    const { exec } = require("child_process");
    let killedAny = false;

    // First, try to stop the process we started
    if (serverProcess) {
      console.log("Stopping launcher-started SPT-AKI Server...");

      // Clean up log watchers
      if (serverProcess.logWatchers) {
        serverProcess.logWatchers.forEach((watcher) => {
          try {
            watcher.close();
          } catch (error) {
            console.error("Error closing log watcher:", error);
          }
        });
      }

      // Try graceful shutdown first
      serverProcess.kill("SIGTERM");

      // Wait a bit for graceful shutdown
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Force kill if still running
      if (serverProcess && !serverProcess.killed) {
        serverProcess.kill("SIGKILL");
      }

      serverProcess = null;
      killedAny = true;
      console.log("Launcher-started SPT-AKI Server stopped successfully");
    }

    // Always check for any processes using port 6969 (in case of external processes or child processes)
    console.log("Checking for any processes using port 6969...");
    const portCheck = await new Promise((resolve) => {
      exec("netstat -ano | findstr :6969", (error, stdout) => {
        if (error || !stdout.trim()) {
          resolve({ inUse: false, processIds: [] });
        } else {
          const lines = stdout.trim().split("\n");
          const processIds = new Set();

          lines.forEach((line) => {
            const parts = line.trim().split(/\s+/);
            if (parts.length >= 5) {
              const pid = parts[parts.length - 1];
              if (pid && !isNaN(pid) && parseInt(pid) > 4) {
                // Filter out system processes (PID 0-4 are critical system processes)
                processIds.add(pid);
              }
            }
          });

          resolve({
            inUse: true,
            processIds: Array.from(processIds),
          });
        }
      });
    });

    console.log("Port 6969 check result:", portCheck);

    // Kill processes using port 6969 directly
    if (portCheck.inUse && portCheck.processIds.length > 0) {
      console.log(
        `Found processes using port 6969: ${portCheck.processIds.join(", ")}`
      );

      for (const pid of portCheck.processIds) {
        try {
          await new Promise((resolve) => {
            exec(`taskkill /F /PID ${pid}`, (error) => {
              if (!error) {
                console.log(`Successfully killed process ${pid}`);
                killedAny = true;
              } else {
                console.log(`Failed to kill process ${pid}: ${error.message}`);
              }
              resolve();
            });
          });
        } catch (error) {
          console.error(`Error killing process ${pid}:`, error);
        }
      }
    }

    // Also try to kill by executable names as backup
    const serverExecutables = [
      "SPT.Server.exe",
      "Aki.Server.exe",
      "server.exe",
      "SPT-Server.exe",
      "AkiServer.exe",
    ];

    let errors = [];

    // Try to kill each possible executable
    for (const exeName of serverExecutables) {
      try {
        await new Promise((resolve) => {
          exec(`taskkill /F /IM "${exeName}"`, (error) => {
            if (!error) {
              console.log(`Successfully killed ${exeName}`);
              killedAny = true;
            } else {
              console.log(`No ${exeName} process found or already stopped`);
            }
            resolve();
          });
        });
      } catch (error) {
        errors.push(`Error killing ${exeName}: ${error.message}`);
      }
    }

    // Wait a moment for processes to fully terminate
    if (killedAny) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    if (killedAny) {
      isExternalProcess = false;
      console.log("SPT-AKI Server stopped successfully");
      return { success: true };
    } else {
      return {
        success: false,
        error: "No SPT-AKI server process found to stop.",
      };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// IPC handler for loading SPT-AKI profiles
ipcMain.handle("load-profiles", async (event, { serverPath }) => {
  try {
    const path = require("path");

    // Get the server directory
    const serverDir = path.dirname(serverPath);

    // Profile directory is typically at user/profiles/
    const profileDir = path.join(serverDir, "user", "profiles");

    console.log("Looking for profiles in:", profileDir);

    // Check if profile directory exists
    if (!(await fs.pathExists(profileDir))) {
      return {
        success: false,
        error: `Profile directory not found: ${profileDir}`,
        profiles: [],
      };
    }

    // Read all files in the profile directory
    const files = await fs.readdir(profileDir);
    const profileFiles = files.filter((file) => file.endsWith(".json"));

    console.log("Found profile files:", profileFiles);

    const profiles = [];

    for (const fileName of profileFiles) {
      try {
        const filePath = path.join(profileDir, fileName);
        const profileData = await fs.readJson(filePath);

        // Extract profile information
        const profile = {
          fileName: fileName,
          name:
            profileData.info?.username ||
            profileData.info?.nickname ||
            "Unknown",
          level: profileData.characters?.pmc?.Info?.Level || 1,
          pmcLevel: profileData.characters?.pmc?.Info?.Level || 1,
          scavLevel: profileData.characters?.scav?.Info?.Level || 1,
          lastLogin: profileData.info?.lastLogin || new Date().toISOString(),
          path: filePath,
        };

        profiles.push(profile);
      } catch (error) {
        console.error(`Error reading profile ${fileName}:`, error);
        // Continue with other profiles even if one fails
      }
    }

    console.log("Loaded profiles:", profiles);

    return {
      success: true,
      profiles: profiles,
    };
  } catch (error) {
    console.error("Error loading profiles:", error);
    return {
      success: false,
      error: error.message,
      profiles: [],
    };
  }
});

// IPC handler for backing up a profile
ipcMain.handle(
  "backup-profile",
  async (event, { profilePath, backupPath, profileName }) => {
    try {
      const path = require("path");

      // Create timestamp for backup filename
      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, "-")
        .slice(0, 19);
      const safeProfileName = profileName.replace(/[^a-zA-Z0-9]/g, "_");
      const backupFileName = `SPT-Profile-${safeProfileName}-${timestamp}.json`;
      const backupFilePath = path.join(backupPath, backupFileName);

      console.log("Backing up profile:", profilePath, "to:", backupFilePath);

      // Copy the profile file to backup location
      await fs.copy(profilePath, backupFilePath);

      console.log("Profile backed up successfully");

      return {
        success: true,
        backupPath: backupFilePath,
      };
    } catch (error) {
      console.error("Error backing up profile:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
);

// IPC handler for restoring a profile
ipcMain.handle(
  "restore-profile",
  async (event, { profilePath, backupFile }) => {
    try {
      console.log("Restoring profile from:", backupFile, "to:", profilePath);

      // Copy the backup file to the profile location
      await fs.copy(backupFile, profilePath);

      console.log("Profile restored successfully");

      return {
        success: true,
      };
    } catch (error) {
      console.error("Error restoring profile:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
);

// IPC handler for picking a backup file
ipcMain.handle("pick-backup-file", async (event) => {
  try {
    const result = await dialog.showOpenDialog({
      title: "Select Backup File",
      filters: [
        { name: "JSON Files", extensions: ["json"] },
        { name: "All Files", extensions: ["*"] },
      ],
      properties: ["openFile"],
    });

    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0];
    }

    return null;
  } catch (error) {
    console.error("Error picking backup file:", error);
    return null;
  }
});

// SPT Installer update management
const SPT_INSTALLER_URL = "https://ligma.waffle-lord.net/SPTInstaller.exe";

const checkForUpdates = async () => {
  try {
    const fetch = (await import("node-fetch")).default;

    // Check if the installer URL is accessible and get file info
    const response = await fetch(SPT_INSTALLER_URL, { method: "HEAD" });

    if (!response.ok) {
      throw new Error(`Failed to access installer: ${response.status}`);
    }

    // Get the last-modified header to check if there's a newer version
    const lastModified = response.headers.get("last-modified");
    const contentLength = response.headers.get("content-length");

    // For now, we'll use a simple approach - if the file is accessible, consider it "up to date"
    // In a real implementation, you might want to compare file hashes or use a version API
    return {
      success: true,
      latestVersion: "Latest Available",
      downloadUrl: SPT_INSTALLER_URL,
      releaseNotes: "SPT-AKI Installer is available for download.",
      publishedAt: lastModified
        ? new Date(lastModified).toISOString()
        : new Date().toISOString(),
      fileSize: contentLength ? parseInt(contentLength) : null,
    };
  } catch (error) {
    console.error("Error checking for updates:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

const downloadUpdate = async (downloadUrl, downloadPath) => {
  try {
    const fetch = (await import("node-fetch")).default;
    const { exec } = require("child_process");

    const installerPath = path.join(downloadPath, "SPTInstaller.exe");

    console.log("Downloading SPT-AKI installer update...");
    const response = await fetch(downloadUrl);

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

    console.log("SPT-AKI installer update downloaded successfully");

    // Auto-run the installer
    console.log("Launching SPT-AKI installer update...");
    exec(`"${installerPath}"`, (error) => {
      if (error) {
        console.error("Failed to run installer update:", error);
      } else {
        console.log("Installer update launched successfully");
      }
    });

    return { success: true, path: installerPath };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
