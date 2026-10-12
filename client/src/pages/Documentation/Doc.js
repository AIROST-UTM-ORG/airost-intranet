import React, { useEffect, useState, useMemo } from 'react';
import DocCard from './component/Doc-card';
import TopBar from './component/TopBar';
import { documentationData as localDocData } from './Doc-content';
import { API_URL } from '../../config/api';
import * as faicon from 'react-icons/fa';
import * as aiicon from 'react-icons/ai';
import './style/global.css';

const Doc = () => {
  const [articleType, setArticleType] = useState('All');
  const [docs, setDocs] = useState(localDocData);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [sortOrder, setSortOrder] = useState('newest');

  useEffect(() => {
    const fetchDocs = async () => {
      try {
        const response = await fetch(`${API_URL}/airost/doc`);
        if (response.ok) {
          const json = await response.json();
          if (Array.isArray(json) && json.length > 0) {
            setDocs(json);
            return;
          }
        }
      } catch (err) {
        console.warn('Backend /airost/doc error, using fallback data:', err);
      }
      setDocs(localDocData);
    };

    fetchDocs();
  }, []);

  const changeType = (newType) => {
    setArticleType(newType);
  };

  const sortedDocs = useMemo(() => {
    const list = [...(docs || [])];
    if (sortOrder === 'title') {
      return list.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    } else if (sortOrder === 'oldest') {
      return list.sort((a, b) => new Date(a.date || a.createdAt || 0) - new Date(b.date || b.createdAt || 0));
    }
    return list;
  }, [docs, sortOrder]);

  return (
    <div className="doc-page">
      <div className="doc-wrapper">
        <TopBar
          articleType={articleType}
          changeType={changeType}
          currentSort={sortOrder}
          onSortChange={setSortOrder}
        />

        {/* Real-time search bar toggleable via FAB or shortcut */}
        {isSearchOpen && (
          <div className="search-banner">
            <div className="search-input-box">
              <faicon.FaSearch className="search-icon" />
              <input
                type="text"
                autoFocus
                placeholder="Search resources by title, author, keyword..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
              {searchQuery && (
                <button
                  className="clear-btn"
                  onClick={() => setSearchQuery('')}
                  title="Clear search"
                >
                  <aiicon.AiOutlineClose />
                </button>
              )}
            </div>
            <button
              className="close-search-btn"
              onClick={() => {
                setIsSearchOpen(false);
                setSearchQuery('');
              }}
            >
              Close
            </button>
          </div>
        )}

        <DocCard
          articleType={articleType}
          docs={sortedDocs}
          searchQuery={searchQuery}
        />

        {/* Floating Action Button (Search FAB matching Figma) */}
        <button
          className={`search-fab ${isSearchOpen ? 'active' : ''}`}
          onClick={() => setIsSearchOpen(!isSearchOpen)}
          title={isSearchOpen ? "Close search" : "Search resources"}
        >
          {isSearchOpen ? <aiicon.AiOutlineClose /> : <faicon.FaSearch />}
        </button>
      </div>
    </div>
  );
};

export default Doc;