import React, { useState, useEffect, useCallback } from 'react';
import ModCard from './ModCard.jsx';
import ModSearch from './ModSearch.jsx';
import styles from '../App.module.css';

const ModManager = ({ styles: appStyles }) => {
  const [mods, setMods] = useState([]);
  const [filteredMods, setFilteredMods] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Categories for filtering
  const categories = [
    { id: 'all', name: 'All Mods' },
    { id: 'client', name: 'Client Mods' },
    { id: 'server', name: 'Server Mods' },
    { id: 'both', name: 'Client & Server' },
    { id: 'utility', name: 'Utilities' },
    { id: 'visual', name: 'Visual Mods' },
    { id: 'gameplay', name: 'Gameplay Mods' }
  ];

  // Fetch mods from GitHub API via main process
  const fetchMods = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Use IPC to call the main process for GitHub API
      const result = await window.electron.ipcRenderer.invoke('fetch-mods');
      
      if (result.success) {
        setMods(result.mods);
        setFilteredMods(result.mods);
      } else {
        // API failed, but we have mock data
        setMods(result.mods);
        setFilteredMods(result.mods);
        // Show a warning instead of error when using offline data
        setError(`Using offline data (GitHub API unavailable): ${result.error}`);
      }
    } catch (err) {
      console.error('Error fetching mods:', err);
      setError('Failed to load mods. Please check your internet connection and try again.');
      
      // Fallback to mock data for development
      const mockMods = [
        {
          id: 1,
          name: 'SPT Realism Mod',
          description: 'Adds realistic gameplay mechanics to SPT-AKI',
          author: 'SPTCommunity',
          version: '2.1.0',
          category: 'gameplay',
          stars: 150,
          lastUpdated: '2024-01-15T10:30:00Z',
          downloadUrl: 'https://github.com/spt-community/realism-mod/releases/latest',
          repository: 'https://github.com/spt-community/realism-mod',
          language: 'C#',
          isInstalled: false,
          isCompatible: true,
          thumbnail: null
        },
        {
          id: 2,
          name: 'SPT Visual Enhancement',
          description: 'Improves graphics and visual effects',
          author: 'VisualMods',
          version: '1.5.2',
          category: 'visual',
          stars: 89,
          lastUpdated: '2024-01-10T14:20:00Z',
          downloadUrl: 'https://github.com/visual-mods/enhancement/releases/latest',
          repository: 'https://github.com/visual-mods/enhancement',
          language: 'C#',
          isInstalled: false,
          isCompatible: true,
          thumbnail: null
        },
        {
          id: 3,
          name: 'SPT Server Tools',
          description: 'Advanced server management and monitoring tools',
          author: 'ServerTools',
          version: '3.0.1',
          category: 'server',
          stars: 234,
          lastUpdated: '2024-01-12T09:15:00Z',
          downloadUrl: 'https://github.com/server-tools/spt-tools/releases/latest',
          repository: 'https://github.com/server-tools/spt-tools',
          language: 'C#',
          isInstalled: false,
          isCompatible: true,
          thumbnail: null
        }
      ];
      
      setMods(mockMods);
      setFilteredMods(mockMods);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Filter mods based on search term and category
  const filterMods = useCallback(() => {
    let filtered = mods;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(mod =>
        mod.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        mod.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        mod.author.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(mod => mod.category === selectedCategory);
    }

    setFilteredMods(filtered);
  }, [mods, searchTerm, selectedCategory]);

  // Apply filters when search or category changes
  useEffect(() => {
    filterMods();
  }, [filterMods]);

  // Load mods on component mount
  useEffect(() => {
    fetchMods();
  }, [fetchMods]);

  // Handle mod installation (placeholder for now)
  const handleInstallMod = async (modId) => {
    console.log('Installing mod:', modId);
    // TODO: Implement mod installation logic
  };

  // Handle mod removal (placeholder for now)
  const handleRemoveMod = async (modId) => {
    console.log('Removing mod:', modId);
    // TODO: Implement mod removal logic
  };

  if (isLoading) {
    return (
      <div className={appStyles.section}>
        <div className={appStyles.loading}>
          <div className={appStyles.loadingSpinner}></div>
          <p>Loading mods...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={appStyles.section}>
        <div className={`${appStyles.status} ${appStyles.error}`}>
          <h3>Error Loading Mods</h3>
          <p>{error}</p>
          <button 
            className={appStyles.button} 
            onClick={fetchMods}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={appStyles.section}>
      <div className={appStyles.sectionTitle}>
        <h2>Mod Browser</h2>
        <p>Discover and install SPT-AKI mods</p>
      </div>

      <ModSearch
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        categories={categories}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        modCount={filteredMods.length}
        totalMods={mods.length}
      />

      {filteredMods.length === 0 ? (
        <div className={appStyles.noMods}>
          <p>No mods found matching your criteria.</p>
          <button 
            className={appStyles.button} 
            onClick={() => {
              setSearchTerm('');
              setSelectedCategory('all');
            }}
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className={appStyles.modGrid}>
          {filteredMods.map(mod => (
            <ModCard
              key={mod.id}
              mod={mod}
              onInstall={handleInstallMod}
              onRemove={handleRemoveMod}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ModManager; 