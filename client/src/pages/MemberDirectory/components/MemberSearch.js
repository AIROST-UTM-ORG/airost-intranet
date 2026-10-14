import React from 'react';
import { FiSearch, FiX } from 'react-icons/fi';

const MemberSearch = ({ value, onChange }) => (
  <label className="member-search">
    <FiSearch aria-hidden="true" />
    <span className="member-sr-only">Search members</span>
    <input
      type="search"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder="Search by name, role, or course"
    />
    <span className="member-search-context">Club members</span>
    {value && (
      <button type="button" onClick={() => onChange('')} aria-label="Clear search">
        <FiX aria-hidden="true" />
      </button>
    )}
  </label>
);

export default MemberSearch;