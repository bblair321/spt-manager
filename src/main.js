const { app, BrowserWindow } = require("electron");
const path = require("node:path");
const { dialog, ipcMain } = require("electron");
const fs = require("fs-extra");
const os = require("os");
const extract = require("extract-zip");
const { extractFull } = require("node-7z");
const SevenBin = require("7zip-bin");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));
const { autoUpdater } = require("electron-updater");

if (require("electron-squirrel-startup")) {
  app.quit();
}

// Performance monitoring utility
const measurePerformance = (operationName, operation) => {
  const start = performance.now();
  return operation().finally(() => {
    const duration = performance.now() - start;
    if (duration > 100) {
      // Log operations taking more than 100ms
      console.log(
        `Performance: ${operationName} took ${duration.toFixed(2)}ms`
      );
    }
  });
};

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

// Smart path learning system
const pathLearningPath = path.join(
  app.getPath("userData"),
  "path-learning.json"
);

const loadPathLearning = async () => {
  try {
    if (await fs.pathExists(pathLearningPath)) {
      const data = await fs.readJson(pathLearningPath);
      return data;
    }
  } catch (error) {
    console.error("Error loading path learning data:", error);
  }
  return {
    successfulPaths: [],
    failedAttempts: [],
    lastUpdated: null,
  };
};

const savePathLearning = async (learningData) => {
  try {
    await fs.ensureDir(path.dirname(pathLearningPath));
    await fs.writeJson(pathLearningPath, learningData, { spaces: 2 });
  } catch (error) {
    console.error("Error saving path learning data:", error);
  }
};

const updatePathLearning = async (serverPath, clientPath, success = true) => {
  try {
    const learningData = await loadPathLearning();

    if (success) {
      // Add successful paths
      if (serverPath && !learningData.successfulPaths.includes(serverPath)) {
        learningData.successfulPaths.push(serverPath);
      }
      if (clientPath && !learningData.successfulPaths.includes(clientPath)) {
        learningData.successfulPaths.push(clientPath);
      }
    } else {
      // Track failed attempts
      const attempt = {
        serverPath,
        clientPath,
        timestamp: new Date().toISOString(),
      };
      learningData.failedAttempts.push(attempt);

      // Keep only last 10 failed attempts
      if (learningData.failedAttempts.length > 10) {
        learningData.failedAttempts = learningData.failedAttempts.slice(-10);
      }
    }

    learningData.lastUpdated = new Date().toISOString();
    await savePathLearning(learningData);
  } catch (error) {
    console.error("Error updating path learning:", error);
  }
};

