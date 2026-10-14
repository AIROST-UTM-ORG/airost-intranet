/**
 * Integration tests for the Projects API endpoints.
 * Uses mongodb-memory-server — never touches the production database.
 *
 * Routes tested:
 *   GET    /projects
 *   POST   /projects
 *   DELETE /projects/:id
 *   GET    /projects/tracking/:uid
 *   POST   /projects/tracking
 *   PUT    /projects/update
 *   GET    /projects/tasks/:taskId/history
 *   GET    /projects/:projectId/history
 */

const request = require('supertest');
const { connect, clearDatabase, closeDatabase } = require('../setup/mongoSetup');
const { createApp } = require('../../app');
const Project = require('../../models/Project');
const ProjectBoard = require('../../models/ProjectBoard');

let app;

beforeAll(async () => {
  await connect();
  app = createApp();
});

afterEach(async () => {
  await clearDatabase();
});

afterAll(async () => {
  await closeDatabase();
});

// ── Seed helpers ──────────────────────────────────────────────────────────────

const seedProject = (overrides = {}) =>
  Project.create({
    projectId: 1,
    title: 'Test Project',
    description: 'A project for testing',
    lead: 'Alice',
    ...overrides,
  });

const seedBoard = (overrides = {}) =>
  ProjectBoard.create({
    projectId: 1,
    tasks: [],
    ...overrides,
  });

// ── GET /projects ─────────────────────────────────────────────────────────────

describe.skip('GET /projects', () => {
  test('returns 200 and an empty array when no projects exist', async () => {
    const res = await request(app).get('/projects');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(0);
  });

  test('returns all seeded projects', async () => {
    await seedProject();
    await seedProject({ projectId: 2, title: 'Second Project' });

    const res = await request(app).get('/projects');
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(2);
  });
});

// ── POST /projects ────────────────────────────────────────────────────────────

describe.skip('POST /projects', () => {
  test('creates the first project with projectId=1 and creates an empty board', async () => {
    const payload = {
      title: 'First Project',
      description: 'First description',
      lead: 'Lead Dev',
    };

    const res = await request(app).post('/projects').send(payload);
    expect(res.status).toBe(201);
    expect(res.body.projectId).toBe(1);
    expect(res.body.title).toBe('First Project');

    // Confirm ProjectBoard was also created
    const board = await ProjectBoard.findOne({ projectId: 1 });
    expect(board).not.toBeNull();
    expect(board.tasks).toEqual([]);
  });

  test('auto-increments projectId when projects already exist', async () => {
    await seedProject({ projectId: 5 });

    const res = await request(app).post('/projects').send({
      title: 'Next Project',
      description: 'Next description',
      lead: 'Lead Dev 2',
    });
    expect(res.status).toBe(201);
    expect(res.body.projectId).toBe(6);
  });
});

// ── DELETE /projects/:id ──────────────────────────────────────────────────────

describe.skip('DELETE /projects/:id', () => {
  test('deletes a project and its board, returns 200', async () => {
    await seedProject({ projectId: 10 });
    await seedBoard({ projectId: 10 });

    const res = await request(app).delete('/projects/10');
    expect(res.status).toBe(200);
    expect(res.body.message).toContain('deleted successfully');

    const remaining = await Project.findOne({ projectId: 10 });
    expect(remaining).toBeNull();
  });

  test('returns 404 when the project does not exist', async () => {
    const res = await request(app).delete('/projects/9999');
    expect(res.status).toBe(404);
    expect(res.body.message).toContain('not found');
  });
});

// ── GET /projects/tracking/:uid ───────────────────────────────────────────────

describe.skip('GET /projects/tracking/:uid', () => {
  test('returns the project board for a valid numeric projectId', async () => {
    await seedBoard({ projectId: 5, tasks: [] });

    const res = await request(app).get('/projects/tracking/5');
    expect(res.status).toBe(200);
    expect(res.body.projectId).toBe(5);
  });

  test('returns 404 when board does not exist for numeric projectId', async () => {
    const res = await request(app).get('/projects/tracking/999');
    expect(res.status).toBe(404);
    expect(res.body.message).toContain('not found');
  });

  test('returns 400 for non-numeric uid', async () => {
    const res = await request(app).get('/projects/tracking/not-a-number');
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('not a number');
  });
});

// ── POST /projects/tracking ───────────────────────────────────────────────────

