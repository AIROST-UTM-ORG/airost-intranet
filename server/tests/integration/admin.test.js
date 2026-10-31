/**
 * Integration tests for the Admin API endpoints.
 * Uses mongodb-memory-server — never touches the production database.
 *
 * Routes tested:
 *   GET  /api/user/users
 *   POST /admin/users/verified
 */

const request = require('supertest');
const { connect, clearDatabase, closeDatabase } = require('../setup/mongoSetup');
const { createApp } = require('../../app');
const User = require('../../models/User');
require('../../models/Project');

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

const seedUser = (overrides = {}) =>
  User.create({
    googleId: 'google-id-001',
    name: 'Alice',
    email: 'alice@airost.com',
    photoUrl: 'https://example.com/photo.png',
    positions: ['member'],
    ...overrides,
  });

// ── GET /api/user/users ──────────────────────────────────────────────────────

describe('GET /api/user/users', () => {
  test('returns 200 and an empty array when no users exist', async () => {
    const res = await request(app).get('/api/user/users');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(0);
  });

  test('returns logged-in users and User placeholders from one collection', async () => {
    await seedUser({ email: 'alice@airost.com' });
    await User.create({ email: 'charlie@airost.com', name: 'Charlie', positions: ['member'] });

    const res = await request(app).get('/api/user/users');
    expect(res.status).toBe(200);

    const alice = res.body.find((u) => u.email === 'alice@airost.com');
    expect(alice).toBeDefined();
    expect(alice.loggedIn).toBe(true);
    expect(alice.verified).toBe(true);

    const charlie = res.body.find((u) => u.email === 'charlie@airost.com');
    expect(charlie).toBeDefined();
    expect(charlie.loggedIn).toBe(false);
    expect(charlie.verified).toBe(true);
    expect(charlie).not.toHaveProperty('googleId');
  });

  test('marks a logged-in user as not verified when no VerifiedUser record exists', async () => {
    await seedUser({ email: 'unverified@airost.com', googleId: 'gid-002', positions: [] });

    const res = await request(app).get('/api/user/users');
    const user = res.body.find((u) => u.email === 'unverified@airost.com');
    expect(user.verified).toBe(false);
    expect(user.loggedIn).toBe(true);
  });
});

// ── POST /admin/users/verified ─────────────────────────────────────────────

describe('POST /admin/users/verified', () => {
  test('creates a placeholder User for a verified member', async () => {
    const payload = { name: 'Dave', email: 'dave@airost.com', position: 'member' };
    const res = await request(app).post('/admin/users/verified').send(payload);

    expect(res.status).toBe(201);
    expect(res.body.createStatus).toBe('success');

    const saved = await User.findOne({ email: 'dave@airost.com' });
    expect(saved).not.toBeNull();
    expect(saved.name).toBe('Dave');
    expect(saved.googleId).toBeUndefined();
    expect(saved.positions).toEqual(['member']);
  });

  test('approves an existing User without duplicating its record', async () => {
    const existing = await seedUser({ email: 'existing@airost.com', name: 'Existing', positions: [] });

    const res = await request(app)
      .post('/admin/users/verified')
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

    await request(app)
      .post('/admin/users/verified')
      .send({ name: 'Promote', email: 'promote@airost.com', position: 'admin' });

    const updatedUser = await User.findOne({ email: 'promote@airost.com' });
    expect(updatedUser.positions).toContain('admin');
  });
});
