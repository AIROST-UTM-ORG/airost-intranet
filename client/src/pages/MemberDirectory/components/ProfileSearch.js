import React, { useEffect, useRef, useState } from 'react';
import { FiSearch, FiX } from 'react-icons/fi';
import '../styles/shared.css';
import { getPositions } from '../utils/memberUtils';

const ProfileSearch = ({
  users = [],
  currentMemberEmail,
  onSelectMember,
  value,
  onChange,
  label = 'Search other club members',
  placeholder = 'Search other club members',
  context,
  showClear = false,
  showEmptyState = true,
}) => {
  const containerRef = useRef(null);
  const [internalQuery, setInternalQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const isControlled = value !== undefined;
  const query = isControlled ? value : internalQuery;
  const normalizedQuery = query.trim().toLowerCase();
  const matches = normalizedQuery
    ? users
      .filter((user) => {
        const positions = getPositions(user.positions);
        const searchable = [user.name, user.email, user.course, user.year, ...positions]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return (user.email !== currentMemberEmail || !currentMemberEmail)
          && searchable.includes(normalizedQuery);
      })
      .slice(0, 6)
    : [];

  const updateQuery = (nextQuery) => {
    if (!isControlled) setInternalQuery(nextQuery);
    onChange?.(nextQuery);
    setIsOpen(true);
  };

  useEffect(() => {
    if (!isOpen) return undefined;

    const closeOnOutsidePointer = (event) => {
      if (!containerRef.current?.contains(event.target)) setIsOpen(false);
    };

    document.addEventListener('pointerdown', closeOnOutsidePointer);
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointer);
  }, [isOpen]);

  return (
    <div
      className={`profile-search-container${context ? ' profile-search-container--directory' : ''}`}
      ref={containerRef}
    >
      <label className={`profile-search${context ? ' profile-search--directory' : ''}`}>
        <FiSearch aria-hidden="true" />
        <span className="profile-sr-only">{label}</span>
        <input
          type="search"
          placeholder={placeholder}
          value={query}
          onChange={(event) => updateQuery(event.target.value)}
          onFocus={() => setIsOpen(true)}
          autoComplete="off"
          aria-autocomplete="list"
          aria-controls="profile-search-results"
          aria-expanded={Boolean(isOpen && normalizedQuery && (matches.length || showEmptyState))}
        />
        {context && <span className="profile-search-context">{context}</span>}
        {showClear && query && (
          <button
            type="button"
            onClick={() => updateQuery('')}
            aria-label="Clear search"
          >
            <FiX aria-hidden="true" />
          </button>
        )}
      </label>
      {isOpen && normalizedQuery && (matches.length > 0 || showEmptyState) && (
        <div className="profile-search-results" id="profile-search-results" role="listbox">
          {matches.length ? matches.map((user) => (
            <button
              key={user.email || user.name}
              type="button"
              role="option"
              aria-selected="false"
              onClick={() => onSelectMember(user)}
            >
              <span>{user.name || 'Airost member'}</span>
              {user.email && <small>{user.email}</small>}
            </button>
          )) : (
            <p className="profile-search-empty" role="status">No matching members</p>
          )}
        </div>
      )}
    </div>
  );
};

export default ProfileSearch;
