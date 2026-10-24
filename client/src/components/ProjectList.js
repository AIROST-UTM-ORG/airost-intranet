import { Link } from "react-router-dom";
import useAuth from "../hooks/useAuth";

const ProjectList = ({ projects, onDeleteProject }) => {
  const { user } = useAuth();
  const position = user?.position || user?.positions;
  const isAdmin =
    position &&
    (Array.isArray(position) ? position.includes("admin") : position === "admin");

  const isOlderProject = (proj) =>
    !proj.createdBy &&
    !proj.owner &&
    (!Array.isArray(proj.teamMembers) || proj.teamMembers.length === 0) &&
    (!Array.isArray(proj.access) || proj.access.length === 0);

  const handleDelete = (e, projectId) => {
    e.preventDefault();
    e.stopPropagation();
    if (
      window.confirm(
        "Are you sure you want to delete this project? This action cannot be undone."
      )
    ) {
      onDeleteProject(projectId);
    }
  };

  return (
    <div className="project-list w-10/12">
      {projects && projects.length > 0 ? (
        projects.map((project) => (
          <div className="project-preview" key={project.projectId || project._id}>
            <Link
              style={{ textDecoration: "none" }}
              to={project.projectId !== undefined ? `/projects/tracking/${project.projectId}` : "#"}
            >
              <h2>{project.title}</h2>
              {project.description && (
                <p className="project-description">{project.description}</p>
              )}
              {!!project.advisor ? (
                <p className="project-meta">
                  Advised by {project.advisor} | Lead by {project.lead || "Unassigned"} {project.category ? `| ${project.category}` : ""}
                </p>
              ) : (
                <p className="project-meta">
                  {project.lead ? `Lead by ${project.lead}` : ""} {project.category ? `| ${project.category}` : ""}
                </p>
              )}
            </Link>
            {/* Action buttons */}
            <div className="project-card-actions mt-3 flex items-center gap-2">
              {(isAdmin ||
                project.permissions?.canEdit ||
                (user && (
                  isOlderProject(project) ||
                  user.email === project.lead ||
                  user.name === project.lead ||
                  user.email === project.createdBy ||
                  project.teamMembers?.includes(user.email) ||
                  project.access?.includes(user.email)
                ))) && (
                <Link
                  to={`/projects/edit/${project.projectId}`}
                  className="btn btn-outline btn-sm"
                  onClick={(e) => e.stopPropagation()}
                >
                  Edit Project
                </Link>
              )}
              {(isAdmin ||
                project.permissions?.canDelete ||
                (user && (
                  user.email === project.lead ||
                  user.name === project.lead ||
                  user.email === project.createdBy
                ))) && (
                <button
                  className="btn btn-error btn-sm"
                  onClick={(e) => handleDelete(e, project.projectId)}
                >
                  Delete Project
                </button>
              )}
            </div>
          </div>
        ))
      ) : (
        <div className="bg-white rounded-xl p-8 mt-6 text-center shadow-sm border border-gray-200">
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No projects yet</h3>
          <p className="text-gray-500 text-sm">Click "Add New Project" above to create your first project.</p>
        </div>
      )}
    </div>
  );
};

export default ProjectList;
