const request = require('supertest');
const mongoose = require('mongoose');
const session = require('express-session');
const { connect, clearDatabase, closeDatabase } = require('../../setup/mongoSetup');
const { createApp } = require('../../../app');
const User = require('../../../models/User');
const VerifiedUser = require('../../../models/VerifiedUser');

let app;
let sessionStore;

const createUser = (overrides = {}) => User.create({
  name: 'Admin Migration User',
  email: `admin-migration-${new mongoose.Types.ObjectId()}@example.com`,
  positions: ['member'],
  ...overrides,
});

const createAgent = async (user) => {
  const agent = request.agent(app);
  await agent.post('/test/auth/login').send({ userId: user.id }).expect(200);
  return agent;
};

const createAdminAgent = async () => createAgent(await createUser({ positions: ['admin'] }));

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

describe('members admin feature migration', () => {
  describe('GET admin user directory', () => {
    test.each(['/api/admin/users', '/admin/users'])('%s requires an authenticated administrator', async (path) => {
      const response = await request(app).get(path).expect(401);
      expect(response.body.error.code).toBe('UNAUTHENTICATED');
    });

    test('forbids an authenticated non-admin from reading the merged directory', async () => {
      const member = await createUser();
      const agent = await createAgent(member);

      const response = await agent.get('/api/admin/users').expect(403);

      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    test('merges logged-in users and VerifiedUser placeholders with the correct flags', async () => {
      const adminAgent = await createAdminAgent();
      const verifiedUser = await createUser({
        name: 'Verified Login',
        email: 'verified-login@example.com',
        googleId: 'private-google-id',
        photoUrl: 'https://example.com/avatar.png',
      });
      const unverifiedUser = await createUser({
        name: 'Unverified Login',
        email: 'unverified-login@example.com',
        googleId: 'private-unverified-id',
      });
      await VerifiedUser.create({
        email: verifiedUser.email,
        name: verifiedUser.name,
        position: ['member'],
      });
      await VerifiedUser.create({
        email: 'placeholder@example.com',
        name: 'Placeholder Member',
        position: ['member'],
      });

      const response = await adminAgent.get('/api/admin/users').expect(200);
      const loggedInVerified = response.body.find((user) => user.email === verifiedUser.email);
      const loggedInUnverified = response.body.find((user) => user.email === unverifiedUser.email);
      const placeholder = response.body.find((user) => user.email === 'placeholder@example.com');

      expect(loggedInVerified).toMatchObject({
        name: 'Verified Login', photo: 'https://example.com/avatar.png',
        loggedIn: true, verified: true,
      });
      expect(loggedInUnverified).toMatchObject({ loggedIn: true, verified: false });
      expect(placeholder).toMatchObject({
        name: 'Placeholder Member', photo: '', position: ['member'],
        loggedIn: false, verified: true,
      });
      for (const user of response.body) {
        expect(user).not.toHaveProperty('googleId');
        expect(user).not.toHaveProperty('googleID');
        expect(user).not.toHaveProperty('__v');
      }
    });

    test('canonical and legacy GET routes return the same merged list', async () => {
      const adminAgent = await createAdminAgent();
      await createUser({ name: 'Visible User' });
      await VerifiedUser.create({ email: 'placeholder@example.com', name: 'Placeholder', position: ['member'] });

      const canonical = await adminAgent.get('/api/admin/users').expect(200);
      const legacy = await adminAgent.get('/admin/users').expect(200);

      expect(canonical.body).toEqual(legacy.body);
    });
  });

  describe('POST verified member', () => {
    test.each([
      [{ email: 'member@example.com', position: 'member' }],
      [{ name: 'Member', position: 'member' }],
      [{ name: 'Member', email: 'member@example.com' }],
    ])('rejects missing required fields with VALIDATION_ERROR', async (payload) => {
      const adminAgent = await createAdminAgent();

      const response = await adminAgent.post('/api/admin/users/verified').send(payload).expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('rejects malformed email values', async () => {
      const adminAgent = await createAdminAgent();

      const response = await adminAgent.post('/api/admin/users/verified')
        .send({ name: 'Member', email: 'not-an-email', position: 'member' })
        .expect(400);

      expect(response.body.error).toMatchObject({ code: 'VALIDATION_ERROR' });
    });

    test('forbids a member from creating or promoting a user', async () => {
      const member = await createUser();
      const agent = await createAgent(member);

      const response = await agent.post('/api/admin/users/verified')
        .send({ name: 'Target', email: 'target@example.com', position: 'admin' })
        .expect(403);

      expect(response.body.error.code).toBe('FORBIDDEN');
      await expect(User.findOne({ email: 'target@example.com' })).resolves.toBeNull();
    });

    test('creates a user with normalized name and email and returns the created envelope', async () => {
      const adminAgent = await createAdminAgent();

      const response = await adminAgent.post('/api/admin/users/verified')
        .send({ name: '  New Member  ', email: '  New.Member@Example.com ', position: 'member' })
        .expect(201);

      expect(response.body).toEqual({ success: true, data: { createStatus: 'success' } });
      const saved = await User.findOne({ email: 'new.member@example.com' });
      expect(saved).toMatchObject({ name: 'New Member', positions: ['member'] });
      expect(saved.googleId).toBeUndefined();
    });

    test('adds a position to an existing user without creating a duplicate', async () => {
      const existing = await createUser({ email: 'existing@example.com', positions: ['member'] });
      const adminAgent = await createAdminAgent();

      const response = await adminAgent.post('/admin/users/verified')
        .send({ name: 'Existing', email: 'EXISTING@example.com', position: 'advisor' })
        .expect(200);

      expect(response.body).toEqual({ success: true, data: { createStatus: 'success' } });
      const matches = await User.find({ email: 'existing@example.com' });
      expect(matches).toHaveLength(1);
      expect(matches[0]._id.toString()).toBe(existing.id);
      expect(matches[0].positions).toEqual(['member', 'advisor']);
    });

    test('canonical and legacy POST routes share the creation response contract', async () => {
      const adminAgent = await createAdminAgent();
      const payload = { name: 'Alias Member', email: 'alias-member@example.com', position: 'member' };

      const canonical = await adminAgent.post('/api/admin/users/verified').send(payload).expect(201);
      const legacy = await adminAgent.post('/admin/users/verified')
        .send({ ...payload, email: 'second-alias-member@example.com' })
        .expect(201);

      expect(canonical.body).toEqual(legacy.body);
    });
  });
});
