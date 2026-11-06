import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MemberCard from './components/MemberCard';
import MemberFilters from './components/MemberFilters';
import MemberHeading from './components/MemberHeading';
import ProfileSearch from './components/ProfileSearch';
import './styles/member-directory.css';
import './styles/shared.css';
import useFetchUsers from '../../hooks/useFetchUsers';
import useAuth from '../../hooks/useAuth';
import { getPositions } from './utils/memberUtils';

const MemberDirectory = () => {
  const { data: users = [], isLoading, isError } = useFetchUsers();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');
  const [selectedYear, setSelectedYear] = useState('all');
  const [sortBy, setSortBy] = useState('name-asc');

  const roles = useMemo(() => Array.from(new Set(
    users.flatMap((user) => getPositions(user.positions)),
  )).sort((left, right) => left.localeCompare(right)), [users]);

  const years = useMemo(() => Array.from(new Set(
    users.map((user) => user.year).filter(Boolean),
  )).sort((left, right) => left.localeCompare(right)), [users]);

  const members = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filteredUsers = users.filter((user) => {
      const positions = getPositions(user.positions);
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
        const leftRole = getPositions(left.positions)[0] || '';
        const rightRole = getPositions(right.positions)[0] || '';
        return leftRole.localeCompare(rightRole);
      }
      return (left.name || '').localeCompare(right.name || '');
    });
  }, [users, search, selectedRole, selectedYear, sortBy]);

  return (
    <main className="member-directory">
      <ProfileSearch
        users={users}
        value={search}
        onChange={setSearch}
        onSelectMember={(member) => navigate(
          `/members/${encodeURIComponent(member.email)}`,
          { state: { member } },
        )}
        label="Search members"
        placeholder="Search by name, role, or course"
        context="Club members"
        showClear
        showEmptyState={false}
      />
      <MemberHeading count={members.length} search={search} />
      <MemberFilters
        roles={roles}
        years={years}
        selectedRole={selectedRole}
        selectedYear={selectedYear}
        sortBy={sortBy}
        onRoleChange={setSelectedRole}
        onYearChange={setSelectedYear}
        onSortChange={setSortBy}
      />

      {isLoading ? (
        <div className="member-state" role="status">Loading members...</div>
      ) : isError ? (
        <div className="member-state member-state-error" role="alert">
          Members could not be loaded. Please try again later.
        </div>
      ) : members.length ? (
        <section className="member-grid" aria-label="Member search results">
          {members.map((member) => {
            const positions = getPositions(member.positions);
            return (
              <MemberCard
                key={member.email || member.name}
                member={member}
                positions={positions}
                isCurrentUser={Boolean(currentUser && (
                  (currentUser._id && member._id === currentUser._id)
                  || (currentUser.email && member.email?.toLowerCase() === currentUser.email.toLowerCase())
                ))}
                onViewProfile={() => navigate(`/members/${encodeURIComponent(member.email)}`, { state: { member } })}
              />
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

    </main>
  );
};

export default MemberDirectory;
