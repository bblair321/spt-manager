import React from "react";

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
        <button className={styles.pathButton} onClick={handleSelectClientPath}>
          Browse
        </button>
      </div>

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
