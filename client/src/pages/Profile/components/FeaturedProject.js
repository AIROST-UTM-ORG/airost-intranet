import React from 'react';

const FeaturedProject = ({ projects = [] }) => (
  <aside className="profile-panel profile-project-panel" aria-labelledby="profile-project-title">
    <div className="profile-panel-heading">
      <h2 id="profile-project-title">Project</h2>
      <p>Featured student project</p>
    </div>
    <div className="profile-project-list">
      {projects.length ? projects.map((project) => (
        <article className="profile-project" key={project._id}>
          <h3>{project.title || 'Featured project'}</h3>
          <p>{project.description || 'Project details have not been added yet.'}</p>
          {project.lead && <div className="profile-project-meta"><span>Lead</span><strong>{project.lead}</strong></div>}
        </article>
      )) : (
        <p className="profile-project-empty">No featured project has been added to this profile.</p>
      )}
    </div>
  </aside>
);

export default FeaturedProject;
