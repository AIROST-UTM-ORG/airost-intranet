import React from 'react';

const MemberHeading = ({ count, search }) => (
  <section className="member-heading" aria-labelledby="member-heading-title">
    <div>
      <p className="member-eyebrow"><span aria-hidden="true" /> Airost community</p>
      <h1 id="member-heading-title">People of Airost</h1>
      <p className="member-heading-caption">
        {search ? `Showing people matching “${search}”` : 'Meet the people building what comes next.'}
      </p>
    </div>
    <div className="member-count" aria-live="polite">
      <strong>{count}</strong>
      <span>{count === 1 ? 'member' : 'members'} found</span>
    </div>
  </section>
);

export default MemberHeading;