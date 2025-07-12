const { contextBridge, ipcRenderer } = require("electron");

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
