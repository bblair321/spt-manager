import React from "react";
import styles from "../App.module.css";

const ModSearch = ({
  searchTerm,
  onSearchChange,
  categories,
  selectedCategory,
  onCategoryChange,
  modCount,
  totalMods,
}) => {
  return (
    <div className={styles.modSearch}>
      <div className={styles.searchRow}>
        <div className={styles.searchInput}>
          <input
            type="text"
            placeholder="Search mods by name, description, or author..."
            value={searchTerm || ""}
            onChange={(e) => onSearchChange(e.target.value)}
            className={styles.searchField}
          />
          {searchTerm && (
            <button
              className={styles.clearSearch}
              onClick={() => onSearchChange("")}
              title="Clear search"
            >
              ×
            </button>
          )}
        </div>

        <div className={styles.searchStats}>
          <span className={styles.modCount}>
            {modCount} of {totalMods} mods
          </span>
          <span className={styles.sortIndicator}>
            📅 Sorted by latest updates
          </span>
        </div>
      </div>

      <div className={styles.categoryFilters}>
        <div className={styles.categoryLabel}>Categories:</div>
        <div className={styles.categoryButtons}>
          {categories.map((category) => (
            <button
              key={category.id}
              className={`${styles.categoryButton} ${
                selectedCategory === category.id
                  ? styles.categoryButtonActive
                  : ""
              }`}
              onClick={() => onCategoryChange(category.id)}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ModSearch;
