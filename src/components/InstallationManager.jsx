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

          {updateInfo && updateInfo.isUpdateAvailable && (
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
              <strong>Current Version:</strong> {updateInfo.currentVersion}
            </div>
            <div className={styles.updateDetails}>
              <strong>Latest Version:</strong> {updateInfo.latestVersion}
            </div>
            {updateInfo.isUpdateAvailable && (
              <div className={styles.updateDetails} style={{ color: "#FF9800", fontWeight: "bold" }}>
                ⚠️ Update Available
              </div>
            )}
            {!updateInfo.isUpdateAvailable && (
              <div className={styles.updateDetails} style={{ color: "#4CAF50", fontWeight: "bold" }}>
                ✅ Up to Date
              </div>
            )}
            
            {/* Directory Status Section */}
            {updateInfo.isUpdateAvailable && updateInfo.directoryStatus && (
              <div className={styles.directoryStatusSection}>
                <div className={styles.updateDetails}>
                  <strong>Installation Directory Status:</strong>
                </div>
                {updateInfo.directoryStatus.isEmpty ? (
                  <div className={styles.updateDetails} style={{ color: "#4CAF50", fontWeight: "bold" }}>
                    ✅ Directory is ready for installation
                  </div>
                ) : (
                  <div className={styles.updateDetails} style={{ color: "#FF5722", fontWeight: "bold" }}>
                    ⚠️ Directory contains {updateInfo.directoryStatus.itemCount} item(s)
                  </div>
                )}
                
                {!updateInfo.directoryStatus.isEmpty && updateInfo.directoryStatus.items && (
                  <div className={styles.directoryContents}>
                    <div className={styles.updateDetails}>
                      <strong>Directory Contents:</strong>
                    </div>
                    <div className={styles.itemList}>
                      {updateInfo.directoryStatus.items.slice(0, 5).map((item, index) => (
                        <div key={index} className={styles.itemRow}>
                          <span className={styles.itemName}>{item.name}</span>
                          <span className={styles.itemType}>{item.type}</span>
                          {item.size !== null && (
                            <span className={styles.itemSize}>
                              {(item.size / 1024 / 1024).toFixed(1)} MB
                            </span>
                          )}
                        </div>
                      ))}
                      {updateInfo.directoryStatus.hasMore && (
                        <div className={styles.moreItems}>
                          ... and {updateInfo.directoryStatus.itemCount - 5} more items
                        </div>
                      )}
                    </div>
                    <div className={styles.updateDetails} style={{ color: "#FF9800", fontSize: "0.9rem", marginTop: "8px" }}>
                      💡 Use "Download SPT-AKI Installer" to backup or clear the directory before installing
                    </div>
                  </div>
                )}
              </div>
            )}
            
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
            {updateInfo.hoursSinceLastCheck !== null && (
              <div className={styles.updateDetails}>
                <strong>Last Check:</strong>{" "}
                {updateInfo.hoursSinceLastCheck === 0 
                  ? "Just now" 
                  : `${updateInfo.hoursSinceLastCheck} hour${updateInfo.hoursSinceLastCheck !== 1 ? 's' : ''} ago`
                }
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
