const repository = require("../project.repository");

const describeChange = (field, oldValue, newValue, changeType) => {
  if (changeType === "created") return "Task created";
  if (changeType === "deleted") return "Task deleted";
  switch (field) {
    case "title":
      return `Title changed from "${oldValue}" to "${newValue}"`;
    case "description":
      return oldValue ? "Description updated" : "Description added";
    case "column":
      return `Status changed from "${oldValue}" to "${newValue}"`;
    case "assignee":
      return !oldValue
        ? `Assigned to ${newValue}`
        : !newValue
          ? `Unassigned from ${oldValue}`
          : `Reassigned from ${oldValue} to ${newValue}`;
    case "priority":
      return `Priority changed from "${oldValue}" to "${newValue}"`;
    case "dueDate":
      return !oldValue
        ? `Due date set to ${new Date(newValue).toLocaleDateString()}`
        : !newValue
          ? "Due date removed"
          : `Due date changed from ${new Date(oldValue).toLocaleDateString()} to ${new Date(newValue).toLocaleDateString()}`;
    default:
      return `${field} updated`;
  }
};

const valuesAreEqual = (oldValue, newValue, field) => {
  if (oldValue == null && newValue == null) return true;
  if (oldValue == null || newValue == null) return false;
  if (field === "dueDate")
    return (
      new Date(oldValue).toISOString() === new Date(newValue).toISOString()
    );
  if (typeof oldValue === "string" && typeof newValue === "string")
    return oldValue.trim() === newValue.trim();
  return oldValue === newValue;
};

const createHistoryEntry = (
  taskId,
  projectId,
  changeType,
  field,
  oldValue,
  newValue,
  changedBy,
) =>
  repository.createHistory({
    taskId,
    projectId,
    changeType,
    field,
    oldValue,
    newValue,
    changedBy,
    changeDescription: describeChange(field, oldValue, newValue, changeType),
  });

const trackTaskChanges = async (oldTask, newTask, projectId, changedBy) => {
  const entries = [];
  for (const field of [
    "title",
    "description",
    "column",
    "assignee",
    "priority",
    "dueDate",
  ]) {
    const oldValue = oldTask?.[field] ?? null;
    const newValue = newTask[field] ?? null;
    if (!valuesAreEqual(oldValue, newValue, field))
      entries.push(
        await createHistoryEntry(
          newTask.task_id,
          projectId,
          "updated",
          field,
          oldValue,
          newValue,
          changedBy,
        ),
      );
  }
  return entries;
};

const trackTaskCreation = (task, projectId, createdBy) =>
  createHistoryEntry(
    task.task_id,
    projectId,
    "created",
    "task_created",
    null,
    null,
    createdBy,
  );

const trackTaskDeletion = (task, projectId, deletedBy) =>
  createHistoryEntry(
    task.task_id,
    projectId,
    "deleted",
    "task_deleted",
    null,
    null,
    deletedBy,
  );
const getTaskHistory = (taskId) => repository.findTaskHistory(taskId);

const getProjectHistory = (projectId) =>
  repository.findProjectHistory(projectId);

module.exports = {
  createHistoryEntry,
  trackTaskChanges,
  trackTaskCreation,
  trackTaskDeletion,
  getTaskHistory,
  getProjectHistory,
  generateChangeDescription: describeChange,
  valuesAreEqual,
};
