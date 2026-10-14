import React from 'react';
import { FiSearch } from 'react-icons/fi';

const ProfileSearch = ({ onOpenDirectory }) => (
  <label className="profile-search">
    <FiSearch aria-hidden="true" />
    <span className="profile-sr-only">Search other club members</span>
    <input
      type="search"
      placeholder="Search other club members"
      onFocus={onOpenDirectory}
      onChange={onOpenDirectory}
    />
  </label>
);

export default ProfileSearch;