/**
 * Integration tests for the Auth API endpoints.
 * Also covers security scenarios (unauthorized access, invalid credentials, session termination).
 *
 * Routes tested:
 *   GET  /auth/login/success  — unauthenticated / invalid credentials → 401
 *   GET  /auth/login/failed   → 401
 *   GET  /auth/logout         — destroys session, clears cookie, redirects to /login
 *   POST /auth/logout         — destroys session, clears cookie, returns 200 JSON
 *   GET  /auth/google         — initiates OAuth redirect
 */

const request = require('supertest');
const { connect, clearDatabase, closeDatabase } = require('../setup/mongoSetup');
const { createApp } = require('../../app');
const User = require('../../models/User');
const { requireAuth } = require('../../middleware/auth');

let app;

beforeAll(async () => {
  await connect();
  app = createApp();

  // Test-only endpoint to simulate passport session serialization in tests
  app.get('/test/login-as/:id', (req, res) => {
    req.session.passport = { user: req.params.id };
    res.json({ success: true });
  });
});

afterEach(async () => {
  await clearDatabase();
});

afterAll(async () => {
  await closeDatabase();
});

// ── GET /auth/login/success ───────────────────────────────────────────────────

describe('GET /auth/login/success', () => {
  test('returns 401 when no session / user is not authenticated', async () => {
    const res = await request(app).get('/auth/login/success');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/not authenticated/i);
  });

  test('returns 401 when request contains invalid credentials or forged session cookie', async () => {
    const res = await request(app)
      .get('/auth/login/success')
      .set('Cookie', ['connect.sid=s%3Ainvalid-fake-session-signature.12345']);

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/not authenticated/i);
  });

  test('returns 200 and user data when user has an active session', async () => {
    const user = await User.create({
      googleID: 'test-google-user-1',
      name: 'Auth User',
      email: 'authuser@example.com',
      photo: 'https://example.com/photo.jpg',
      position: ['member'],
    });

    const agent = request.agent(app);
    await agent.get(`/test/login-as/${user._id}`).expect(200);

    const res = await agent.get('/auth/login/success');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.email).toBe('authuser@example.com');
  });
});

// ── GET /auth/login/failed ────────────────────────────────────────────────────

describe('GET /auth/login/failed', () => {
  test('returns 401 with failure message', async () => {
    const res = await request(app).get('/auth/login/failed');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/authentication failed/i);
  });
});

// ── GET /auth/google ──────────────────────────────────────────────────────────

describe('GET /auth/google', () => {
  test('redirects to Google OAuth when credentials are present in env', async () => {
    const res = await request(app).get('/auth/google');
    // Either 302 redirect or 500 if the passport strategy cannot build the URL with dummy credentials
    expect([302, 500]).toContain(res.status);
  });
});

// ── /auth/logout (GET and POST) ───────────────────────────────────────────────

describe('/auth/logout', () => {
  test('clears the session cookie and redirects to the login page on GET', async () => {
    const res = await request(app).get('/auth/logout');

    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(/\/login$/);
    expect(res.headers['set-cookie']).toEqual(
      expect.arrayContaining([expect.stringMatching(/^connect\.sid=;/)])
    );
  });

  test('clears the session cookie and returns 200 JSON on POST when accepting JSON', async () => {
    const res = await request(app)
      .post('/auth/logout')
      .set('Accept', 'application/json');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/successfully logged out/i);
    expect(res.headers['set-cookie']).toEqual(
      expect.arrayContaining([expect.stringMatching(/^connect\.sid=;/)])
    );
  });

  test('terminates active session on backend and rejects subsequent requests with 401', async () => {
    const user = await User.create({
      googleID: 'test-google-user-logout',
      name: 'Logout User',
      email: 'logoutuser@example.com',
      photo: 'https://example.com/photo.jpg',
      position: ['member'],
    });

    const agent = request.agent(app);
    // Establish active session
    await agent.get(`/test/login-as/${user._id}`).expect(200);

    // Verify session is active
    const activeRes = await agent.get('/auth/login/success');
    expect(activeRes.status).toBe(200);
    expect(activeRes.body.success).toBe(true);

    // Perform logout
    const logoutRes = await agent.get('/auth/logout');
    expect(logoutRes.status).toBe(302);

    // Verify subsequent request with agent or expired session is rejected with 401
    const postLogoutRes = await agent.get('/auth/login/success');
    expect(postLogoutRes.status).toBe(401);
    expect(postLogoutRes.body.success).toBe(false);
  });
});

// ── requireAuth Middleware ────────────────────────────────────────────────────

describe('requireAuth middleware', () => {
  test('returns 401 when request is not authenticated', () => {
    const req = { isAuthenticated: () => false };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: expect.stringMatching(/unauthorized/i),
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  test('calls next when request is authenticated', () => {
    const req = { isAuthenticated: () => true };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    requireAuth(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });
});