describe.skip('POST /projects/tracking', () => {
  test('creates a new project board when none exists', async () => {
    const res = await request(app)
      .post('/projects/tracking')
      .send({ projectId: 7, tasks: [] });

    expect(res.status).toBe(201);
    expect(res.body.projectId).toBe(7);
  });

  test('updates existing board tasks when board already exists', async () => {
    await seedBoard({ projectId: 8, tasks: [] });

    const task = {
      title: 'Task 1',
      column: 'Todo',
      assignee: 'Alice',
      createdBy: 'Alice',
      description: '',
      priority: 'Medium',
      task_id: 'task-abc-123',
    };

    const res = await request(app)
      .post('/projects/tracking')
      .send({ projectId: 8, tasks: [task] });

    expect(res.status).toBe(200);
    expect(res.body.tasks.length).toBe(1);
    expect(res.body.tasks[0].task_id).toBe('task-abc-123');
  });
});

// ── PUT /projects/tracking ───────────────────────────────────────────────────

describe.skip('PUT /projects/tracking', () => {
  test('refreshes the tasks of an existing project board and returns 200', async () => {
    await seedBoard({ projectId: 12, tasks: [] });

    const newTasks = [
      {
        title: 'Refreshed Task',
        column: 'Done',
        assignee: 'Bob',
        task_id: 'task-refreshed-1',
      },
    ];

    const res = await request(app)
      .put('/projects/tracking')
      .send({ projectId: 12, tasks: newTasks });

    expect(res.status).toBe(200);
    expect(res.body.projectId).toBe(12);
    expect(res.body.tasks.length).toBe(1);
    expect(res.body.tasks[0].title).toBe('Refreshed Task');
  });

  test('returns 404 when project board does not exist', async () => {
    const res = await request(app)
      .put('/projects/tracking')
      .send({ projectId: 9999, tasks: [] });

    expect(res.status).toBe(404);
    expect(res.body.message).toContain('not found');
  });
});

// ── PUT /projects/update ──────────────────────────────────────────────────────

describe.skip('PUT /projects/update', () => {
  test('updates a specific task within a project board', async () => {
    const task = {
      title: 'Original Title',
      column: 'Todo',
      assignee: 'Alice',
      createdBy: 'Alice',
      description: '',
      priority: 'Low',
      task_id: 'task-001',
    };
    await seedBoard({ projectId: 9, tasks: [task] });

    const updatedTask = { ...task, title: 'Updated Title', column: 'In Progress' };

    const res = await request(app)
      .put('/projects/update')
      .send({ projectId: 9, tasks: updatedTask, changedBy: 'Alice' });

    expect(res.status).toBe(200);

    // Verify the update is persisted in the board
    const board = await ProjectBoard.findOne({ projectId: 9 });
    const found = board.tasks.find((t) => t.task_id === 'task-001');
    expect(found.title).toBe('Updated Title');
    expect(found.column).toBe('In Progress');
  });
});

// ── GET /projects/tasks/:taskId/history ───────────────────────────────────────

describe.skip('GET /projects/tasks/:taskId/history', () => {
  test('returns 200 and an empty array when no history exists', async () => {
    const res = await request(app).get('/projects/tasks/nonexistent-task/history');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('returns history records for a task after updates', async () => {
    const task = {
      title: 'Original Title',
      column: 'Todo',
      assignee: 'Alice',
      createdBy: 'Alice',
      task_id: 'task-hist-1',
    };
    await seedBoard({ projectId: 20, tasks: [task] });

    // Update the task to trigger history tracking
    await request(app)
      .put('/projects/update')
      .send({
        projectId: 20,
        tasks: { ...task, title: 'New Title' },
        changedBy: 'Bob',
      });

    const res = await request(app).get('/projects/tasks/task-hist-1/history');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0].taskId).toBe('task-hist-1');
  });
});

// ── GET /projects/:projectId/history ──────────────────────────────────────────

describe.skip('GET /projects/:projectId/history', () => {
  test('returns 200 and an empty array when no history exists for project', async () => {
    const res = await request(app).get('/projects/999/history');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('returns project history when tasks have been tracked', async () => {
    const task = {
      title: 'Project Task',
      column: 'Todo',
      assignee: 'Alice',
      createdBy: 'Alice',
      task_id: 'task-proj-1',
    };
    await seedBoard({ projectId: 25, tasks: [task] });

    await request(app)
      .put('/projects/update')
      .send({
        projectId: 25,
        tasks: { ...task, column: 'Done' },
        changedBy: 'Alice',
      });

    const res = await request(app).get('/projects/25/history');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0].projectId).toBe(25);
  });
});
