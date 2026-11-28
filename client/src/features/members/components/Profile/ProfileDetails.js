import React from 'react';

const ProfileDetails = ({ memberName, details }) => (
  <section className="profile-panel" aria-labelledby="profile-details-title">
    <div className="profile-panel-heading">
      <h2 id="profile-details-title">Profile details</h2>
      <p>Core information for {memberName || 'this member'}</p>
    </div>
    <dl className="profile-details-grid">
      {details.map(([label, value]) => (
        <div className="profile-detail" key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  </section>
);

export default ProfileDetails;