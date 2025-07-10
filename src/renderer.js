import React from "react";
import { createRoot } from "react-dom/client";

const App = () => (
  <div>
    <h1>SPT-AKI Launcher</h1>
    <p>Welcome! Your Electron + React app is running.</p>
  </div>
);

const container = document.getElementById("root");
const root = createRoot(container);
root.render(<App />);