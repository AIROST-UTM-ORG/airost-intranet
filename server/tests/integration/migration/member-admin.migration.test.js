const request = require('supertest');
const mongoose = require('mongoose');
const session = require('express-session');
const { connect, clearDatabase, closeDatabase } = require('../../setup/mongoSetup');
const { createApp } = require('../../../app');
const User = require('../../../models/User');
const VerifiedUser = require('../../../models/VerifiedUser');

let app;
let sessionStore;

const createUser = (overrides = {}) =>
  User.create({
    googleId: `google-${new mongoose.Types.ObjectId()}`,
    name: 'Admin Test User',
    email: `user-${new mongoose.Types.ObjectId()}@example.com`,
    positions: ['member'],
    photoUrl: 'https://example.com/photo.jpg',
    ...overrides,
  });

const createVerifiedUserDoc = (overrides = {}) =>
  VerifiedUser.create({
    name: 'Verified List User',
    email: `verified-${new mongoose.Types.ObjectId()}@example.com`,
    position: ['member'],
    ...overrides,
  });

const createAuthenticatedAgent = async (user) => {
  const agent = request.agent(app);
  await agent.post('/test/auth/login').send({ userId: user.id || user._id.toString() }).expect(200);
  return agent;
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

describe('Member Admin feature migration integration', () => {
  describe('GET /api/admin/users and GET /admin/users', () => {
    test.each(['/api/admin/users', '/admin/users'])(
      'returns 401 when unauthenticated at %s',
      async (path) => {
        const res = await request(app).get(path);
        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);
        expect(res.body.error.code).toBe('UNAUTHENTICATED');
      }
    );

    test.each([
      ['member role', ['member']],
      ['project lead role', ['project lead']],
      ['advisor role', ['advisor']],
      ['empty positions', []],
    ])('returns 403 when authenticated user is non-admin (%s)', async (_label, positions) => {
      const nonAdmin = await createUser({ positions });
      const agent = await createAuthenticatedAgent(nonAdmin);

      for (const path of ['/api/admin/users', '/admin/users']) {
        const res = await agent.get(path);
        expect(res.status).toBe(403);
        expect(res.body.success).toBe(false);
        expect(res.body.error.code).toBe('FORBIDDEN');
      }
    });

    test('authorizes case-insensitive admin role (e.g. AdMiN)', async () => {
      const admin = await createUser({
        name: 'Case Admin',
        email: 'caseadmin@airost.com',
        positions: ['AdMiN'],
      });
      const agent = await createAuthenticatedAgent(admin);

      const res = await agent.get('/api/admin/users');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('canonical /api/admin/users returns envelope and legacy /admin/users returns raw array', async () => {
      const admin = await createUser({
        name: 'Admin Boss',
        email: 'boss@airost.com',
        positions: ['admin'],
      });
      const agent = await createAuthenticatedAgent(admin);

      const canonicalRes = await agent.get('/api/admin/users');
      expect(canonicalRes.status).toBe(200);
      expect(canonicalRes.body.success).toBe(true);
      expect(Array.isArray(canonicalRes.body.data)).toBe(true);

      const legacyRes = await agent.get('/admin/users');
      expect(legacyRes.status).toBe(200);
      expect(Array.isArray(legacyRes.body)).toBe(true);
      expect(legacyRes.body).toEqual(canonicalRes.body.data);
    });

    test('correctly merges registered users and verified users', async () => {
      const admin = await createUser({
        name: 'Super Admin',
        email: 'superadmin@airost.com',
        positions: ['admin'],
        photoUrl: 'https://example.com/admin.png',
      });
      // Alice is in User AND VerifiedUser
      await createUser({
        name: 'Alice Registered',
        email: 'alice@airost.com',
        positions: ['member'],
        photoUrl: 'https://example.com/alice.png',
      });
      await createVerifiedUserDoc({
        name: 'Alice Verified',
        email: 'alice@airost.com',
        position: ['member'],
      });

      // Bob is in User only (not verified)
      await createUser({
        name: 'Bob Registered',
        email: 'bob@airost.com',
        positions: ['member'],
      });

      // Charlie is in VerifiedUser only (unlinked, loggedIn: false)
      await createVerifiedUserDoc({
        name: 'Charlie Verified Only',
        email: 'charlie@airost.com',
        position: ['advisor'],
      });

      const agent = await createAuthenticatedAgent(admin);
      const res = await agent.get('/api/admin/users');

      expect(res.status).toBe(200);
      const users = res.body.data;

      // Alice: loggedIn true, verified true, photo mapped, positions mapped, stripped googleId and __v
      const alice = users.find((u) => u.email === 'alice@airost.com');
      expect(alice).toBeDefined();
      expect(alice.loggedIn).toBe(true);
      expect(alice.verified).toBe(true);
      expect(alice.photo).toBe('https://example.com/alice.png');
      expect(alice.position).toEqual(['member']);
      expect(alice).not.toHaveProperty('googleId');
      expect(alice).not.toHaveProperty('__v');

      // Bob: loggedIn true, verified false
      const bob = users.find((u) => u.email === 'bob@airost.com');
      expect(bob).toBeDefined();
      expect(bob.loggedIn).toBe(true);
      expect(bob.verified).toBe(false);

      // Charlie: loggedIn false, verified true, photo empty, position mapped
      const charlie = users.find((u) => u.email === 'charlie@airost.com');
      expect(charlie).toBeDefined();
      expect(charlie.loggedIn).toBe(false);
      expect(charlie.verified).toBe(true);
      expect(charlie.photo).toBe('');
      expect(charlie.position).toEqual(['advisor']);

      // Deduplication: each email appears exactly once
      const emails = users.map((u) => u.email.toLowerCase());
      expect(emails.filter((e) => e === 'alice@airost.com')).toHaveLength(1);
    });

    test('handles case-insensitive email matching and VerifiedUser deduplication in merged list', async () => {
      const admin = await createUser({ positions: ['admin'] });
      // User with lowercase email
      await createUser({
        name: 'Mixed User',
        email: 'mixed@airost.com',
        positions: ['member'],
      });
      // VerifiedUser with uppercase and whitespace
      await createVerifiedUserDoc({
        name: 'Mixed User Verified',
        email: '  MIXED@AIROST.COM  ',
        position: ['member'],
      });
      // VerifiedUser duplicate records
      await createVerifiedUserDoc({
        name: 'Dup User 1',
        email: 'duplicate@airost.com',
        position: ['advisor'],
      });
      await createVerifiedUserDoc({
        name: 'Dup User 2',
        email: '  DUPLICATE@AIROST.COM  ',
        position: ['advisor'],
      });

      const agent = await createAuthenticatedAgent(admin);
      const res = await agent.get('/api/admin/users');

      expect(res.status).toBe(200);
      const users = res.body.data;

      const mixed = users.filter((u) => u.email.toLowerCase() === 'mixed@airost.com');
      expect(mixed).toHaveLength(1);
      expect(mixed[0].loggedIn).toBe(true);
      expect(mixed[0].verified).toBe(true);

      const dups = users.filter((u) => u.email.toLowerCase() === 'duplicate@airost.com');
      expect(dups).toHaveLength(1);
      expect(dups[0].loggedIn).toBe(false);
      expect(dups[0].verified).toBe(true);
    });
  });

  describe('POST /api/admin/users/verified and POST /admin/users/verified', () => {
    test.each(['/api/admin/users/verified', '/admin/users/verified'])(
      'returns 401 when unauthenticated at %s',
      async (path) => {
        const res = await request(app)
          .post(path)
          .send({ name: 'Dave', email: 'dave@airost.com', position: 'member' });
        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);
        expect(res.body.error.code).toBe('UNAUTHENTICATED');
      }
    );

    test.each([
      ['member role', ['member']],
      ['project lead role', ['project lead']],
      ['advisor role', ['advisor']],
      ['empty positions', []],
    ])('returns 403 when non-admin calls POST (%s)', async (_label, positions) => {
      const nonAdmin = await createUser({ positions });
      const agent = await createAuthenticatedAgent(nonAdmin);

      for (const path of ['/api/admin/users/verified', '/admin/users/verified']) {
        const res = await agent
          .post(path)
          .send({ name: 'Dave', email: 'dave@airost.com', position: 'member' });
        expect(res.status).toBe(403);
        expect(res.body.success).toBe(false);
        expect(res.body.error.code).toBe('FORBIDDEN');
      }
    });

    test('validates payload and rejects invalid inputs with 400 VALIDATION_ERROR', async () => {
      const admin = await createUser({ positions: ['admin'] });
      const agent = await createAuthenticatedAgent(admin);

      // Unsupported fields
      const res1 = await agent
        .post('/api/admin/users/verified')
        .send({ name: 'Dave', email: 'dave@airost.com', position: 'member', extra: 'bad' });
      expect(res1.status).toBe(400);
      expect(res1.body.error.code).toBe('VALIDATION_ERROR');

      // Invalid email
      const res2 = await agent
        .post('/api/admin/users/verified')
        .send({ name: 'Dave', email: 'invalid-email', position: 'member' });
      expect(res2.status).toBe(400);
      expect(res2.body.error.code).toBe('VALIDATION_ERROR');

      // Missing position
      const res3 = await agent
        .post('/api/admin/users/verified')
        .send({ name: 'Dave', email: 'dave@airost.com' });
      expect(res3.status).toBe(400);
      expect(res3.body.error.code).toBe('VALIDATION_ERROR');

      // Name exceeding 100 chars
      const res4 = await agent
        .post('/api/admin/users/verified')
        .send({ name: 'a'.repeat(101), email: 'dave@airost.com', position: 'member' });
      expect(res4.status).toBe(400);
      expect(res4.body.error.code).toBe('VALIDATION_ERROR');

      // Position exceeding 80 chars
      const res5 = await agent
        .post('/api/admin/users/verified')
        .send({ name: 'Dave', email: 'dave@airost.com', position: 'p'.repeat(81) });
      expect(res5.status).toBe(400);
      expect(res5.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('accepts max length boundaries (name: 100, position: 80)', async () => {
      const admin = await createUser({ positions: ['admin'] });
      const agent = await createAuthenticatedAgent(admin);

      const boundaryPayload = {
        name: 'n'.repeat(100),
        email: 'boundary.user@airost.com',
        position: 'p'.repeat(80),
      };

      const res = await agent.post('/api/admin/users/verified').send(boundaryPayload);
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);

      const created = await User.findOne({ email: 'boundary.user@airost.com' });
      expect(created.name).toHaveLength(100);
      expect(created.positions[0]).toHaveLength(80);
    });

    test('canonical endpoint creates a new user and returns 201 with envelope', async () => {
      const admin = await createUser({ positions: ['admin'] });
      const agent = await createAuthenticatedAgent(admin);

      const payload = {
        name: 'New Member',
        email: 'newmember@airost.com',
        position: 'developer',
      };

      const res = await agent.post('/api/admin/users/verified').send(payload);
      expect(res.status).toBe(201);
      expect(res.body).toEqual({
        success: true,
        data: { createStatus: 'success' },
      });

      const created = await User.findOne({ email: 'newmember@airost.com' });
      expect(created).not.toBeNull();
      expect(created.name).toBe('New Member');
      expect(created.positions).toEqual(['developer']);
      expect(created.googleId).toBeUndefined();
    });

    test('legacy endpoint creates a new user and returns 201 raw data', async () => {
      const admin = await createUser({ positions: ['admin'] });
      const agent = await createAuthenticatedAgent(admin);

      const payload = {
        name: 'Legacy Member',
        email: 'legacymember@airost.com',
        position: 'designer',
      };

      const res = await agent.post('/admin/users/verified').send(payload);
      expect(res.status).toBe(201);
      expect(res.body).toEqual({ createStatus: 'success' });

      const created = await User.findOne({ email: 'legacymember@airost.com' });
      expect(created).not.toBeNull();
      expect(created.name).toBe('Legacy Member');
      expect(created.positions).toEqual(['designer']);
    });

    test('normalizes uppercase emails and trimmed strings and updates existing user (200)', async () => {
      const admin = await createUser({ positions: ['admin'] });
      const existing = await createUser({
        name: 'Existing Member',
        email: 'existing@airost.com',
        positions: ['developer'],
      });
      const agent = await createAuthenticatedAgent(admin);

      // Add 'lead' position via canonical endpoint with uppercase email and whitespace
      const res1 = await agent.post('/api/admin/users/verified').send({
        name: '  Existing Member  ',
        email: '  EXISTING@AIROST.COM  ',
        position: '  lead  ',
      });
      expect(res1.status).toBe(200);
      expect(res1.body).toEqual({
        success: true,
        data: { createStatus: 'success' },
      });

      let updated = await User.findOne({ email: 'existing@airost.com' });
      expect(updated.positions).toContain('developer');
      expect(updated.positions).toContain('lead');

      // Add 'lead' again via legacy endpoint -> $addToSet prevents duplicate
      const res2 = await agent.post('/admin/users/verified').send({
        name: 'Existing Member',
        email: 'EXISTING@AIROST.COM',
        position: 'lead',
      });
      expect(res2.status).toBe(200);
      expect(res2.body).toEqual({ createStatus: 'success' });

      updated = await User.findOne({ email: 'existing@airost.com' });
      expect(updated.positions.filter((p) => p === 'lead')).toHaveLength(1);
    });
  });
});
