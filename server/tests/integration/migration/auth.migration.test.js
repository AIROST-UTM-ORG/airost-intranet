const request = require('supertest');
const passport = require('passport');
const session = require('express-session');
const { connect, clearDatabase, closeDatabase } = require('../../setup/mongoSetup');
const { createApp } = require('../../../app');
const User = require('../../../models/User');

let app;

beforeAll(async () => {
  await connect();
  app = createApp();
});

afterEach(async () => {
  jest.restoreAllMocks();
  await clearDatabase();
});

afterAll(async () => {
  await closeDatabase();
});

const createUser = (overrides = {}) => User.create({
  googleId: 'auth-migration-google-id',
  name: 'Migration Test User',
  email: 'auth-migration@example.com',
  featuredProjectIds: [],
  ...overrides,
});

const createAuthenticatedAgent = async (user) => {
  const agent = request.agent(app);
  await agent.post('/test/auth/login').send({ userId: user.id }).expect(200);
  return agent;
};

describe('auth feature migration integration', () => {
  describe('canonical and legacy login status routes', () => {
    test('canonical success requires a session and returns the standardized unauthenticated error', async () => {
      const response = await request(app).get('/api/auth/login/success').expect(401);
      expect(response.body).toEqual({
        success: false,
        error: { code: 'UNAUTHENTICATED', message: 'User not authenticated' },
      });
    });

    test('legacy success route retains its unauthenticated response contract', async () => {
      const response = await request(app).get('/auth/login/success').expect(401);
      expect(response.body).toEqual({ success: false, message: 'User not authenticated' });
    });

    test('authenticated canonical response contains populated user data without Google identifiers', async () => {
      const user = await createUser({ googleId: 'private-google-id' });
      const agent = await createAuthenticatedAgent(user);

      const response = await agent.get('/api/auth/login/success').expect(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe('auth-migration@example.com');
      expect(response.body.data.user).not.toHaveProperty('googleId');
      expect(response.body.data.user).not.toHaveProperty('googleID');
      expect(response.body.data.user).not.toHaveProperty('__v');
      expect(response.body.data.user.featuredProjectIds).toEqual([]);
    });

    test('authenticated legacy response retains its existing top-level user contract', async () => {
      const user = await createUser();
      const agent = await createAuthenticatedAgent(user);

      const response = await agent.get('/auth/login/success').expect(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Successfully authenticated');
      expect(response.body.user.email).toBe(user.email);
      expect(response.body).not.toHaveProperty('data');
    });

    test('canonical and legacy failure routes preserve their respective response contracts', async () => {
      const canonical = await request(app).get('/api/auth/login/failed').expect(401);
      expect(canonical.body).toEqual({
        success: false,
        error: { code: 'AUTH_FAILED', message: 'Authentication failed' },
      });

      const legacy = await request(app).get('/auth/login/failed').expect(401);
      expect(legacy.body).toEqual({ success: false, message: 'Authentication failed' });
    });
  });

  describe('test-only login bootstrap and validation', () => {
    test('rejects a whitespace-only user ID before database lookup', async () => {
      const response = await request(app)
        .post('/test/auth/login')
        .send({ userId: '   ' })
        .expect(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('trims a padded user ID, establishes a session, and authenticates through the feature route', async () => {
      const user = await createUser();
      const agent = request.agent(app);

      await agent.post('/test/auth/login').send({ userId: `  ${user.id}  ` }).expect(200);
      const response = await agent.get('/api/auth/login/success').expect(200);

      expect(response.body.data.user._id).toBe(user.id);
    });
  });

  describe('logout through canonical and legacy mounts', () => {
    test.each([
      ['GET', '/api/auth/logout', 'application/json'],
      ['POST', '/api/auth/logout', 'application/json'],
    ])('%s %s clears the cookie and returns JSON', async (method, path, accept) => {
      const user = await createUser();
      const agent = await createAuthenticatedAgent(user);
      const response = await agent[method.toLowerCase()](path).set('Accept', accept).expect(200);

      expect(response.body).toEqual({ success: true, data: { message: 'Successfully logged out' } });
      expect(response.headers['set-cookie']).toEqual(
        expect.arrayContaining([expect.stringMatching(/^connect\.sid=;/)])
      );
      await agent.get('/api/auth/login/success').expect(401);
    });

    test('legacy POST logout retains its JSON response and terminates the session', async () => {
      const user = await createUser();
      const agent = await createAuthenticatedAgent(user);
      const response = await agent.post('/auth/logout').set('Accept', 'application/json').expect(200);

      expect(response.body).toEqual({ success: true, message: 'Successfully logged out' });
      expect(response.headers['set-cookie']).toEqual(
        expect.arrayContaining([expect.stringMatching(/^connect\.sid=;/)])
      );
      await agent.get('/auth/login/success').expect(401);
    });

    test('session-store destruction failure returns a safe error and still clears the cookie', async () => {
      const store = new session.MemoryStore();
      const destroySession = store.destroy.bind(store);
      let failDestroy = false;
      const privateStoreError = 'private session-store failure detail';
      store.destroy = (sessionId, callback) => {
        if (failDestroy) return callback(new Error(privateStoreError));
        return destroySession(sessionId, callback);
      };

      const storeApp = createApp({ sessionStore: store });
      const user = await createUser();
      const agent = request.agent(storeApp);
      await agent.post('/test/auth/login').send({ userId: user.id }).expect(200);
      failDestroy = true;

      const response = await agent
        .post('/api/auth/logout')
        .set('Accept', 'application/json')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('LOGOUT_FAILED');
      expect(response.body.error.details).toEqual({
        passportLogoutCompleted: true,
        sessionPresent: true,
        sessionDestroyed: false,
      });
      expect(JSON.stringify(response.body)).not.toContain(privateStoreError);
      expect(response.headers['set-cookie']).toEqual(
        expect.arrayContaining([expect.stringMatching(/^connect\.sid=;/)])
      );
    });

    test('GET logout redirects browsers to login and clears the cookie', async () => {
      const previousClientUrl = process.env.REACT_APP_URL;
      process.env.REACT_APP_URL = '';
      try {
        const response = await request(app).get('/api/auth/logout').expect(302);
        expect(response.headers.location).toBe('/login');
        expect(response.headers['set-cookie']).toEqual(
          expect.arrayContaining([expect.stringMatching(/^connect\.sid=;/)])
        );
      } finally {
        if (previousClientUrl === undefined) delete process.env.REACT_APP_URL;
        else process.env.REACT_APP_URL = previousClientUrl;
      }
    });
  });

  test('Google entry and callback routes reach Passport with OAuth configuration', async () => {
    const previousClientUrl = process.env.REACT_APP_URL;
    process.env.REACT_APP_URL = 'https://app.example.test/';
    const authenticate = jest.spyOn(passport, 'authenticate').mockImplementation((strategy, options) =>
      (req, res) => res.status(200).json({ strategy, options }));

    try {
      const entry = await request(app).get('/api/auth/google').expect(200);
      expect(entry.body).toEqual({
        strategy: 'google',
        options: { scope: ['profile', 'email'], prompt: 'select_account' },
      });

      const callback = await request(app).get('/api/auth/google/callback').expect(200);
      expect(callback.body).toEqual({
        strategy: 'google',
        options: {
          successRedirect: 'https://app.example.test',
          failureRedirect: 'https://app.example.test/login',
          failureFlash: true,
        },
      });
      expect(authenticate).toHaveBeenCalledTimes(2);
    } finally {
      if (previousClientUrl === undefined) delete process.env.REACT_APP_URL;
      else process.env.REACT_APP_URL = previousClientUrl;
    }
  });
});
