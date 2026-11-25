/**
 * Integration tests for the Admin API endpoints.
 * Uses mongodb-memory-server — never touches the production database.
 *
 * Routes tested:
 *   GET  /api/user/users
 *   GET  /admin/users
 *   POST /admin/users/verified
 */

const request = require('supertest');
const mongoose = require('mongoose');
const session = require('express-session');
const cookieSignature = require('cookie-signature');
const { connect, clearDatabase, closeDatabase } = require('../setup/mongoSetup');
const { createApp } = require('../../app');
const User = require('../../models/User');
const VerifiedUser = require('../../models/VerifiedUser');
require('../../models/Project');

let app;
let sessionStore;

const authenticatedCookie = async (userId) => {
  const sessionId = `test-session-${new mongoose.Types.ObjectId()}`;
  await new Promise((resolve, reject) => sessionStore.set(sessionId, {
    cookie: {
      originalMaxAge: 7 * 24 * 60 * 60 * 1000,
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
    },
    passport: { user: userId.toString() },
  }, (error) => error ? reject(error) : resolve()));
  const secret = process.env.PASSPORT_SECRET || 'airost-intranet-test-secret';
  const signedSessionId = cookieSignature.sign(sessionId, secret);
  return `connect.sid=${encodeURIComponent(`s:${signedSessionId}`)}`;
};

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

// ── Seed helpers ──────────────────────────────────────────────────────────────

const seedUser = (overrides = {}) =>
  User.create({
    googleId: 'google-id-001',
    name: 'Alice',
    email: 'alice@airost.com',
    photoUrl: 'https://example.com/photo.png',
    positions: ['member'],
    ...overrides,
  });

const authenticatedAdminCookie = async () => {
  const adminId = new mongoose.Types.ObjectId();
  const admin = await seedUser({
    googleId: `admin-${adminId}`,
    email: `admin-${adminId}@airost.com`,
    positions: ['admin'],
  });
  return authenticatedCookie(admin._id);
};

// ── GET /api/user/users ──────────────────────────────────────────────────────

