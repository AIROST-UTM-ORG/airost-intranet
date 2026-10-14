import React from 'react';
import { FiGithub, FiInstagram, FiMail, FiMapPin } from 'react-icons/fi';

const getInitials = (name = '') => name
  .trim()
  .split(/\s+/)
  .slice(0, 2)
  .map((part) => part[0])
  .join('')
  .toUpperCase();

const getSocialUrl = (value, network) => {
  if (value.startsWith('http')) return value;
  const handle = network === 'instagram' ? value.replace(/^@/, '') : value;
  return `https://${network}.com/${handle}`;
};

const ProfileHero = ({ member, location }) => (
  <section className="profile-hero" aria-labelledby="profile-name">
    <div className="profile-hero-top">
      <div>
        <p className="profile-eyebrow">Student profile</p>
        <h1 id="profile-name">{member.name || 'Airost member'}</h1>
      </div>
      <div className="profile-contact-pills">
        {member.email && <a href={`mailto:${member.email}`}><FiMail aria-hidden="true" />{member.email}</a>}
        {location && <span><FiMapPin aria-hidden="true" />{location}</span>}
      </div>
    </div>
    <div className="profile-hero-body">
      {member.photo ? (
        <img className="profile-photo" src={member.photo} alt={`${member.name || 'Member'} profile`} />
      ) : (
        <div className="profile-photo profile-photo-initials" aria-hidden="true">{getInitials(member.name)}</div>
      )}
      <div className="profile-intro">
        <p>{member.description || `${member.name || 'This member'} is part of the Airost club.`}</p>
        <div className="profile-social-links">
          {member.instagram && (
            <a href={getSocialUrl(member.instagram, 'instagram')} target="_blank" rel="noreferrer">
              <FiInstagram aria-hidden="true" /> Instagram
            </a>
          )}
          {member.github && (
            <a href={getSocialUrl(member.github, 'github')} target="_blank" rel="noreferrer">
              <FiGithub aria-hidden="true" /> GitHub
            </a>
          )}
        </div>
      </div>
    </div>
  </section>
);

export default ProfileHero;