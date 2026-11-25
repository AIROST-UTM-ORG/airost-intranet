const AppError = require('../../shared/errors/AppError');
const { BAD_REQUEST } = require('../../shared/constants/httpStatus');

const invalid = (message) => { throw new AppError(BAD_REQUEST, 'VALIDATION_ERROR', message); };

const validateCreateProject = (req) => {
  const body = req.body;
  if (!body || typeof body !== "object" || Array.isArray(body))
    invalid("Request body must be an object.");
  if (typeof body.title !== "string" || !body.title.trim())
    invalid("Project title is required.");
  return { sanitizedData: { ...body, title: body.title.trim() } };
};

const validateUpdateTask = (req) => {
  const body = req.body;
  if (!body || typeof body !== "object" || Array.isArray(body))
    invalid("Request body must be an object.");
  if (!Number.isFinite(Number(body.projectId)))
    invalid("projectId must be numeric.");
  if (
    !body.tasks ||
    typeof body.tasks !== "object" ||
    Array.isArray(body.tasks)
  )
    invalid("tasks must be an object.");
  if (typeof body.tasks.task_id !== "string" || !body.tasks.task_id.trim())
    invalid("Task ID is required.");
  return {
    sanitizedData: {
      ...body,
      projectId: Number(body.projectId),
      tasks: body.tasks,
    },
  };
};

module.exports = { validateCreateProject, validateUpdateTask };
