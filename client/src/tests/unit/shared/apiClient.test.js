import axios, { AxiosError } from 'axios';
import apiClient, {
  apiClient as namedApiClient,
  resetAuthUnauthorizedLock,
} from '../../../shared/api/client';

jest.mock('axios', () => jest.requireActual('axios/dist/node/axios.cjs'));

describe('shared/api/client (apiClient)', () => {
  const originalAdapter = apiClient.defaults.adapter;
  const originalLocation = window.location;
  let unauthorizedHandler;

  const setPathname = (pathname) => {
    delete window.location;
    window.location = { ...originalLocation, pathname };
  };

  beforeEach(() => {
    resetAuthUnauthorizedLock();
    setPathname('/projects');
    unauthorizedHandler = jest.fn();
    window.addEventListener('auth:unauthorized', unauthorizedHandler);
  });

  afterEach(() => {
    apiClient.defaults.adapter = originalAdapter;
    window.removeEventListener('auth:unauthorized', unauthorizedHandler);
    window.location = originalLocation;
    jest.restoreAllMocks();
  });

  test('exports named and default apiClient with baseURL "/api" and withCredentials true', () => {
    expect(apiClient).toBe(namedApiClient);
    expect(apiClient.defaults.baseURL).toBe('/api');
    expect(apiClient.defaults.withCredentials).toBe(true);
    expect(apiClient.defaults.headers['Content-Type']).toBeUndefined();
    expect(apiClient.defaults.headers.common['Content-Type']).toBeUndefined();
  });

  test('uses REACT_APP_API_URL in development when configured', () => {
    const prevEnv = process.env.NODE_ENV;
    const prevUrl = process.env.REACT_APP_API_URL;
    try {
      process.env.NODE_ENV = 'development';
      process.env.REACT_APP_API_URL = 'http://localhost:4000/api';
      jest.isolateModules(() => {
        const devClient = require('../../../shared/api/client').default;
        expect(devClient.defaults.baseURL).toBe('http://localhost:4000/api');
      });
    } finally {
      process.env.NODE_ENV = prevEnv;
      if (prevUrl !== undefined) {
        process.env.REACT_APP_API_URL = prevUrl;
      } else {
        delete process.env.REACT_APP_API_URL;
      }
    }
  });

  test('preserves proper Content-Type headers for JSON vs FormData without hardcoded overrides', async () => {
    const capturedHeaders = [];
    apiClient.defaults.adapter = jest.fn(async (config) => {
      capturedHeaders.push({
        url: config.url,
        contentType:
          typeof config.headers?.getContentType === 'function'
            ? config.headers.getContentType()
            : config.headers?.['Content-Type'],
      });
      return {
        data: { ok: true },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      };
    });

    await apiClient.post('/projects', { title: 'Test' });

    const formData = new FormData();
    formData.append('name', 'Airost');
    await apiClient.post('/upload', formData);

    expect(capturedHeaders[0].contentType).toMatch(/application\/json/i);
    // For FormData, Axios must not force application/json
    expect(capturedHeaders[1].contentType || '').not.toMatch(/application\/json/i);
  });

  test('dispatches auth:unauthorized once on 401 and deduplicates concurrent 401 responses', async () => {
    apiClient.defaults.adapter = jest.fn(async (config) => {
      throw new AxiosError('Request failed with status code 401', 'ERR_BAD_REQUEST', config, null, {
        status: 401,
        statusText: 'Unauthorized',
        data: { message: 'Session expired' },
        headers: {},
        config,
      });
    });

    const results = await Promise.allSettled([
      apiClient.get('/projects'),
      apiClient.get('/user/users'),
      apiClient.get('/admin/spaces'),
    ]);

    expect(results.every((r) => r.status === 'rejected')).toBe(true);
    expect(unauthorizedHandler).toHaveBeenCalledTimes(1);
  });

  test('does not unlock on 200 response; unlocks only via resetAuthUnauthorizedLock()', async () => {
    let shouldFail = true;
    apiClient.defaults.adapter = jest.fn(async (config) => {
      if (shouldFail) {
        throw new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, null, {
          status: 401,
          statusText: 'Unauthorized',
          data: { message: 'Unauthorized' },
          headers: {},
          config,
        });
      }
      return {
        data: { ok: true },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      };
    });

    await expect(apiClient.get('/projects')).rejects.toMatchObject({ status: 401 });
    expect(unauthorizedHandler).toHaveBeenCalledTimes(1);

    // Subsequent 200 must NOT reset the lock
    shouldFail = false;
    await expect(apiClient.get('/projects')).resolves.toMatchObject({ status: 200 });

    // Another 401 while still locked must NOT dispatch again
    shouldFail = true;
    await expect(apiClient.get('/projects')).rejects.toMatchObject({ status: 401 });
    expect(unauthorizedHandler).toHaveBeenCalledTimes(1);

    // Explicit reset unlocks for the next auth cycle
    resetAuthUnauthorizedLock();
    await expect(apiClient.get('/projects')).rejects.toMatchObject({ status: 401 });
    expect(unauthorizedHandler).toHaveBeenCalledTimes(2);
  });

  test('does not dispatch auth:unauthorized when skipAuthRedirect is true', async () => {
    apiClient.defaults.adapter = jest.fn(async (config) => {
      throw new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, null, {
        status: 401,
        statusText: 'Unauthorized',
        data: { message: 'Not logged in' },
        headers: {},
        config,
      });
    });

    await expect(
      apiClient.get('/projects', { skipAuthRedirect: true })
    ).rejects.toMatchObject({ status: 401 });

    expect(unauthorizedHandler).not.toHaveBeenCalled();
  });

  test('does not dispatch auth:unauthorized when already on /login', async () => {
    setPathname('/login');
    apiClient.defaults.adapter = jest.fn(async (config) => {
      throw new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, null, {
        status: 401,
        statusText: 'Unauthorized',
        data: { message: 'Not logged in' },
        headers: {},
        config,
      });
    });

    await expect(apiClient.get('/projects')).rejects.toMatchObject({ status: 401 });
    expect(unauthorizedHandler).not.toHaveBeenCalled();
  });

  test('does not dispatch auth:unauthorized for exact /login/success and /logout endpoints, but does for other /auth/* endpoints', async () => {
    apiClient.defaults.adapter = jest.fn(async (config) => {
      throw new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, null, {
        status: 401,
        statusText: 'Unauthorized',
        data: { message: 'Auth failed' },
        headers: {},
        config,
      });
    });

    await expect(apiClient.get('/auth/login/success')).rejects.toMatchObject({ status: 401 });
    await expect(apiClient.get('/login/success')).rejects.toMatchObject({ status: 401 });
    await expect(apiClient.post('/auth/logout')).rejects.toMatchObject({ status: 401 });
    await expect(apiClient.post('/logout')).rejects.toMatchObject({ status: 401 });
    expect(unauthorizedHandler).not.toHaveBeenCalled();

    // Non-exempt /auth/* endpoint must still trigger auth:unauthorized
    await expect(apiClient.get('/auth/session-details')).rejects.toMatchObject({ status: 401 });
    expect(unauthorizedHandler).toHaveBeenCalledTimes(1);
  });

  test('does not dispatch auth:unauthorized for cancelled requests or network errors without response', async () => {
    apiClient.defaults.adapter = jest.fn(async (config) => {
      throw new axios.Cancel('Operation canceled by the user.');
    });

    await expect(apiClient.get('/projects')).rejects.toBeDefined();
    expect(unauthorizedHandler).not.toHaveBeenCalled();

    apiClient.defaults.adapter = jest.fn(async (config) => {
      throw new AxiosError('Network Error', 'ERR_NETWORK', config);
    });

    let caughtNetworkErr;
    try {
      await apiClient.get('/projects');
    } catch (err) {
      caughtNetworkErr = err;
    }
    expect(caughtNetworkErr).toBeDefined();
    expect(caughtNetworkErr.normalizedMessage).toBe('Network Error');
    expect(caughtNetworkErr.status).toBeUndefined();
    expect(unauthorizedHandler).not.toHaveBeenCalled();
  });

  test('attaches normalizedMessage and status while preserving response and config', async () => {
    const serverPayload = { error: 'Forbidden resource' };
    apiClient.defaults.adapter = jest.fn(async (config) => {
      throw new AxiosError('Request failed with status code 403', 'ERR_BAD_REQUEST', config, null, {
        status: 403,
        statusText: 'Forbidden',
        data: serverPayload,
        headers: { 'x-request-id': 'abc-123' },
        config,
      });
    });

    let caughtError;
    try {
      await apiClient.get('/admin/users');
    } catch (err) {
      caughtError = err;
    }

    expect(caughtError).toBeDefined();
    expect(caughtError.status).toBe(403);
    expect(caughtError.normalizedMessage).toBe('Forbidden resource');
    expect(caughtError.response).toMatchObject({
      status: 403,
      data: serverPayload,
      headers: { 'x-request-id': 'abc-123' },
    });
    expect(caughtError.config).toMatchObject({ url: '/admin/users' });
    expect(unauthorizedHandler).not.toHaveBeenCalled();
  });
});
