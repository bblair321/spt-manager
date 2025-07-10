// spt-launcher/src/renderer.js
import React, { useState } from "react";
import { createRoot } from "react-dom/client";

function App() {
  const [sourcePath, setSourcePath] = useState("");
  const [status, setStatus] = useState("");

  const pickSourceFolder = async () => {
    const result = await window.electron.ipcRenderer.invoke("pick-folder");
    if (result) setSourcePath(result);
  };

  const handleClone = async () => {
    if (!sourcePath) return;
    // Ask user for destination folder
    const destPath = await window.electron.ipcRenderer.invoke(
      "pick-dest-folder"
    );
    if (!destPath) return;
    setStatus("Cloning...");
    const res = await window.electron.ipcRenderer.invoke("clone-folder", {
      source: sourcePath,
      dest: destPath,
    });
    setStatus(res.success ? "Clone complete!" : `Error: ${res.error}`);
  };

  return (
    <div>
      <h1>SPT-AKI Launcher</h1>
      <button onClick={pickSourceFolder}>Pick Original EFT Folder</button>
      <div>Selected: {sourcePath}</div>
      <button onClick={handleClone} disabled={!sourcePath}>
        Clone Game Folder
      </button>
      <div>{status}</div>
    </div>
  );
}

const container = document.getElementById("root");
const root = createRoot(container);
root.render(<App />);
export default App;
