// spt-launcher/src/renderer.js
import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  Suspense,
} from "react";
import { createRoot } from "react-dom/client";
import styles from "./App.module.css";
import { ThemeProvider } from "./theme.js";

// Lazy load components to reduce initial bundle size
const ServerManager = React.lazy(
  () => import("./components/ServerManager.jsx")
);
const InstallationManager = React.lazy(
  () => import("./components/InstallationManager.jsx")
);
const ClientLauncher = React.lazy(
  () => import("./components/ClientLauncher.jsx")
);
const ProfileManager = React.lazy(
  () => import("./components/ProfileManager.jsx")
);
const SettingsManager = React.lazy(
  () => import("./components/SettingsManager.jsx")
);

// Preload PathDisplay component since it's used by multiple components
const PathDisplay = React.lazy(() => import("./components/PathDisplay.jsx"));
const ThemeToggle = React.lazy(() => import("./components/ThemeToggle.jsx"));
const ModManager = React.lazy(() => import("./components/ModManager.jsx"));

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className={styles.errorBoundary}>
          <h2>Something went wrong</h2>
          <p>Please restart the application or check the console for more details.</p>
          <button 
            onClick={() => window.location.reload()} 
            className={styles.button}
          >
            Reload Application
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Utility function for debouncing
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Performance monitoring utility
const measureComponentLoad = (componentName) => {
  const start = performance.now();
  return () => {
    const duration = performance.now() - start;
    console.log(
      `Performance: ${componentName} loaded in ${duration.toFixed(2)}ms`
    );
  };
};

