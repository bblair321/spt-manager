import React from "react";

function SettingsManager({
  settings,
  pathValidation,
  styles,
  handleSelectServerPath,
  handleSelectClientPath,
  handleSelectDownloadPath,
  handleAutoDetectPaths,
  toggleAutoUpdate
}) {
  return (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>Settings</h2>

      <div className={styles.settingsSection}>
        <h3 className={styles.settingsSubtitle}>Path Configuration</h3>

        <div className={styles.pathDisplay}>
          <div className={styles.pathLabel}>Server Executable:</div>
          <div className={styles.pathValue}>
            {settings.serverPath ? (
              <>
                <span
                  className={
                    pathValidation.serverPath?.valid
                      ? styles.validPath
                      : styles.invalidPath
                  }
                >
                  {settings.serverPath}
                </span>
                {pathValidation.serverPath?.error && (
                  <div className={styles.pathError}>
                    {pathValidation.serverPath.error}
                  </div>
                )}
              </>
            ) : (
              <span className={styles.noPath}>No server executable set</span>
            )}
          </div>
          <button
            className={styles.pathButton}
            onClick={handleSelectServerPath}
          >
            Browse
          </button>
        </div>

        <div className={styles.pathDisplay}>
          <div className={styles.pathLabel}>Client Launcher:</div>
          <div className={styles.pathValue}>
            {settings.clientPath ? (
              <>
                <span
                  className={
                    pathValidation.clientPath?.valid
                      ? styles.validPath
                      : styles.invalidPath
                  }
                >
                  {settings.clientPath}
                </span>
                {pathValidation.clientPath?.error && (
                  <div className={styles.pathError}>
                    {pathValidation.clientPath.error}
                  </div>
                )}
              </>
            ) : (
              <span className={styles.noPath}>No client launcher set</span>
            )}
          </div>
          <button
            className={styles.pathButton}
            onClick={handleSelectClientPath}
          >
            Browse
          </button>
        </div>

        <div className={styles.pathDisplay}>
          <div className={styles.pathLabel}>Download Path:</div>
          <div className={styles.pathValue}>
            {settings.downloadPath ? (
              <span className={styles.validPath}>{settings.downloadPath}</span>
            ) : (
              <span className={styles.noPath}>No download path set</span>
            )}
          </div>
          <button
            className={styles.pathButton}
            onClick={handleSelectDownloadPath}
          >
            📁 Browse
          </button>
        </div>

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
              checked={settings.autoUpdateEnabled}
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
            <strong>Current Version:</strong>{" "}
            {settings.lastInstallerVersion}
          </div>
        )}
      </div>
    </div>
  );
}

export default SettingsManager; 