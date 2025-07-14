# SPT Launcher IPC & Preload API Documentation

## Preload Script (`src/preload.js`)

The preload script exposes a secure API to the renderer process via Electron's `contextBridge`. The following API is available on `window.electron`:

### `window.electron.ipcRenderer`

- `invoke(channel, ...args)`: Calls an IPC handler in the main process and returns a promise with the result.
- `on(channel, callback)`: Listens for asynchronous messages from the main process.
- `once(channel, callback)`: Listens for a single asynchronous message from the main process.
- `removeListener(channel, callback)`: Removes a previously registered listener.

### `window.electron.windowControls`

- `minimize()`: Requests the main process to minimize the window.
- `maximize()`: Requests the main process to maximize or unmaximize the window.
- `close()`: Requests the main process to close the window.

---

## IPC Channels (Main Process)

The following IPC channels are handled in the main process (`src/main.js`):

### Window Controls

- `window-minimize`: Minimizes the current window.
- `window-maximize`: Maximizes or unmaximizes the current window.
- `window-close`: Closes the current window.

### File Pickers

- `pick-server-exe`: Opens a dialog to select the SPT-AKI server executable. Returns the file path or `null`.
- `pick-client-exe`: Opens a dialog to select the SPT-AKI client launcher. Returns the file path or `null`.
- `pick-dest-folder`: Opens a dialog to select a destination folder. Returns the folder path or `null`.

### Settings

- `load-settings`: Loads user settings from disk. Returns a settings object.
- `save-settings`: Saves user settings to disk. Expects a settings object. Returns `{ success: true }` or `{ success: false, error }`.

### SPT Path Detection

- `detect-spt-paths`: Attempts to auto-detect SPT-AKI server and client paths. Returns `{ serverPath, clientPath }`.
- `validate-path`: Validates a given path for server or client executable. Expects `{ path, type }`. Returns `{ valid, error }`.

### Mod Management

- `fetch-mods`: Fetches SPT mods from GitHub API. Returns `{ success, mods, error? }` with mod data or fallback mock data.
- `open-external-url`: Opens a URL in the system's default browser. Expects a URL string. Returns `{ success: true }` or `{ success: false, error }`.

### Profile Management

- (See main.js for additional profile-related IPC handlers, such as backup/restore.)

---

## Usage Example (Renderer)

```js
// Minimize window
window.electron.windowControls.minimize();

// Invoke an IPC handler
window.electron.ipcRenderer.invoke("load-settings").then((settings) => {
  // Use settings
});

// Listen for server log messages
window.electron.ipcRenderer.on("server-log", (log) => {
  console.log("Server log:", log);
});
```

---

For more details, see the source code in `src/preload.js` and `src/main.js`.
