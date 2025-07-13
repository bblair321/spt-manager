import React, { createContext, useContext, useState, useEffect } from "react";

// Theme context
const ThemeContext = createContext();

// Theme definitions
const themes = {
  dark: {
    // Background colors
    "--bg-primary": "#1a1a1a",
    "--bg-primary-rgb": "26, 26, 26",
    "--bg-secondary": "#0f0f0f",
    "--bg-secondary-rgb": "15, 15, 15",
    "--bg-tertiary": "#050505",
    "--bg-tertiary-rgb": "5, 5, 5",
    "--bg-gradient":
      "linear-gradient(135deg, #050505 0%, #0f0f0f 25%, #1a1a1a 50%, #0f0f0f 75%, #050505 100%)",

    // Text colors
    "--text-primary": "#d0d0d0",
    "--text-secondary": "#a0a0a0",
    "--text-muted": "#666666",

    // Border colors
    "--border-primary": "#333333",
    "--border-secondary": "#444444",

    // Button colors
    "--button-bg": "#2a2a2a",
    "--button-hover": "#3a3a3a",
    "--button-active": "#4a4a4a",
    "--button-disabled": "#1a1a1a",
    "--button-text": "#d0d0d0",

    // Status colors
    "--status-success": "#4ade80",
    "--status-error": "#f87171",
    "--status-warning": "#fbbf24",
    "--status-info": "#60a5fa",
    "--status-info-rgb": "96, 165, 250",

    // Scrollbar colors
    "--scrollbar-track": "#1a1a1a",
    "--scrollbar-thumb": "#444444",
    "--scrollbar-thumb-hover": "#555555",

    // Shadow colors
    "--shadow-primary": "rgba(0, 0, 0, 0.7)",
    "--shadow-secondary": "rgba(255, 255, 255, 0.05)",

    // Input colors
    "--input-bg": "#2a2a2a",
    "--input-border": "#444444",
    "--input-focus": "#60a5fa",

    // Tab colors
    "--tab-bg": "transparent",
    "--tab-hover": "#2a2a2a",
    "--tab-active": "#3a3a3a",
    "--tab-text": "#a0a0a0",
    "--tab-text-active": "#d0d0d0",
  },
  light: {
    // Background colors
    "--bg-primary": "#ffffff",
    "--bg-primary-rgb": "255, 255, 255",
    "--bg-secondary": "#f8f9fa",
    "--bg-secondary-rgb": "248, 249, 250",
    "--bg-tertiary": "#e9ecef",
    "--bg-tertiary-rgb": "233, 236, 239",
    "--bg-gradient":
      "linear-gradient(135deg, #ffffff 0%, #f8f9fa 25%, #e9ecef 50%, #f8f9fa 75%, #ffffff 100%)",

    // Text colors
    "--text-primary": "#212529",
    "--text-secondary": "#6c757d",
    "--text-muted": "#adb5bd",

    // Border colors
    "--border-primary": "#dee2e6",
    "--border-secondary": "#ced4da",

    // Button colors
    "--button-bg": "#f8f9fa",
    "--button-hover": "#e9ecef",
    "--button-active": "#dee2e6",
    "--button-disabled": "#f8f9fa",
    "--button-text": "#212529",

    // Status colors
    "--status-success": "#198754",
    "--status-error": "#dc3545",
    "--status-warning": "#ffc107",
    "--status-info": "#0d6efd",
    "--status-info-rgb": "13, 110, 253",

    // Scrollbar colors
    "--scrollbar-track": "#f8f9fa",
    "--scrollbar-thumb": "#dee2e6",
    "--scrollbar-thumb-hover": "#ced4da",

    // Shadow colors
    "--shadow-primary": "rgba(0, 0, 0, 0.1)",
    "--shadow-secondary": "rgba(0, 0, 0, 0.05)",

    // Input colors
    "--input-bg": "#ffffff",
    "--input-border": "#ced4da",
    "--input-focus": "#0d6efd",

    // Tab colors
    "--tab-bg": "transparent",
    "--tab-hover": "#f8f9fa",
    "--tab-active": "#e9ecef",
    "--tab-text": "#6c757d",
    "--tab-text-active": "#212529",
  },
};

// Theme provider component
export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState("dark");

  // Apply theme to document root
  const applyTheme = (newTheme) => {
    const root = document.documentElement;
    const themeColors = themes[newTheme];

    Object.entries(themeColors).forEach(([property, value]) => {
      root.style.setProperty(property, value);
    });
  };

  // Toggle theme
  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    applyTheme(newTheme);
  };

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") || "dark";
    setTheme(savedTheme);
    applyTheme(savedTheme);
  }, []);

  const value = {
    theme,
    toggleTheme,
    isDark: theme === "dark",
    isLight: theme === "light",
  };

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};

// Custom hook to use theme
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
