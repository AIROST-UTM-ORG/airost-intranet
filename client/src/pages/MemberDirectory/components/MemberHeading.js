import React from 'react';

const MemberHeading = ({ count, search }) => (
  <section className="member-heading" aria-labelledby="member-heading-title">
    <div>
      <p className="member-eyebrow">Club members</p>
      <h1 id="member-heading-title">Member search results</h1>
      <p className="member-heading-caption">
        {search ? `Members found for "${search}"` : 'Get to know the people behind Airost'}
      </p>
    </div>
    <div className="member-count" aria-live="polite">
      <strong>{count}</strong>
      <span>{count === 1 ? 'member' : 'members'}</span>
    </div>
  </section>
);

export default MemberHeading;