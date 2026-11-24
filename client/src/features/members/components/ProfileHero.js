import React from 'react';
import { CgProfile } from 'react-icons/cg';
import { FiEdit2, FiGithub, FiInstagram, FiLinkedin, FiMail, FiMapPin } from 'react-icons/fi';
import { getSocialUrl } from '../utils/socialUrl';

const ProfileHero = ({ member, location, onEdit }) => {
  const instagramUrl = getSocialUrl(member.instagramUrl, 'instagram');
  const githubUrl = getSocialUrl(member.githubUrl, 'github');
  const linkedinUrl = getSocialUrl(member.linkedinUrl, 'linkedin');

  return (
    <section
      className="profile-hero before:pointer-events-none before:absolute before:-z-[1] before:right-[10%] before:top-[-215px] before:h-[360px] before:w-[360px] before:rounded-full before:border before:border-[rgba(108,211,201,0.28)] before:content-[''] before:shadow-[0_0_0_30px_rgba(108,211,201,0.045),0_0_0_60px_rgba(108,211,201,0.035),0_0_0_90px_rgba(108,211,201,0.025)]"
      aria-labelledby="profile-name"
    >
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
        {member.photoUrl ? (
          <img className="profile-photo" src={member.photoUrl} alt={`${member.name || 'Member'} profile`} />
        ) : (
          <CgProfile className="profile-photo" />
        )}
        <div className="profile-intro">
          <p>{member.description || `${member.name || 'This member'} is part of the Airost club.`}</p>
          <div className="profile-social-links">
            {instagramUrl && (
              <a href={instagramUrl} target="_blank" rel="noreferrer">
                <FiInstagram aria-hidden="true" /> Instagram
              </a>
            )}
            {githubUrl && (
              <a href={githubUrl} target="_blank" rel="noreferrer">
                <FiGithub aria-hidden="true" /> GitHub
              </a>
            )}
            {linkedinUrl && (
              <a href={linkedinUrl} target="_blank" rel="noreferrer">
                <FiLinkedin aria-hidden="true" /> LinkedIn
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProfileHero;