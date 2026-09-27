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
      {projects.map((project) => (
        <div className="project-preview" key={project.id}>
          <Link style={{ textDecoration: "none" }} to={``}>
            <h2>{project.title}</h2>
            {!!project.advisor ? (
              <p>
                Advised by {project.advisor} | Lead by {project.lead} | {project.category}
              </p>
            ) : (
              <p>
                {project.lead ? `Lead by ${project.lead}` : ""}{" "}
                {project.category ? `| ${project.category}` : ""}
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
      ))}
    </div>
  );
};

export default ProjectList;
