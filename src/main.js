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

    console.log("Selected client path:", clientPath);

    // List all files in the selected directory for debugging
    const files = fs.readdirSync(clientPath);
    console.log("Files in selected directory:", files);

    // Look for the SPT launcher executable in the selected folder
    const launcherExePath = path.join(clientPath, "spt.launcher.exe");
    console.log("Looking for SPT launcher at:", launcherExePath);

    // Check if the SPT launcher exists
    if (!fs.existsSync(launcherExePath)) {
      // Also check for alternative launcher names
      const alternativeNames = [
        "SPT.Launcher.exe",
        "launcher.exe",
        "SPT-Launcher.exe",
        "AkiLauncher.exe",
        "sptlauncher.exe",
      ];
      let foundAlternative = false;

      for (const altName of alternativeNames) {
        const altPath = path.join(clientPath, altName);
        if (fs.existsSync(altPath)) {
          console.log("Found alternative launcher:", altName);
          launcherExePath = altPath;
          foundAlternative = true;
          break;
        }
      }

      if (!foundAlternative) {
        throw new Error(
          "SPT-AKI Launcher (spt.launcher.exe) not found. Please select the correct SPT-AKI client folder."
        );
      }
    }

    console.log("Launching SPT-AKI Launcher...");

    // Launch the SPT launcher in a new process
    exec(`"${launcherExePath}"`, { cwd: clientPath }, (error) => {
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
      path.join(serverPath, "logs", "server.log"),
      path.join(serverPath, "logs", "aki.log"),
      path.join(serverPath, "user", "logs", "server.log"),
      path.join(serverPath, "user", "logs", "aki.log"),
      path.join(serverPath, "user", "logs", "spt.log"),
      path.join(serverPath, "logs", "spt.log"),
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
