/**
 * Integration tests for historyHelper utility (DB-dependent functions).
 * Tests trackTaskCreation, trackTaskChanges, getTaskHistory, getProjectHistory.
 */

const { connect, clearDatabase, closeDatabase } = require('../setup/mongoSetup');
const {
  trackTaskCreation,
  trackTaskChanges,
  getTaskHistory,
  getProjectHistory,
} = require('../../utils/historyHelper');
const TaskHistory = require('../../models/TaskHistory');

beforeAll(async () => {
  await connect();
});

afterEach(async () => {
  await clearDatabase();
});

afterAll(async () => {
  await closeDatabase();
});

const sampleTask = {
  task_id: 'task-001',
  title: 'Sample Task',
  column: 'Todo',
  assignee: null,
  description: '',
  priority: 'Low',
  dueDate: null,
};

// ── trackTaskCreation ─────────────────────────────────────────────────────────

describe.skip('trackTaskCreation', () => {
  test('creates a TaskHistory record with changeType=created', async () => {
    await trackTaskCreation(sampleTask, 1, 'alice');

    const records = await TaskHistory.find({ taskId: 'task-001' });
    expect(records.length).toBe(1);
    expect(records[0].changeType).toBe('created');
    expect(records[0].changedBy).toBe('alice');
    expect(records[0].field).toBe('task_created');
  });
});

// ── trackTaskChanges ──────────────────────────────────────────────────────────

describe.skip('trackTaskChanges', () => {
  test('creates no history entries when tasks are identical', async () => {
    await trackTaskChanges(sampleTask, sampleTask, 1, 'alice');
    const records = await TaskHistory.find({});
    expect(records.length).toBe(0);
  });

  test('creates a history entry for a changed title', async () => {
    const updatedTask = { ...sampleTask, title: 'Updated Title' };
    await trackTaskChanges(sampleTask, updatedTask, 1, 'alice');

    const records = await TaskHistory.find({ field: 'title' });
    expect(records.length).toBe(1);
    expect(records[0].oldValue).toBe('Sample Task');
    expect(records[0].newValue).toBe('Updated Title');
    expect(records[0].changeType).toBe('updated');
  });

  test('creates a history entry for a changed column', async () => {
    const updatedTask = { ...sampleTask, column: 'In Progress' };
    await trackTaskChanges(sampleTask, updatedTask, 1, 'alice');

    const records = await TaskHistory.find({ field: 'column' });
    expect(records.length).toBe(1);
    expect(records[0].newValue).toBe('In Progress');
  });

  test('creates a history entry for a new assignee', async () => {
    const updatedTask = { ...sampleTask, assignee: 'Bob' };
    await trackTaskChanges(sampleTask, updatedTask, 1, 'alice');

    const records = await TaskHistory.find({ field: 'assignee' });
    expect(records.length).toBe(1);
    expect(records[0].newValue).toBe('Bob');
  });

  test('creates history entries for multiple changed fields', async () => {
    const updatedTask = {
      ...sampleTask,
      title: 'New Title',
      priority: 'High',
      column: 'Done',
    };
    await trackTaskChanges(sampleTask, updatedTask, 1, 'alice');

    const records = await TaskHistory.find({});
    expect(records.length).toBe(3);
  });
});

// ── getTaskHistory ────────────────────────────────────────────────────────────

describe.skip('getTaskHistory', () => {
  test('returns history entries sorted by timestamp descending', async () => {
    await trackTaskCreation(sampleTask, 1, 'alice');
    const updatedTask = { ...sampleTask, title: 'New Title' };
    await trackTaskChanges(sampleTask, updatedTask, 1, 'alice');

    const history = await getTaskHistory('task-001');
    expect(history.length).toBe(2);
    // Most recent first
    expect(history[0].timestamp.getTime()).toBeGreaterThanOrEqual(history[1].timestamp.getTime());
  });

  test('returns empty array for a task with no history', async () => {
    const history = await getTaskHistory('nonexistent-task');
    expect(history).toEqual([]);
  });
});

// ── getProjectHistory ─────────────────────────────────────────────────────────

describe.skip('getProjectHistory', () => {
  test('returns all history records for a given projectId', async () => {
    await trackTaskCreation(sampleTask, 42, 'alice');
    await trackTaskCreation({ ...sampleTask, task_id: 'task-002' }, 42, 'bob');

    const history = await getProjectHistory(42);
    expect(history.length).toBe(2);
  });

  test('does not return history from other projects', async () => {
    await trackTaskCreation(sampleTask, 1, 'alice');
    await trackTaskCreation({ ...sampleTask, task_id: 'task-other' }, 99, 'bob');

    const history = await getProjectHistory(1);
    expect(history.length).toBe(1);
    expect(history[0].projectId).toBe(1);
  });
});
