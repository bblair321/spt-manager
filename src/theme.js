import React, { createContext, useContext, useState, useEffect } from "react";

// Theme context
const ThemeContext = createContext();

// Theme definitions
const themes = {
  dark: {
    // Background colors
    "--bg-primary": "#2d2f4a",
    "--bg-primary-rgb": "45, 47, 74",
    "--bg-secondary": "#23243a",
    "--bg-secondary-rgb": "35, 36, 58",
    "--bg-tertiary": "#18192b",
    "--bg-tertiary-rgb": "24, 25, 43",
    "--bg-gradient": "linear-gradient(135deg, #23243a 0%, #2d2f4a 100%)",

    // Text colors
    "--text-primary": "#f0f0f0",
    "--text-secondary": "#a0a0a0",
    "--text-muted": "#666666",

    // Border colors
    "--border-primary": "#333333",
    "--border-secondary": "#444444",

    // Button colors
    "--button-bg": "#3a3a5a",
    "--button-hover": "#4a4a7a",
    "--button-active": "#5a5a9a",
    "--button-disabled": "#23243a",
    "--button-text": "#f0f0f0",

    // Status colors
    "--status-success": "#4ade80",
    "--status-error": "#f87171",
    "--status-warning": "#fbbf24",
    "--status-warning-rgb": "251, 191, 36",
    "--status-info": "#60a5fa",
    "--status-info-rgb": "96, 165, 250",

    // Scrollbar colors
    "--scrollbar-track": "#23243a",
    "--scrollbar-thumb": "#444444",
    "--scrollbar-thumb-hover": "#555555",

    // Shadow colors
    "--shadow-primary": "rgba(0, 0, 0, 0.7)",
    "--shadow-secondary": "rgba(255, 255, 255, 0.05)",

    // Input colors
    "--input-bg": "#2d2f4a",
    "--input-border": "#444444",
    "--input-focus": "#60a5fa",

    // Tab colors
    "--tab-bg": "transparent",
    "--tab-hover": "#2d2f4a",
    "--tab-active": "#3a3a5a",
    "--tab-text": "#a0a0a0",
    "--tab-text-active": "#f0f0f0",
  },
  light: {
    "--bg-primary": "#f5f6fa",
    "--bg-secondary": "#e0e1e6",
    "--bg-tertiary": "#d1d2d6",
    "--bg-gradient": "linear-gradient(135deg, #f5f6fa 0%, #e0e1e6 100%)",
    "--text-primary": "#23243a",
    "--text-secondary": "#555",
    "--text-muted": "#888",
    "--border-primary": "#ccc",
    "--border-secondary": "#bbb",
    "--button-bg": "#e0e1e6",
    "--button-hover": "#d1d2d6",
    "--button-active": "#c1c2c6",
    "--button-disabled": "#f5f6fa",
    "--button-text": "#23243a",
    "--status-success": "#22c55e",
    "--status-error": "#ef4444",
    "--status-warning": "#eab308",
    "--status-warning-rgb": "234, 179, 8",
    "--status-info": "#2563eb",
    "--status-info-rgb": "37, 99, 235",
    "--scrollbar-track": "#e0e1e6",
    "--scrollbar-thumb": "#bbb",
    "--scrollbar-thumb-hover": "#aaa",
    "--shadow-primary": "rgba(0, 0, 0, 0.1)",
    "--shadow-secondary": "rgba(0, 0, 0, 0.03)",
    "--input-bg": "#fff",
    "--input-border": "#ccc",
    "--input-focus": "#2563eb",
    "--tab-bg": "transparent",
    "--tab-hover": "#e0e1e6",
    "--tab-active": "#d1d2d6",
    "--tab-text": "#555",
    "--tab-text-active": "#23243a",
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
