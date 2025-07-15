import React from "react";
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
        </div>
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
