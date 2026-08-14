'use client';

import styles from '../settings.module.css';

const OPEN_COOKIE_SETTINGS_EVENT = 'tsr:open-cookie-settings';

export default function PrivacySettingsPage() {
  const openCookieSettings = () => {
    window.dispatchEvent(new Event(OPEN_COOKIE_SETTINGS_EVENT));
  };

  return (
    <div className={styles.sectionContainer}>
      <div className={styles.sectionHeading}>
        <h2>Privacy & cookies</h2>
        <p>Review how Song Room uses optional analytics cookies.</p>
      </div>

      <div className={styles.settingsBlock}>
        <div className={styles.blockLabel}>
          <h3>Analytics cookies</h3>
          <p>Choose whether Song Room can use Google Analytics to understand product usage. You can change your choice at any time.</p>
        </div>
        <div className={styles.blockControl}>
          <button
            type="button"
            className={styles.actionButton}
            onClick={openCookieSettings}
          >
            Cookie settings
          </button>
        </div>
      </div>
    </div>
  );
}
