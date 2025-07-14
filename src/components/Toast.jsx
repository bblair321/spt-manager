import React, { useEffect } from "react";
import styles from "../App.module.css";

const Toast = ({ message, type = "info", onClose }) => {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      onClose();
    }, 3000);
    return () => clearTimeout(timer);
  }, [message, onClose]);

  if (!message) return null;

  return (
    <div
      className={`${styles.toast} ${
        styles[`toast${type.charAt(0).toUpperCase() + type.slice(1)}`]
      }`}
    >
      {message}
      <button className={styles.toastClose} onClick={onClose}>
        &times;
      </button>
    </div>
  );
};

export default Toast;
