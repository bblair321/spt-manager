// spt-launcher/src/renderer.js
import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import styles from "./App.module.css";

function App() {
  const [downloadStatus, setDownloadStatus] = useState("");
  const [serverStatus, setServerStatus] = useState("");
  const [isServerRunning, setIsServerRunning] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("installation");
  const [serverLogs, setServerLogs] = useState([]);

  // Check server status when component mounts
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const status = await window.electron.ipcRenderer.invoke(
          "check-server-status"
        );
        if (status.isRunning) {
          setIsServerRunning(true);
          setServerStatus("SPT-AKI Server is already running");
        } else {
          setServerStatus("SPT-AKI Server is not running");
        }
      } catch (error) {
        setServerStatus("Error checking server status");
      } finally {
        setIsLoading(false);
      }
    };

    checkStatus();
  }, []);

  // Listen for server log updates
  useEffect(() => {
    const handleServerLog = (log) => {
      console.log("Received server log:", log);
      setServerLogs((prev) => [
        ...prev,
        { timestamp: new Date().toLocaleTimeString(), message: log },
      ]);
    };

    console.log("Setting up IPC listeners...");
    window.electron.ipcRenderer.on("server-log", handleServerLog);
    window.electron.ipcRenderer.on("server-error", handleServerLog);
    console.log("IPC listeners set up");

    return () => {
      window.electron.ipcRenderer.removeListener("server-log", handleServerLog);
      window.electron.ipcRenderer.removeListener(
        "server-error",
        handleServerLog
      );
    };
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
    const downloadPath = await window.electron.ipcRenderer.invoke(
      "pick-dest-folder"
    );
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
    // Ask user to select their SPT-AKI server folder (the folder containing Aki.Server.exe)
    const serverPath = await window.electron.ipcRenderer.invoke("pick-folder");
    if (!serverPath) return;

    // Check if port 6969 is already in use
    setServerStatus("Checking port availability...");
    const portCheck = await window.electron.ipcRenderer.invoke(
      "check-port-6969"
    );

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
    const portCheck = await window.electron.ipcRenderer.invoke(
      "check-port-6969"
    );

    if (portCheck.inUse) {
      setServerStatus(
        `Port 6969 is in use by process(es): ${portCheck.processIds.join(", ")}`
      );
    } else {
      setServerStatus("Port 6969 is available");
    }
  };

  const getStatusClass = (status) => {
    if (!status) return "";
    if (status.includes("Error")) return styles.error;
    if (
      status.includes("downloaded") ||
      status.includes("started") ||
      status.includes("already running")
    )
      return styles.success;
    return "";
  };

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
            📥 Installation
          </button>
          <button
            className={`${styles.tab} ${
              activeTab === "server" ? styles.activeTab : ""
            }`}
            onClick={() => setActiveTab("server")}
          >
            🚀 Server Management
          </button>
        </div>

        {activeTab === "installation" && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Installation</h2>
            <button className={styles.button} onClick={handleDownloadSPT}>
              📥 Download SPT-AKI Installer
            </button>
            {downloadStatus && (
              <div
                className={`${styles.status} ${getStatusClass(downloadStatus)}`}
              >
                {downloadStatus}
              </div>
            )}
          </div>
        )}

        {activeTab === "server" && (
          <>
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Server Management</h2>
              <div className={styles.buttonGroup}>
                <button
                  className={`${styles.button} ${
                    isServerRunning ? styles.buttonDisabled : ""
                  }`}
                  onClick={handleStartServer}
                  disabled={isServerRunning}
                >
                  🚀 Start SPT-AKI Server
                </button>
                <button
                  className={`${styles.button} ${styles.buttonStop} ${
                    !isServerRunning ? styles.buttonDisabled : ""
                  }`}
                  onClick={handleStopServer}
                  disabled={!isServerRunning}
                >
                  ⏹️ Stop SPT-AKI Server
                </button>
                <button className={styles.button} onClick={checkPortStatus}>
                  🔍 Check Port 6969
                </button>
              </div>
              {serverStatus && (
                <div
                  className={`${styles.status} ${getStatusClass(serverStatus)}`}
                >
                  {serverStatus}
                </div>
              )}
            </div>

            <div className={styles.section}>
              <div className={styles.logHeader}>
                <h2 className={styles.sectionTitle}>Server Logs</h2>
                <button className={styles.clearButton} onClick={clearLogs}>
                  🗑️ Clear Logs
                </button>
              </div>
              <div className={styles.logWindow}>
                {serverLogs.length === 0 ? (
                  <div className={styles.noLogs}>
                    No server logs yet. Start the server to see output.
                  </div>
                ) : (
                  serverLogs.map((log, index) => (
                    <div key={index} className={styles.logEntry}>
                      <span className={styles.logTimestamp}>
                        [{log.timestamp}]
                      </span>
                      <span className={styles.logMessage}>{log.message}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const container = document.getElementById("root");
const root = createRoot(container);
root.render(<App />);
export default App;
