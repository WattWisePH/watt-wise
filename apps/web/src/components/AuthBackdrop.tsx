import styles from "./AuthBackdrop.module.css";

/**
 * Decorative organic shapes for the auth/onboarding screens.
 * Purely decorative: hidden from assistive tech and never intercepts clicks.
 */
export function AuthBackdrop() {
  return (
    <div className={styles.AuthBackdrop} aria-hidden="true">
      <svg
        className={`${styles.AuthBackdrop_shape} ${styles.AuthBackdrop_shape__green}`}
        viewBox="0 0 200 200"
      >
        <path
          fill="var(--primary-600)"
          transform="translate(100 100)"
          d="M45.6,-58.4C59.1,-49.7,69.5,-34.9,73.6,-18.1C77.7,-1.3,75.5,17.5,66.7,32.6C57.9,47.7,42.5,59.1,25.4,65.6C8.3,72.1,-10.5,73.7,-27.6,68C-44.7,62.3,-60.1,49.3,-68.4,32.8C-76.7,16.3,-77.9,-3.7,-71.4,-20.5C-64.9,-37.3,-50.7,-50.9,-35.1,-59.4C-19.5,-67.9,-2.5,-71.3,13.4,-69.1C29.3,-66.9,45.6,-58.4,45.6,-58.4Z"
        />
      </svg>
      <svg
        className={`${styles.AuthBackdrop_shape} ${styles.AuthBackdrop_shape__navy}`}
        viewBox="0 0 200 200"
      >
        <path
          fill="var(--bg-secondary)"
          transform="translate(100 100)"
          d="M45.6,-58.4C59.1,-49.7,69.5,-34.9,73.6,-18.1C77.7,-1.3,75.5,17.5,66.7,32.6C57.9,47.7,42.5,59.1,25.4,65.6C8.3,72.1,-10.5,73.7,-27.6,68C-44.7,62.3,-60.1,49.3,-68.4,32.8C-76.7,16.3,-77.9,-3.7,-71.4,-20.5C-64.9,-37.3,-50.7,-50.9,-35.1,-59.4C-19.5,-67.9,-2.5,-71.3,13.4,-69.1C29.3,-66.9,45.6,-58.4,45.6,-58.4Z"
        />
      </svg>
    </div>
  );
}
