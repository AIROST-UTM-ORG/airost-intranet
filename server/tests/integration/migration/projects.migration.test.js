const request = require('supertest');
const session = require('express-session');
const { connect, clearDatabase, closeDatabase } = require('../../setup/mongoSetup');
const { createApp } = require('../../../app');
const User = require('../../../models/User');
const Project = require('../../../models/Project');
const ProjectBoard = require('../../../models/ProjectBoard');
const TaskHistory = require('../../../models/TaskHistory');

let app;
let sessionStore;

const createUser = (name, positions = ['member']) => User.create({
  name,
  email: `${name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
  positions,
});

const createAuthenticatedAgent = async (user) => {
  const agent = request.agent(app);
  await agent.post('/test/auth/login').send({ userId: user.id }).expect(200);
  return agent;
};

const createProject = async (overrides = {}) => Project.create({
  projectId: 1,
  title: 'Migration Project',
  description: 'Project migration integration fixture',
  lead: 'Project Owner',
  ...overrides,
});

beforeAll(async () => {
  await connect();
  sessionStore = new session.MemoryStore();
  app = createApp({ sessionStore });
});

afterEach(async () => {
  await clearDatabase();
});

afterAll(async () => {
  await closeDatabase();
});

describe('projects feature migration integration', () => {
  describe('project routes and frontend API contract', () => {
    test('creates a project and board, then serves canonical and legacy list shapes', async () => {
      const created = await request(app)
        .post('/api/projects')
        .send({ title: 'New Migration Project', description: 'Created through feature routes' })
        .expect(201);

      expect(created.body).toMatchObject({
        success: true,
        data: { projectId: 1, title: 'New Migration Project' },
      });
      const createdBoard = await ProjectBoard.findOne({ projectId: 1 });
      expect(createdBoard.projectId).toBe(1);
      expect(createdBoard.tasks).toHaveLength(0);

      const canonical = await request(app).get('/api/projects').expect(200);
      const legacy = await request(app).get('/projects').expect(200);

      expect(canonical.body).toMatchObject({ success: true, data: [{ projectId: 1, title: 'New Migration Project' }] });
      expect(legacy.body).toEqual(canonical.body.data);
    });

    test('deletes a project and its board and reports missing projects', async () => {
      await createProject();
      await ProjectBoard.create({ projectId: 2, tasks: [] });

      const deleted = await request(app).delete('/api/projects/1').expect(200);
      expect(deleted.body).toMatchObject({
        success: true,
        data: { message: 'Project and project board deleted successfully' },
      });
      expect(await Project.findOne({ projectId: 1 })).toBeNull();
      expect(await ProjectBoard.findOne({ projectId: 1 })).toBeNull();
      expect(await ProjectBoard.findOne({ projectId: 2 })).not.toBeNull();

      const missing = await request(app).delete('/api/projects/999').expect(404);
      expect(missing.body.error.code).toBe('NOT_FOUND');
    });

    test('rejects project creation without a non-empty title', async () => {
      const response = await request(app)
        .post('/api/projects')
        .send({ title: '   ' })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: { code: 'VALIDATION_ERROR' },
      });
      expect(await Project.countDocuments()).toBe(0);
    });

    test('serves canonical board and task history envelopes at frontend paths', async () => {
      await ProjectBoard.create({
        projectId: 1,
        tasks: [{ task_id: 'frontend-task', title: 'Read migrated board', createdBy: 'Project Owner' }],
      });

      const board = await request(app).get('/api/projects/tracking/1').expect(200);
      const history = await request(app).get('/api/projects/tasks/frontend-task/history').expect(200);
      const projectHistory = await request(app).get('/api/projects/1/history').expect(200);

      expect(board.body).toMatchObject({ success: true, data: { projectId: 1, tasks: [{ task_id: 'frontend-task' }] } });
      expect(history.body).toEqual({ success: true, data: [] });
      expect(projectHistory.body).toEqual({ success: true, data: [] });
      expect((await request(app).get('/projects/tracking/1').expect(200)).body).toEqual(board.body.data);
    });
  });

  describe('board actions and task history', () => {
    test('requires a session for board mutations', async () => {
      const createResponse = await request(app)
        .post('/api/projects/tracking')
        .send({ projectId: 4, tasks: [] })
        .expect(401);
      const refreshResponse = await request(app)
        .put('/api/projects/tracking')
        .send({ projectId: 4, tasks: [] })
        .expect(401);
      const updateResponse = await request(app)
        .put('/api/projects/update')
        .send({ projectId: 4, tasks: { task_id: 'task-1' } })
        .expect(401);

      expect(createResponse.body.error.code).toBe('UNAUTHENTICATED');
      expect(refreshResponse.body.error.code).toBe('UNAUTHENTICATED');
      expect(updateResponse.body.error.code).toBe('UNAUTHENTICATED');
    });

    test('creates a task, records its creation and update, and returns history to the frontend', async () => {
      const owner = await createUser('Project Owner');
      const agent = await createAuthenticatedAgent(owner);
      await createProject();

      const task = {
        task_id: 'history-task',
        title: 'Initial title',
        column: 'todo',
        createdBy: owner.name,
      };
      const created = await agent
        .post('/api/projects/tracking')
        .send({ projectId: 1, tasks: [task] })
        .expect(201);

      expect(created.body.data.tasks).toEqual(expect.arrayContaining([
        expect.objectContaining({ task_id: 'history-task', title: 'Initial title' }),
      ]));
      await expect(TaskHistory.find({ taskId: 'history-task' }).lean()).resolves.toEqual(expect.arrayContaining([
        expect.objectContaining({ changeType: 'created', changedBy: owner.name }),
      ]));

      await agent
        .put('/api/projects/update')
        .send({ projectId: 1, tasks: { ...task, title: 'Updated title' }, changedBy: 'forged actor' })
        .expect(200);

      const persistedBoard = await ProjectBoard.findOne({ projectId: 1 });
      expect(persistedBoard.tasks[0].title).toBe('Updated title');
      const history = await agent.get('/api/projects/tasks/history-task/history').expect(200);
      expect(history.body.data).toEqual(expect.arrayContaining([
        expect.objectContaining({ changeType: 'updated', field: 'title', changedBy: owner.name }),
        expect.objectContaining({ changeType: 'created', field: 'task_created' }),
      ]));
    });

    test('blocks a non-creator from updating or deleting a task but permits an admin', async () => {
      const owner = await createUser('Task Owner');
      const member = await createUser('Other Member');
      const admin = await createUser('Project Admin', ['admin']);
      const memberAgent = await createAuthenticatedAgent(member);
      const adminAgent = await createAuthenticatedAgent(admin);
      await createProject();
      await ProjectBoard.create({
        projectId: 1,
        tasks: [{ task_id: 'protected-task', title: 'Protected title', createdBy: owner.name }],
      });

      const updateDenied = await memberAgent
        .put('/api/projects/update')
        .send({ projectId: 1, tasks: { task_id: 'protected-task', title: 'Unauthorized title', createdBy: owner.name } })
        .expect(403);
      const deleteDenied = await memberAgent
        .put('/api/projects/tracking')
        .send({ projectId: 1, tasks: [] })
        .expect(403);

      expect(updateDenied.body.error.code).toBe('FORBIDDEN');
      expect(deleteDenied.body.error.code).toBe('FORBIDDEN');
      expect((await ProjectBoard.findOne({ projectId: 1 })).tasks[0].title).toBe('Protected title');

      await adminAgent
        .put('/api/projects/update')
        .send({ projectId: 1, tasks: { task_id: 'protected-task', title: 'Admin updated title' } })
        .expect(200);

      expect((await ProjectBoard.findOne({ projectId: 1 })).tasks[0].title).toBe('Admin updated title');
    });
  });
});
