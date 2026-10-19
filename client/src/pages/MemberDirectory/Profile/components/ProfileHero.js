import React from 'react';
import { CgProfile } from 'react-icons/cg';
import { FiEdit2, FiGithub, FiInstagram, FiLinkedin, FiMail, FiMapPin } from 'react-icons/fi';
import { getSocialUrl } from '../utils/socialUrl';

const ProfileHero = ({ member, location, onEdit }) => (
  <section className="profile-hero" aria-labelledby="profile-name">
    <div className="profile-hero-top">
      <div>
        <p className="profile-eyebrow">Student profile</p>
        <h1 id="profile-name">{member.name || 'Airost member'}</h1>
      </div>
      <div className="profile-contact-pills">
        {member.email && <a href={`mailto:${member.email}`}><FiMail aria-hidden="true" />{member.email}</a>}
        {location && <span><FiMapPin aria-hidden="true" />{location}</span>}
        {onEdit && (
          <button className="profile-edit-button" type="button" onClick={onEdit}>
            <FiEdit2 aria-hidden="true" /> Edit profile
          </button>
        )}
      </div>
    </div>
    <div className="profile-hero-body">
      {member.photo ? (
        <img className="profile-photo" src={member.photo} alt={`${member.name || 'Member'} profile`} />
      ) : (
        <CgProfile className='profile-photo'/>
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
          {member.linkedin && (
            <a href={getSocialUrl(member.linkedin, 'linkedin')} target="_blank" rel="noreferrer">
              <FiLinkedin aria-hidden="true" /> LinkedIn
            </a>
          )}
        </div>
      </div>
    </div>
  </section>
);

export default ProfileHero;