import React from "react";

function ServerManager({
  settings,
  pathValidation,
  isServerRunning,
  serverStatus,
  serverLogs,
  styles,
  handleSelectServerPath,
  handleStartServer,
  handleStopServer,
  checkPortStatus,
  clearLogs,
  getStatusClass,
}) {
  return (
    <>
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Server Management</h2>
        {/* Server Path Display */}
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
        <div className={styles.buttonGroup}>
          <button
            className={`${styles.button} ${
              isServerRunning ? styles.buttonDisabled : ""
            }`}
            onClick={handleStartServer}
            disabled={isServerRunning}
          >
            Start SPT-AKI Server
          </button>
          <button
            className={`${styles.button} ${styles.buttonStop} ${
              !isServerRunning ? styles.buttonDisabled : ""
            }`}
            onClick={handleStopServer}
            disabled={!isServerRunning}
          >
            Stop SPT-AKI Server
          </button>
          <button className={styles.button} onClick={checkPortStatus}>
            Check Port 6969
          </button>
        </div>
        {serverStatus && (
          <div className={`${styles.status} ${getStatusClass(serverStatus)}`}>
            {serverStatus}
          </div>
        )}
      </div>
      <div className={styles.section}>
        <div className={styles.logHeader}>
          <h2 className={styles.sectionTitle}>Server Logs</h2>
          <button className={styles.clearButton} onClick={clearLogs}>
            Clear Logs
          </button>
        </div>
        <div className={styles.logWindow}>
          {serverLogs.length === 0 ? (
            <div className={styles.noLogs}>
              No server logs yet. Start the server to see output.
            </div>
          ) : (
            serverLogs.map((log, index) => (
              <div key={index} className={styles.logEntry}>
                <span className={styles.logTimestamp}>[{log.timestamp}]</span>
                <span className={styles.logMessage}>{log.message}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}

export default ServerManager;
