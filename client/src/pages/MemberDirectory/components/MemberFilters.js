import React from 'react';

const MemberFilters = ({
  roles,
  years,
  selectedRole,
  selectedYear,
  sortBy,
  onRoleChange,
  onYearChange,
  onSortChange,
}) => (
  <section className="member-controls" aria-label="Filter and sort members">
    <div className="member-filters">
      <label>
        <span className="member-sr-only">Filter by role</span>
        <select value={selectedRole} onChange={(event) => onRoleChange(event.target.value)}>
          <option value="all">All roles</option>
          {roles.map((role) => <option key={role} value={role}>{role}</option>)}
        </select>
      </label>
      <label>
        <span className="member-sr-only">Filter by year</span>
        <select value={selectedYear} onChange={(event) => onYearChange(event.target.value)}>
          <option value="all">All years</option>
          {years.map((year) => <option key={year} value={year}>{year}</option>)}
        </select>
      </label>
    </div>
    <label className="member-sort">
      <span>Sort by</span>
      <select value={sortBy} onChange={(event) => onSortChange(event.target.value)}>
        <option value="name-asc">Name A-Z</option>
        <option value="name-desc">Name Z-A</option>
        <option value="role">Role</option>
      </select>
    </label>
  </section>
);

export default MemberFilters;