describe('GET /api/user/users', () => {
  test('returns 401 when no session exists', async () => {
    const res = await request(app).get('/api/user/users');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  test('returns 200 and an empty array when no users exist for an authenticated user', async () => {
    const loggedInUser = await seedUser({ email: 'admin-viewer@airost.com', positions: ['admin'], isActive: false });
    const cookie = await authenticatedCookie(loggedInUser._id);
    const res = await request(app).get('/api/user/users').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual([]);
    expect(res.body.meta.total).toBe(0);
  });

  test('returns logged-in users and User placeholders from one collection', async () => {
    const loggedInUser = await seedUser({ email: 'alice@airost.com' });
    await User.create({ email: 'charlie@airost.com', name: 'Charlie', positions: ['member'] });

    const cookie = await authenticatedCookie(loggedInUser._id);
    const res = await request(app).get('/api/user/users').set('Cookie', cookie);
    expect(res.status).toBe(200);

    const alice = res.body.data.find((u) => u.email === 'alice@airost.com');
    expect(alice).toBeDefined();
    expect(alice.loggedIn).toBe(true);
    expect(alice.verified).toBe(true);

    const charlie = res.body.data.find((u) => u.email === 'charlie@airost.com');
    expect(charlie).toBeDefined();
    expect(charlie.loggedIn).toBe(false);
    expect(charlie.verified).toBe(true);
    expect(charlie).not.toHaveProperty('googleId');
  });

  test('marks a logged-in user as not verified when no VerifiedUser record exists', async () => {
    const loggedInUser = await seedUser({ email: 'unverified@airost.com', googleId: 'gid-002', positions: [] });
    const cookie = await authenticatedCookie(loggedInUser._id);

    const res = await request(app).get('/api/user/users').set('Cookie', cookie);
    const user = res.body.data.find((u) => u.email === 'unverified@airost.com');
    expect(user.verified).toBe(false);
    expect(user.loggedIn).toBe(true);
  });
});

// ── GET /admin/users (Legacy) ────────────────────────────────────────────────

describe('GET /admin/users', () => {
  test('returns 401 when the requester is unauthenticated', async () => {
    const res = await request(app).get('/admin/users');
    expect(res.status).toBe(401);
  });

  test('returns 403 when authenticated caller is not an admin', async () => {
    const member = await seedUser({ email: 'non-admin@airost.com', positions: ['member'] });
    const cookie = await authenticatedCookie(member._id);

    const res = await request(app).get('/admin/users').set('Cookie', cookie);
    expect(res.status).toBe(403);
  });

  test('returns raw array of merged users for authenticated admin', async () => {
    const adminCookie = await authenticatedAdminCookie();
    await seedUser({ email: 'member1@airost.com', positions: ['member'] });
    await VerifiedUser.create({
      name: 'Verified Unregistered',
      email: 'verified.unregistered@airost.com',
      position: ['member'],
    });

    const res = await request(app).get('/admin/users').set('Cookie', adminCookie);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);

    const registered = res.body.find((u) => u.email === 'member1@airost.com');
    expect(registered).toBeDefined();
    expect(registered.loggedIn).toBe(true);

    const unreg = res.body.find((u) => u.email === 'verified.unregistered@airost.com');
    expect(unreg).toBeDefined();
    expect(unreg.loggedIn).toBe(false);
    expect(unreg.verified).toBe(true);
  });
});

// ── POST /admin/users/verified ─────────────────────────────────────────────

describe('POST /admin/users/verified', () => {
  test('returns 401 when the requester is not authenticated', async () => {
    const res = await request(app)
      .post('/admin/users/verified')
      .send({ name: 'Dave', email: 'dave@airost.com', position: 'member' });

    expect(res.status).toBe(401);
    expect(await User.findOne({ email: 'dave@airost.com' })).toBeNull();
  });

  test('returns 403 when an authenticated member tries to create a verified user', async () => {
    const member = await seedUser();
    const cookie = await authenticatedCookie(member._id);
    const res = await request(app)
      .post('/admin/users/verified')
      .set('Cookie', cookie)
      .send({ name: 'Dave', email: 'dave@airost.com', position: 'admin' });

    expect(res.status).toBe(403);
    expect(await User.findOne({ email: 'dave@airost.com' })).toBeNull();
  });

  test('rejects invalid payload with 400 VALIDATION_ERROR', async () => {
    const cookie = await authenticatedAdminCookie();

    // Invalid email
    const res1 = await request(app)
      .post('/admin/users/verified')
      .set('Cookie', cookie)
      .send({ name: 'Dave', email: 'not-an-email', position: 'member' });
    expect(res1.status).toBe(400);
    expect(res1.body.error.code).toBe('VALIDATION_ERROR');

    // Missing position
    const res2 = await request(app)
      .post('/admin/users/verified')
      .set('Cookie', cookie)
      .send({ name: 'Dave', email: 'dave@airost.com' });
    expect(res2.status).toBe(400);
    expect(res2.body.error.code).toBe('VALIDATION_ERROR');

    // Name too long (> 100)
    const res3 = await request(app)
      .post('/admin/users/verified')
      .set('Cookie', cookie)
      .send({ name: 'n'.repeat(101), email: 'dave@airost.com', position: 'member' });
    expect(res3.status).toBe(400);
    expect(res3.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('creates a placeholder User for a verified member with normalized email and trims', async () => {
    const cookie = await authenticatedAdminCookie();
    const payload = {
      name: '  Dave Miller  ',
      email: '  DAVE.MILLER@AIROST.COM  ',
      position: '  member  ',
    };
    const res = await request(app).post('/admin/users/verified').set('Cookie', cookie).send(payload);

    expect(res.status).toBe(201);
    expect(res.body.createStatus).toBe('success');

    const saved = await User.findOne({ email: 'dave.miller@airost.com' });
    expect(saved).not.toBeNull();
    expect(saved.name).toBe('Dave Miller');
    expect(saved.googleId).toBeUndefined();
    expect(saved.positions).toEqual(['member']);
  });

  test('approves an existing User without duplicating its record', async () => {
    const existing = await seedUser({ email: 'existing@airost.com', name: 'Existing', positions: [] });
    const cookie = await authenticatedAdminCookie();

    const res = await request(app)
      .post('/admin/users/verified')
      .set('Cookie', cookie)
      .send({ name: 'Duplicate', email: 'existing@airost.com', position: 'member' });

    expect(res.status).toBe(200);
    expect(res.body.createStatus).toBe('success');
    const updated = await User.find({ email: 'existing@airost.com' });
    expect(updated).toHaveLength(1);
    expect(updated[0].positions).toContain('member');
    expect(updated[0]._id.toString()).toBe(existing._id.toString());
  });

  test('adds the selected position to an existing User', async () => {
    await seedUser({ email: 'promote@airost.com', googleId: 'gid-003' });
    const cookie = await authenticatedAdminCookie();

    const res = await request(app)
      .post('/admin/users/verified')
      .set('Cookie', cookie)
      .send({ name: 'Promote', email: 'promote@airost.com', position: 'admin' });

    expect(res.status).toBe(200);
    const updatedUser = await User.findOne({ email: 'promote@airost.com' });
    expect(updatedUser.positions).toContain('admin');
  });
});
