const repository = require("../project.repository");
const history = require("./history.service");
const AppError = require("../../../shared/errors/AppError");
const {
  BAD_REQUEST,
  NOT_FOUND,
  FORBIDDEN,
} = require("../../../shared/constants/httpStatus");
const { PLATFORM_ROLES } = require("../../../shared/constants/roles");

const getProjectBoard = async (uid) => {
  const projectId = Number(uid);
  if (!Number.isFinite(projectId))
    throw new AppError(
      BAD_REQUEST,
      "VALIDATION_ERROR",
      "projectId is not a number",
    );
  const board = await repository.findBoard({ projectId });
  if (!board)
    throw new AppError(NOT_FOUND, "NOT_FOUND", "Project board not found");
  return board;
};

const createOrUpdateProjectBoard = async ({ projectId, tasks = [] }, user) => {
  const board = await repository.findBoard({ projectId });
  if (!board) {
    const created = await repository.createBoard({ projectId, tasks });
    for (const task of tasks)
      await history.trackTaskCreation(
        task,
        projectId,
        task.createdBy || "system",
      );
    return { board: created, status: 201 };
  }
  const oldTasks = board.tasks || [];
  assertTaskChangesAllowed(oldTasks, tasks, user);
  board.tasks = tasks;
  await repository.saveBoard(board);
  for (const task of tasks) {
    if (!oldTasks.some((oldTask) => oldTask.task_id === task.task_id))
      await history.trackTaskCreation(
        task,
        projectId,
        task.createdBy || "system",
      );
  }
  return { board, status: 200 };
};

const isAdmin = (user) => {
  const positions = user?.positions ?? user?.position;
  return (Array.isArray(positions) ? positions : [positions]).some(
    (role) =>
      typeof role === "string" &&
      role.trim().toLowerCase() === PLATFORM_ROLES.ADMIN,
  );
};

const actorIdentifiers = (user) =>
  [user?._id, user?.id, user?.email, user?.name]
    .filter(Boolean)
    .map(String)
    .map((value) => value.toLowerCase());
const assertCanChangeTask = (task, user) => {
  if (
    !user ||
    (!isAdmin(user) &&
      !actorIdentifiers(user).includes(
        String(task.createdBy || "").toLowerCase(),
      ))
  ) {
    throw new AppError(
      FORBIDDEN,
      "FORBIDDEN",
      "Only the task creator or an admin can modify or delete this task",
    );
  }
};

const refreshProjectBoard = async ({ projectId, tasks }, user) => {
  const board = await repository.findBoard({ projectId });
  if (!board)
    throw new AppError(NOT_FOUND, "NOT_FOUND", "Project board not found");
  const nextTasks = Array.isArray(tasks) ? tasks : [];
  assertTaskChangesAllowed(board.tasks || [], nextTasks, user);
  return repository.updateBoardTasks(projectId, nextTasks);
};

const assertTaskChangesAllowed = (oldTasks, nextTasks, user) => {
  for (const oldTask of oldTasks) {
    const replacement = nextTasks.find(
      (task) => task.task_id === oldTask.task_id,
    );
    if (
      !replacement ||
      Object.keys(oldTask.toObject?.() ?? oldTask).some(
        (key) =>
          key !== "_id" &&
          key !== "__v" &&
          JSON.stringify(oldTask[key]) !== JSON.stringify(replacement[key]),
      )
    ) {
      assertCanChangeTask(oldTask, user);
    }
  }
};

const updateTask = async ({ projectId, tasks }, user) => {
  const board = await repository.findBoard({
    projectId,
    "tasks.task_id": tasks.task_id,
  });
  if (!board) throw new AppError(NOT_FOUND, "NOT_FOUND", "Task not found");
  const oldTask = board.tasks.find((task) => task.task_id === tasks.task_id);
  assertCanChangeTask(oldTask, user);
  const updated = await repository.updateTask(projectId, tasks.task_id, tasks);
  await history.trackTaskChanges(
    oldTask,
    tasks,
    projectId,
    user?.name || user?.email || String(user?._id),
  );
  return updated;
};

module.exports = {
  getProjectBoard,
  createOrUpdateProjectBoard,
  refreshProjectBoard,
  updateTask,
  getTaskHistory: history.getTaskHistory,
  getProjectHistory: history.getProjectHistory,
};
