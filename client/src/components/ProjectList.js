import { Link } from "react-router-dom";
import useAuth from "../hooks/useAuth";

const ProjectList = ({ projects, onDeleteProject }) => {
  const { user } = useAuth();
  const isAdmin =
    user &&
    user.position &&
    (Array.isArray(user.position) ? user.position.includes("admin") : user.position === "admin");

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
            {isAdmin && (
              <button
                className="btn btn-error btn-sm mt-2"
                onClick={(e) => handleDelete(e, project.projectId)}
              >
                Delete Project
              </button>
            )}
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
