import React from 'react';
import { FiArrowLeft } from 'react-icons/fi';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import useFetchUsers from '../../hooks/useFetchUsers';
import FeaturedProject from './components/FeaturedProject';
import ProfileDetails from './components/ProfileDetails';
import ProfileHero from './components/ProfileHero';
import ProfileSearch from '../MemberDirectory/components/ProfileSearch';
import useAuth from '../../hooks/useAuth';
import { getPositions } from '../MemberDirectory/utils/memberUtils';
import './styles/profile.css';
import '../MemberDirectory/styles/shared.css';

const Profile = ({ isCurrentUser = false }) => {
  const { email } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: users = [], isLoading, isError } = useFetchUsers();
  const routeEmail = decodeURIComponent(email || '');
  const navigationMember = location.state?.member;
  const member = isCurrentUser
    ? user
    : navigationMember?.email === routeEmail
      ? navigationMember
      : users.find((user) => user.email === routeEmail);
  const positions = getPositions(member?.profileTitle || member?.position);
  const project = member?.featuredProject;
  const locationText = [
    member?.state,
    member?.country,
  ].filter(Boolean).join(', ') || member?.location || member?.origin || '';

  if ((isCurrentUser && !user) || (isLoading && !member)) {
    return <main className="profile-page"><div className="profile-state" role="status">Loading profile...</div></main>;
  }

  if ((!isCurrentUser && isError) || !member) {
    return (
      <main className="profile-page">
        <button className="profile-back" type="button" onClick={() => navigate(isCurrentUser ? '/' : '/members')}>
          <FiArrowLeft aria-hidden="true" /> {isCurrentUser ? 'Back to dashboard' : 'Back to members'}
        </button>
        <div className="profile-state" role={!isCurrentUser && isError ? 'alert' : 'status'}>
          {!isCurrentUser && isError ? 'The profile could not be loaded.' : 'This member profile was not found.'}
        </div>
      </main>
    );
  }

  const details = [
    ['Name', member.name],
    ['Position', positions.join(', ')],
    ['Year', member.year],
    ['Course', member.course],
    ['Location', locationText],
    ['Email', member.email],
    ['LinkedIn', member.linkedin],
    ['GitHub', member.github],
    ['Phone', member.phonenum],
  ].filter(([, value]) => value);

  return (
    <main className="profile-page">
      {!isCurrentUser && (
        <div className="profile-search-toolbar">
          <button
            className="profile-back profile-back-directory"
            type="button"
            onClick={() => navigate('/members')}
          >
            <FiArrowLeft aria-hidden="true" /> Back to members
          </button>
          <ProfileSearch
            users={users}
            currentMemberEmail={member.email}
            onSelectMember={(selectedMember) => navigate(
              `/members/${encodeURIComponent(selectedMember.email)}`,
              { state: { member: selectedMember } },
            )}
          />
        </div>
      )}
      <ProfileHero
        member={member}
        location={locationText}
        onEdit={isCurrentUser ? () => navigate('/profile/edit') : undefined}
      />
      <div className={`profile-content${project ? '' : ' profile-content-no-project'}`}>
        <ProfileDetails memberName={member.name} details={details} />
        <FeaturedProject project={project} />
      </div>
    </main>
  );
};

export default Profile;