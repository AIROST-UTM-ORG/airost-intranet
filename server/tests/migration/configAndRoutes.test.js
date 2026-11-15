/** Regression coverage for migrated server configuration and route assembly. */

const express = require('express');
const request = require('supertest');
const mongoose = require('mongoose');
const { connectDatabase } = require('../../src/config/database');
const { validateEnv } = require('../../src/config/env');

const ROUTE_MODULES = [
  ['../../routes/auth', 'auth'],
  ['../../routes/docRoutes', 'documents'],
  ['../../routes/adminRoutes', 'admin'],
  ['../../routes/userRoutes', 'users'],
  ['../../routes/eventRoutes', 'events'],
  ['../../routes/projectsRoutes', 'projects'],
];

const registerRouteMocks = () => {
  for (const [modulePath, routeName] of ROUTE_MODULES) {
    jest.doMock(modulePath, () => {
      const router = jest.requireActual('express').Router();
      router.get('/migration-probe', (req, res) => res.json({ route: routeName }));
      return router;
    });
  }
};

const createRouteApp = ({ nodeEnv = 'test', userModel, loginError = null } = {}) => {
  jest.resetModules();
  process.env.NODE_ENV = nodeEnv;
  registerRouteMocks();
  if (userModel) jest.doMock('../../models/User', () => userModel);

  const router = require('../../src/routes');
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    req.login = (user, callback) => callback(loginError);
    next();
  });
  app.use(router);
  return app;
};

describe('database configuration', () => {
  const originalMongo = process.env.MONGODB_URI;
  const originalLegacy = process.env.MONGO_URI;
  afterEach(() => {
    jest.restoreAllMocks();
    if (originalMongo === undefined) delete process.env.MONGODB_URI;
    else process.env.MONGODB_URI = originalMongo;
    if (originalLegacy === undefined) delete process.env.MONGO_URI;
    else process.env.MONGO_URI = originalLegacy;
  });

  test('connects using an explicit URI and returns the Mongoose result', async () => {
    const result = { connection: 'connected' };
    const connect = jest.spyOn(mongoose, 'connect').mockResolvedValue(result);
    await expect(connectDatabase('mongodb://example/test')).resolves.toBe(result);
    expect(connect).toHaveBeenCalledWith('mongodb://example/test');
  });

  test('prefers MONGODB_URI and falls back to MONGO_URI', async () => {
    const connect = jest.spyOn(mongoose, 'connect').mockResolvedValue({});
    process.env.MONGODB_URI = 'mongodb://primary/test';
    process.env.MONGO_URI = 'mongodb://legacy/test';
    await connectDatabase();
    expect(connect).toHaveBeenLastCalledWith('mongodb://primary/test');

    process.env.MONGODB_URI = '';
    await connectDatabase();
    expect(connect).toHaveBeenLastCalledWith('mongodb://legacy/test');
  });

  test('rejects missing URI and propagates connection failures', async () => {
    process.env.MONGODB_URI = '';
    process.env.MONGO_URI = '';
    await expect(connectDatabase()).rejects.toThrow('MONGODB_URI is not configured');

    const failure = new Error('connection rejected');
    jest.spyOn(mongoose, 'connect').mockRejectedValue(failure);
    await expect(connectDatabase('mongodb://example/test')).rejects.toBe(failure);
  });
});

