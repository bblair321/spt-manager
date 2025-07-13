import React from "react";
import PathDisplay from "./PathDisplay.jsx";

function ClientLauncher({
  settings,
  pathValidation,
  serverStatus,
  styles,
  handleSelectClientPath,
  handleLaunchClient,
  getStatusClass,
}) {
  return (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>Client Launcher</h2>

      {/* Client Path Display */}
      <PathDisplay
        label="Client Launcher:"
        value={settings.clientPath}
        isValid={pathValidation.clientPath?.valid}
        error={pathValidation.clientPath?.error}
        onBrowse={handleSelectClientPath}
        styles={styles}
      />

      <p className={styles.sectionDescription}>
        Launch the SPT-AKI client to play the game. Make sure the server is
        running first!
      </p>
      <button className={styles.button} onClick={handleLaunchClient}>
        Launch SPT-AKI Launcher
      </button>
      {serverStatus && (
        <div className={`${styles.status} ${getStatusClass(serverStatus)}`}>
          {serverStatus}
        </div>
      )}
    </div>
  );
}

export default ClientLauncher;