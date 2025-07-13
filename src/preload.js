// Simple preload script for Electron
console.log("=== Preload script starting ===");

// Test if we can access Node.js modules
try {
  const { contextBridge, ipcRenderer } = require("electron");
  console.log("Electron modules loaded successfully");

  // Expose protected methods that allow the renderer process to use
  // the ipcRenderer without exposing the entire object
  contextBridge.exposeInMainWorld("electron", {
    ipcRenderer: {
      invoke: (...args) => ipcRenderer.invoke(...args),
      on: (channel, func) =>
        ipcRenderer.on(channel, (event, ...args) => func(...args)),
      once: (channel, func) =>
        ipcRenderer.once(channel, (event, ...args) => func(...args)),
      removeListener: (channel, func) =>
        ipcRenderer.removeListener(channel, func),
    },
    windowControls: {
      minimize: () => ipcRenderer.invoke("window-minimize"),
      maximize: () => ipcRenderer.invoke("window-maximize"),
      close: () => ipcRenderer.invoke("window-close"),
    },
  });

  console.log("Electron API exposed successfully");
} catch (error) {
  console.error("Error in preload script:", error);
}

console.log("=== Preload script finished ===");
