const request = require('supertest');
const mongoose = require('mongoose');
const session = require('express-session');
const { connect, clearDatabase, closeDatabase } = require('../../setup/mongoSetup');
const { createApp } = require('../../../app');
const User = require('../../../models/User');
const Project = require('../../../models/Project');

let app;
let sessionStore;

const createUser = (overrides = {}) => User.create({
  name: 'Member Migration User',
  email: `member-${new mongoose.Types.ObjectId()}@example.com`,
  positions: ['member'],
  featuredProjectIds: [],
  ...overrides,
});

const createAuthenticatedAgent = async (user) => {
  const agent = request.agent(app);
  await agent.post('/test/auth/login').send({ userId: user.id }).expect(200);
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

describe('members feature migration integration', () => {
  describe('directory routes', () => {
    test.each(['/api/user/users', '/user/users'])(
      'requires an authenticated session at %s',
      async (path) => {
        const response = await request(app).get(path).expect(401);
        expect(response.body).toEqual({
          success: false,
          error: { code: 'UNAUTHENTICATED', message: 'Authentication is required' },
        });
      }
    );

    test('filters, sorts, paginates, counts, and formats active directory users', async () => {
      const viewer = await createUser({ isActive: false });
      await createUser({ name: 'Alice', email: 'alice-member@example.com', year: 'Year 2' });
      await createUser({ name: 'Alicia', email: 'alicia-member@example.com', year: 'Year 2' });
      await createUser({ name: 'Alina', email: 'alina-admin@example.com', positions: ['admin'], year: 'Year 2' });
      await createUser({ name: 'Alicia Old', email: 'alicia-old@example.com', year: 'Year 2', isActive: false });
      const agent = await createAuthenticatedAgent(viewer);

      const response = await agent
        .get('/api/user/users?search=Ali&role=member&year=Year%202&page=2&limit=1')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        meta: { page: 2, limit: 1, total: 2 },
      });
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0]).toEqual(expect.objectContaining({
        name: 'Alicia',
        positions: ['member'],
        year: 'Year 2',
      }));
      expect(response.body.data[0]).not.toHaveProperty('googleId');
      expect(response.body.data[0]).not.toHaveProperty('googleID');
      expect(response.body.data[0]).not.toHaveProperty('__v');
      expect(response.body.data[0]).not.toHaveProperty('isActive');
    });

    test('canonical and legacy directory routes return the same contract and results', async () => {
      const viewer = await createUser({ isActive: false });
      await createUser({ name: 'Directory Member' });
      const agent = await createAuthenticatedAgent(viewer);

      const canonical = await agent.get('/api/user/users?page=1&limit=10').expect(200);
      const legacy = await agent.get('/user/users?page=1&limit=10').expect(200);

      expect(canonical.body).toEqual(legacy.body);
      expect(canonical.body).toMatchObject({
        success: true,
        meta: { page: 1, limit: 10, total: 1 },
      });
      expect(canonical.body.data[0].name).toBe('Directory Member');
    });

    test('returns a standard validation error for invalid query parameters', async () => {
      const viewer = await createUser();
      const agent = await createAuthenticatedAgent(viewer);

      const response = await agent.get('/api/user/users?page=0&limit=10').expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toMatchObject({
        code: 'VALIDATION_ERROR',
        message: 'Invalid page parameter.',
      });
    });
  });

  describe('profile update routes', () => {
    test('requires authentication before accepting a profile update', async () => {
      const user = await createUser();

      const response = await request(app)
        .patch(`/api/user/${user.id}`)
        .send({ name: 'Unauthenticated Change' })
        .expect(401);

      expect(response.body.error.code).toBe('UNAUTHENTICATED');
      expect((await User.findById(user.id)).name).toBe('Member Migration User');
    });

    test('allows a member to update their own profile and persists normalized fields', async () => {
      const user = await createUser();
      const project = await Project.create({ projectId: 21, title: 'Member Project', description: 'Featured project' });
      const agent = await createAuthenticatedAgent(user);

      const response = await agent
        .patch(`/api/user/${user.id}`)
        .send({
          name: 'Updated Member',
          instagramUrl: '@updated.member',
          featuredProjectIds: [project.id],
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(expect.objectContaining({
        _id: user.id,
        name: 'Updated Member',
        instagramUrl: 'https://www.instagram.com/updated.member/',
        featuredProjectIds: [expect.objectContaining({ _id: project.id, title: 'Member Project' })],
      }));
      expect(response.body.data).not.toHaveProperty('googleId');
      expect(response.body.data).not.toHaveProperty('__v');

      const persisted = await User.findById(user.id);
      expect(persisted.name).toBe('Updated Member');
      expect(persisted.instagramUrl).toBe('https://www.instagram.com/updated.member/');
      expect(persisted.featuredProjectIds.map(String)).toEqual([project.id]);
    });

    test('preserves omitted origin fields when updating part of the origin object', async () => {
      const user = await createUser({ origin: { state: 'Selangor', country: 'Malaysia' } });
      const agent = await createAuthenticatedAgent(user);

      const response = await agent
        .patch(`/api/user/${user.id}`)
        .send({ origin: { state: 'Johor' } })
        .expect(200);

      expect(response.body.data.origin).toEqual({ state: 'Johor', country: 'Malaysia' });
      const persisted = await User.findById(user.id);
      expect(persisted.origin.toObject()).toEqual({ state: 'Johor', country: 'Malaysia' });
    });

    test('rejects unsupported profile fields with a 400 validation error', async () => {
      const user = await createUser();
      const agent = await createAuthenticatedAgent(user);

      const response = await agent
        .patch(`/api/user/${user.id}`)
        .send({ positions: ['admin'] })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          details: { unsupportedFields: ['positions'] },
        },
      });
      expect((await User.findById(user.id)).positions).toEqual(['member']);
    });

    test('rejects malformed social URLs without changing the profile', async () => {
      const user = await createUser();
      const agent = await createAuthenticatedAgent(user);

      const response = await agent
        .patch(`/api/user/${user.id}`)
        .send({ linkedinUrl: 'https://example.com/not-linkedin' })
        .expect(400);

      expect(response.body.error).toMatchObject({ code: 'VALIDATION_ERROR' });
      expect((await User.findById(user.id)).linkedinUrl).toBe('');
    });

    test('rejects non-profile social URL paths, queries, and fragments', async () => {
      const user = await createUser();
      const agent = await createAuthenticatedAgent(user);
      const invalidLinks = [
        { githubUrl: 'https://github.com/ada/settings' },
        { instagramUrl: 'https://instagram.com/ada/reels' },
        { linkedinUrl: 'https://linkedin.com/company/ada' },
        { linkedinUrl: 'https://linkedin.com/in/ada/details' },
        { githubUrl: 'https://github.com/ada?tab=repositories' },
        { instagramUrl: 'https://instagram.com/ada#posts' },
      ];

      for (const profile of invalidLinks) {
        const response = await agent.patch(`/api/user/${user.id}`).send(profile).expect(400);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      }

      const persisted = await User.findById(user.id);
      expect(persisted.githubUrl).toBe('');
      expect(persisted.instagramUrl).toBe('');
      expect(persisted.linkedinUrl).toBe('');
    });

    test('returns 403 when a non-admin member attempts to update another profile', async () => {
      const member = await createUser();
      const target = await createUser({ name: 'Protected Member' });
      const agent = await createAuthenticatedAgent(member);

      const response = await agent
        .patch(`/api/user/${target.id}`)
        .send({ name: 'Unauthorized Change' })
        .expect(403);

      expect(response.body.error.code).toBe('FORBIDDEN');
      expect((await User.findById(target.id)).name).toBe('Protected Member');
    });

    test('legacy profile route also blocks a non-admin from changing another member', async () => {
      const member = await createUser();
      const target = await createUser({ name: 'Legacy Protected Member' });
      const agent = await createAuthenticatedAgent(member);

      const response = await agent
        .patch(`/user/${target.id}`)
        .send({ name: 'Legacy Unauthorized Change' })
        .expect(403);

      expect(response.body.error.code).toBe('FORBIDDEN');
      expect((await User.findById(target.id)).name).toBe('Legacy Protected Member');
    });

    test('allows an administrator to update another member profile', async () => {
      const admin = await createUser({ positions: ['admin'] });
      const target = await createUser({ name: 'Admin Target' });
      const agent = await createAuthenticatedAgent(admin);

      const response = await agent
        .patch(`/api/user/${target.id}`)
        .send({ name: 'Updated by Admin' })
        .expect(200);

      expect(response.body.data.name).toBe('Updated by Admin');
      expect((await User.findById(target.id)).name).toBe('Updated by Admin');
    });

    test('returns 404 for malformed profile IDs', async () => {
      const user = await createUser();
      const agent = await createAuthenticatedAgent(user);

      const response = await agent
        .patch('/api/user/not-an-object-id')
        .send({ name: 'Updated Member' })
        .expect(404);

      expect(response.body.error).toMatchObject({ code: 'NOT_FOUND' });
    });
  });
});
