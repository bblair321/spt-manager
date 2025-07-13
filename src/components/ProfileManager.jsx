import React from "react";

function ProfileManager({
  profiles,
  isLoadingProfiles,
  profileError,
  settings,
  styles,
  handleBackupProfile,
  handleRestoreProfile,
}) {
  return (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>Profile Management</h2>
      <p className={styles.sectionDescription}>
        View, backup, and restore your SPT-AKI profiles here. (Feature in
        progress)
      </p>
      {isLoadingProfiles ? (
        <div className={styles.status}>Loading profiles...</div>
      ) : profileError ? (
        <div className={`${styles.status} ${styles.error}`}>{profileError}</div>
      ) : profiles.length === 0 ? (
        <div className={styles.status}>
          No profiles found. Make sure your server path is configured correctly.
        </div>
      ) : (
        <div className={styles.profileList}>
          {profiles.map((profile, index) => (
            <div key={index} className={styles.profileItem}>
              <div className={styles.profileInfo}>
                <div className={styles.profileName}>{profile.name}</div>
                <div className={styles.profileDetails}>
                  <span>Level: {profile.level}</span>
                  <span>PMC: {profile.pmcLevel}</span>
                  <span>Scav: {profile.scavLevel}</span>
                </div>
                <div className={styles.profilePath}>{profile.fileName}</div>
              </div>
              <div className={styles.profileActions}>
                <button
                  className={styles.button}
                  onClick={() => handleBackupProfile(profile)}
                >
                  Backup
                </button>
                <button
                  className={styles.button}
                  onClick={() => handleRestoreProfile(profile)}
                >
                  Restore
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ProfileManager;
