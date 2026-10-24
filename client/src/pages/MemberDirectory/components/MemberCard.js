import { FiArrowRight } from 'react-icons/fi';
import { CgProfile } from "react-icons/cg";

const MemberCard = ({ member, positions, onViewProfile }) => (
  <article className="member-card">
    <div className="member-card-heading">
      {member.photo ? (
        <img className="member-avatar" src={member.photo} alt="" />
      ) : (
        <CgProfile className='member-avatar'/>

      )}
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
      <button type="button" disabled={!member.email} onClick={onViewProfile}>
        View profile <FiArrowRight aria-hidden="true" />
      </button>
    </div>
  </article>
);

export default MemberCard;