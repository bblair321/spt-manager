import React from "react";
import styles from "../App.module.css";

const ModCard = ({ mod, onInstall, onRemove, progress = "idle" }) => {
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getCategoryColor = (category) => {
    const colors = {
      client: "#60a5fa",
      server: "#f87171",
      both: "#fbbf24",
      utility: "#34d399",
      visual: "#a78bfa",
      gameplay: "#fb7185",
    };
    return colors[category] || "#6b7280";
  };

  const getCategoryIcon = (category) => {
    const icons = {
      client: "🖥️",
      server: "🖥️",
      both: "🔄",
      utility: "🔧",
      visual: "🎨",
      gameplay: "🎮",
    };
    return icons[category] || "📦";
  };

  return (
    <div className={styles.modCard}>
      <div className={styles.modHeader}>
        <div className={styles.modTitle}>
          <h3>{mod.name}</h3>
          <span
            className={styles.modCategory}
            style={{ backgroundColor: getCategoryColor(mod.category) }}
          >
            {getCategoryIcon(mod.category)} {mod.category}
          </span>
        </div>

        <div className={styles.modMeta}>
          <div className={styles.modStars}>⭐ {mod.stars.toLocaleString()}</div>
          <div className={styles.modLanguage}>{mod.language}</div>
        </div>
      </div>

      <div className={styles.modDescription}>
        <p>{mod.description}</p>
      </div>

      <div className={styles.modInfo}>
        <div className={styles.modAuthor}>
          <span className={styles.modLabel}>Author:</span>
          <button
            className={styles.modAuthorLink}
            onClick={async () => {
              const authorUrl = `https://github.com/${mod.author}`;
              if (authorUrl && /^https?:\/\//.test(authorUrl)) {
                try {
                  const result = await window.electron.ipcRenderer.invoke(
                    "open-external-url",
                    authorUrl
                  );
                  if (!result.success) {
                    console.error("Failed to open URL:", result.error);
                    window.open(authorUrl, "_blank");
                  }
                } catch (error) {
                  console.error("Error opening author profile:", error);
                  window.open(authorUrl, "_blank");
                }
              } else {
                console.error("Invalid author URL:", authorUrl);
              }
            }}
          >
            {mod.author}
          </button>
        </div>

        <div className={styles.modVersion}>
          <span className={styles.modLabel}>Version:</span>
          <span className={styles.modVersionText}>{mod.version}</span>
        </div>

        <div className={styles.modUpdated}>
          <span className={styles.modLabel}>Updated:</span>
          <span>{formatDate(mod.lastUpdated)}</span>
        </div>
      </div>

      <div className={styles.modStatus}>
        {!mod.isCompatible && (
          <div className={styles.modWarning}>
            ⚠️ May not be compatible with current SPT version
          </div>
        )}

        {mod.isInstalled && (
          <div className={styles.modInstalled}>✅ Installed</div>
        )}
      </div>

      <div className={styles.modActions}>
        <button
          className={`${styles.modButton} ${styles.modButtonPrimary}`}
          onClick={() => onInstall(mod.id)}
          disabled={mod.isInstalled || progress === "installing"}
        >
          {progress === "installing" && (
            <span
              className={styles.loadingSpinnerSmall}
              style={{ marginRight: 6 }}
            ></span>
          )}
          {progress === "installing"
            ? "Installing..."
            : mod.isInstalled
            ? "Installed"
            : "Install"}
        </button>
        {progress === "success" && !mod.isInstalled && (
          <span className={styles.modSuccess}>Installed!</span>
        )}
        {progress === "error" && (
          <span className={styles.modError}>Install failed</span>
        )}

        {mod.isInstalled && (
          <button
            className={`${styles.modButton} ${styles.modButtonSecondary}`}
            onClick={() => onRemove(mod.id)}
          >
            Remove
          </button>
        )}

        <button
          className={`${styles.modButton} ${styles.modButtonTertiary}`}
          onClick={async () => {
            if (mod.repository && /^https?:\/\//.test(mod.repository)) {
              try {
                const result = await window.electron.ipcRenderer.invoke(
                  "open-external-url",
                  mod.repository
                );
                if (!result.success) {
                  console.error("Failed to open URL:", result.error);
                  window.open(mod.repository, "_blank");
                }
              } catch (error) {
                console.error("Error opening repository:", error);
                window.open(mod.repository, "_blank");
              }
            } else {
              console.error("Invalid repository URL:", mod.repository);
            }
          }}
        >
          View
        </button>
      </div>
    </div>
  );
};

export default ModCard;
