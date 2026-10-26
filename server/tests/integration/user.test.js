/**
 * Integration tests for the User API endpoints.
 * Uses mongodb-memory-server — never touches the production database.
 *
 * Routes tested:
 *   GET   /user/users
 *   GET   /user/filter
 *   PATCH /user/:id
 */

const request = require('supertest');
const mongoose = require('mongoose');
const { connect, clearDatabase, closeDatabase } = require('../setup/mongoSetup');
const { createApp } = require('../../app');
const User = require('../../models/User');
const Project = require('../../models/Project');
const session = require('express-session');
const cookieSignature = require('cookie-signature');

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
  const signedSessionId = cookieSignature.sign(sessionId, 'airost-intranet-test-secret');
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

describe('User directory and profile API', () => {
  test('returns a consistent User-only directory projection without internal fields', async () => {
    await User.create({
      googleId: 'google-test-123',
      name: 'Alice',
      email: 'alice@example.com',
      photoUrl: 'https://example.com/alice.png',
      positions: ['member'],
      year: 'Year 3',
      course: 'Computer Science',
      origin: { state: 'Johor', country: 'Malaysia' },
      instagramUrl: 'https://instagram.com/alice',
      linkedinUrl: 'https://linkedin.com/in/alice',
      githubUrl: 'https://github.com/alice',
    });
    await User.create({
      name: 'Bob',
      email: 'bob@example.com',
      positions: ['member'],
      isActive: true,
    });

    const res = await request(app).get('/user/filter');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0]).toEqual(expect.objectContaining({
      name: 'Alice',
      positions: ['member'],
      photoUrl: 'https://example.com/alice.png',
      origin: { state: 'Johor', country: 'Malaysia' },
      loggedIn: true,
      verified: true,
    }));
    expect(res.body[0]).not.toHaveProperty('googleId');
    expect(res.body[0]).not.toHaveProperty('isActive');
    expect(res.body[1]).toEqual(expect.objectContaining({
      name: 'Bob',
      positions: ['member'],
      loggedIn: false,
      verified: true,
    }));
  });

  test('filters directory users and paginates results', async () => {
    await User.create([
      { name: 'Alice', email: 'alice@example.com', positions: ['member'], year: 'Year 2' },
      { name: 'Bob', email: 'bob@example.com', positions: ['admin'], year: 'Year 3' },
    ]);

    const res = await request(app).get('/user/filter?search=ali&role=member&year=Year%202&page=1&limit=1');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe('Alice');
  });

  test('returns 400 for malformed directory query parameters', async () => {
    const res = await request(app).get('/user/filter?page=0&limit=not-a-number');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid page parameter.');
  });

  test('returns all users from the unfiltered users route', async () => {
    await User.create({ name: 'Inactive', email: 'inactive@example.com', isActive: false });
    const res = await request(app).get('/user/users');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe('Inactive');
  });

  test('does not return inactive users from the filtered directory route', async () => {
    await User.create({ name: 'Inactive', email: 'inactive@example.com', isActive: false });
    const res = await request(app).get('/user/filter');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('returns 404 when id is not a valid ObjectId', async () => {
    const res = await request(app)
      .patch('/user/not-a-valid-id')
      .send({ name: 'New Name' });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('No such User');
  });

  test('returns 403 when the requested profile does not belong to the caller', async () => {
    const caller = await User.create({ name: 'Caller', email: 'caller@example.com' });
    const fakeId = new mongoose.Types.ObjectId().toString();
    const cookie = await authenticatedCookie(caller._id);
    const res = await request(app)
      .patch(`/user/${fakeId}`)
      .set('Cookie', cookie)
      .send({ name: 'Nonexistent User' });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Forbidden');
  });

  test('updates user successfully and returns 200 with updated user', async () => {
    const createdUser = await User.create({
      googleId: 'google-test-123',
      name: 'Old Name',
      email: 'test@example.com',
      photoUrl: 'https://example.com/pic.jpg',
      positions: ['Developer'],
      description: 'Initial description',
    });
    const cookie = await authenticatedCookie(createdUser._id);

    const res = await request(app)
      .patch(`/user/${createdUser._id}`)
      .set('Cookie', cookie)
      .send({
        name: 'Updated Name',
        description: 'Updated description',
      });

    expect(res.status).toBe(200);
    expect(res.body._id).toBe(createdUser._id.toString());
    expect(res.body.name).toBe('Updated Name');
    expect(res.body.description).toBe('Updated description');

    // Verify persisted document in MongoDB
    const persisted = await User.findById(createdUser._id);
    expect(persisted.name).toBe('Updated Name');
    expect(persisted.description).toBe('Updated description');
  });

  test('saves multiple featured project references and returns populated projects', async () => {
    const firstProject = await Project.create({ projectId: 1, title: 'Portal', description: 'Member portal' });
    const secondProject = await Project.create({ projectId: 2, title: 'Analytics', description: 'Analytics app' });
    const user = await User.create({ name: 'Alice', email: 'alice@example.com' });
    const cookie = await authenticatedCookie(user._id);

    const res = await request(app)
      .patch(`/user/${user._id}`)
      .set('Cookie', cookie)
      .send({ featuredProjectIds: [firstProject._id.toString(), secondProject._id.toString()] });

    expect(res.status).toBe(200);
    expect(res.body.featuredProjectIds).toEqual([
      expect.objectContaining({ _id: firstProject._id.toString(), title: 'Portal' }),
      expect.objectContaining({ _id: secondProject._id.toString(), title: 'Analytics' }),
    ]);
    const savedUser = await User.findById(user._id);
    expect(savedUser.featuredProjectIds.map(String)).toEqual([String(firstProject._id), String(secondProject._id)]);
  });

  test('rejects malformed featured project ids and protected fields', async () => {
    const user = await User.create({ name: 'Alice', email: 'alice@example.com' });
    const cookie = await authenticatedCookie(user._id);

    const invalidProject = await request(app)
      .patch(`/user/${user._id}`)
      .set('Cookie', cookie)
      .send({ featuredProjectIds: ['not-an-object-id'] });
    expect(invalidProject.status).toBe(400);

    const protectedField = await request(app)
      .patch(`/user/${user._id}`)
      .set('Cookie', cookie)
      .send({ positions: ['admin'] });
    expect(protectedField.status).toBe(400);
    expect(protectedField.body.unsupportedFields).toContain('positions');
  });

  test('returns 401 when updating a profile without a session', async () => {
    const user = await User.create({ name: 'Alice', email: 'alice@example.com' });
    const res = await request(app).patch(`/user/${user._id}`).send({ name: 'New Name' });
    expect(res.status).toBe(401);
  });

  test('returns 403 when a member tries to update another profile', async () => {
    const caller = await User.create({ name: 'Caller', email: 'caller@example.com' });
    const target = await User.create({ name: 'Target', email: 'target@example.com' });
    const cookie = await authenticatedCookie(caller._id);

    const res = await request(app)
      .patch(`/user/${target._id}`)
      .set('Cookie', cookie)
      .send({ name: 'Changed Name' });

    expect(res.status).toBe(403);
    expect((await User.findById(target._id)).name).toBe('Target');
  });

  test('allows admins to update another member profile', async () => {
    const admin = await User.create({ name: 'Admin', email: 'admin@example.com', positions: ['admin'] });
    const target = await User.create({ name: 'Target', email: 'target@example.com' });
    const cookie = await authenticatedCookie(admin._id);

    const res = await request(app)
      .patch(`/user/${target._id}`)
      .set('Cookie', cookie)
      .send({ name: 'Updated by Admin' });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Updated by Admin');
  });

  test('rejects null origin values', async () => {
    const user = await User.create({ name: 'Alice', email: 'alice@example.com' });
    const cookie = await authenticatedCookie(user._id);
    const res = await request(app)
      .patch(`/user/${user._id}`)
      .set('Cookie', cookie)
      .send({ origin: null });
    expect(res.status).toBe(400);
  });
});