// Enhanced path detection with learning
const detectSPTPaths = async () => {
  const detectedPaths = {
    serverPath: "",
    clientPath: "",
    confidence: 0,
    searchResults: [],
  };

  const searchResults = [];
  const startTime = performance.now();

  try {
    // Load learned paths first
    const learningData = await loadPathLearning();
    if (learningData.successfulPaths.length > 0) {
      searchResults.push({
        type: "learned",
        paths: learningData.successfulPaths,
        timestamp: new Date().toISOString(),
      });
    }

    // 1. Check Windows Registry for Steam/Epic installations
    const registryPaths = await checkRegistryForGamePaths();
    searchResults.push(...registryPaths);

    // 2. Check common installation directories
    const commonPaths = await checkCommonInstallationPaths();
    searchResults.push(...commonPaths);

    // 3. Check user directories (Desktop, Documents, Downloads)
    const userPaths = await checkUserDirectories();
    searchResults.push(...userPaths);

    // 4. Check running processes for SPT installations
    const processPaths = await checkRunningProcesses();
    searchResults.push(...processPaths);

    // 5. Check recent files and shortcuts
    const recentPaths = await checkRecentFiles();
    searchResults.push(...recentPaths);

    // 6. Recursive search in common game directories
    const recursivePaths = await performRecursiveSearch();
    searchResults.push(...recursivePaths);

    // 7. Check Steam common folder for SPT installations
    const steamPaths = await checkSteamCommonFolder();
    searchResults.push(...steamPaths);

    // 8. Deep search in detected directories
    const deepSearchPaths = await performDeepSearch(searchResults);
    searchResults.push(...deepSearchPaths);

    // 9. Specific search for known SPT locations
    const knownSPTPaths = await searchKnownSPTLocations();
    searchResults.push(...knownSPTPaths);

    // 10. Search for SPT installations by folder patterns
    const sptFolders = await searchSPTFolders();
    searchResults.push(...sptFolders);

    // 11. Enhanced search for client launcher in server directories
    const serverPaths = searchResults.filter(
      (result) =>
        result.file &&
        ["Aki.Server.exe", "SPT.Server.exe", "server.exe"].includes(result.file)
    );

    for (const serverResult of serverPaths) {
      const clientResults = await searchForClientInServerDirectory(
        serverResult.path
      );
      searchResults.push(...clientResults);
    }

    // Analyze results and find best matches
    const analysis = analyzeSearchResults(searchResults, learningData);

    detectedPaths.serverPath = analysis.bestServerPath;
    detectedPaths.clientPath = analysis.bestClientPath;
    detectedPaths.confidence = analysis.confidence;
    detectedPaths.searchResults = searchResults;

    const duration = performance.now() - startTime;
    console.log(
      `Path detection completed in ${duration.toFixed(2)}ms with ${
        analysis.confidence
      }% confidence`
    );
    console.log(
      `Found ${analysis.serverCandidates.length} server candidates and ${analysis.clientCandidates.length} client candidates`
    );
  } catch (error) {
    console.error("Error during path detection:", error);
    searchResults.push({
      type: "error",
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }

  return detectedPaths;
};

// Deep search in detected directories
const performDeepSearch = async (existingResults) => {
  const results = [];
  const serverExes = ["Aki.Server.exe", "SPT.Server.exe", "server.exe"];
  const clientExes = ["spt.launcher.exe", "SPT-Launcher.exe", "launcher.exe"];

  // Extract unique directories from existing results
  const directories = new Set();
  for (const result of existingResults) {
    if (result.path && !result.file) {
      directories.add(result.path);
    }
  }

  for (const dir of directories) {
    try {
      if (await fs.pathExists(dir)) {
        const found = await deepSearchDirectory(
          dir,
          [...serverExes, ...clientExes],
          3
        ); // Max depth 3
        results.push(...found);
      }
    } catch (error) {
      // Continue if recursive search fails
    }
  }

  return results;
};

// Deep search in a single directory
const deepSearchDirectory = async (dir, targetFiles, depth = 0) => {
  const results = [];
  const maxDepth = 2; // Limit depth for performance

  if (depth >= maxDepth) return results;

  try {
    const items = await fs.readdir(dir);

    for (const item of items) {
      const fullPath = path.join(dir, item);

      try {
        const stats = await fs.stat(fullPath);

        if (stats.isDirectory()) {
          // Search subdirectories
          const subResults = await deepSearchDirectory(
            fullPath,
            targetFiles,
            depth + 1
          );
          results.push(...subResults);
        } else if (stats.isFile() && targetFiles.includes(item)) {
          console.log(`Found executable: ${fullPath}`);
          results.push({
            type: "deep",
            file: item,
            path: fullPath.replace(/[^\w\\\/:.-]/g, ""), // Remove any non-standard characters
            depth: depth,
            timestamp: new Date().toISOString(),
          });
        }
      } catch (error) {
        // Continue if individual item check fails
      }
    }
  } catch (error) {
    // Continue if directory read fails
  }

  return results;
};

// Enhanced search for client launcher in server directory
const searchForClientInServerDirectory = async (serverPath) => {
  const results = [];
  const serverDir = path.dirname(serverPath);
  const clientExes = [
    "spt.launcher.exe",
    "SPT-Launcher.exe",
    "launcher.exe",
    "SPT-Launcher.exe",
    "Aki.Launcher.exe",
    "SPT.Launcher.exe",
    "sptlauncher.exe",
    "SPTLauncher.exe",
    "aki.launcher.exe",
    "AkiLauncher.exe",
  ];

  try {
    const items = await fs.readdir(serverDir);

    for (const item of items) {
      const fullPath = path.join(serverDir, item);
      try {
        const stats = await fs.stat(fullPath);
        if (stats.isFile()) {
          // Only process .exe files, skip license files and other non-executables
          if (item.toLowerCase().endsWith(".exe")) {
            if (clientExes.includes(item)) {
              console.log(`Found client launcher: ${fullPath}`);
              results.push({
                type: "server_dir",
                file: item,
                path: fullPath.trim(), // Ensure no trailing characters
                serverDir: serverDir,
                timestamp: new Date().toISOString(),
              });
            } else if (
              item.toLowerCase().includes("launcher") ||
              item.toLowerCase().includes("client")
            ) {
              console.log(`Found potential client launcher: ${fullPath}`);
              results.push({
                type: "server_dir",
                file: item,
                path: fullPath.trim(),
                serverDir: serverDir,
                potential: true,
                timestamp: new Date().toISOString(),
              });
            }
          }
        }
      } catch (error) {
        // Continue if individual file check fails
      }
    }
  } catch (error) {
    console.log(`Error searching server directory: ${error.message}`);
  }

  return results;
};

// Check Windows Registry for game installations
const checkRegistryForGamePaths = async () => {
  const results = [];

  try {
    const { exec } = require("child_process");
    const { promisify } = require("util");
    const execAsync = promisify(exec);

    // Check Steam registry
    try {
      const steamQuery = await execAsync(
        'reg query "HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432Node\\Valve\\Steam" /v InstallPath'
      );
      const steamPath = steamQuery.stdout
        .match(/InstallPath\s+REG_SZ\s+(.+)/)?.[1]
        ?.trim();

      if (steamPath) {
        const steamApps = path.join(steamPath, "steamapps", "common");
        if (await fs.pathExists(steamApps)) {
          results.push({
            type: "registry",
            source: "steam",
            path: steamApps,
            timestamp: new Date().toISOString(),
          });
        }
      }
    } catch (e) {
      // Steam registry not found, continue
    }

    // Check Epic Games registry
    try {
      const epicQuery = await execAsync(
        'reg query "HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432Node\\EpicGames\\Launcher" /v AppPath'
      );
      const epicPath = epicQuery.stdout
        .match(/AppPath\s+REG_SZ\s+(.+)/)?.[1]
        ?.trim();

      if (epicPath) {
        const epicGames = path.join(epicPath, "..", "..", "Games");
        if (await fs.pathExists(epicGames)) {
          results.push({
            type: "registry",
            source: "epic",
            path: epicGames,
            timestamp: new Date().toISOString(),
          });
        }
      }
    } catch (e) {
      // Epic registry not found, continue
    }
  } catch (error) {
    results.push({
      type: "error",
      source: "registry",
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }

  return results;
};

// Check common installation directories
const checkCommonInstallationPaths = async () => {
  const results = [];
  const commonPaths = [
    path.join("C:", "Program Files (x86)", "Steam", "steamapps", "common"),
    path.join("C:", "Program Files", "Steam", "steamapps", "common"),
    path.join("D:", "Program Files (x86)", "Steam", "steamapps", "common"),
    path.join("D:", "Program Files", "Steam", "steamapps", "common"),
    path.join("C:", "Games"),
    path.join("D:", "Games"),
    path.join("C:", "Program Files", "Epic Games"),
    path.join("C:", "Program Files (x86)", "Epic Games"),
    path.join("C:", "SPT-AKI"),
    path.join("D:", "SPT-AKI"),
    path.join("C:", "Escape from Tarkov"),
    path.join("D:", "Escape from Tarkov"),
    // Common SPT installation patterns
    path.join("C:", "SPT"),
    path.join("D:", "SPT"),
    path.join("C:", "SPT-AKI-3.8.0"),
    path.join("D:", "SPT-AKI-3.8.0"),
    path.join("C:", "SPT-AKI-3.7.6"),
    path.join("D:", "SPT-AKI-3.7.6"),
    path.join("C:", "SPT-AKI-3.7.5"),
    path.join("D:", "SPT-AKI-3.7.5"),
    path.join("C:", "SPT-AKI-3.7.4"),
    path.join("D:", "SPT-AKI-3.7.4"),
    path.join("C:", "SPT-AKI-3.7.3"),
    path.join("D:", "SPT-AKI-3.7.3"),
    path.join("C:", "SPT-AKI-3.7.2"),
    path.join("D:", "SPT-AKI-3.7.2"),
    path.join("C:", "SPT-AKI-3.7.1"),
    path.join("D:", "SPT-AKI-3.7.1"),
    path.join("C:", "SPT-AKI-3.7.0"),
    path.join("D:", "SPT-AKI-3.7.0"),
  ];

  const serverExes = ["Aki.Server.exe", "SPT.Server.exe", "server.exe"];
  const clientExes = ["spt.launcher.exe", "SPT-Launcher.exe", "launcher.exe"];

  for (const basePath of commonPaths) {
    try {
      if (await fs.pathExists(basePath)) {
        results.push({
          type: "common",
          path: basePath,
          timestamp: new Date().toISOString(),
        });

        // Also search for executables directly in this directory
        const items = await fs.readdir(basePath);
        for (const item of items) {
          const fullPath = path.join(basePath, item);
          try {
            const stats = await fs.stat(fullPath);
            if (
              stats.isFile() &&
              [...serverExes, ...clientExes].includes(item)
            ) {
              console.log(`Found executable: ${fullPath}`);
              results.push({
                type: "common",
                file: item,
                path: fullPath,
                timestamp: new Date().toISOString(),
              });
            }
          } catch (error) {
            // Continue if individual file check fails
          }
        }
      }
    } catch (error) {
      // Continue if path check fails
    }
  }

  return results;
};

// Check user directories
const checkUserDirectories = async () => {
  const results = [];
  const userPaths = [
    path.join(os.homedir(), "Desktop"),
    path.join(os.homedir(), "Documents"),
    path.join(os.homedir(), "Downloads"),
    path.join(os.homedir(), "Games"),
    path.join(os.homedir(), "SPT-AKI"),
    path.join(os.homedir(), "SPT"),
  ];

  const serverExes = ["Aki.Server.exe", "SPT.Server.exe", "server.exe"];
  const clientExes = ["spt.launcher.exe", "SPT-Launcher.exe", "launcher.exe"];

  for (const basePath of userPaths) {
    try {
      if (await fs.pathExists(basePath)) {
        results.push({
          type: "user",
          path: basePath,
          timestamp: new Date().toISOString(),
        });

        // Also search for executables directly in this directory
        const items = await fs.readdir(basePath);
        for (const item of items) {
          const fullPath = path.join(basePath, item);
          try {
            const stats = await fs.stat(fullPath);
            if (
              stats.isFile() &&
              [...serverExes, ...clientExes].includes(item)
            ) {
              results.push({
                type: "user",
                file: item,
                path: fullPath,
                timestamp: new Date().toISOString(),
              });
            }
          } catch (error) {
            // Continue if individual file check fails
          }
        }
      }
    } catch (error) {
      // Continue if path check fails
    }
  }

  return results;
};

// Check running processes for SPT installations
const checkRunningProcesses = async () => {
  const results = [];

  try {
    const { exec } = require("child_process");
    const { promisify } = require("util");
    const execAsync = promisify(exec);

    // Get running processes
    const processList = await execAsync("tasklist /FO CSV /NH");
    const lines = processList.stdout.split("\n");

    const sptProcesses = [
      "Aki.Server.exe",
      "SPT.Server.exe",
      "server.exe",
      "spt.launcher.exe",
      "SPT-Launcher.exe",
      "launcher.exe",
    ];

    for (const line of lines) {
      const match = line.match(/"([^"]+)"/);
      if (match && sptProcesses.includes(match[1])) {
        results.push({
          type: "process",
          process: match[1],
          timestamp: new Date().toISOString(),
        });
      }
    }
  } catch (error) {
    results.push({
      type: "error",
      source: "process",
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }

  return results;
};

// Check recent files and shortcuts
const checkRecentFiles = async () => {
  const results = [];

  try {
    const recentPath = path.join(
      os.homedir(),
      "AppData",
      "Roaming",
      "Microsoft",
      "Windows",
      "Recent"
    );
    if (await fs.pathExists(recentPath)) {
      const files = await fs.readdir(recentPath);

      for (const file of files) {
        if (
          file.toLowerCase().includes("spt") ||
          file.toLowerCase().includes("aki")
        ) {
          const filePath = path.join(recentPath, file);

          // If it's a shortcut (.lnk file), try to resolve it
          if (file.toLowerCase().endsWith(".lnk")) {
            try {
              const { exec } = require("child_process");
              const { promisify } = require("util");
              const execAsync = promisify(exec);

              // Use PowerShell to resolve the shortcut
              const psCommand = `powershell -Command "(New-Object -ComObject WScript.Shell).CreateShortcut('${filePath.replace(
                /\\/g,
                "\\\\"
              )}').TargetPath"`;
              const resolvedPath = await execAsync(psCommand);

              if (resolvedPath.stdout && resolvedPath.stdout.trim()) {
                const targetPath = resolvedPath.stdout.trim();

                // Check if the resolved path is an SPT executable
                const fileName = path.basename(targetPath);
                const sptExes = [
                  "Aki.Server.exe",
                  "SPT.Server.exe",
                  "server.exe",
                  "spt.launcher.exe",
                  "SPT-Launcher.exe",
                  "launcher.exe",
                ];

                if (sptExes.includes(fileName)) {
                  results.push({
                    type: "recent",
                    file: file,
                    path: targetPath,
                    originalShortcut: filePath,
                    timestamp: new Date().toISOString(),
                  });
                }
              }
            } catch (error) {
              // If shortcut resolution fails, just log the shortcut
              results.push({
                type: "recent",
                file: file,
                path: filePath,
                timestamp: new Date().toISOString(),
              });
            }
          } else {
            results.push({
              type: "recent",
              file: file,
              path: filePath,
              timestamp: new Date().toISOString(),
            });
          }
        }
      }
    }
  } catch (error) {
    // Continue if recent files check fails
  }

  return results;
};

// Perform recursive search in promising directories
const performRecursiveSearch = async () => {
  const results = [];
  const searchDirs = [
    path.join("C:", "Games"),
    path.join("D:", "Games"),
    path.join(os.homedir(), "Desktop"),
    path.join(os.homedir(), "Documents"),
    path.join(os.homedir(), "Downloads"),
    path.join("C:", "Program Files (x86)", "Steam", "steamapps", "common"),
    path.join("C:", "Program Files", "Steam", "steamapps", "common"),
    path.join("C:", "Program Files (x86)", "Epic Games"),
    path.join("C:", "Program Files", "Epic Games"),
  ];

  const serverExes = ["Aki.Server.exe", "SPT.Server.exe", "server.exe"];
  const clientExes = ["spt.launcher.exe", "SPT-Launcher.exe", "launcher.exe"];

  for (const searchDir of searchDirs) {
    try {
      if (await fs.pathExists(searchDir)) {
        const found = await recursiveSearch(
          searchDir,
          [...serverExes, ...clientExes],
          3
        ); // Max depth 3
        results.push(...found);
      }
    } catch (error) {
      // Continue if recursive search fails
    }
  }

  return results;
};

// Recursive search helper
const recursiveSearch = async (
  dir,
  targetFiles,
  maxDepth,
  currentDepth = 0
) => {
  const results = [];

  if (currentDepth >= maxDepth) return results;

  try {
    const items = await fs.readdir(dir);

    for (const item of items) {
      const fullPath = path.join(dir, item);

      try {
        const stats = await fs.stat(fullPath);

        if (stats.isDirectory()) {
          // Check if this directory name suggests it might contain SPT files
          const dirNameLower = item.toLowerCase();
          const isPromisingDir =
            dirNameLower.includes("spt") ||
            dirNameLower.includes("aki") ||
            dirNameLower.includes("tarkov") ||
            dirNameLower.includes("escape") ||
            dirNameLower.includes("game") ||
            currentDepth === 0; // Always search first level

          if (isPromisingDir) {
            // Search this directory for executables
            const subResults = await recursiveSearch(
              fullPath,
              targetFiles,
              maxDepth,
              currentDepth + 1
            );
            results.push(...subResults);
          }
        } else if (stats.isFile() && targetFiles.includes(item)) {
          results.push({
            type: "recursive",
            file: item,
            path: fullPath,
            depth: currentDepth,
            timestamp: new Date().toISOString(),
          });
        }
      } catch (error) {
        // Continue if individual item check fails
      }
    }
  } catch (error) {
    // Continue if directory read fails
  }

  return results;
};

// Analyze search results and find best matches
const analyzeSearchResults = (searchResults, learningData) => {
  const serverCandidates = [];
  const clientCandidates = [];
  const seenPaths = new Set(); // Track seen paths to avoid duplicates

  // Filter out non-executable results first
  const filteredResults = searchResults.filter((result) => {
    // Skip results that are clearly not executables
    if (result.file && !result.file.toLowerCase().endsWith(".exe")) {
      return false;
    }
    if (result.path && !result.path.toLowerCase().endsWith(".exe")) {
      return false;
    }
    return true;
  });

  // Process all search results
  for (const result of filteredResults) {
    if (result.type === "learned") {
      // Process learned paths with highest priority
      for (const learnedPath of result.paths) {
        if (seenPaths.has(learnedPath)) continue; // Skip duplicates
        seenPaths.add(learnedPath);

        const fileName = path.basename(learnedPath);

        if (
          ["Aki.Server.exe", "SPT.Server.exe", "server.exe"].includes(fileName)
        ) {
          serverCandidates.push({
            path: learnedPath,
            type: "learned",
            depth: 0,
            score: 150, // Highest score for learned paths
          });
        } else if (
          [
            "spt.launcher.exe",
            "SPT-Launcher.exe",
            "launcher.exe",
            "SPT.Launcher.exe",
          ].includes(fileName)
        ) {
          clientCandidates.push({
            path: learnedPath,
            type: "learned",
            depth: 0,
            score: 150, // Highest score for learned paths
          });
        }
      }
    } else if (
      result.type === "recursive" ||
      result.type === "common" ||
      result.type === "user" ||
      result.type === "steam" ||
      result.type === "recent" ||
      result.type === "deep" ||
      result.type === "known" ||
      result.type === "folder" ||
      result.type === "server_dir"
    ) {
      // Handle results that have a direct path to an executable
      if (result.path && result.file) {
        if (seenPaths.has(result.path)) continue; // Skip duplicates
        seenPaths.add(result.path);

        const fileName = result.file;

        if (
          ["Aki.Server.exe", "SPT.Server.exe", "server.exe"].includes(fileName)
        ) {
          serverCandidates.push({
            path: result.path,
            type: result.type,
            depth: result.depth || 0,
            score: calculatePathScore(result, learningData),
          });
        } else if (
          [
            "spt.launcher.exe",
            "SPT-Launcher.exe",
            "launcher.exe",
            "SPT.Launcher.exe",
          ].includes(fileName)
        ) {
          clientCandidates.push({
            path: result.path,
            type: result.type,
            depth: result.depth || 0,
            score: calculatePathScore(result, learningData),
          });
        }
      } else if (result.path && !result.file) {
        // Handle directory-only results (for backward compatibility)
        if (seenPaths.has(result.path)) continue; // Skip duplicates
        seenPaths.add(result.path);

        const fileName = path.basename(result.path);

        if (
          ["Aki.Server.exe", "SPT.Server.exe", "server.exe"].includes(fileName)
        ) {
          serverCandidates.push({
            path: result.path,
            type: result.type,
            depth: result.depth || 0,
            score: calculatePathScore(result, learningData),
          });
        } else if (
          [
            "spt.launcher.exe",
            "SPT-Launcher.exe",
            "launcher.exe",
            "SPT.Launcher.exe",
          ].includes(fileName)
        ) {
          clientCandidates.push({
            path: result.path,
            type: result.type,
            depth: result.depth || 0,
            score: calculatePathScore(result, learningData),
          });
        }
      }
    }
  }

  // Handle potential client launchers (files with 'launcher' or 'client' in name)
  for (const result of filteredResults) {
    if (result.type === "server_dir" && result.potential && result.file) {
      if (seenPaths.has(result.path)) continue; // Skip duplicates
      seenPaths.add(result.path);

      const fileName = result.file.toLowerCase();
      if (fileName.includes("launcher") || fileName.includes("client")) {
        clientCandidates.push({
          path: result.path,
          type: result.type,
          depth: result.depth || 0,
          score: calculatePathScore(result, learningData) - 20, // Slightly lower score for potential matches
          potential: true,
        });
      }
    }
  }

  // Sort candidates by score (highest first)
  serverCandidates.sort((a, b) => b.score - a.score);
  clientCandidates.sort((a, b) => b.score - a.score);

  // Calculate confidence based on found candidates
  const confidence = calculateConfidence(serverCandidates, clientCandidates);

  return {
    bestServerPath: serverCandidates[0]?.path || "",
    bestClientPath: clientCandidates[0]?.path || "",
    confidence: confidence,
    serverCandidates: serverCandidates,
    clientCandidates: clientCandidates,
  };
};

// Calculate path score based on various factors
const calculatePathScore = (result, learningData) => {
  let score = 0;

  // Base score by type
  switch (result.type) {
    case "learned":
      score += 150;
      break; // Highest priority
    case "steam":
      score += 120;
      break; // High priority for Steam installations
    case "recent":
      score += 110;
      break; // High priority for recently used files
    case "registry":
      score += 100;
      break;
    case "common":
      score += 80;
      break;
    case "user":
      score += 60;
      break;
    case "recursive":
      score += 40;
      break;
    case "deep":
      score += 30; // High priority for executables found via deep search
      break;
    case "known":
      score += 20; // High priority for known SPT locations
      break;
    case "folder":
      score += 10; // High priority for SPT installations found via folder patterns
      break;
    case "server_dir":
      score += 140; // Very high priority for client found in server directory
      break;
    default:
      score += 20;
      break;
  }

  // Penalty for depth in recursive search
  if (result.depth) {
    score -= result.depth * 10;
  }

  // Bonus for being in a dedicated SPT directory
  const pathLower = result.path.toLowerCase();
  if (pathLower.includes("spt") || pathLower.includes("aki")) {
    score += 30;
  }

  // Bonus for being in a games directory
  if (pathLower.includes("games")) {
    score += 20;
  }

  // Bonus for Steam installations
  if (result.type === "steam" && result.gameDir) {
    score += 25; // Additional bonus for Steam game directories
  }

  // Bonus for resolved shortcuts (recent files)
  if (result.type === "recent" && result.originalShortcut) {
    score += 15; // Bonus for successfully resolved shortcuts
  }

  // Check if this path was previously successful
  if (learningData && learningData.successfulPaths.includes(result.path)) {
    score += 50; // Significant bonus for previously successful paths
  }

  // Penalty for paths that previously failed
  if (
    learningData &&
    learningData.failedAttempts.some(
      (attempt) =>
        attempt.serverPath === result.path || attempt.clientPath === result.path
    )
  ) {
    score -= 30; // Penalty for previously failed paths
  }

  return Math.max(0, score);
};

// Calculate overall confidence score
const calculateConfidence = (serverCandidates, clientCandidates) => {
  let confidence = 0;

  // Base confidence from finding candidates
  if (serverCandidates.length > 0) confidence += 30;
  if (clientCandidates.length > 0) confidence += 30;

  // Bonus for high-scoring candidates
  if (serverCandidates[0]?.score > 80) confidence += 20;
  if (clientCandidates[0]?.score > 80) confidence += 20;

  // Bonus for finding both server and client
  if (serverCandidates.length > 0 && clientCandidates.length > 0) {
    confidence += 10;
  }

  // Bonus for multiple candidates (indicates thorough search)
  if (serverCandidates.length > 1) confidence += 5;
  if (clientCandidates.length > 1) confidence += 5;

  return Math.min(100, confidence);
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
      // Use a single command to check all executables at once
      const exeNames = serverExecutables.map((exe) => `"${exe}"`).join(" ");
      exec(
        `tasklist /FI "IMAGENAME eq SPT.Server.exe OR IMAGENAME eq Aki.Server.exe OR IMAGENAME eq server.exe OR IMAGENAME eq SPT-Server.exe OR IMAGENAME eq AkiServer.exe" /FO CSV`,
        (error, stdout) => {
          if (!error && stdout.trim()) {
            const foundProcess = serverExecutables.some((exeName) =>
              stdout.includes(exeName)
            );
            if (foundProcess) {
              isExternalProcess = true;
            }
            resolve({ isRunning: foundProcess, error: null });
          } else {
            resolve({ isRunning: false, error: null });
          }
        }
      );
    });
  } catch (error) {
    return { isRunning: false, error: error.message };
  }
};

const isDev = process.env.NODE_ENV === "development";

const getPreloadPath = () => {
  let preloadPath;
  if (isDev) {
    // Use the raw preload script file in development, resolved from project root
    preloadPath = path.join(app.getAppPath(), "src", "preload.js");
  } else {
    // Use the webpack-bundled preload script in production
    // The preload script is bundled to .webpack/renderer/main_window/preload.js
    preloadPath = path.join(
      __dirname,
      "..",
      "renderer",
      "main_window",
      "preload.js"
    );
  }
  return preloadPath;
};

const createWindow = () => {
  const preloadPath = getPreloadPath();

  // Check if preload file exists
  const fs = require("fs");
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    frame: false,
    transparent: false,
    resizable: true,
    backgroundColor: "#1a1a2e",
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
  });

  // Log the entry point being loaded
  console.log("Loading renderer from:", MAIN_WINDOW_WEBPACK_ENTRY);

  // Set Content Security Policy
  mainWindow.webContents.session.webRequest.onHeadersReceived(
    (details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          "Content-Security-Policy": [
            "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:",
          ],
        },
      });
    }
  );

  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
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
  try {
    createWindow();
  } catch (err) {
    console.error("Error creating window:", err);
  }

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

