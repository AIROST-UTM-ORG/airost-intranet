import React, { useState } from 'react';
import * as faicon from 'react-icons/fa';
import '../style/TopBar.css';

const TopBar = ({ articleType, changeType, currentSort, onSortChange }) => {
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  const categories = [
    { id: 'All', label: 'All' },
    { id: 'AI Resources', label: 'AI Resources' },
    { id: 'IOT Resources', label: 'IOT Resources' },
    { id: 'Web & Apps', label: 'Web & App Resources' },
  ];

  return (
    <div className="topbar">
      <header className="topbar-header">
        <div className="topbar-tabs">
          {categories.map((cat) => (
            <h2
              key={cat.id}
              className={`topbar-tab ${articleType === cat.id ? 'active' : ''}`}
              onClick={() => changeType(cat.id)}
            >
              {cat.label}
            </h2>
          ))}
        </div>
        <div className="filter-wrapper">
          <button
            className={`filter-btn ${showFilterDropdown ? 'active' : ''}`}
            onClick={() => setShowFilterDropdown(!showFilterDropdown)}
            title="Filter and sort"
          >
            <faicon.FaFilter />
          </button>
          {showFilterDropdown && (
            <div className="filter-dropdown">
              <div className="filter-dropdown-title">Sort By</div>
              <button
                className={`filter-dropdown-item ${currentSort === 'newest' ? 'active' : ''}`}
                onClick={() => { onSortChange && onSortChange('newest'); setShowFilterDropdown(false); }}
              >
                Newest First
              </button>
              <button
                className={`filter-dropdown-item ${currentSort === 'oldest' ? 'active' : ''}`}
                onClick={() => { onSortChange && onSortChange('oldest'); setShowFilterDropdown(false); }}
              >
                Oldest First
              </button>
              <button
                className={`filter-dropdown-item ${currentSort === 'title' ? 'active' : ''}`}
                onClick={() => { onSortChange && onSortChange('title'); setShowFilterDropdown(false); }}
              >
                Title (A-Z)
              </button>
            </div>
          )}
        </div>
      </header>
    </div>
  );
};

export default TopBar;