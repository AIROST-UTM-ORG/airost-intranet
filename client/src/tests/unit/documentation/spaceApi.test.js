import apiClient from '../../../shared/api/client';
import { setUseMock } from '../../../services/documentation/mockData';
import {
  listSpaces,
  getSpace,
  createSpace,
  updateSpace,
  deleteSpace,
  listProjects,
  listMembers,
} from '../../../services/documentation/spaceApi';

describe('services/documentation/spaceApi routing via apiClient', () => {
  const originalAdapter = apiClient.defaults.adapter;
  let capturedRequests;

  beforeEach(() => {
    setUseMock(false);
    capturedRequests = [];
    apiClient.defaults.adapter = jest.fn(async (config) => {
      capturedRequests.push({
        method: (config.method || 'get').toUpperCase(),
        baseURL: config.baseURL,
        url: config.url,
        withCredentials: config.withCredentials,
      });

      if (config.url === '/airost/doc/spaces' && config.method === 'get') {
        return { data: [], status: 200, statusText: 'OK', headers: {}, config };
      }
      if (config.url === '/user/users') {
        return { data: [], status: 200, statusText: 'OK', headers: {}, config };
      }
      if (config.url === '/projects') {
        return { data: [], status: 200, statusText: 'OK', headers: {}, config };
      }
      return {
        data: { _id: 'space-1', title: 'Test Space' },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      };
    });
  });

  afterEach(() => {
    apiClient.defaults.adapter = originalAdapter;
    setUseMock(true);
    jest.restoreAllMocks();
  });

  test('routes all spaceApi endpoints through apiClient with relative paths under baseURL "/api"', async () => {
    await listSpaces();
    await getSpace('space-1');
    await createSpace({ title: 'New Space', description: 'Desc' });
    await updateSpace('space-1', { title: 'Updated Space' });
    await deleteSpace('space-1');
    await listProjects();
    await listMembers();

    expect(capturedRequests).toEqual([
      expect.objectContaining({ method: 'GET', baseURL: '/api', url: '/airost/doc/spaces', withCredentials: true }),
      expect.objectContaining({ method: 'GET', baseURL: '/api', url: '/airost/doc/spaces/space-1', withCredentials: true }),
      expect.objectContaining({ method: 'POST', baseURL: '/api', url: '/airost/doc/spaces', withCredentials: true }),
      expect.objectContaining({ method: 'PATCH', baseURL: '/api', url: '/airost/doc/spaces/space-1', withCredentials: true }),
      expect.objectContaining({ method: 'DELETE', baseURL: '/api', url: '/airost/doc/spaces/space-1', withCredentials: true }),
      expect.objectContaining({ method: 'GET', baseURL: '/api', url: '/projects', withCredentials: true }),
      expect.objectContaining({ method: 'GET', baseURL: '/api', url: '/user/users', withCredentials: true }),
    ]);
  });
});
