const repository = require('../project.repository');
const history = require('./history.service');
const AppError = require('../../../shared/errors/AppError');
const {
  BAD_REQUEST,
  NOT_FOUND,
  FORBIDDEN,
} = require('../../../shared/constants/httpStatus');
const { PLATFORM_ROLES } = require('../../../shared/constants/roles');

const TASK_EDITABLE_FIELDS = ['title', 'column', 'assignee', 'description', 'priority', 'dueDate'];

const getProjectBoard = async (projectId) => {
  const board = await repository.findBoard({ projectId });
  if (!board) throw new AppError(NOT_FOUND, 'NOT_FOUND', 'Project board not found');
  return board;
};

const taskOwner = (user) => user?.email || user?.name || String(user?._id || user?.id || '');
const actorIdentifiers = (user) =>
  [user?._id, user?.id, user?.email, user?.name]
    .filter(Boolean)
    .map(String)
    .map((value) => value.toLowerCase());

const isAdmin = (user) => {
  const positions = user?.positions ?? user?.position;
  return (Array.isArray(positions) ? positions : [positions]).some(
    (role) => typeof role === 'string' && role.trim().toLowerCase() === PLATFORM_ROLES.ADMIN,
  );
};

const assertCanChangeTask = (task, user) => {
  if (!user || (!isAdmin(user) && !actorIdentifiers(user).includes(String(task.createdBy || '').toLowerCase()))) {
    throw new AppError(FORBIDDEN, 'FORBIDDEN', 'Only the task creator or an admin can modify or delete this task');
  }
};

const assertUniqueTaskIds = (tasks, source) => {
  const ids = tasks.map((task) => task.task_id);
  if (ids.some((taskId) => typeof taskId !== 'string' || !taskId.trim())) {
    throw new AppError(BAD_REQUEST, 'VALIDATION_ERROR', `${source} tasks must have non-empty task IDs`);
  }
  if (new Set(ids).size !== ids.length) {
    throw new AppError(BAD_REQUEST, 'VALIDATION_ERROR', `${source} task IDs must be unique`);
  }
};

const toStoredTask = (submittedTask, existingTask, user) => {
  const storedTask = {};
  for (const field of TASK_EDITABLE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(submittedTask, field)) {
      storedTask[field] = submittedTask[field];
    } else if (existingTask?.[field] !== undefined) {
      storedTask[field] = existingTask[field];
    }
  }
  storedTask.task_id = existingTask?.task_id || submittedTask.task_id;
  storedTask.createdBy = existingTask ? existingTask.createdBy : taskOwner(user);
  if (existingTask?._id) storedTask._id = existingTask._id;
  return storedTask;
};

const prepareBoardChanges = (oldTasks, submittedTasks, user) => {
  assertUniqueTaskIds(oldTasks, 'Persisted');
  assertUniqueTaskIds(submittedTasks, 'Submitted');

  const oldTasksById = new Map(oldTasks.map((task) => [task.task_id, task]));
  const submittedIds = new Set(submittedTasks.map((task) => task.task_id));
  const changes = { created: [], updated: [], deleted: [] };
  const nextTasks = submittedTasks.map((submittedTask) => {
    const oldTask = oldTasksById.get(submittedTask.task_id);
    if (!oldTask) {
      const task = toStoredTask(submittedTask, null, user);
      changes.created.push(task);
      return task;
    }

    const hasChanges = TASK_EDITABLE_FIELDS.some(
      (field) => Object.prototype.hasOwnProperty.call(submittedTask, field)
        && !history.valuesAreEqual(oldTask[field], submittedTask[field], field),
    );
    if (hasChanges) {
      assertCanChangeTask(oldTask, user);
      const task = toStoredTask(submittedTask, oldTask, user);
      changes.updated.push({ oldTask, newTask: task });
      return task;
    }

    return toStoredTask({}, oldTask, user);
  });

  for (const oldTask of oldTasks) {
    if (submittedIds.has(oldTask.task_id)) continue;
    assertCanChangeTask(oldTask, user);
    changes.deleted.push(oldTask);
  }

  return { nextTasks, changes };
};

const recordTaskChanges = async (changes, projectId, user) => {
  const changedBy = taskOwner(user);
  for (const task of changes.created) {
    await history.trackTaskCreation(task, projectId, changedBy);
  }
  for (const { oldTask, newTask } of changes.updated) {
    await history.trackTaskChanges(oldTask, newTask, projectId, changedBy);
  }
  for (const task of changes.deleted) {
    await history.trackTaskDeletion(task, projectId, changedBy);
  }
};

const createOrUpdateProjectBoard = async ({ projectId, tasks }, user) => {
  const board = await repository.findBoard({ projectId });
  const oldTasks = board?.tasks || [];
  const { nextTasks, changes } = prepareBoardChanges(oldTasks, tasks, user);

  if (!board) {
    const createdBoard = await repository.createBoard({ projectId, tasks: nextTasks });
    await recordTaskChanges(changes, projectId, user);
    return { board: createdBoard, status: 201 };
  }

  board.tasks = nextTasks;
  await repository.saveBoard(board);
  await recordTaskChanges(changes, projectId, user);
  return { board, status: 200 };
};

const refreshProjectBoard = async ({ projectId, tasks }, user) => {
  const board = await repository.findBoard({ projectId });
  if (!board) throw new AppError(NOT_FOUND, 'NOT_FOUND', 'Project board not found');

  const { nextTasks, changes } = prepareBoardChanges(board.tasks || [], tasks, user);
  const updatedBoard = await repository.updateBoardTasks(projectId, nextTasks);
  await recordTaskChanges(changes, projectId, user);
  return updatedBoard;
};

const updateTask = async ({ projectId, tasks }, user) => {
  assertUniqueTaskIds([tasks], 'Submitted');
  const board = await repository.findBoard({ projectId, 'tasks.task_id': tasks.task_id });
  if (!board) throw new AppError(NOT_FOUND, 'NOT_FOUND', 'Task not found');
  assertUniqueTaskIds(board.tasks || [], 'Persisted');
  const oldTask = board.tasks.find((task) => task.task_id === tasks.task_id);
  assertCanChangeTask(oldTask, user);

  const updatedTask = toStoredTask(tasks, oldTask, user);
  const updatedBoard = await repository.updateTask(projectId, oldTask.task_id, updatedTask);
  await history.trackTaskChanges(oldTask, updatedTask, projectId, taskOwner(user));
  return updatedBoard;
};

module.exports = {
  getProjectBoard,
  createOrUpdateProjectBoard,
  refreshProjectBoard,
  updateTask,
  getTaskHistory: history.getTaskHistory,
  getProjectHistory: history.getProjectHistory,
};