// Open external URL in system browser
ipcMain.handle("open-external-url", async (event, url) => {
  try {
    const { shell } = require("electron");
    await shell.openExternal(url);
    return { success: true };
  } catch (error) {
    console.error("Error opening external URL:", error);
    return { success: false, error: error.message };
  }
});

// GitHub API handler for mod fetching
const localModsPath = path.join(__dirname, "../mods.json");
ipcMain.handle("fetch-mods", async (event, { source } = {}) => {
  const useLocal = source === "local";
  if (useLocal) {
    try {
      const localMods = await fs.readJson(localModsPath);
      return { success: true, mods: localMods, error: "Using local mods.json" };
    } catch (localError) {
      console.error("Error loading local mods.json:", localError);
      return {
        success: false,
        mods: [],
        error: "Failed to load local mods.json",
      };
    }
  }
  // Default: try remote, fallback to local
  try {
    const response = await fetch("https://hub.sp-tarkov.com/api/files/");
    if (!response.ok) {
      throw new Error(`SPT Hub API error: ${response.status}`);
    }
    const data = await response.json();
    const transformedMods = (data.data || []).map((mod) => ({
      id: mod.id,
      name: mod.title || mod.name || "Unknown Mod",
      description: mod.description || "No description available",
      author: mod.author?.username || mod.author?.name || "Unknown",
      version: mod.version || (mod.versions && mod.versions[0]?.version) || "?",
      category: mod.category?.name?.toLowerCase() || "utility",
      stars: mod.likes || 0,
      lastUpdated: mod.updated_at || mod.created_at || new Date().toISOString(),
      downloadUrl:
        mod.versions && mod.versions[0]?.download_url
          ? mod.versions[0].download_url
          : mod.download_url || "",
      repository: mod.url || mod.link || "",
      language: mod.language || "",
      isInstalled: false,
      isCompatible: true,
      thumbnail: mod.icon_url || null,
    }));
    return { success: true, mods: transformedMods };
  } catch (error) {
    console.error("Error fetching mods from SPT Hub:", error);
    // Try to load from local mods.json as fallback
    try {
      const localMods = await fs.readJson(localModsPath);
      return { success: true, mods: localMods, error: "Using local mods.json" };
    } catch (localError) {
      console.error("Error loading local mods.json:", localError);
      return { success: false, mods: [], error: error.message };
    }
  }
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
  return measurePerformance("load-settings", () => loadSettings());
});

