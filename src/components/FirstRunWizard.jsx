import React, { useState, useEffect } from "react";

function FirstRunWizard({ onNext, styles, settings, saveSettings }) {
  const [step, setStep] = useState(1);
  const [detectedPath, setDetectedPath] = useState("");
  const [manualPath, setManualPath] = useState("");
  const [isValid, setIsValid] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const [serverPath, setServerPath] = useState("");
  const [clientDetectedPath, setClientDetectedPath] = useState("");
  const [clientManualPath, setClientManualPath] = useState("");
  const [clientIsValid, setClientIsValid] = useState(false);
  const [clientChecking, setClientChecking] = useState(false);
  const [clientError, setClientError] = useState("");
  const [installerLoading, setInstallerLoading] = useState(false);
  const [installerMessage, setInstallerMessage] = useState("");

  useEffect(() => {
    function onInstallerError(msg) {
      setInstallerMessage(msg);
    }
    if (window.electron && window.electron.ipcRenderer) {
      window.electron.ipcRenderer.on("installer-error", onInstallerError);
    }
    return () => {
      if (window.electron && window.electron.ipcRenderer) {
        window.electron.ipcRenderer.removeListener(
          "installer-error",
          onInstallerError
        );
      }
    };
  }, []);

  // Helper to check if a file exists
  const checkFileExists = async (filePath) => {
    if (!filePath) return false;
    try {
      const res = await window.electron?.ipcRenderer.invoke("validate-path", {
        path: filePath,
        type: "server",
      });
      return res && res.valid;
    } catch {
      return false;
    }
  };

  // Helper to trigger re-detection for the current step
  const triggerDetection = () => {
    if (step === 2) {
      setDetectedPath("");
      setManualPath("");
      setIsValid(false);
      setChecking(true);
      setError("");
      window.electron?.ipcRenderer
        .invoke("detect-spt-paths")
        .then(async (result) => {
          if (result && result.serverPath) {
            const exists = await checkFileExists(result.serverPath);
            if (exists) {
              setDetectedPath(result.serverPath);
              setManualPath(result.serverPath);
              setIsValid(true);
              // Immediately save detected serverPath to settings
              await saveSettings({
                ...settings,
                serverPath: result.serverPath,
              });
            } else {
              setDetectedPath("");
              setManualPath("");
              setIsValid(false);
            }
          } else {
            setDetectedPath("");
            setManualPath("");
            setIsValid(false);
          }
        })
        .catch(() => {
          setDetectedPath("");
          setManualPath("");
          setIsValid(false);
        })
        .finally(() => setChecking(false));
    } else if (step === 3) {
      setClientDetectedPath("");
      setClientManualPath("");
      setClientIsValid(false);
      setClientChecking(true);
      setClientError("");
      window.electron?.ipcRenderer
        .invoke("detect-spt-paths")
        .then(async (result) => {
          if (result && result.clientPath) {
            const res = await window.electron?.ipcRenderer.invoke(
              "validate-path",
              { path: result.clientPath, type: "client" }
            );
            if (res && res.valid) {
              setClientDetectedPath(result.clientPath);
              setClientManualPath(result.clientPath);
              setClientIsValid(true);
            } else {
              setClientDetectedPath("");
              setClientManualPath("");
              setClientIsValid(false);
            }
          } else {
            setClientDetectedPath("");
            setClientManualPath("");
            setClientIsValid(false);
          }
        })
        .catch(() => {
          setClientDetectedPath("");
          setClientManualPath("");
          setClientIsValid(false);
        })
        .finally(() => setClientChecking(false));
    }
  };

  // Helper to detect and update installed SPT-AKI version
  const detectAndUpdateVersion = async () => {
    try {
      const version = await window.electron?.ipcRenderer.invoke(
        "detect-current-spt-version"
      );
      if (version) {
        await saveSettings({ ...settings, lastInstallerVersion: version });
        setInstallerMessage(`Detected SPT-AKI version: ${version}`);
      }
    } catch (err) {
      // Optionally show an error
    }
  };

  // After running the installer, auto-refresh detection and version after a delay
  useEffect(() => {
    if (installerMessage && installerMessage.includes("launched")) {
      const timer = setTimeout(() => {
        triggerDetection();
        detectAndUpdateVersion();
      }, 12000); // 12 seconds after installer launches
      return () => clearTimeout(timer);
    }
  }, [installerMessage, step]);

  // Step 2: Try to auto-detect SPT-AKI server path
  useEffect(() => {
    if (step === 2) {
      setChecking(true);
      setError("");
      window.electron?.ipcRenderer
        .invoke("detect-spt-paths")
        .then(async (result) => {
          if (result && result.serverPath) {
            const exists = await checkFileExists(result.serverPath);
            if (exists) {
              setDetectedPath(result.serverPath);
              setManualPath(result.serverPath);
              setIsValid(true);
              // Immediately save detected serverPath to settings
              await saveSettings({
                ...settings,
                serverPath: result.serverPath,
              });
            } else {
              setDetectedPath("");
              setManualPath("");
              setIsValid(false);
            }
          } else {
            setDetectedPath("");
            setManualPath("");
            setIsValid(false);
          }
        })
        .catch(() => {
          setDetectedPath("");
          setManualPath("");
          setIsValid(false);
        })
        .finally(() => setChecking(false));
    }
  }, [step]);

  // Validate the selected server path
  useEffect(() => {
    if (step === 2 && manualPath) {
      setChecking(true);
      window.electron?.ipcRenderer
        .invoke("validate-path", { path: manualPath, type: "server" })
        .then((res) => {
          setIsValid(res?.valid);
          setError(res?.error || "");
        })
        .catch(() => setIsValid(false))
        .finally(() => setChecking(false));
    }
  }, [manualPath, step]);

  // Step 3: Try to auto-detect SPT-AKI client path
  useEffect(() => {
    if (step === 3) {
      setClientChecking(true);
      setClientError("");
      window.electron?.ipcRenderer
        .invoke("detect-spt-paths")
        .then(async (result) => {
          if (result && result.clientPath) {
            // Validate client path exists
            const res = await window.electron?.ipcRenderer.invoke(
              "validate-path",
              { path: result.clientPath, type: "client" }
            );
            if (res && res.valid) {
              setClientDetectedPath(result.clientPath);
              setClientManualPath(result.clientPath);
              setClientIsValid(true);
            } else {
              setClientDetectedPath("");
              setClientManualPath("");
              setClientIsValid(false);
            }
          } else {
            setClientDetectedPath("");
            setClientManualPath("");
            setClientIsValid(false);
          }
        })
        .catch(() => {
          setClientDetectedPath("");
          setClientManualPath("");
          setClientIsValid(false);
        })
        .finally(() => setClientChecking(false));
    }
  }, [step]);

  // Validate the selected client path
  useEffect(() => {
    if (step === 3 && clientManualPath) {
      setClientChecking(true);
      window.electron?.ipcRenderer
        .invoke("validate-path", { path: clientManualPath, type: "client" })
        .then((res) => {
          setClientIsValid(res?.valid);
          setClientError(res?.error || "");
        })
        .catch(() => setClientIsValid(false))
        .finally(() => setClientChecking(false));
    }
  }, [clientManualPath, step]);

  const handleBrowseServer = async () => {
    const path = await window.electron?.ipcRenderer.invoke("pick-server-exe");
    if (path) setManualPath(path);
  };

  const handleBrowseClient = async () => {
    const path = await window.electron?.ipcRenderer.invoke("pick-client-exe");
    if (path) setClientManualPath(path);
  };

  const handleRunInstaller = async () => {
    setInstallerLoading(true);
    setInstallerMessage("");
    try {
      const res = await window.electron?.ipcRenderer.invoke(
        "download-spt-installer"
      );
      if (res && res.success) {
        setInstallerMessage(
          "SPT-AKI Installer launched. Please follow the installer steps, then return here to continue setup."
        );
      } else {
        setInstallerMessage(
          res && res.error ? res.error : "Failed to launch installer."
        );
      }
    } catch (err) {
      setInstallerMessage("Failed to launch installer.");
    } finally {
      setInstallerLoading(false);
    }
  };

  if (step === 1) {
    return (
      <div className={styles.wizardOverlay}>
        <div className={styles.wizardContent}>
          <h2 className={styles.wizardTitle}>Welcome to SPT-AKI Launcher!</h2>
          <p className={styles.wizardText}>
            This setup wizard will help you configure the launcher for the best
            experience. You’ll only see this once.
          </p>
          <button className={styles.button} onClick={() => setStep(2)}>
            Next
          </button>
        </div>
      </div>
    );
  }

  if (step === 2) {
    const showInstallerOption = !detectedPath;
    return (
      <div className={styles.wizardOverlay}>
        <div className={styles.wizardContent}>
          <h2 className={styles.wizardTitle}>Step 2: Locate SPT-AKI Server</h2>
          <p className={styles.wizardText}>
            {detectedPath
              ? "We auto-detected your SPT-AKI server executable."
              : "We couldn't auto-detect your SPT-AKI server. Please select the server executable (Aki.Server.exe, SPT.Server.exe, or server.exe)."}
          </p>
          <div className={styles.pathDisplay}>
            <input
              className={styles.pathValue}
              type="text"
              value={manualPath}
              onChange={(e) => setManualPath(e.target.value)}
              placeholder="Path to SPT-AKI server executable"
              disabled={checking}
              style={{ width: "100%" }}
            />
            <button
              className={styles.pathButton}
              onClick={handleBrowseServer}
              disabled={checking}
            >
              Browse
            </button>
          </div>
          {error && <div className={styles.pathError}>{error}</div>}
          <div className={styles.wizardActions}>
            <button
              className={styles.button}
              onClick={triggerDetection}
              disabled={checking || installerLoading}
            >
              Refresh
            </button>
            <button
              className={styles.button}
              onClick={() => setStep(1)}
              disabled={checking}
            >
              Back
            </button>
            <button
              className={styles.button}
              onClick={async () => {
                setServerPath(manualPath);
                await saveSettings({ ...settings, serverPath: manualPath });
                setStep(3);
              }}
              disabled={!isValid || checking}
            >
              Next
            </button>
          </div>
          {showInstallerOption && (
            <div
              className={styles.wizardActions}
              style={{
                flexDirection: "column",
                alignItems: "flex-start",
                marginTop: 12,
              }}
            >
              <div
                style={{
                  marginBottom: 8,
                  color: styles.textSecondary || "#aaa",
                }}
              >
                Can’t find your SPT-AKI server? You can run the official
                installer:
              </div>
              <button
                className={styles.button}
                onClick={handleRunInstaller}
                disabled={installerLoading}
                style={{ marginBottom: 8 }}
              >
                {installerLoading
                  ? "Launching Installer..."
                  : "Run SPT-AKI Installer"}
              </button>
              {installerMessage && (
                <div style={{ color: "#4ade80", fontSize: "0.97rem" }}>
                  {installerMessage}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (step === 3) {
    const showInstallerOption = !clientDetectedPath;
    return (
      <div className={styles.wizardOverlay}>
        <div className={styles.wizardContent}>
          <h2 className={styles.wizardTitle}>Step 3: Locate SPT-AKI Client</h2>
          <p className={styles.wizardText}>
            {clientDetectedPath
              ? "We auto-detected your SPT-AKI client executable."
              : "We couldn't auto-detect your SPT-AKI client. Please select the client executable (SPT-Launcher.exe, spt.launcher.exe, or launcher.exe)."}
          </p>
          <div className={styles.pathDisplay}>
            <input
              className={styles.pathValue}
              type="text"
              value={clientManualPath}
              onChange={(e) => setClientManualPath(e.target.value)}
              placeholder="Path to SPT-AKI client executable"
              disabled={clientChecking}
              style={{ width: "100%" }}
            />
            <button
              className={styles.pathButton}
              onClick={handleBrowseClient}
              disabled={clientChecking}
            >
              Browse
            </button>
          </div>
          {clientError && <div className={styles.pathError}>{clientError}</div>}
          <div className={styles.wizardActions}>
            <button
              className={styles.button}
              onClick={triggerDetection}
              disabled={clientChecking || installerLoading}
            >
              Refresh
            </button>
            <button
              className={styles.button}
              onClick={() => setStep(2)}
              disabled={clientChecking}
            >
              Back
            </button>
            <button
              className={styles.button}
              onClick={() =>
                onNext({
                  serverPath: manualPath || serverPath,
                  clientPath: clientManualPath,
                })
              }
              disabled={!clientIsValid || clientChecking}
            >
              Finish
            </button>
          </div>
          {showInstallerOption && (
            <div
              className={styles.wizardActions}
              style={{
                flexDirection: "column",
                alignItems: "flex-start",
                marginTop: 12,
              }}
            >
              <div
                style={{
                  marginBottom: 8,
                  color: styles.textSecondary || "#aaa",
                }}
              >
                Can’t find your SPT-AKI client? You can run the official
                installer:
              </div>
              <button
                className={styles.button}
                onClick={handleRunInstaller}
                disabled={installerLoading}
                style={{ marginBottom: 8 }}
              >
                {installerLoading
                  ? "Launching Installer..."
                  : "Run SPT-AKI Installer"}
              </button>
              {installerMessage && (
                <div style={{ color: "#4ade80", fontSize: "0.97rem" }}>
                  {installerMessage}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}

export default FirstRunWizard;
