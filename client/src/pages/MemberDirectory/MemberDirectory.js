import React, { useMemo, useState } from 'react';
import { FiArrowRight, FiSearch, FiX } from 'react-icons/fi';
import useFetchUsers from '../../hooks/useFetchUsers';
import './MemberDirectory.css';

const getPositions = (position) => (
  Array.isArray(position) ? position.filter(Boolean) : position ? [position] : []
);

const getInitials = (name = '') => name
  .trim()
  .split(/\s+/)
  .slice(0, 2)
  .map((part) => part[0])
  .join('')
  .toUpperCase();

const MemberDirectory = () => {
  const { data: users = [], isLoading, isError } = useFetchUsers();
  const [search, setSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');
  const [selectedYear, setSelectedYear] = useState('all');
  const [sortBy, setSortBy] = useState('name-asc');
  const [selectedMember, setSelectedMember] = useState(null);

  const roles = useMemo(() => Array.from(new Set(
    users.flatMap((user) => getPositions(user.position)),
  )).sort((left, right) => left.localeCompare(right)), [users]);

  const years = useMemo(() => Array.from(new Set(
    users.map((user) => user.year).filter(Boolean),
  )).sort((left, right) => left.localeCompare(right)), [users]);

  const members = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filteredUsers = users.filter((user) => {
      const positions = getPositions(user.position);
      const searchable = [user.name, user.email, user.course, user.year, ...positions]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return (!query || searchable.includes(query))
        && (selectedRole === 'all' || positions.includes(selectedRole))
        && (selectedYear === 'all' || user.year === selectedYear);
    });

    return filteredUsers.sort((left, right) => {
      if (sortBy === 'name-desc') return (right.name || '').localeCompare(left.name || '');
      if (sortBy === 'role') {
        const leftRole = getPositions(left.position)[0] || '';
        const rightRole = getPositions(right.position)[0] || '';
        return leftRole.localeCompare(rightRole);
      }
      return (left.name || '').localeCompare(right.name || '');
    });
  }, [users, search, selectedRole, selectedYear, sortBy]);

  const renderAvatar = (member) => member.photo ? (
    <img className="member-avatar" src={member.photo} alt="" />
  ) : (
    <div className="member-avatar member-avatar-initials" aria-hidden="true">
      {getInitials(member.name)}
    </div>
  );

  return (
    <main className="member-directory">
      <label className="member-search">
        <FiSearch aria-hidden="true" />
        <span className="member-sr-only">Search members</span>
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by name, role, or course"
        />
        <span className="member-search-context">Club members</span>
        {search && (
          <button type="button" onClick={() => setSearch('')} aria-label="Clear search">
            <FiX aria-hidden="true" />
          </button>
        )}
      </label>

      <section className="member-heading" aria-labelledby="member-heading-title">
        <div>
          <p className="member-eyebrow">Club members</p>
          <h1 id="member-heading-title">Member search results</h1>
          <p className="member-heading-caption">
            {search ? `Members found for "${search}"` : 'Get to know the people behind Airost'}
          </p>
        </div>
        <div className="member-count" aria-live="polite">
          <strong>{members.length}</strong>
          <span>{members.length === 1 ? 'member' : 'members'}</span>
        </div>
      </section>

      <section className="member-controls" aria-label="Filter and sort members">
        <div className="member-filters">
          <label>
            <span className="member-sr-only">Filter by role</span>
            <select value={selectedRole} onChange={(event) => setSelectedRole(event.target.value)}>
              <option value="all">All roles</option>
              {roles.map((role) => <option key={role} value={role}>{role}</option>)}
            </select>
          </label>
          <label>
            <span className="member-sr-only">Filter by year</span>
            <select value={selectedYear} onChange={(event) => setSelectedYear(event.target.value)}>
              <option value="all">All years</option>
              {years.map((year) => <option key={year} value={year}>{year}</option>)}
            </select>
          </label>
        </div>
        <label className="member-sort">
          <span>Sort by</span>
          <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
            <option value="name-asc">Name A-Z</option>
            <option value="name-desc">Name Z-A</option>
            <option value="role">Role</option>
          </select>
        </label>
      </section>

      {isLoading ? (
        <div className="member-state" role="status">Loading members...</div>
      ) : isError ? (
        <div className="member-state member-state-error" role="alert">
          Members could not be loaded. Please try again later.
        </div>
      ) : members.length ? (
        <section className="member-grid" aria-label="Member search results">
          {members.map((member) => {
            const positions = getPositions(member.position);
            return (
              <article className="member-card" key={member.email || member.name}>
                <div className="member-card-heading">
                  {renderAvatar(member)}
                  <div className="member-identity">
                    <h2>{member.name || 'Airost member'}</h2>
                    <p>{positions[0] || 'Airost member'}</p>
                  </div>
                </div>
                <dl className="member-facts">
                  <div><dt>Course</dt><dd>{member.course || 'Not listed'}</dd></div>
                  <div><dt>Year</dt><dd>{member.year || 'Not listed'}</dd></div>
                </dl>
                <p className="member-description">
                  {member.description || positions.slice(1).join(' | ') || 'Airost club member'}
                </p>
                <div className="member-card-footer">
                  <span>{member.verified ? 'Verified member' : 'Airost member'}</span>
                  <button type="button" onClick={() => setSelectedMember(member)}>
                    View profile <FiArrowRight aria-hidden="true" />
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      ) : (
        <div className="member-state">
          <h2>No members found</h2>
          <p>Try another name or adjust your filters.</p>
        </div>
      )}

      <footer className="member-directory-footer">
        <span>{isLoading ? 'Loading member directory' : `Showing ${members.length} of ${users.length} members`}</span>
        <span>Search by name to find another club member.</span>
      </footer>

      {selectedMember && (
        <div className="member-dialog-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setSelectedMember(null);
        }}>
          <section className="member-dialog" role="dialog" aria-modal="true" aria-labelledby="member-dialog-title">
            <button
              className="member-dialog-close"
              type="button"
              onClick={() => setSelectedMember(null)}
              aria-label="Close profile"
            >
              <FiX aria-hidden="true" />
            </button>
            <div className="member-dialog-identity">
              {renderAvatar(selectedMember)}
              <div>
                <h2 id="member-dialog-title">{selectedMember.name || 'Airost member'}</h2>
                <p>{getPositions(selectedMember.position)[0] || 'Airost member'}</p>
              </div>
            </div>
            <dl className="member-dialog-details">
              <div><dt>Email</dt><dd>{selectedMember.email || 'Not listed'}</dd></div>
              <div><dt>Course</dt><dd>{selectedMember.course || 'Not listed'}</dd></div>
              <div><dt>Year</dt><dd>{selectedMember.year || 'Not listed'}</dd></div>
              {selectedMember.description && (
                <div><dt>About</dt><dd>{selectedMember.description}</dd></div>
              )}
            </dl>
          </section>
        </div>
      )}
    </main>
  );
};

export default MemberDirectory;