describe('environment validation', () => {
  test.each(['test', 'development', 'staging', undefined])(
    'skips production checks for NODE_ENV=%s',
    (nodeEnv) => expect(validateEnv({ NODE_ENV: nodeEnv })).toEqual([])
  );

  test('reports all missing production values in a deterministic order', () => {
    expect(() => validateEnv({ NODE_ENV: 'production' })).toThrow(
      'Missing required production environment variables: MONGODB_URI (or MONGO_URI), PASSPORT_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET'
    );
  });

  test.each(['MONGODB_URI', 'MONGO_URI'])(
    'accepts %s when all other production credentials are present',
    (databaseKey) => {
      expect(validateEnv({
        NODE_ENV: 'production',
        [databaseKey]: 'mongodb://example/test',
        PASSPORT_SECRET: 'secret',
        GOOGLE_CLIENT_ID: 'client-id',
        GOOGLE_CLIENT_SECRET: 'client-secret',
      })).toEqual([]);
    }
  );

  test.each(['PASSPORT_SECRET', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'])(
    'identifies a missing %s when remaining production values are configured',
    (missingKey) => {
      const env = {
        NODE_ENV: 'production',
        MONGODB_URI: 'mongodb://example/test',
        PASSPORT_SECRET: 'secret',
        GOOGLE_CLIENT_ID: 'client-id',
        GOOGLE_CLIENT_SECRET: 'client-secret',
      };
      delete env[missingKey];
      expect(() => validateEnv(env)).toThrow(missingKey);
    }
  );
});

describe('CORS origin policy', () => {
  const invokeOrigin = (corsOptions, origin) => new Promise((resolve) => {
    corsOptions.origin(origin, (error, allowed) => resolve({ error, allowed }));
  });

  test.each([
    [undefined, true],
    ['http://localhost:3000', true],
    ['http://localhost:1234', true],
    ['https://localhost', true],
    ['http://127.0.0.1:3000', true],
    ['https://127.0.0.1:4567', true],
    ['https://attacker.example', false],
    ['https://localhost.attacker.example', false],
    ['ftp://localhost:3000', false],
  ])('evaluates origin %s', async (origin, expectedAllowed) => {
    const { corsOptions } = require('../../src/config/cors');
    const result = await invokeOrigin(corsOptions, origin);
    if (expectedAllowed) {
      expect(result).toEqual({ error: null, allowed: true });
    } else {
      expect(result.error).toBeInstanceOf(Error);
      expect(result.allowed).toBeUndefined();
    }
  });

  test('normalizes and allows the configured client origin', async () => {
    const previousUrl = process.env.REACT_APP_URL;
    process.env.REACT_APP_URL = ' https://app.example.test/// ';
    jest.resetModules();
    try {
      const { corsOptions } = require('../../src/config/cors');
      const result = await invokeOrigin(corsOptions, 'https://app.example.test');
      expect(result).toEqual({ error: null, allowed: true });
    } finally {
      if (previousUrl === undefined) delete process.env.REACT_APP_URL;
      else process.env.REACT_APP_URL = previousUrl;
      jest.resetModules();
    }
  });

  test('omits an unconfigured client URL while retaining built-in development origins', async () => {
    const previousUrl = process.env.REACT_APP_URL;
    delete process.env.REACT_APP_URL;
    jest.resetModules();
    try {
      const { corsOptions } = require('../../src/config/cors');
      const localOrigin = await invokeOrigin(corsOptions, 'http://localhost:1234');
      const externalOrigin = await invokeOrigin(corsOptions, 'https://app.example.test');
      expect(localOrigin).toEqual({ error: null, allowed: true });
      expect(externalOrigin.error).toBeInstanceOf(Error);
    } finally {
      if (previousUrl === undefined) delete process.env.REACT_APP_URL;
      else process.env.REACT_APP_URL = previousUrl;
      jest.resetModules();
    }
  });

  test('configures credentials, supported methods, and exposed headers', () => {
    const { corsOptions } = require('../../src/config/cors');
    expect(corsOptions.credentials).toBe(true);
    expect(corsOptions.methods).toEqual(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']);
    expect(corsOptions.exposedHeaders).toEqual(['set-cookie']);
  });
});

describe('shared route assembly', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  afterEach(() => {
    jest.dontMock('../../models/User');
    for (const [modulePath] of ROUTE_MODULES) jest.dontMock(modulePath);
    jest.resetModules();
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
  });

  test.each([
    [['/api/auth', '/auth'], 'auth'],
    [['/api/airost/doc', '/airost/doc', '/doc'], 'documents'],
    [['/api/admin', '/admin'], 'admin'],
    [['/api/user', '/user'], 'users'],
    [['/api/projects', '/projects'], 'projects'],
    [['/api/calendar', '/calendar'], 'events'],
  ])('serves the same feature router at canonical and legacy paths', async (paths, routeName) => {
    const app = createRouteApp();
    for (const path of paths) {
      const res = await request(app).get(`${path}/migration-probe`);
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ route: routeName });
    }
  });

  test('test login endpoint returns 404 when the requested user is missing', async () => {
    const userModel = { findById: jest.fn().mockResolvedValue(null) };
    const app = createRouteApp({ userModel });
    const res = await request(app).post('/test/auth/login').send({ userId: 'missing' });
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'User not found' });
    expect(userModel.findById).toHaveBeenCalledWith('missing');
  });

  test('test login endpoint returns 500 when session login fails', async () => {
    const user = { id: 'user-1' };
    const userModel = { findById: jest.fn().mockResolvedValue(user) };
    const app = createRouteApp({ userModel, loginError: new Error('session failure') });
    const res = await request(app).post('/test/auth/login').send({ userId: 'user-1' });
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'session failure' });
  });

  test('test login endpoint logs in a found user and returns success', async () => {
    const user = { id: 'user-1', name: 'Test User' };
    const userModel = { findById: jest.fn().mockResolvedValue(user) };
    const app = createRouteApp({ userModel });
    const res = await request(app).post('/test/auth/login').send({ userId: 'user-1' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, user });
  });

  test('test login endpoint catches database errors', async () => {
    const userModel = { findById: jest.fn().mockRejectedValue(new Error('lookup failure')) };
    const app = createRouteApp({ userModel });
    const res = await request(app).post('/test/auth/login').send({ userId: 'user-1' });
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'lookup failure' });
  });

  test('does not register the test login endpoint outside test mode', async () => {
    const app = createRouteApp({ nodeEnv: 'development' });
    const res = await request(app).post('/test/auth/login').send({ userId: 'user-1' });
    expect(res.status).toBe(404);
  });
});
