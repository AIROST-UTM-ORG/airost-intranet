jest.mock('../../../src/features/projects/project.repository', () => ({
  findBoard: jest.fn(),
  createBoard: jest.fn(),
  saveBoard: jest.fn(),
  updateBoardTasks: jest.fn(),
  updateTask: jest.fn(),
}));

jest.mock('../../../src/features/projects/services/history.service', () => ({
  trackTaskCreation: jest.fn(),
  trackTaskChanges: jest.fn(),
  trackTaskDeletion: jest.fn(),
  valuesAreEqual: (oldValue, newValue, field) => {
    if (oldValue == null && newValue == null) return true;
    if (oldValue == null || newValue == null) return false;
    if (field === 'dueDate') return new Date(oldValue).toISOString() === new Date(newValue).toISOString();
    return typeof oldValue === 'string' && typeof newValue === 'string'
      ? oldValue.trim() === newValue.trim()
      : oldValue === newValue;
  },
}));

const mongoose = require('mongoose');
const repository = require('../../../src/features/projects/project.repository');
const history = require('../../../src/features/projects/services/history.service');
const taskService = require('../../../src/features/projects/services/task.service');

describe('projects task service authorization and history', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(mongoose, 'startSession').mockResolvedValue({
      withTransaction: jest.fn((callback) => callback()),
      endSession: jest.fn(),
    });
  });

  test('rejects duplicate replacement IDs before persisting board changes', async () => {
    const board = { tasks: [] };
    repository.findBoard.mockResolvedValue(board);

    await expect(taskService.refreshProjectBoard({
      projectId: 2,
      tasks: [{ task_id: 'duplicate' }, { task_id: 'duplicate' }],
    }, { email: 'admin@example.com', positions: ['admin'] })).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
    });
    expect(repository.updateBoardTasks).not.toHaveBeenCalled();
  });

  test('checks ownership before removing a task and records deletion for its owner', async () => {
    const protectedTask = { task_id: 'protected', title: 'Keep', createdBy: 'owner@example.com' };
    repository.findBoard.mockResolvedValue({ tasks: [protectedTask] });
    repository.updateBoardTasks.mockResolvedValue({ projectId: 3, tasks: [] });

    await expect(taskService.refreshProjectBoard({ projectId: 3, tasks: [] }, { email: 'other@example.com' }))
      .rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect(repository.updateBoardTasks).not.toHaveBeenCalled();

    await taskService.refreshProjectBoard({ projectId: 3, tasks: [] }, { email: 'owner@example.com' });
    expect(repository.updateBoardTasks).toHaveBeenCalledWith(3, [], expect.any(Object));
    expect(history.trackTaskDeletion).toHaveBeenCalledWith(protectedTask, 3, 'owner@example.com', expect.any(Object));
  });

  test('assigns new task ownership from the session user instead of request data', async () => {
    repository.findBoard.mockResolvedValue(null);
    repository.createBoard.mockImplementation(async (board) => board);

    const result = await taskService.createOrUpdateProjectBoard({
      projectId: 4,
      tasks: [{ task_id: 'new-task', title: 'New', createdBy: 'forged@example.com' }],
    }, { email: 'authenticated@example.com' });

    expect(result.board.tasks[0]).toEqual(expect.objectContaining({
      task_id: 'new-task',
      title: 'New',
      createdBy: 'authenticated@example.com',
    }));
    expect(history.trackTaskCreation).toHaveBeenCalledWith(
      expect.objectContaining({ createdBy: 'authenticated@example.com' }),
      4,
      'authenticated@example.com',
      expect.any(Object),
    );
  });

  test('does not let POST tracking replace a protected task using a forged creator', async () => {
    const protectedTask = { task_id: 'protected', title: 'Original', createdBy: 'owner@example.com' };
    repository.findBoard.mockResolvedValue({ tasks: [protectedTask], save: jest.fn() });

    await expect(taskService.createOrUpdateProjectBoard({
      projectId: 9,
      tasks: [{ task_id: 'protected', title: 'Replaced', createdBy: 'attacker@example.com' }],
    }, { email: 'attacker@example.com' })).rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect(repository.saveBoard).not.toHaveBeenCalled();
  });

  test('preserves persisted owner and whitelists update fields', async () => {
    const oldTask = { _id: 'subdoc-id', task_id: 'owned', title: 'Old', createdBy: 'owner@example.com' };
    repository.findBoard.mockResolvedValue({ tasks: [oldTask] });
    repository.updateTask.mockResolvedValue({ projectId: 5 });

    await taskService.updateTask({
      projectId: 5,
      tasks: {
        task_id: 'owned',
        title: 'Updated',
        createdBy: 'forged@example.com',
        isAdmin: true,
      },
    }, { email: 'owner@example.com' });

    expect(repository.updateTask).toHaveBeenCalledWith(5, 'owned', {
      task_id: 'owned',
      title: 'Updated',
      createdBy: 'owner@example.com',
      _id: 'subdoc-id',
    }, expect.any(Object));
    expect(history.trackTaskChanges).toHaveBeenCalledWith(
      oldTask,
      expect.objectContaining({ title: 'Updated', createdBy: 'owner@example.com' }),
      5,
      'owner@example.com',
      expect.any(Object),
    );
  });
});
