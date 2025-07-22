import React from "react";

function InstallationManager({
  downloadStatus,
  styles,
  handleDownloadSPT,
  getStatusClass,
}) {
  return (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>Installation</h2>
      {/* Only keep SPT-AKI installation logic and UI here. Remove update check UI. */}
      <div className={styles.updateSection}>
        <h3 className={styles.settingsSubtitle}>SPT-AKI Installer</h3>
        <div className={styles.updateStatus}>{downloadStatus}</div>
        <div className={styles.buttonGroup}>
          <button
            className={styles.button}
            onClick={handleDownloadSPT}
          >
            Download SPT-AKI Installer
          </button>
        </div>
      </div>
    </div>
  );
}

export default InstallationManager;
