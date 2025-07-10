import React, { useState } from "react";

const { ipcRenderer } = window.require("electron");

function App() {
  const [sourcePath, setSourcePath] = useState("");
  const [destPath, setDestPath] = useState("");
  const [status, setStatus] = useState("");

  const pickSourceFolder = async () => {
    const result = await ipcRenderer.invoke("pick-folder");
    if (result) setSourcePath(result);
  };

  const handleClone = async () => {
    setStatus("Cloning...");
    const res = await ipcRenderer.invoke("clone-folder", { source: sourcePath, dest: destPath });
    setStatus(res.success ? "Clone complete!" : `Error: ${res.error}`);
  };

  return (
    <div>
      <h1>SPT-AKI Launcher</h1>
      <button onClick={pickSourceFolder}>Pick Original EFT Folder</button>
      <div>Selected: {sourcePath}</div>
      <input
        type="text"
        placeholder="Destination folder path"
        value={destPath}
        onChange={e => setDestPath(e.target.value)}
        style={{ width: "300px" }}
      />
      <button onClick={handleClone} disabled={!sourcePath || !destPath}>
        Clone Game Folder
      </button>
      <div>{status}</div>
    </div>
  );
}

export default App;