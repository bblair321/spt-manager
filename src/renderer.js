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
    setServerStatus("Starting SPT-AKI Server...");
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
            </div>
            {serverStatus && (
              <div
                className={`${styles.status} ${getStatusClass(serverStatus)}`}
              >
                {serverStatus}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const container = document.getElementById("root");
const root = createRoot(container);
root.render(<App />);
export default App;
