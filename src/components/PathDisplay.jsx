import React from "react";

function PathDisplay({
  label,
  value,
  isValid,
  error,
  onBrowse,
  browseLabel = "Browse",
  styles,
}) {
  return (
    <div className={styles.pathDisplay}>
      <div className={styles.pathLabel}>{label}</div>
      <div className={styles.pathValue}>
        {value ? (
          <>
            <span className={isValid ? styles.validPath : styles.invalidPath}>
              {value}
            </span>
            {error && <div className={styles.pathError}>{error}</div>}
          </>
        ) : (
          <span className={styles.noPath}>
            No {label.toLowerCase().replace(":", "")} set
          </span>
        )}
      </div>
      <button className={styles.pathButton} onClick={onBrowse}>
        {browseLabel}
      </button>
    </div>
  );
}

export default PathDisplay;