function App() {
  const [downloadStatus, setDownloadStatus] = useState("");
  const [serverStatus, setServerStatus] = useState("");
  const [isServerRunning, setIsServerRunning] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("installation");
  const [serverLogs, setServerLogs] = useState([]);

  // Settings state
  const [settings, setSettings] = useState({
    serverPath: "",
    clientPath: "",
    downloadPath: "",
    lastUpdateCheck: null,
    lastInstallerVersion: null,
    autoUpdateEnabled: true,
  });

  // Memoize settings to prevent unnecessary re-renders
  const memoizedSettings = useMemo(() => settings, [
    settings.serverPath,
    settings.clientPath,
    settings.downloadPath,
    settings.lastUpdateCheck,
    settings.lastInstallerVersion,
    settings.autoUpdateEnabled,
  ]);
  const [pathValidation, setPathValidation] = useState({
    serverPath: { valid: false, error: "" },
    clientPath: { valid: false, error: "" },
  });

  // Update state
  const [updateInfo, setUpdateInfo] = useState(null);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [isDownloadingUpdate, setIsDownloadingUpdate] = useState(false);
  const [updateStatus, setUpdateStatus] = useState("");

  // Profile state
  const [profiles, setProfiles] = useState([]);
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(false);
  const [profileError, setProfileError] = useState("");

  // Load settings and detect paths on component mount
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Wait for electron API to be available with retry
        let retries = 0;
        while (!window.electron || !window.electron.ipcRenderer) {
          await new Promise(resolve => setTimeout(resolve, 50));
          retries++;
          if (retries > 20) { // 1 second timeout
            throw new Error("Electron IPC not available after timeout. Please restart the application.");
          }
        }
        
        

        // Load saved settings
        const savedSettings =
          await window.electron.ipcRenderer.invoke("load-settings");
        setSettings(savedSettings);

        // Auto-detect paths if not already set
        if (!savedSettings.serverPath || !savedSettings.clientPath) {
          const detectedPaths =
            await window.electron.ipcRenderer.invoke("detect-spt-paths");

          const newSettings = { ...savedSettings };
          if (!savedSettings.serverPath && detectedPaths.serverPath) {
            newSettings.serverPath = detectedPaths.serverPath;
          }
          if (!savedSettings.clientPath && detectedPaths.clientPath) {
            newSettings.clientPath = detectedPaths.clientPath;
          }

          if (
            newSettings.serverPath !== savedSettings.serverPath ||
            newSettings.clientPath !== savedSettings.clientPath
          ) {
            setSettings(newSettings);
            await window.electron.ipcRenderer.invoke(
              "save-settings",
              newSettings
            );
          }
        }

        // Validate existing paths
        await validatePaths(savedSettings);

        // Check server status
        const status = await window.electron.ipcRenderer.invoke(
          "check-server-status"
        );
        if (status.isRunning) {
          setIsServerRunning(true);
          setServerStatus("SPT-AKI Server is already running");
        } else {
          setServerStatus("SPT-AKI Server is not running");
        }

        // Check for updates if auto-update is enabled
        if (savedSettings.autoUpdateEnabled) {
          checkForUpdates();
        }
      } catch (error) {
        console.error("Error initializing app:", error);
        setServerStatus("Error checking server status");
      } finally {
        setIsLoading(false);
      }
    };

    initializeApp();
  }, []);

  // Update checking function
  const checkForUpdates = useCallback(async () => {
    setIsCheckingUpdate(true);
    setUpdateStatus("Checking for updates...");

    try {
      const result =
        await window.electron.ipcRenderer.invoke("check-for-updates");

      if (result.success) {
        setUpdateInfo(result);

        // Since we're using a simplified approach, always show as available
        setUpdateStatus("SPT-AKI Installer is available for download");

        // Update the last check time
        const newSettings = {
          ...settings,
          lastUpdateCheck: new Date().toISOString(),
        };
        await saveSettings(newSettings);
      } else {
        setUpdateStatus(`Error checking updates: ${result.error}`);
      }
    } catch (error) {
      setUpdateStatus(`Error checking updates: ${error.message}`);
    } finally {
      setIsCheckingUpdate(false);
    }
  }, [settings]);

  // Download update function
  const downloadUpdate = useCallback(async () => {
    let downloadPath = settings.downloadPath;

    // If no download path is set, ask user to select one
    if (!downloadPath) {
      downloadPath =
        await window.electron.ipcRenderer.invoke("pick-dest-folder");
      if (!downloadPath) return;

      // Save the selected download path
      const newSettings = { ...settings, downloadPath };
      await saveSettings(newSettings);
    }

    if (!updateInfo) {
      setUpdateStatus("Please check for updates first");
      return;
    }

    setIsDownloadingUpdate(true);
    setUpdateStatus("Downloading update...");

    try {
      const result = await window.electron.ipcRenderer.invoke(
        "download-update",
        {
          downloadUrl: updateInfo.downloadUrl,
          downloadPath: downloadPath,
        }
      );

      if (result.success) {
        setUpdateStatus("Update downloaded and launched!");

        // Update settings with new version
        const newSettings = {
          ...settings,
          lastInstallerVersion: updateInfo.latestVersion,
          lastUpdateCheck: new Date().toISOString(),
          downloadPath: downloadPath,
        };
        await saveSettings(newSettings);
      } else {
        setUpdateStatus(`Error downloading update: ${result.error}`);
      }
    } catch (error) {
      setUpdateStatus(`Error downloading update: ${error.message}`);
    } finally {
      setIsDownloadingUpdate(false);
    }
  }, [settings, updateInfo]);

  // Toggle auto-update function
  const toggleAutoUpdate = async (enabled) => {
    try {
      const result = await window.electron.ipcRenderer.invoke(
        "toggle-auto-update",
        { enabled }
      );
      if (result.success) {
        const newSettings = { ...settings, autoUpdateEnabled: enabled };
        setSettings(newSettings);
      }
    } catch (error) {
      console.error("Error toggling auto-update:", error);
    }
  };

  // Validate paths function
  const validatePaths = async (pathsToValidate) => {
    const validation = {};

    if (pathsToValidate.serverPath) {
      const serverValidation = await window.electron.ipcRenderer.invoke(
        "validate-path",
        {
          path: pathsToValidate.serverPath,
          type: "server",
        }
      );
      validation.serverPath = serverValidation;
    }

    if (pathsToValidate.clientPath) {
      const clientValidation = await window.electron.ipcRenderer.invoke(
        "validate-path",
        {
          path: pathsToValidate.clientPath,
          type: "client",
        }
      );
      validation.clientPath = clientValidation;
    }

    setPathValidation(validation);
  };

  // Save settings function
  const saveSettings = async (newSettings) => {
    try {
      const result = await window.electron.ipcRenderer.invoke(
        "save-settings",
        newSettings
      );
      if (result.success) {
        setSettings(newSettings);
        await validatePaths(newSettings);
      }
      return result;
    } catch (error) {
      console.error("Error saving settings:", error);
      return { success: false, error: error.message };
    }
  };

  // Load profiles function
  const loadProfiles = async () => {
    if (!settings.serverPath) {
      setProfiles([]);
      setProfileError(
        "No server path configured. Please set the server path in Settings."
      );
      return;
    }

    setIsLoadingProfiles(true);
    setProfileError("");

    try {
      const result = await window.electron.ipcRenderer.invoke("load-profiles", {
        serverPath: settings.serverPath,
      });

      if (result.success) {
        setProfiles(result.profiles);
      } else {
        setProfileError(result.error || "Failed to load profiles");
        setProfiles([]);
      }
    } catch (error) {
      setProfileError(`Error loading profiles: ${error.message}`);
      setProfiles([]);
    } finally {
      setIsLoadingProfiles(false);
    }
  };

  // Load profiles when profiles tab is active or settings change
  useEffect(() => {
    if (activeTab === "profiles") {
      loadProfiles();
    }
  }, [activeTab, settings.serverPath]);

  // Backup profile function
  const handleBackupProfile = async (profile) => {
    try {
      // Ask user to select backup destination
      const backupPath =
        await window.electron.ipcRenderer.invoke("pick-dest-folder");
      if (!backupPath) return;

      const result = await window.electron.ipcRenderer.invoke(
        "backup-profile",
        {
          profilePath: profile.path,
          backupPath: backupPath,
          profileName: profile.name,
        }
      );

      if (result.success) {
        setServerStatus(`Profile "${profile.name}" backed up successfully!`);
      } else {
        setServerStatus(`Error backing up profile: ${result.error}`);
      }
    } catch (error) {
      setServerStatus(`Error backing up profile: ${error.message}`);
    }
  };

  // Restore profile function
  const handleRestoreProfile = async (profile) => {
    try {
      // Ask user to select backup file to restore
      const backupFile =
        await window.electron.ipcRenderer.invoke("pick-backup-file");
      if (!backupFile) return;

      // Confirm restoration
      const confirmed = confirm(
        `Are you sure you want to restore profile "${profile.name}"?\n\nThis will overwrite the current profile data.`
      );

      if (!confirmed) return;

      const result = await window.electron.ipcRenderer.invoke(
        "restore-profile",
        {
          profilePath: profile.path,
          backupFile: backupFile,
        }
      );

      if (result.success) {
        setServerStatus(`Profile "${profile.name}" restored successfully!`);
        // Reload profiles to show updated data
        loadProfiles();
      } else {
        setServerStatus(`Error restoring profile: ${result.error}`);
      }
    } catch (error) {
      setServerStatus(`Error restoring profile: ${error.message}`);
    }
  };

  // Listen for server log updates
  useEffect(() => {
    const handleServerLog = (log) => {
      setServerLogs((prev) => [
        ...prev,
        { timestamp: new Date().toLocaleTimeString(), message: log },
      ]);
    };

    
    // Check if electron API is available before setting up listeners
    if (window.electron && window.electron.ipcRenderer) {
      window.electron.ipcRenderer.on("server-log", handleServerLog);
      window.electron.ipcRenderer.on("server-error", handleServerLog);

      return () => {
        window.electron.ipcRenderer.removeListener("server-log", handleServerLog);
        window.electron.ipcRenderer.removeListener(
          "server-error",
          handleServerLog
        );
      };
    } else {
      console.error("Electron IPC not available for listeners");
    }
  }, []);

  // Auto-scroll to bottom when logs update
  useEffect(() => {
    const logWindow = document.querySelector(`.${styles.logWindow}`);
    if (logWindow) {
      logWindow.scrollTop = logWindow.scrollHeight;
    }
  }, [serverLogs]);

  const handleDownloadSPT = async () => {
    // Ask user for the download location
    const downloadPath =
      await window.electron.ipcRenderer.invoke("pick-dest-folder");
    if (!downloadPath) return;
    setDownloadStatus("Downloading SPT-AKI Installer...");
    const res = await window.electron.ipcRenderer.invoke(
      "download-spt-installer",
      { downloadPath }
    );
    setDownloadStatus(
      res.success
        ? "SPT-AKI Installer downloaded and launched!"
        : `Error: ${res.error}`
    );
  };

  const handleStartServer = async () => {
    let serverPath = settings.serverPath;

    // If no saved path, ask user to select
    if (!serverPath) {
      serverPath = await window.electron.ipcRenderer.invoke("pick-server-exe");
      if (!serverPath) return;

      // Save the selected path
      const newSettings = { ...settings, serverPath };
      await saveSettings(newSettings);
    }

    // Check if port 6969 is already in use
    setServerStatus("Checking port availability...");
    const portCheck =
      await window.electron.ipcRenderer.invoke("check-port-6969");

    if (portCheck.inUse) {
      setServerStatus(
        `Port 6969 is already in use! Process IDs: ${portCheck.processIds.join(
          ", "
        )}`
      );

      // Ask user if they want to force kill the processes
      if (
        confirm(
          `Port 6969 is already in use by process(es): ${portCheck.processIds.join(
            ", "
          )}\n\nWould you like to force kill these processes to free up the port?`
        )
      ) {
        setServerStatus("Killing processes using port 6969...");

        // Kill each process
        for (const pid of portCheck.processIds) {
          const killResult = await window.electron.ipcRenderer.invoke(
            "kill-process-by-pid",
            { pid }
          );
          if (!killResult.success) {
            setServerStatus(
              `Failed to kill process ${pid}: ${killResult.error}`
            );
            return;
          }
        }

        setServerStatus("Processes killed. Waiting for port to be freed...");
        // Wait a moment for the port to be freed
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } else {
        setServerStatus(
          "Cannot start server - port 6969 is in use. Please stop the existing server first."
        );
        return;
      }
    }

    setServerStatus("Starting SPT-AKI Server...");
    setServerLogs([]); // Clear previous logs
    const res = await window.electron.ipcRenderer.invoke("start-spt-server", {
      serverPath,
    });
    if (res.success) {
      setServerStatus("SPT-AKI Server started!");
      setIsServerRunning(true);
    } else {
      setServerStatus(`Error: ${res.error}`);
    }
  };

  const handleStopServer = async () => {
    setServerStatus("Stopping SPT-AKI Server...");
    const res = await window.electron.ipcRenderer.invoke("stop-spt-server");
    if (res.success) {
      setServerStatus("SPT-AKI Server stopped!");
      setIsServerRunning(false);
    } else {
      setServerStatus(`Error: ${res.error}`);
    }
  };

  const clearLogs = () => {
    setServerLogs([]);
  };

  const checkPortStatus = async () => {
    setServerStatus("Checking port 6969...");
    const portCheck =
      await window.electron.ipcRenderer.invoke("check-port-6969");

    if (portCheck.inUse) {
      setServerStatus(
        `Port 6969 is in use by process(es): ${portCheck.processIds.join(", ")}`
      );
    } else {
      setServerStatus("Port 6969 is available");
    }
  };

  const handleLaunchClient = async () => {
    let clientPath = settings.clientPath;

    // If no saved path, ask user to select
    if (!clientPath) {
      clientPath = await window.electron.ipcRenderer.invoke("pick-client-exe");
      if (!clientPath) return;

      // Save the selected path
      const newSettings = { ...settings, clientPath };
      await saveSettings(newSettings);
    }

    setServerStatus("Launching SPT-AKI Launcher...");
    const res = await window.electron.ipcRenderer.invoke("launch-spt-client", {
      clientPath,
    });

    if (res.success) {
      setServerStatus("SPT-AKI Launcher launched!");
    } else {
      setServerStatus(`Error: ${res.error}`);
    }
  };

  // Path selection handlers
  const handleSelectServerPath = async () => {
    const serverPath =
      await window.electron.ipcRenderer.invoke("pick-server-exe");
    if (serverPath) {
      const newSettings = { ...settings, serverPath };
      await saveSettings(newSettings);
    }
  };

  const handleSelectClientPath = async () => {
    const clientPath =
      await window.electron.ipcRenderer.invoke("pick-client-exe");
    if (clientPath) {
      const newSettings = { ...settings, clientPath };
      await saveSettings(newSettings);
    }
  };

  const handleSelectDownloadPath = async () => {
    const downloadPath =
      await window.electron.ipcRenderer.invoke("pick-dest-folder");
    if (downloadPath) {
      const newSettings = { ...settings, downloadPath };
      await saveSettings(newSettings);
    }
  };

  const handleAutoDetectPaths = async () => {
    const detectedPaths =
      await window.electron.ipcRenderer.invoke("detect-spt-paths");
    const newSettings = { ...settings };

    if (detectedPaths.serverPath) {
      newSettings.serverPath = detectedPaths.serverPath;
    }
    if (detectedPaths.clientPath) {
      newSettings.clientPath = detectedPaths.clientPath;
    }

    await saveSettings(newSettings);
  };

  const getStatusClass = useCallback((status) => {
    if (!status) return "";
    if (status.includes("Error")) return styles.error;
    if (
      status.includes("downloaded") ||
      status.includes("started") ||
      status.includes("already running")
    )
      return styles.success;
    return "";
  }, []);

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>SPT-AKI Launcher</h1>
          <p className={styles.subtitle}>Single Player Tarkov - AKI Launcher</p>
        </div>
        <div className={styles.content}>
          <div className={styles.section}>
            <div className={styles.status}>Checking server status...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.titleBar}>
        <div className={styles.titleBarContent}>
          <span>SPT-AKI Launcher</span>
        </div>
        <div className={styles.windowControls}>
          <Suspense fallback={<div>...</div>}>
            <ThemeToggle />
          </Suspense>
          <button
            className={styles.windowControl}
            onClick={() => window.electron?.windowControls?.minimize?.()}
            title="Minimize"
          >
            ─
          </button>
          <button
            className={styles.windowControl}
            onClick={() => window.electron?.windowControls?.maximize?.()}
            title="Maximize"
          >
            □
          </button>
          <button
            className={`${styles.windowControl} ${styles.close}`}
            onClick={() => window.electron?.windowControls?.close?.()}
            title="Close"
          >
            ×
          </button>
        </div>
      </div>

      <div className={styles.appWrapper}>
        <div className={styles.header}>
          <h1 className={styles.title}>SPT-AKI Launcher</h1>
          <p className={styles.subtitle}>Single Player Tarkov - AKI Launcher</p>
        </div>

        <div className={styles.content}>
          <div className={styles.tabContainer}>
            <button
              className={`${styles.tab} ${
                activeTab === "installation" ? styles.activeTab : ""
              }`}
              onClick={() => setActiveTab("installation")}
            >
              Installation
            </button>
            <button
              className={`${styles.tab} ${
                activeTab === "server" ? styles.activeTab : ""
              }`}
              onClick={() => setActiveTab("server")}
            >
              Server Management
            </button>
            <button
              className={`${styles.tab} ${
                activeTab === "client" ? styles.activeTab : ""
              }`}
              onClick={() => setActiveTab("client")}
            >
              Client Launcher
            </button>
            <button
              className={`${styles.tab} ${
                activeTab === "profiles" ? styles.activeTab : ""
              }`}
              onClick={() => setActiveTab("profiles")}
            >
              Profiles
            </button>
            <button
              className={`${styles.tab} ${
                activeTab === "mods" ? styles.activeTab : ""
              }`}
              onClick={() => setActiveTab("mods")}
            >
              Mods
            </button>
            <button
              className={`${styles.tab} ${
                activeTab === "settings" ? styles.activeTab : ""
              }`}
              onClick={() => setActiveTab("settings")}
            >
              Settings
            </button>
          </div>

          {activeTab === "installation" && (
            <Suspense
              fallback={
                <div className={styles.loading}>
                  Loading Installation Manager...
                </div>
              }
            >
              <InstallationManager
                updateStatus={updateStatus}
                updateInfo={updateInfo}
                isCheckingUpdate={isCheckingUpdate}
                isDownloadingUpdate={isDownloadingUpdate}
                downloadStatus={downloadStatus}
                styles={styles}
                checkForUpdates={checkForUpdates}
                downloadUpdate={downloadUpdate}
                handleDownloadSPT={handleDownloadSPT}
                getStatusClass={getStatusClass}
              />
            </Suspense>
          )}

          {activeTab === "server" && (
            <Suspense
              fallback={
                <div className={styles.loading}>Loading Server Manager...</div>
              }
            >
              <ServerManager
                settings={memoizedSettings}
                pathValidation={pathValidation}
                isServerRunning={isServerRunning}
                serverStatus={serverStatus}
                serverLogs={serverLogs}
                styles={styles}
                handleSelectServerPath={handleSelectServerPath}
                handleStartServer={handleStartServer}
                handleStopServer={handleStopServer}
                checkPortStatus={checkPortStatus}
                clearLogs={clearLogs}
                getStatusClass={getStatusClass}
              />
            </Suspense>
          )}

          {activeTab === "client" && (
            <Suspense
              fallback={
                <div className={styles.loading}>Loading Client Launcher...</div>
              }
            >
              <ClientLauncher
                settings={memoizedSettings}
                pathValidation={pathValidation}
                serverStatus={serverStatus}
                styles={styles}
                handleSelectClientPath={handleSelectClientPath}
                handleLaunchClient={handleLaunchClient}
                getStatusClass={getStatusClass}
              />
            </Suspense>
          )}

          {activeTab === "profiles" && (
            <Suspense
              fallback={
                <div className={styles.loading}>Loading Profile Manager...</div>
              }
            >
              <ProfileManager
                profiles={profiles}
                isLoadingProfiles={isLoadingProfiles}
                profileError={profileError}
                settings={memoizedSettings}
                styles={styles}
                handleBackupProfile={handleBackupProfile}
                handleRestoreProfile={handleRestoreProfile}
              />
            </Suspense>
          )}

          {activeTab === "mods" && (
            <Suspense
              fallback={
                <div className={styles.loading}>Loading Mod Manager...</div>
              }
            >
              <ModManager styles={styles} />
            </Suspense>
          )}

          {activeTab === "settings" && (
            <Suspense
              fallback={
                <div className={styles.loading}>
                  Loading Settings Manager...
                </div>
              }
            >
              <SettingsManager
                settings={memoizedSettings}
                pathValidation={pathValidation}
                styles={styles}
                handleSelectServerPath={handleSelectServerPath}
                handleSelectClientPath={handleSelectClientPath}
                handleSelectDownloadPath={handleSelectDownloadPath}
                handleAutoDetectPaths={handleAutoDetectPaths}
                toggleAutoUpdate={toggleAutoUpdate}
              />
            </Suspense>
          )}
        </div>
      </div>
    </div>
  );
}

const container = document.getElementById("root");
const root = createRoot(container);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
export default App;
