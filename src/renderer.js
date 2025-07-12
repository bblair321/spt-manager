// spt-launcher/src/renderer.js
import React, { useState } from "react";
import { createRoot } from "react-dom/client";

function App() {
  const [downloadStatus, setDownloadStatus] = useState("");
  const [serverStatus, setServerStatus] = useState("");

  const handleDownloadSPT = async () => {
    // Ask user for the download location
    const downloadPath = await window.electron.ipcRenderer.invoke(
      "pick-dest-folder"
    );
    if (!downloadPath) return;
    setDownloadStatus("Downloading SPT-AKI Installer...");
    const res = await window.electron.ipcRenderer.invoke(
      "download-spt-installer",
      { downloadPath }
    );
    setDownloadStatus(
      res.success
        ? "SPT-AKI Installer downloaded and launched!"
        : `Error: ${res.error}`
    );
  };

  const handleStartServer = async () => {
    // Ask user to select their SPT-AKI server folder
    const serverPath = await window.electron.ipcRenderer.invoke("pick-folder");
    if (!serverPath) return;
    setServerStatus("Starting SPT-AKI Server...");
    const res = await window.electron.ipcRenderer.invoke("start-spt-server", {
      serverPath,
    });
    setServerStatus(
      res.success ? "SPT-AKI Server started!" : `Error: ${res.error}`
    );
  };

  return (
    <div>
      <h1>SPT-AKI Launcher</h1>
      <button onClick={handleDownloadSPT}>Download SPT-AKI Installer</button>
      <div>{downloadStatus}</div>
      <button onClick={handleStartServer}>Start SPT-AKI Server</button>
      <div>{serverStatus}</div>
    </div>
  );
}

const container = document.getElementById("root");
const root = createRoot(container);
root.render(<App />);
export default App;
