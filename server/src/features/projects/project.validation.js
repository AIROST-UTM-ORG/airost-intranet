const AppError = require("../../shared/errors/AppError");
const { BAD_REQUEST } = require("../../shared/constants/httpStatus");

const invalid = (message) => {
  throw new AppError(BAD_REQUEST, "VALIDATION_ERROR", message);
};
const TASK_EDITABLE_FIELDS = [
  "title",
  "column",
  "assignee",
  "description",
  "priority",
  "dueDate",
];
const TASK_INPUT_FIELDS = new Set([
  "task_id",
  ...TASK_EDITABLE_FIELDS,
  "createdBy",
  "_id",
]);

const parseProjectId = (value) => {
  if (
    (typeof value !== "number" && typeof value !== "string") ||
    String(value).trim() === ""
  )
    invalid("Project ID must be a positive integer.");
  const stringValue = String(value).trim();
  if (!/^\d+$/.test(stringValue))
    invalid("Project ID must be a positive integer.");
  const projectId = Number(stringValue);
  if (!Number.isSafeInteger(projectId) || projectId <= 0)
    invalid("Project ID must be a positive integer.");
  return projectId;
};

const sanitizeTask = (task) => {
  if (!task || typeof task !== "object" || Array.isArray(task))
    invalid("Each task must be an object.");
  const unsupportedFields = Object.keys(task).filter(
    (field) => !TASK_INPUT_FIELDS.has(field),
  );
  if (unsupportedFields.length) invalid("Task contains unsupported fields.");
  if (
    typeof task.task_id !== "string" ||
    !task.task_id.trim() ||
    task.task_id.trim().length > 200
  )
    invalid(
      "Each task must have a non-empty task_id of at most 200 characters.",
    );

  const sanitizedTask = { task_id: task.task_id.trim() };
  for (const field of TASK_EDITABLE_FIELDS) {
    if (task[field] === undefined) continue;
    if (field === "dueDate") {
      if (
        task[field] !== null &&
        (typeof task[field] !== "string" ||
          Number.isNaN(Date.parse(task[field])))
      )
        invalid("Task dueDate must be a valid date or null.");
      sanitizedTask[field] = task[field];
    } else {
      if (task[field] !== null && typeof task[field] !== "string")
        invalid(`Task ${field} must be a string or null.`);
      sanitizedTask[field] = task[field];
    }
  }
  return sanitizedTask;
};

const validateTaskList = (tasks) => {
  if (!Array.isArray(tasks)) invalid("tasks must be an array.");
  const sanitizedTasks = tasks.map(sanitizeTask);
  const taskIds = sanitizedTasks.map((task) => task.task_id);
  if (new Set(taskIds).size !== taskIds.length)
    invalid("Task IDs must be unique.");
  return sanitizedTasks;
};

const validateCreateProject = (req) => {
  const body = req.body;
  if (!body || typeof body !== "object" || Array.isArray(body))
    invalid("Request body must be an object.");
  if (typeof body.title !== "string" || !body.title.trim())
    invalid("Project title is required.");
  return { sanitizedData: { ...body, title: body.title.trim() } };
};

const validateCreateOrUpdateProjectBoard = (req) => {
  const body = req.body;
  if (!body || typeof body !== "object" || Array.isArray(body))
    invalid("Request body must be an object.");
  return {
    sanitizedData: {
      projectId: parseProjectId(body.projectId),
      tasks: validateTaskList(body.tasks),
    },
  };
};

const validateProjectIdParam = (parameterName) => (req) => ({
  sanitizedData: { projectId: parseProjectId(req.params[parameterName]) },
});

const validateUpdateTask = (req) => {
  const body = req.body;
  if (!body || typeof body !== "object" || Array.isArray(body))
    invalid("Request body must be an object.");
  if (
    !body.tasks ||
    typeof body.tasks !== "object" ||
    Array.isArray(body.tasks)
  )
    invalid("tasks must be an object.");
  const tasks = sanitizeTask(body.tasks);
  return {
    sanitizedData: {
      projectId: parseProjectId(body.projectId),
      tasks,
    },
  };
};

module.exports = {
  validateCreateProject,
  validateCreateOrUpdateProjectBoard,
  validateProjectIdParam,
  validateUpdateTask,
};
