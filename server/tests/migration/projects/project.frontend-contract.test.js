jest.mock('../../../src/features/projects/services/project.service', () => ({
  getProjects: jest.fn(),
  createProject: jest.fn(),
  deleteProject: jest.fn(),
}));

jest.mock('../../../src/features/projects/services/task.service', () => ({
  getProjectBoard: jest.fn(),
  createOrUpdateProjectBoard: jest.fn(),
  refreshProjectBoard: jest.fn(),
  updateTask: jest.fn(),
  getTaskHistory: jest.fn(),
  getProjectHistory: jest.fn(),
}));

const projectService = require('../../../src/features/projects/services/project.service');
const taskService = require('../../../src/features/projects/services/task.service');
const projectController = require('../../../src/features/projects/controller/project.controller');
const taskController = require('../../../src/features/projects/controller/task.controller');

// client/src/shared/api/client.js defaults to '/api'; these match current frontend calls.
const frontendBaseUrl = '/api';
const frontendMountFor = (url) => `${frontendBaseUrl}/${url.split('/').filter(Boolean)[0]}`;

const invoke = async (handler, request) => {
  const response = {
    statusCode: 200,
    body: undefined,
    status(statusCode) {
      this.statusCode = statusCode;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
  await handler({ baseUrl: request.baseUrl, params: request.params || {} }, response, jest.fn());
  return response;
};

describe('projects feature migration frontend contract', () => {
  beforeEach(() => jest.resetAllMocks());

  test('GET /projects is mounted where the frontend apiClient sends it and returns an unwrappable list', async () => {
    const projects = [{ projectId: 42, title: 'AIROST Platform', description: 'Internal platform' }];
    projectService.getProjects.mockResolvedValue(projects);
    const url = '/projects';

    const response = await invoke(projectController.getProjects, { baseUrl: frontendMountFor(url) });

    expect(frontendMountFor(url)).toBe('/api/projects');
    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ success: true, data: projects });
    expect(response.body.data).toEqual(projects);
  });

  test('GET /projects/tracking/:projectId returns the board shape the frontend unwraps', async () => {
    const board = { projectId: 42, tasks: [{ task_id: 'task-1', title: 'Ship migration' }] };
    taskService.getProjectBoard.mockResolvedValue(board);
    const url = '/projects/tracking/42';

    const response = await invoke(taskController.getProjectBoard, {
      baseUrl: frontendMountFor(url),
      params: { uid: '42' },
    });

    expect(frontendMountFor(url)).toBe('/api/projects');
    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ success: true, data: board });
    expect(response.body.data.tasks).toEqual(board.tasks);
  });

  test('GET /projects/tasks/:taskId/history returns the array the frontend history hook unwraps', async () => {
    const history = [{ taskId: 'task-1', field: 'title', changeDescription: 'Title changed' }];
    taskService.getTaskHistory.mockResolvedValue(history);
    const url = '/projects/tasks/task-1/history';

    const response = await invoke(taskController.getTaskHistory, {
      baseUrl: frontendMountFor(url),
      params: { taskId: 'task-1' },
    });

    expect(frontendMountFor(url)).toBe('/api/projects');
    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ success: true, data: history });
    expect(response.body.data).toEqual(history);
  });

  test('legacy project mount keeps its raw list response for existing integrations', async () => {
    const projects = [{ projectId: 42, title: 'AIROST Platform' }];
    projectService.getProjects.mockResolvedValue(projects);

    const response = await invoke(projectController.getProjects, { baseUrl: '/projects' });

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual(projects);
  });
});
