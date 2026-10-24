import React from 'react';

const FeaturedProject = ({ project }) => (
  <aside className="profile-panel profile-project-panel" aria-labelledby="profile-project-title">
    <div className="profile-panel-heading">
      <h2 id="profile-project-title">Project</h2>
      <p>Featured student project</p>
    </div>
    <div className="profile-project">
      {project ? (
        <>
          <h3>{project.title || 'Featured project'}</h3>
          <p>{project.description || 'Project details have not been added yet.'}</p>
          {project.role &&
            <div className="profile-project-meta"><span>Role</span><strong>{project.role}</strong></div>}
          {project.status && <div className="profile-project-meta"><span>Status</span><strong>{project.status}</strong></div>}
          {Array.isArray(project.technologies) && (
            <div className="profile-project-tags">
              {project.technologies.map((technology) => <span key={technology}>{technology}</span>)}
            </div>
          )}
        </>
      ) : (
        <p className="profile-project-empty">No featured project has been added to this profile.</p>
      )}
    </div>
  </aside>
);

export default FeaturedProject;