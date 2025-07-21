import React from "react";

function DirectoryWarningDialog({
  isOpen,
  directoryInfo,
  onConfirm,
  onCancel,
  onBackup,
  styles,
}) {
  if (!isOpen) return null;

  const formatFileSize = (bytes) => {
    if (bytes === null) return "N/A";
    const sizes = ["Bytes", "KB", "MB", "GB"];
    if (bytes === 0) return "0 Bytes";
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i];
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>⚠️ Directory Not Empty</h3>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.warningMessage}>
            <p>
              <strong>SPT-AKI installer requires an empty directory.</strong>
            </p>
            <p>
              The selected directory contains{" "}
              <strong>{directoryInfo.itemCount} item(s)</strong>.
            </p>
          </div>

          <div className={styles.directoryContents}>
            <h4>Directory Contents:</h4>
            <div className={styles.itemList}>
              {directoryInfo.items.map((item, index) => (
                <div key={index} className={styles.itemRow}>
                  <span className={styles.itemName}>{item.name}</span>
                  <span className={styles.itemType}>{item.type}</span>
                  {item.size !== null && (
                    <span className={styles.itemSize}>
                      {formatFileSize(item.size)}
                    </span>
                  )}
                </div>
              ))}
              {directoryInfo.hasMore && (
                <div className={styles.moreItems}>
                  ... and {directoryInfo.itemCount - 10} more items
                </div>
              )}
            </div>
          </div>

          <div className={styles.warningActions}>
            <p>
              <strong>Please choose an option:</strong>
            </p>
            <ul>
              <li>
                <strong>Backup & Clear:</strong> Move all contents to a backup
                folder, then proceed
              </li>
              <li>
                <strong>Delete All:</strong> Permanently delete all contents and
                proceed
              </li>
              <li>
                <strong>Cancel:</strong> Choose a different directory
              </li>
            </ul>
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button
            className={`${styles.button} ${styles.dangerButton}`}
            onClick={() => onConfirm("delete")}
          >
            🗑️ Delete All & Proceed
          </button>
          <button
            className={`${styles.button} ${styles.warningButton}`}
            onClick={() => onBackup()}
          >
            💾 Backup & Clear
          </button>
          <button
            className={`${styles.button} ${styles.secondaryButton}`}
            onClick={onCancel}
          >
            ❌ Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default DirectoryWarningDialog;