ipcMain.handle("save-settings", async (event, settings) => {
  const result = await saveSettings(settings);
  return result;
});

ipcMain.handle("detect-spt-paths", async () => {
  const detectedPaths = await detectSPTPaths();
  return detectedPaths;
});

ipcMain.handle("get-path-detection-details", async () => {
  const detectedPaths = await detectSPTPaths();
  return {
    paths: {
      serverPath: detectedPaths.serverPath,
      clientPath: detectedPaths.clientPath,
    },
    confidence: detectedPaths.confidence,
    searchResults: detectedPaths.searchResults,
    timestamp: new Date().toISOString(),
  };
});

// Path learning IPC handlers
ipcMain.handle(
  "update-path-learning",
  async (event, { serverPath, clientPath, success }) => {
    await updatePathLearning(serverPath, clientPath, success);
    return { success: true };
  }
);

ipcMain.handle("get-path-learning-data", async () => {
  const learningData = await loadPathLearning();
  return learningData;
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

    // Check if the client launcher exists
    if (!fs.existsSync(clientPath)) {
      throw new Error(
        "SPT-AKI Client launcher not found. Please select the correct client launcher executable."
      );
    }

    // Get the directory containing the executable
    const clientDir = path.dirname(clientPath);

    // Launch the SPT launcher in a new process
    exec(`"${clientPath}"`, { cwd: clientDir }, (error) => {
      if (error) {
        console.error("Launcher process error:", error);
      } else {
        console.log("Launcher process ended");
      }
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// IPC handler for downloading SPT-AKI installer
ipcMain.handle(
  "download-spt-installer",
  async (event, { downloadPath } = {}) => {
    try {
      // If no downloadPath is provided, prompt the user
      if (!downloadPath) {
        const { canceled, filePaths } = await dialog.showOpenDialog({
          properties: ["openDirectory"],
        });
        if (canceled || !filePaths || !filePaths[0]) {
          return { success: false, error: "No download directory selected." };
        }
        downloadPath = filePaths[0];
      }
      const fetch = (await import("node-fetch")).default;
      const { exec } = require("child_process");
      const installerUrl = "https://ligma.waffle-lord.net/SPTInstaller.exe";
      const installerPath = path.join(downloadPath, "SPTInstaller.exe");

      // Download the SPT-AKI installer
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

      // Check if the file exists before launching
      if (!fs.existsSync(installerPath)) {
        return { success: false, error: "Installer file was not downloaded." };
      }

      // Auto-run the installer
      exec(`"${installerPath}"`, (error) => {
        if (error) {
          console.error("Failed to run installer:", error);
          // Send error to renderer
          BrowserWindow.getAllWindows()[0].webContents.send(
            "installer-error",
            error.message || String(error)
          );
        } else {
          console.log("Installer launched successfully");
        }
      });

      return { success: true, path: installerPath };
    } catch (error) {
      // Send error to renderer for UI display
      try {
        BrowserWindow.getAllWindows()[0].webContents.send(
          "installer-error",
          error.message || String(error)
        );
      } catch {}
      return { success: false, error: error.message };
    }
  }
);

// IPC handler for starting SPT-AKI server
ipcMain.handle("start-spt-server", async (event, { serverPath }) => {
  try {
    const { exec } = require("child_process");
    const path = require("path");

    // Check if the server executable exists
    if (!fs.existsSync(serverPath)) {
      throw new Error(
        "SPT-AKI Server executable not found. Please select the correct server executable."
      );
    }

    // Get the directory containing the executable
    const serverDir = path.dirname(serverPath);

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

    // Check for existing log files and start watching them
    logFiles.forEach((logFile) => {
      if (fs.existsSync(logFile)) {
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
    }

    // Always check for any processes using port 6969 (in case of external processes or child processes)
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

    // Kill processes using port 6969 directly
    if (portCheck.inUse && portCheck.processIds.length > 0) {
      for (const pid of portCheck.processIds) {
        try {
          await new Promise((resolve) => {
            exec(`taskkill /F /PID ${pid}`, (error) => {
              if (!error) {
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

    // Try to kill each possible executable
    for (const exeName of serverExecutables) {
      try {
        await new Promise((resolve) => {
          exec(`taskkill /F /IM "${exeName}"`, (error) => {
            if (!error) {
              killedAny = true;
            } else {
              console.log(`No ${exeName} process found or already stopped`);
            }
            resolve();
          });
        });
      } catch (error) {
        console.error(`Error killing ${exeName}:`, error.message);
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
      // Suppress the generic 'Command failed' error, only show meaningful errors
      return {
        success: false,
        error:
          "No running SPT-AKI server process was found to stop. It may have already been stopped.",
      };
    }
  } catch (error) {
    // Suppress 'Command failed' errors that are not meaningful
    if (error.message && error.message.startsWith("Command failed")) {
      return {
        success: false,
        error:
          "Failed to stop the server process. It may have already been stopped.",
      };
    }
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

// IPC handler for installing a mod
ipcMain.handle("install-mod", async (event, { downloadUrl, serverPath }) => {
  try {
    if (!downloadUrl || !serverPath) {
      throw new Error("Missing downloadUrl or serverPath");
    }
    const serverDir = path.dirname(serverPath);
    const modsDir = path.join(serverDir, "user", "mods");
    await fs.ensureDir(modsDir);

    // Download the archive to a temp file
    const urlParts = downloadUrl.split("/");
    const fileName = urlParts[urlParts.length - 1].split("?")[0];
    const tempArchivePath = path.join(os.tmpdir(), fileName);
    const response = await fetch(downloadUrl);
    if (!response.ok) throw new Error(`Failed to download: ${response.status}`);
    const fileStream = fs.createWriteStream(tempArchivePath);
    await new Promise((resolve, reject) => {
      response.body.pipe(fileStream);
      response.body.on("error", reject);
      fileStream.on("finish", resolve);
    });

    // Determine archive type
    const ext = fileName.split(".").pop().toLowerCase();
    if (ext === "zip") {
      await extract(tempArchivePath, { dir: modsDir });
    } else if (ext === "7z") {
      await new Promise((resolve, reject) => {
        const stream = extractFull(tempArchivePath, modsDir, {
          $bin: SevenBin.path7za,
          recursive: true,
          overwrite: "a",
        });
        stream.on("end", resolve);
        stream.on("error", reject);
      });
    } else {
      throw new Error("Unsupported archive type: " + ext);
    }
    // Clean up temp file
    await fs.remove(tempArchivePath);
    return { success: true };
  } catch (error) {
    console.error("Mod install error:", error);
    return { success: false, error: error.message };
  }
});

// SPT Installer update management
const SPT_INSTALLER_URL = "https://ligma.waffle-lord.net/SPTInstaller.exe";

// Detect current SPT version from installed files
const detectCurrentSPTVersion = async () => {
  try {
    const currentSettings = await loadSettings();
    console.log("[SPT Version Detection] settings:", currentSettings);

    if (currentSettings.lastInstallerVersion) {
      console.log(
        "[SPT Version Detection] lastInstallerVersion:",
        currentSettings.lastInstallerVersion
      );
      return currentSettings.lastInstallerVersion;
    }

    const serverPath = currentSettings.serverPath;
    console.log("[SPT Version Detection] serverPath:", serverPath);

    if (serverPath && (await fs.pathExists(serverPath))) {
      const serverDir = path.dirname(serverPath);
      const items = await fs.readdir(serverDir);
      console.log("[SPT Version Detection] serverDir:", serverDir);
      console.log("[SPT Version Detection] items:", items);

      for (const item of items) {
        const itemLower = item.toLowerCase();
        if (
          itemLower.includes("version") ||
          itemLower.includes("readme") ||
          itemLower.includes("changelog")
        ) {
          try {
            const filePath = path.join(serverDir, item);
            const stats = await fs.stat(filePath);
            if (stats.isFile()) {
              const content = await fs.readFile(filePath, "utf8");
              const versionMatch = content.match(
                /(?:SPT-AKI|Version)[\s:]*([0-9]+\.[0-9]+\.[0-9]+)/i
              );
              console.log(
                "[SPT Version Detection] file:",
                filePath,
                "versionMatch:",
                versionMatch ? versionMatch[1] : null
              );
              if (versionMatch) {
                return `SPT-AKI-${versionMatch[1]}`;
              }
            }
          } catch (error) {
            console.log(
              "[SPT Version Detection] error reading file:",
              item,
              error
            );
          }
        }
      }

      const dirName = path.basename(serverDir);
      const versionMatch = dirName.match(
        /(?:SPT-AKI-)?([0-9]+\.[0-9]+\.[0-9]+)/i
      );
      console.log(
        "[SPT Version Detection] dirName:",
        dirName,
        "versionMatch:",
        versionMatch ? versionMatch[1] : null
      );
      if (versionMatch) {
        return `SPT-AKI-${versionMatch[1]}`;
      }

      // Try to extract version from the server executable file name (e.g., SPT.Server-3.8.0.exe)
      const exeName = path.basename(serverPath);
      const exeVersionMatch = exeName.match(/([0-9]+\.[0-9]+\.[0-9]+)/);
      console.log(
        "[SPT Version Detection] exeName:",
        exeName,
        "exeVersionMatch:",
        exeVersionMatch ? exeVersionMatch[1] : null
      );
      if (exeVersionMatch) {
        return `SPT-AKI-${exeVersionMatch[1]}`;
      }

      // Fallback: if the server executable exists, return 'SPT-AKI-unknown'
      if (await fs.pathExists(serverPath)) {
        console.log(
          "[SPT Version Detection] Fallback: server executable exists, returning SPT-AKI-unknown"
        );
        return "SPT-AKI-unknown";
      }
    } else {
      console.log(
        "[SPT Version Detection] serverPath does not exist or is not set."
      );
    }

    return null;
  } catch (error) {
    console.error("Error detecting SPT version:", error);
    return null;
  }
};

const extractSemanticVersion = (versionString) => {
  if (!versionString) return null;
  // Match 3.x.x or 2024.xx.xx
  const match = versionString.match(/(\d+\.\d+\.\d+)/);
  return match ? match[1] : null;
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

ipcMain.handle("save-local-mods", async (event, mods) => {
  try {
    await fs.writeJson(localModsPath, mods, { spaces: 2 });
    return { success: true };
  } catch (error) {
    console.error("Error saving mods.json:", error);
    return { success: false, error: error.message };
  }
});

// Check Steam common folder for SPT installations
const checkSteamCommonFolder = async () => {
  const results = [];

  try {
    const steamCommonPaths = [
      path.join("C:", "Program Files (x86)", "Steam", "steamapps", "common"),
      path.join("C:", "Program Files", "Steam", "steamapps", "common"),
      path.join("D:", "Program Files (x86)", "Steam", "steamapps", "common"),
      path.join("D:", "Program Files", "Steam", "steamapps", "common"),
    ];

    const serverExes = ["Aki.Server.exe", "SPT.Server.exe", "server.exe"];
    const clientExes = ["spt.launcher.exe", "SPT-Launcher.exe", "launcher.exe"];

    for (const steamCommonPath of steamCommonPaths) {
      if (await fs.pathExists(steamCommonPath)) {
        try {
          const items = await fs.readdir(steamCommonPath);

          for (const item of items) {
            const gamePath = path.join(steamCommonPath, item);
            try {
              const stats = await fs.stat(gamePath);

              if (stats.isDirectory()) {
                // Check if this looks like an SPT installation
                const dirNameLower = item.toLowerCase();
                if (
                  dirNameLower.includes("spt") ||
                  dirNameLower.includes("aki") ||
                  dirNameLower.includes("tarkov")
                ) {
                  // Search for executables in this game directory
                  const gameItems = await fs.readdir(gamePath);
                  for (const gameItem of gameItems) {
                    const exePath = path.join(gamePath, gameItem);
                    try {
                      const exeStats = await fs.stat(exePath);
                      if (
                        exeStats.isFile() &&
                        [...serverExes, ...clientExes].includes(gameItem)
                      ) {
                        results.push({
                          type: "steam",
                          file: gameItem,
                          path: exePath,
                          gameDir: item,
                          timestamp: new Date().toISOString(),
                        });
                      }
                    } catch (error) {
                      // Continue if individual exe check fails
                    }
                  }
                }
              }
            } catch (error) {
              // Continue if individual game directory check fails
            }
          }
        } catch (error) {
          // Continue if steam common directory read fails
        }
      }
    }
  } catch (error) {
    // Continue if steam check fails
  }

  return results;
};

// Specific search for known SPT locations
const searchKnownSPTLocations = async () => {
  const results = [];
  const knownLocations = [
    "D:\\SPT",
    "C:\\SPT",
    "D:\\SPT-AKI",
    "C:\\SPT-AKI",
    path.join(os.homedir(), "SPT"),
    path.join(os.homedir(), "SPT-AKI"),
  ];

  const serverExes = ["Aki.Server.exe", "SPT.Server.exe", "server.exe"];
  const clientExes = ["spt.launcher.exe", "SPT-Launcher.exe", "launcher.exe"];

  for (const location of knownLocations) {
    try {
      if (await fs.pathExists(location)) {
        // Search for executables in this directory
        const items = await fs.readdir(location);
        for (const item of items) {
          const fullPath = path.join(location, item);
          try {
            const stats = await fs.stat(fullPath);
            if (
              stats.isFile() &&
              [...serverExes, ...clientExes].includes(item)
            ) {
              console.log(`Found SPT executable: ${fullPath}`);
              results.push({
                type: "known",
                file: item,
                path: fullPath,
                location: location,
                timestamp: new Date().toISOString(),
              });
            }
          } catch (error) {
            // Continue if individual file check fails
          }
        }

        // Also search subdirectories
        for (const item of items) {
          const fullPath = path.join(location, item);
          try {
            const stats = await fs.stat(fullPath);
            if (stats.isDirectory()) {
              const subItems = await fs.readdir(fullPath);
              for (const subItem of subItems) {
                const subPath = path.join(fullPath, subItem);
                try {
                  const subStats = await fs.stat(subPath);
                  if (
                    subStats.isFile() &&
                    [...serverExes, ...clientExes].includes(subItem)
                  ) {
                    console.log(
                      `Found SPT executable in subdirectory: ${subPath}`
                    );
                    results.push({
                      type: "known",
                      file: subItem,
                      path: subPath,
                      location: location,
                      subdirectory: item,
                      timestamp: new Date().toISOString(),
                    });
                  }
                } catch (error) {
                  // Continue if individual subfile check fails
                }
              }
            }
          } catch (error) {
            // Continue if subdirectory check fails
          }
        }
      }
    } catch (error) {
      console.log(`Error searching ${location}:`, error.message);
    }
  }

  return results;
};

// Search for SPT installations by folder patterns
const searchSPTFolders = async () => {
  const results = [];
  const searchRoots = ["C:\\", "D:\\", os.homedir()];

  const serverExes = ["Aki.Server.exe", "SPT.Server.exe", "server.exe"];
  const clientExes = ["spt.launcher.exe", "SPT-Launcher.exe", "launcher.exe"];

  for (const root of searchRoots) {
    try {
      if (await fs.pathExists(root)) {
        const items = await fs.readdir(root);

        for (const item of items) {
          const itemPath = path.join(root, item);
          try {
            const stats = await fs.stat(itemPath);

            if (stats.isDirectory()) {
              const dirNameLower = item.toLowerCase();

              // Check if this directory name suggests it's an SPT installation
              if (
                dirNameLower.includes("spt") ||
                dirNameLower.includes("aki")
              ) {
                // Search for executables in this directory
                const subItems = await fs.readdir(itemPath);
                for (const subItem of subItems) {
                  const subPath = path.join(itemPath, subItem);
                  try {
                    const subStats = await fs.stat(subPath);
                    if (
                      subStats.isFile() &&
                      [...serverExes, ...clientExes].includes(subItem)
                    ) {
                      console.log(`Found SPT executable in folder: ${subPath}`);
                      results.push({
                        type: "folder",
                        file: subItem,
                        path: subPath,
                        folder: item,
                        timestamp: new Date().toISOString(),
                      });
                    }
                  } catch (error) {
                    // Continue if individual file check fails
                  }
                }
              }
            }
          } catch (error) {
            // Continue if individual item check fails
          }
        }
      }
    } catch (error) {
      console.log(`Error searching ${root}:`, error.message);
    }
  }

  return results;
};

// Check if directory is empty (for SPT installation requirements)
const checkDirectoryEmpty = async (dirPath) => {
  try {
    if (!(await fs.pathExists(dirPath))) {
      return { isEmpty: true, message: "Directory does not exist" };
    }

    const items = await fs.readdir(dirPath);
    const visibleItems = items.filter((item) => {
      // Filter out hidden files and system files
      return (
        !item.startsWith(".") &&
        !item.startsWith("$") &&
        item !== "Thumbs.db" &&
        item !== "desktop.ini"
      );
    });

    if (visibleItems.length === 0) {
      return { isEmpty: true, message: "Directory is empty" };
    }

    // Get details about the items
    const itemDetails = [];
    for (const item of visibleItems.slice(0, 10)) {
      // Limit to first 10 items
      try {
        const itemPath = path.join(dirPath, item);
        const stats = await fs.stat(itemPath);
        itemDetails.push({
          name: item,
          type: stats.isDirectory() ? "Directory" : "File",
          size: stats.isFile() ? stats.size : null,
        });
      } catch (error) {
        itemDetails.push({ name: item, type: "Unknown", size: null });
      }
    }

    return {
      isEmpty: false,
      message: `Directory contains ${visibleItems.length} item(s)`,
      itemCount: visibleItems.length,
      items: itemDetails,
      hasMore: visibleItems.length > 10,
    };
  } catch (error) {
    return {
      isEmpty: false,
      message: `Error checking directory: ${error.message}`,
    };
  }
};

// IPC handler for checking if directory is empty
ipcMain.handle("check-directory-empty", async (event, { directoryPath }) => {
  try {
    const result = await checkDirectoryEmpty(directoryPath);
    return { success: true, ...result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// IPC handler for backing up directory contents
ipcMain.handle("backup-directory-contents", async (event, { sourcePath }) => {
  try {
    const backupPath = path.join(
      path.dirname(sourcePath),
      `${path.basename(sourcePath)}_backup_${Date.now()}`
    );

    // Create backup directory
    await fs.ensureDir(backupPath);

    // Move all contents to backup
    const items = await fs.readdir(sourcePath);
    for (const item of items) {
      const sourceItemPath = path.join(sourcePath, item);
      const backupItemPath = path.join(backupPath, item);
      await fs.move(sourceItemPath, backupItemPath);
    }

    return {
      success: true,
      backupPath: backupPath,
      message: `Contents backed up to: ${backupPath}`,
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// IPC handler for clearing directory contents
ipcMain.handle("clear-directory-contents", async (event, { directoryPath }) => {
  try {
    const items = await fs.readdir(directoryPath);

    for (const item of items) {
      const itemPath = path.join(directoryPath, item);
      const stats = await fs.stat(itemPath);

      if (stats.isDirectory()) {
        await fs.remove(itemPath);
      } else {
        await fs.unlink(itemPath);
      }
    }

    return {
      success: true,
      message: `Cleared ${items.length} items from directory`,
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Auto-update: check for updates on app ready
app.on("ready", () => {
  autoUpdater.checkForUpdatesAndNotify();
});

// Notify renderer when update is available
autoUpdater.on("update-available", () => {
  BrowserWindow.getAllWindows()[0].webContents.send(
    "launcher-update-available"
  );
});

// Notify renderer and show dialog when update is downloaded
autoUpdater.on("update-downloaded", () => {
  BrowserWindow.getAllWindows()[0].webContents.send(
    "launcher-update-downloaded"
  );
  const { dialog } = require("electron");
  dialog
    .showMessageBox({
      type: "info",
      title: "Update Ready",
      message:
        "A new version of SPT Launcher has been downloaded. Restart to install?",
      buttons: ["Restart", "Later"],
    })
    .then((result) => {
      if (result.response === 0) {
        autoUpdater.quitAndInstall();
      }
    });
});

ipcMain.handle("get-launcher-version", () => {
  return app.getVersion();
});

ipcMain.handle("detect-current-spt-version", async () => {
  try {
    const version = await detectCurrentSPTVersion();
    return version;
  } catch (error) {
    return null;
  }
});
