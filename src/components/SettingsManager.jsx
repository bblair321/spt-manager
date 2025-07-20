import React, { useState } from "react";
import PathDisplay from "./PathDisplay.jsx";

function SettingsManager({
  settings,
  pathValidation,
  styles,
  handleSelectServerPath,
  handleSelectClientPath,
  handleSelectDownloadPath,
  handleAutoDetectPaths,
  toggleAutoUpdate,
}) {
  const [detectionDetails, setDetectionDetails] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  const handleAutoDetectWithDetails = async () => {
    try {
      const details = await window.electron.ipcRenderer.invoke(
        "get-path-detection-details"
      );
      setDetectionDetails(details);
      setShowDetails(true);
    } catch (error) {
      console.error("Error getting detection details:", error);
    }
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 80) return "#4CAF50"; // Green
    if (confidence >= 50) return "#FF9800"; // Orange
    return "#F44336"; // Red
  };

  const getConfidenceText = (confidence) => {
    if (confidence >= 80) return "High";
    if (confidence >= 50) return "Moderate";
    return "Low";
  };

  return (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>Settings</h2>

      <div className={styles.settingsSection}>
        <h3 className={styles.settingsSubtitle}>Path Configuration</h3>

        <PathDisplay
          label="Server Executable:"
          value={settings.serverPath}
          isValid={pathValidation.serverPath?.valid}
          error={pathValidation.serverPath?.error}
          onBrowse={handleSelectServerPath}
          styles={styles}
        />
        <PathDisplay
          label="Client Launcher:"
          value={settings.clientPath}
          isValid={pathValidation.clientPath?.valid}
          error={pathValidation.clientPath?.error}
          onBrowse={handleSelectClientPath}
          styles={styles}
        />
        <PathDisplay
          label="Download Path:"
          value={settings.downloadPath}
          isValid={true}
          onBrowse={handleSelectDownloadPath}
          browseLabel="📁 Browse"
          styles={styles}
        />

        <div className={styles.buttonGroup}>
          <button className={styles.button} onClick={handleAutoDetectPaths}>
            🔍 Auto-Detect Paths
          </button>
          <button
            className={`${styles.button} ${styles.buttonSecondary}`}
            onClick={handleAutoDetectWithDetails}
          >
            📊 Detection Details
          </button>
        </div>

        {/* Detection Details Panel */}
        {showDetails && detectionDetails && (
          <div
            style={{
              marginTop: "20px",
              padding: "15px",
              backgroundColor: "var(--bg-secondary)",
              borderRadius: "8px",
              border: "1px solid var(--border-primary)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "10px",
              }}
            >
              <h4 style={{ margin: 0, color: "var(--text-primary)" }}>
                Path Detection Results
              </h4>
              <button
                onClick={() => setShowDetails(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                  fontSize: "18px",
                }}
              >
                ×
              </button>
            </div>

            <div style={{ marginBottom: "15px" }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginBottom: "5px"
              }}>
                <span style={{ color: "var(--text-secondary)" }}>Confidence:</span>
                <span style={{
                  color: getConfidenceColor(detectionDetails.confidence),
                  fontWeight: "bold"
                }}>
                  {getConfidenceText(detectionDetails.confidence)} ({detectionDetails.confidence}%)
                </span>
              </div>
              
              <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                Detected at: {new Date(detectionDetails.timestamp).toLocaleString()}
              </div>
              
              {/* Show found executables */}
              {detectionDetails.paths.serverPath && (
                <div style={{ marginTop: "10px", fontSize: "12px" }}>
                  <span style={{ color: "var(--text-secondary)" }}>Server: </span>
                  <span style={{ color: "#4CAF50", fontWeight: "bold" }}>
                    {detectionDetails.paths.serverPath}
                  </span>
                </div>
              )}
              
              {detectionDetails.paths.clientPath && (
                <div style={{ fontSize: "12px" }}>
                  <span style={{ color: "var(--text-secondary)" }}>Client: </span>
                  <span style={{ color: "#4CAF50", fontWeight: "bold" }}>
                    {detectionDetails.paths.clientPath}
                  </span>
                </div>
              )}
              
              {!detectionDetails.paths.serverPath && !detectionDetails.paths.clientPath && (
                <div style={{ marginTop: "10px", fontSize: "12px", color: "#F44336" }}>
                  No SPT executables found. Please check the search results below.
                </div>
              )}
            </div>

            <div style={{ marginBottom: "10px" }}>
              <strong style={{ color: "var(--text-primary)" }}>
                Search Summary:
              </strong>
            </div>

            <div
              style={{
                fontSize: "12px",
                color: "var(--text-secondary)",
                maxHeight: "200px",
                overflowY: "auto",
                backgroundColor: "var(--bg-primary)",
                padding: "10px",
                borderRadius: "4px",
              }}
            >
              {detectionDetails.searchResults.map((result, index) => (
                <div key={index} style={{ marginBottom: "5px" }}>
                  <span style={{ fontWeight: "bold" }}>{result.type}:</span>{" "}
                  {result.path ||
                    result.process ||
                    result.file ||
                    result.message}
                  {result.depth && ` (depth: ${result.depth})`}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className={styles.settingsSection}>
        <h3 className={styles.settingsSubtitle}>Auto-Update Settings</h3>
        <div className={styles.autoUpdateToggle}>
          <label>
            <input
              type="checkbox"
              checked={!!settings.autoUpdateEnabled}
              onChange={(e) => toggleAutoUpdate(e.target.checked)}
            />
            Enable automatic update checking on startup
          </label>
        </div>
        {settings.lastUpdateCheck && (
          <div className={styles.updateDetails}>
            <strong>Last Check:</strong>{" "}
            {new Date(settings.lastUpdateCheck).toLocaleString()}
          </div>
        )}
        {settings.lastInstallerVersion && (
          <div className={styles.updateDetails}>
            <strong>Current Version:</strong> {settings.lastInstallerVersion}
          </div>
        )}
      </div>
    </div>
  );
}

export default SettingsManager;
