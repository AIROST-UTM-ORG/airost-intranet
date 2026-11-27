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
const User = require('../../models/User');
const projectRepository = require('../../src/features/projects/project.repository');

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

const authenticatedAdmin = async () => {
  const user = await User.create({ name: 'Project Admin', email: 'project-admin@example.com', positions: ['admin'] });
  const agent = request.agent(app);
  await agent.post('/test/auth/login').send({ userId: user._id }).expect(200);
  return agent;
};

// ── GET /projects ─────────────────────────────────────────────────────────────

describe('GET /projects', () => {
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

  test('returns the canonical success envelope on /api/projects', async () => {
    await seedProject();
    const res = await request(app).get('/api/projects');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
  });

  test('returns 500 when Project.find throws an error', async () => {
    const findSpy = jest.spyOn(Project, 'find').mockRejectedValueOnce(new Error('Database query failed'));

    const res = await request(app).get('/projects');
    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred' },
    });

    findSpy.mockRestore();
  });
});

// ── POST /projects ────────────────────────────────────────────────────────────

describe('POST /projects', () => {
  test('rejects a missing or blank title with a validation error', async () => {
    const res = await request(app).post('/api/projects').send({ title: '  ' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

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

  test('allocates unique sequential project IDs for concurrent creations', async () => {
    await seedProject({ projectId: 20, title: 'Existing Project' });

    const responses = await Promise.all([
      request(app).post('/projects').send({ title: 'Concurrent Project A' }),
      request(app).post('/projects').send({ title: 'Concurrent Project B' }),
    ]);

    expect(responses.map((response) => response.status)).toEqual([201, 201]);
    expect(responses.map((response) => response.body.projectId).sort((a, b) => a - b)).toEqual([21, 22]);
    expect(await ProjectBoard.countDocuments({ projectId: { $in: [21, 22] } })).toBe(2);
  });

  test('rolls back project creation and returns 500 when board creation fails', async () => {
    const createBoardSpy = jest.spyOn(projectRepository, 'createBoard').mockRejectedValueOnce(new Error('Board creation failed'));

    const payload = {
      title: 'Rollback Project',
      description: 'Test rollback description',
      lead: 'Lead Dev',
    };

    try {
      const res = await request(app).post('/projects').send(payload);
      expect(res.status).toBe(500);
      expect(res.body).toEqual({
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Board creation failed' },
      });

      // Confirm project was rolled back and not found in database
      const project = await Project.findOne({ title: 'Rollback Project' });
      expect(project).toBeNull();
    } finally {
      createBoardSpy.mockRestore();
    }
  });
});

// ── DELETE /projects/:id ──────────────────────────────────────────────────────

describe('DELETE /projects/:id', () => {
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
    expect(res.body.error.message).toContain('not found');
  });
});

// ── GET /projects/tracking/:uid ───────────────────────────────────────────────

describe('GET /projects/tracking/:uid', () => {
  test('returns the project board for a valid numeric projectId', async () => {
    await seedBoard({ projectId: 5, tasks: [] });

    const res = await request(app).get('/projects/tracking/5');
    expect(res.status).toBe(200);
    expect(res.body.projectId).toBe(5);
  });

  test('returns 404 when board does not exist for numeric projectId', async () => {
    const res = await request(app).get('/projects/tracking/999');
    expect(res.status).toBe(404);
    expect(res.body.error.message).toContain('not found');
  });

  test('returns 400 for non-numeric uid', async () => {
    const res = await request(app).get('/projects/tracking/not-a-number');
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('positive integer');
  });
});

// ── POST /projects/tracking ───────────────────────────────────────────────────

describe('POST /projects/tracking', () => {
  test('creates a new project board when none exists', async () => {
    const agent = await authenticatedAdmin();
    const res = await agent
      .post('/projects/tracking')
      .send({ projectId: 7, tasks: [] });

    expect(res.status).toBe(201);
    expect(res.body.projectId).toBe(7);
  });

  test('updates existing board tasks when board already exists', async () => {
    const agent = await authenticatedAdmin();
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

    const res = await agent
      .post('/projects/tracking')
      .send({ projectId: 8, tasks: [task] });

    expect(res.status).toBe(200);
    expect(res.body.tasks.length).toBe(1);
    expect(res.body.tasks[0].task_id).toBe('task-abc-123');
  });
});

// ── PUT /projects/tracking ───────────────────────────────────────────────────

describe('PUT /projects/tracking', () => {
  test('refreshes the tasks of an existing project board and returns 200', async () => {
    const agent = await authenticatedAdmin();
    await seedBoard({ projectId: 12, tasks: [] });

    const newTasks = [
      {
        title: 'Refreshed Task',
        column: 'Done',
        assignee: 'Bob',
        task_id: 'task-refreshed-1',
      },
    ];

    const res = await agent
      .put('/projects/tracking')
      .send({ projectId: 12, tasks: newTasks });

    expect(res.status).toBe(200);
    expect(res.body.projectId).toBe(12);
    expect(res.body.tasks.length).toBe(1);
    expect(res.body.tasks[0].title).toBe('Refreshed Task');
  });

  test('returns 404 when project board does not exist', async () => {
    const agent = await authenticatedAdmin();
    const res = await agent
      .put('/projects/tracking')
      .send({ projectId: 9999, tasks: [] });

    expect(res.status).toBe(404);
    expect(res.body.error.message).toContain('not found');
  });

  test('does not allow a non-creator member to delete a protected task', async () => {
    const user = await User.create({ name: 'Project Member', email: 'project-member@example.com', positions: ['member'] });
    const agent = request.agent(app);
    await agent.post('/test/auth/login').send({ userId: user._id }).expect(200);
    await seedBoard({ projectId: 13, tasks: [{ task_id: 'protected', createdBy: 'another-user', title: 'Keep me' }] });

    const res = await agent.put('/projects/tracking').send({ projectId: 13, tasks: [] });
    expect(res.status).toBe(403);
    const board = await ProjectBoard.findOne({ projectId: 13 });
    expect(board.tasks).toHaveLength(1);
  });
});

// ── PUT /projects/update ──────────────────────────────────────────────────────

describe('PUT /projects/update', () => {
  test('updates a specific task within a project board', async () => {
    const agent = await authenticatedAdmin();
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

    const res = await agent
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

describe('GET /projects/tasks/:taskId/history', () => {
  test('returns 200 and an empty array when no history exists', async () => {
    const res = await request(app).get('/projects/tasks/nonexistent-task/history');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('returns history records for a task after updates', async () => {
    const agent = await authenticatedAdmin();
    const task = {
      title: 'Original Title',
      column: 'Todo',
      assignee: 'Alice',
      createdBy: 'Alice',
      task_id: 'task-hist-1',
    };
    await seedBoard({ projectId: 20, tasks: [task] });

    // Update the task to trigger history tracking
    await agent
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

describe('GET /projects/:projectId/history', () => {
  test('returns 200 and an empty array when no history exists for project', async () => {
    const res = await request(app).get('/projects/999/history');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('returns project history when tasks have been tracked', async () => {
    const agent = await authenticatedAdmin();
    const task = {
      title: 'Project Task',
      column: 'Todo',
      assignee: 'Alice',
      createdBy: 'Alice',
      task_id: 'task-proj-1',
    };
    await seedBoard({ projectId: 25, tasks: [task] });

    await agent
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
