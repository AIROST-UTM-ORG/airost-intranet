const repository = require('../project.repository');
const history = require('./history.service');
const mongoose = require('mongoose');
const AppError = require('../../../shared/errors/AppError');
const {
  BAD_REQUEST,
  NOT_FOUND,
  FORBIDDEN,
  CONFLICT,
} = require('../../../shared/constants/httpStatus');
const { PLATFORM_ROLES } = require('../../../shared/constants/roles');

const TASK_EDITABLE_FIELDS = ['title', 'column', 'assignee', 'description', 'priority', 'dueDate'];

const throwConcurrentModification = () => {
  throw new AppError(CONFLICT, 'CONCURRENT_MODIFICATION', 'Project board was modified. Please reload and retry.');
};

const assertStableTransactionVersion = (board, state) => {
  const version = board ? (board.__v ?? 0) : null;
  if (!state.initialized) {
    state.initialized = true;
    state.version = version;
    return;
  }
  if (state.version !== version) throwConcurrentModification();
};

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

const recordTaskChanges = async (changes, projectId, user, session) => {
  const changedBy = taskOwner(user);
  for (const task of changes.created) {
    await history.trackTaskCreation(task, projectId, changedBy, session);
  }
  for (const { oldTask, newTask } of changes.updated) {
    await history.trackTaskChanges(oldTask, newTask, projectId, changedBy, session);
  }
  for (const task of changes.deleted) {
    await history.trackTaskDeletion(task, projectId, changedBy, session);
  }
};

const createOrUpdateProjectBoard = async ({ projectId, tasks }, user) => {
  const session = await mongoose.startSession();
  let result;
  const transactionVersion = { initialized: false };
  try {
    await session.withTransaction(async () => {
      const board = await repository.findBoard({ projectId }, session);
      assertStableTransactionVersion(board, transactionVersion);
      const oldTasks = board?.tasks || [];
      const { nextTasks, changes } = prepareBoardChanges(oldTasks, tasks, user);

      if (!board) {
        const createdBoard = await repository.createBoard({ projectId, tasks: nextTasks }, session);
        await recordTaskChanges(changes, projectId, user, session);
        result = { board: createdBoard, status: 201 };
        return;
      }

      if (changes.created.length || changes.updated.length || changes.deleted.length) {
        const updatedBoard = await repository.updateBoardTasks(projectId, nextTasks, board.__v ?? 0, session);
        if (!updatedBoard) throwConcurrentModification();
        result = { board: updatedBoard, status: 200 };
      } else {
        result = { board, status: 200 };
      }
      await recordTaskChanges(changes, projectId, user, session);
    });
  } finally {
    await session.endSession();
  }
  return result;
};

const refreshProjectBoard = async ({ projectId, tasks }, user) => {
  const session = await mongoose.startSession();
  let updatedBoard;
  const transactionVersion = { initialized: false };
  try {
    await session.withTransaction(async () => {
      const board = await repository.findBoard({ projectId }, session);
      if (!board) throw new AppError(NOT_FOUND, 'NOT_FOUND', 'Project board not found');
      assertStableTransactionVersion(board, transactionVersion);

      const { nextTasks, changes } = prepareBoardChanges(board.tasks || [], tasks, user);
      if (!changes.created.length && !changes.updated.length && !changes.deleted.length) {
        updatedBoard = board;
        return;
      }
      updatedBoard = await repository.updateBoardTasks(projectId, nextTasks, board.__v ?? 0, session);
      if (!updatedBoard) throwConcurrentModification();
      await recordTaskChanges(changes, projectId, user, session);
    });
  } finally {
    await session.endSession();
  }
  return updatedBoard;
};

const updateTask = async ({ projectId, tasks }, user) => {
  assertUniqueTaskIds([tasks], 'Submitted');
  const session = await mongoose.startSession();
  let updatedBoard;
  const transactionVersion = { initialized: false };
  try {
    await session.withTransaction(async () => {
      const board = await repository.findBoard({ projectId, 'tasks.task_id': tasks.task_id }, session);
      if (!board) throw new AppError(NOT_FOUND, 'NOT_FOUND', 'Task not found');
      assertStableTransactionVersion(board, transactionVersion);
      assertUniqueTaskIds(board.tasks || [], 'Persisted');
      const oldTask = board.tasks.find((task) => task.task_id === tasks.task_id);
      assertCanChangeTask(oldTask, user);

      const hasChanges = TASK_EDITABLE_FIELDS.some(
        (field) => Object.prototype.hasOwnProperty.call(tasks, field)
          && !history.valuesAreEqual(oldTask[field], tasks[field], field),
      );
      if (!hasChanges) {
        updatedBoard = board;
        return;
      }

      const updatedTask = toStoredTask(tasks, oldTask, user);
      const nextTasks = board.tasks.map((task) => task.task_id === oldTask.task_id ? updatedTask : task);
      updatedBoard = await repository.updateBoardTasks(projectId, nextTasks, board.__v ?? 0, session);
      if (!updatedBoard) throwConcurrentModification();
      await history.trackTaskChanges(oldTask, updatedTask, projectId, taskOwner(user), session);
    });
  } finally {
    await session.endSession();
  }
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
