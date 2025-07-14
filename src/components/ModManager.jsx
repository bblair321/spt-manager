import React, { useState, useEffect, useCallback } from "react";
import ModCard from "./ModCard.jsx";
import ModSearch from "./ModSearch.jsx";
import styles from "../App.module.css";

const initialNewMod = {
  name: "",
  description: "",
  author: "",
  version: "",
  category: "utility",
  stars: 0,
  lastUpdated: new Date().toISOString(),
  downloadUrl: "",
  repository: "",
  language: "",
  isInstalled: false,
  isCompatible: true,
  thumbnail: null,
};

const ModManager = ({ styles: appStyles, showToast }) => {
  const [mods, setMods] = useState([]);
  const [filteredMods, setFilteredMods] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [installProgress, setInstallProgress] = useState({});
  const [modSource, setModSource] = useState("remote"); // 'remote' or 'local'
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMod, setNewMod] = useState(initialNewMod);
  const [saving, setSaving] = useState(false);

  // Categories for filtering
  const categories = [
    { id: "all", name: "All Mods" },
    { id: "client", name: "Client Mods" },
    { id: "server", name: "Server Mods" },
    { id: "both", name: "Client & Server" },
    { id: "utility", name: "Utilities" },
    { id: "visual", name: "Visual Mods" },
    { id: "gameplay", name: "Gameplay Mods" },
  ];

  // Fetch mods from GitHub API via main process
  const fetchMods = useCallback(
    async (source = modSource) => {
      setIsLoading(true);
      setError(null);

      try {
        // Use IPC to call the main process for GitHub API
        const result = await window.electron.ipcRenderer.invoke("fetch-mods", {
          source,
        });

        if (result.success) {
          setMods(result.mods);
          setFilteredMods(result.mods);
          setError(result.error || null);
        } else {
          setMods([]);
          setFilteredMods([]);
          setError(result.error || "Failed to load mods.");
        }
      } catch (err) {
        setError(
          "Failed to load mods. Please check your internet connection and try again."
        );
        setMods([]);
        setFilteredMods([]);
      } finally {
        setIsLoading(false);
      }
    },
    [modSource]
  );

  // Filter mods based on search term and category
  const filterMods = useCallback(() => {
    let filtered = mods;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (mod) =>
          mod.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          mod.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          mod.author.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by category
    if (selectedCategory !== "all") {
      filtered = filtered.filter((mod) => mod.category === selectedCategory);
    }

    setFilteredMods(filtered);
  }, [mods, searchTerm, selectedCategory]);

  // Apply filters when search or category changes
  useEffect(() => {
    filterMods();
  }, [filterMods]);

  // Load mods on component mount and when modSource changes
  useEffect(() => {
    fetchMods(modSource);
  }, [fetchMods, modSource]);

  // Handle mod installation (placeholder for now)
  const handleInstallMod = async (modId) => {
    const mod = mods.find((m) => m.id === modId);
    if (!mod) return;
    setInstallProgress((prev) => ({ ...prev, [modId]: "installing" }));
    try {
      // Get serverPath from settings (via window.electron.ipcRenderer.invoke)
      const settings = await window.electron.ipcRenderer.invoke(
        "load-settings"
      );
      const serverPath = settings.serverPath;
      if (!serverPath) throw new Error("SPT-AKI server path not set.");
      const res = await window.electron.ipcRenderer.invoke("install-mod", {
        downloadUrl: mod.downloadUrl,
        serverPath,
      });
      if (res.success) {
        setInstallProgress((prev) => ({ ...prev, [modId]: "success" }));
        // Optionally update mod as installed
        setMods((prevMods) =>
          prevMods.map((m) =>
            m.id === modId ? { ...m, isInstalled: true } : m
          )
        );
        setFilteredMods((prevMods) =>
          prevMods.map((m) =>
            m.id === modId ? { ...m, isInstalled: true } : m
          )
        );
        if (showToast)
          showToast(`${mod.name} installed successfully!`, "success");
      } else {
        setInstallProgress((prev) => ({ ...prev, [modId]: "error" }));
        if (showToast) showToast(`Failed to install ${mod.name}.`, "error");
      }
    } catch (err) {
      setInstallProgress((prev) => ({ ...prev, [modId]: "error" }));
      if (showToast) showToast(`Failed to install ${mod.name}.`, "error");
    }
  };

  // Handle mod removal (placeholder for now)
  const handleRemoveMod = async (modId) => {
    console.log("Removing mod:", modId);
    // TODO: Implement mod removal logic
  };

  const handleAddMod = () => {
    setNewMod(initialNewMod);
    setShowAddModal(true);
  };
  const handleModalChange = (e) => {
    const { name, value } = e.target;
    setNewMod((prev) => ({ ...prev, [name]: value }));
  };
  const handleAddModSubmit = async (e) => {
    e.preventDefault();
    // Basic validation
    if (!newMod.name || !newMod.downloadUrl) {
      showToast && showToast("Name and Download URL are required.", "error");
      return;
    }
    setSaving(true);
    try {
      // Assign a unique id
      const maxId = mods.reduce((max, m) => Math.max(max, m.id || 0), 0);
      const modToAdd = { ...newMod, id: maxId + 1 };
      const updatedMods = [...mods, modToAdd];
      // Save to backend
      const res = await window.electron.ipcRenderer.invoke(
        "save-local-mods",
        updatedMods
      );
      if (res.success) {
        setShowAddModal(false);
        setNewMod(initialNewMod);
        showToast && showToast("Mod added to local list!", "success");
        fetchMods("local");
      } else {
        showToast && showToast("Failed to save mod.", "error");
      }
    } catch (err) {
      showToast && showToast("Failed to save mod.", "error");
    } finally {
      setSaving(false);
    }
  };

  // Show info banner if using offline/local data
  const showOfflineInfo =
    error &&
    (error.includes("offline data") || error.includes("local mods.json"));
  const noMods = filteredMods.length === 0;

  return (
    <div className={appStyles.section}>
      <div className={appStyles.sectionTitle}>
        <h2>Mod Browser</h2>
        <p>Discover and install SPT-AKI mods</p>
        <div style={{ marginTop: 12, marginBottom: 8 }}>
          <button
            className={
              modSource === "remote" ? appStyles.buttonActive : appStyles.button
            }
            onClick={() => setModSource("remote")}
            style={{ marginRight: 8 }}
          >
            Remote (API)
          </button>
          <button
            className={
              modSource === "local" ? appStyles.buttonActive : appStyles.button
            }
            onClick={() => setModSource("local")}
          >
            Local List
          </button>
          <span style={{ marginLeft: 16, fontSize: "0.95em", color: "#888" }}>
            Source:{" "}
            <b>{modSource === "remote" ? "Remote (API)" : "Local List"}</b>
          </span>
          {modSource === "local" && (
            <button
              className={appStyles.button}
              style={{ marginLeft: 24 }}
              onClick={handleAddMod}
            >
              + Add Mod
            </button>
          )}
        </div>
      </div>
      {/* Info banner if using offline/local data */}
      {showOfflineInfo && (
        <div
          className={appStyles.status + " " + appStyles.info}
          style={{ marginBottom: 16 }}
        >
          <h3>Mod browser is using offline data</h3>
          <p>
            API integration is in progress. You can still browse and install
            from the local mod list.
          </p>
        </div>
      )}
      {/* Add Mod Modal */}
      {showAddModal && (
        <div className={appStyles.modalOverlay}>
          <div className={appStyles.modal}>
            <h3>Add Mod to Local List</h3>
            <form onSubmit={handleAddModSubmit}>
              <div className={appStyles.formGroup}>
                <label>Name*</label>
                <input
                  name="name"
                  value={newMod.name}
                  onChange={handleModalChange}
                  required
                />
              </div>
              <div className={appStyles.formGroup}>
                <label>Description</label>
                <textarea
                  name="description"
                  value={newMod.description}
                  onChange={handleModalChange}
                />
              </div>
              <div className={appStyles.formGroup}>
                <label>Author</label>
                <input
                  name="author"
                  value={newMod.author}
                  onChange={handleModalChange}
                />
              </div>
              <div className={appStyles.formGroup}>
                <label>Version</label>
                <input
                  name="version"
                  value={newMod.version}
                  onChange={handleModalChange}
                />
              </div>
              <div className={appStyles.formGroup}>
                <label>Category</label>
                <select
                  name="category"
                  value={newMod.category}
                  onChange={handleModalChange}
                >
                  <option value="utility">Utility</option>
                  <option value="gameplay">Gameplay</option>
                  <option value="visual">Visual</option>
                  <option value="server">Server</option>
                  <option value="client">Client</option>
                  <option value="both">Both</option>
                </select>
              </div>
              <div className={appStyles.formGroup}>
                <label>Download URL*</label>
                <input
                  name="downloadUrl"
                  value={newMod.downloadUrl}
                  onChange={handleModalChange}
                  required
                />
              </div>
              <div className={appStyles.formGroup}>
                <label>Repository</label>
                <input
                  name="repository"
                  value={newMod.repository}
                  onChange={handleModalChange}
                />
              </div>
              <div className={appStyles.formGroup}>
                <label>Language</label>
                <input
                  name="language"
                  value={newMod.language}
                  onChange={handleModalChange}
                />
              </div>
              <div className={appStyles.formGroup}>
                <label>Thumbnail URL</label>
                <input
                  name="thumbnail"
                  value={newMod.thumbnail || ""}
                  onChange={handleModalChange}
                />
              </div>
              <div className={appStyles.formActions}>
                <button
                  type="button"
                  className={appStyles.buttonSecondary}
                  onClick={() => setShowAddModal(false)}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={appStyles.buttonPrimary}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Add Mod"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Show mod grid or no mods message */}
      {isLoading ? (
        <div className={appStyles.loading}>
          <div className={appStyles.loadingSpinner}></div>
          <p>Loading mods...</p>
        </div>
      ) : noMods ? (
        <div className={appStyles.noMods}>
          <p>No mods found in your local list.</p>
          {modSource === "local" && (
            <button className={appStyles.button} onClick={handleAddMod}>
              + Add Mod
            </button>
          )}
        </div>
      ) : (
        <>
          <ModSearch
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            categories={categories}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            modCount={filteredMods.length}
            totalMods={mods.length}
          />
          <div className={appStyles.modGrid}>
            {filteredMods.map((mod) => (
              <ModCard
                key={mod.id}
                mod={mod}
                onInstall={handleInstallMod}
                onRemove={handleRemoveMod}
                progress={installProgress[mod.id] || "idle"}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default ModManager;
