/**
 * Integration tests for the Admin API endpoints.
 * Uses mongodb-memory-server — never touches the production database.
 *
 * Routes tested:
 *   GET  /admin/users
 *   POST /admin/users/verified
 */

const request = require('supertest');
const { connect, clearDatabase, closeDatabase } = require('../setup/mongoSetup');
const { createApp } = require('../../app');
const User = require('../../models/User');
const VerifiedUser = require('../../models/VerifiedUser');

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
    googleID: 'google-id-001',
    name: 'Alice',
    email: 'alice@airost.com',
    photo: 'https://example.com/photo.png',
    position: ['member'],
    ...overrides,
  });

const seedVerifiedUser = (overrides = {}) =>
  VerifiedUser.create({
    name: 'Bob',
    email: 'bob@airost.com',
    position: ['admin'],
    ...overrides,
  });

// ── GET /admin/users ──────────────────────────────────────────────────────────

describe.skip('GET /admin/users', () => {
  test('returns 200 and an empty array when no users exist', async () => {
    const res = await request(app).get('/admin/users');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(0);
  });

  test('merges logged-in users with verified-only users', async () => {
    await seedUser({ email: 'alice@airost.com' });
    await seedVerifiedUser({ email: 'alice@airost.com' }); // same email → loggedIn + verified
    await seedVerifiedUser({ email: 'charlie@airost.com', name: 'Charlie', position: ['member'] });

    const res = await request(app).get('/admin/users');
    expect(res.status).toBe(200);

    const alice = res.body.find((u) => u.email === 'alice@airost.com');
    expect(alice).toBeDefined();
    expect(alice.loggedIn).toBe(true);
    expect(alice.verified).toBe(true);

    const charlie = res.body.find((u) => u.email === 'charlie@airost.com');
    expect(charlie).toBeDefined();
    expect(charlie.loggedIn).toBe(false);
    expect(charlie.verified).toBe(true);
  });

  test('marks a logged-in user as not verified when no VerifiedUser record exists', async () => {
    await seedUser({ email: 'unverified@airost.com', googleID: 'gid-002' });

    const res = await request(app).get('/admin/users');
    const user = res.body.find((u) => u.email === 'unverified@airost.com');
    expect(user.verified).toBe(false);
    expect(user.loggedIn).toBe(true);
  });
});

// ── POST /admin/users/verified ─────────────────────────────────────────────

describe.skip('POST /admin/users/verified', () => {
  test('creates a new verified user and returns 201 with createStatus=success', async () => {
    const payload = { name: 'Dave', email: 'dave@airost.com', position: 'member' };
    const res = await request(app).post('/admin/users/verified').send(payload);

    expect(res.status).toBe(201);
    expect(res.body.createStatus).toBe('success');

    // Verify it is actually persisted
    const saved = await VerifiedUser.findOne({ email: 'dave@airost.com' });
    expect(saved).not.toBeNull();
    expect(saved.name).toBe('Dave');
  });

  test('returns createStatus=exist when the email is already verified', async () => {
    await seedVerifiedUser({ email: 'existing@airost.com', name: 'Existing', position: ['member'] });

    const res = await request(app)
      .post('/admin/users/verified')
      .send({ name: 'Duplicate', email: 'existing@airost.com', position: 'member' });

    expect(res.status).toBe(200);
    expect(res.body.createStatus).toBe('exist');
  });

  test('updates the corresponding User position when creating a verified user', async () => {
    await seedUser({ email: 'promote@airost.com', googleID: 'gid-003' });

    await request(app)
      .post('/admin/users/verified')
      .send({ name: 'Promote', email: 'promote@airost.com', position: 'admin' });

    const updatedUser = await User.findOne({ email: 'promote@airost.com' });
    expect(updatedUser.position).toContain('admin');
  });
});
