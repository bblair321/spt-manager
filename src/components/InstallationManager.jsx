import React from "react";

function InstallationManager({
  updateStatus,
  updateInfo,
  isCheckingUpdate,
  isDownloadingUpdate,
  downloadStatus,
  styles,
  checkForUpdates,
  downloadUpdate,
  handleDownloadSPT,
  getStatusClass,
}) {
  return (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>Installation</h2>

      {/* Update Status */}
      <div className={styles.updateSection}>
        <h3 className={styles.settingsSubtitle}>SPT-AKI Installer Updates</h3>
        <div className={styles.updateStatus}>
          {updateStatus ||
            "Check for updates to get the latest SPT-AKI installer"}
        </div>

        <div className={styles.buttonGroup}>
          <button
            className={styles.button}
            onClick={checkForUpdates}
            disabled={isCheckingUpdate}
          >
            {isCheckingUpdate ? "Checking..." : "Check for Updates"}
          </button>

          {updateInfo && updateInfo.latestVersion && (
            <button
              className={styles.button}
              onClick={downloadUpdate}
              disabled={isDownloadingUpdate}
            >
              {isDownloadingUpdate ? "Downloading..." : "Download Update"}
            </button>
          )}
        </div>

        {updateInfo && (
          <div className={styles.updateInfo}>
            <div className={styles.updateDetails}>
              <strong>Status:</strong> {updateInfo.latestVersion}
            </div>
            {updateInfo.fileSize && (
              <div className={styles.updateDetails}>
                <strong>File Size:</strong>{" "}
                {(updateInfo.fileSize / 1024 / 1024).toFixed(1)} MB
              </div>
            )}
            {updateInfo.publishedAt && (
              <div className={styles.updateDetails}>
                <strong>Last Updated:</strong>{" "}
                {new Date(updateInfo.publishedAt).toLocaleDateString()}
              </div>
            )}
            {updateInfo.releaseNotes && (
              <div className={styles.releaseNotes}>
                <strong>Info:</strong>
                <div className={styles.notesContent}>
                  {updateInfo.releaseNotes}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Manual Download */}
      <div className={styles.manualDownloadSection}>
        <h3 className={styles.settingsSubtitle}>Manual Download</h3>
        <button className={styles.button} onClick={handleDownloadSPT}>
          Download SPT-AKI Installer
        </button>
        {downloadStatus && (
          <div className={`${styles.status} ${getStatusClass(downloadStatus)}`}>
            {downloadStatus}
          </div>
        )}
      </div>
    </div>
  );
}

export default InstallationManager;
