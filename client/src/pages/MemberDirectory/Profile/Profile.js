import React from 'react';
import { FiArrowLeft } from 'react-icons/fi';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import useFetchUsers from '../../../hooks/useFetchUsers';
import FeaturedProject from './components/FeaturedProject';
import ProfileDetails from './components/ProfileDetails';
import ProfileHero from './components/ProfileHero';
import ProfileSearch from './components/ProfileSearch';
import './Profile.css';

const getPositions = (position) => (
  Array.isArray(position) ? position.filter(Boolean) : position ? [position] : []
);

const Profile = () => {
  const { email } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { data: users = [], isLoading, isError } = useFetchUsers();
  const routeEmail = decodeURIComponent(email || '');
  const navigationMember = location.state?.member;
  const member = navigationMember?.email === routeEmail
    ? navigationMember
    : users.find((user) => user.email === routeEmail);
  const positions = getPositions(member?.position);
  const project = member?.featuredProject;
  const locationText = member?.location || member?.origin || '';

  if (isLoading && !member) {
    return <main className="profile-page"><div className="profile-state" role="status">Loading profile...</div></main>;
  }

  if (isError || !member) {
    return (
      <main className="profile-page">
        <button className="profile-back" type="button" onClick={() => navigate('/members')}>
          <FiArrowLeft aria-hidden="true" /> Back to members
        </button>
        <div className="profile-state" role={isError ? 'alert' : 'status'}>
          {isError ? 'The profile could not be loaded.' : 'This member profile was not found.'}
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
  ].filter(([, value]) => value);

  return (
    <main className="profile-page">
      <ProfileSearch onOpenDirectory={() => navigate('/members')} />
      <ProfileHero member={member} location={locationText} />
      <div className={`profile-content${project ? '' : ' profile-content-no-project'}`}>
        <ProfileDetails memberName={member.name} details={details} />
        <FeaturedProject project={project} />
      </div>
    </main>
  );
};

export default Profile;