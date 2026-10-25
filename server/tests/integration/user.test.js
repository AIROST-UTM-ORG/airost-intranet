/**
 * Integration tests for the User API endpoints.
 * Uses mongodb-memory-server — never touches the production database.
 *
 * Routes tested:
 *   GET   /user/users
 *   PATCH /user/:id
 */

const request = require('supertest');
const mongoose = require('mongoose');
const { connect, clearDatabase, closeDatabase } = require('../setup/mongoSetup');
const { createApp } = require('../../app');
const User = require('../../models/User');
const Project = require('../../models/Project');

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

    const res = await request(app).get('/user/users');

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

  test('does not return inactive users in the directory', async () => {
    await User.create({ name: 'Inactive', email: 'inactive@example.com', isActive: false });
    const res = await request(app).get('/user/users');
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

  test('returns 404 when user does not exist in the database', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .patch(`/user/${fakeId}`)
      .send({ name: 'Nonexistent User' });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Not found');
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

    const res = await request(app)
      .patch(`/user/${createdUser._id}`)
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

    const res = await request(app)
      .patch(`/user/${user._id}`)
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

    const invalidProject = await request(app)
      .patch(`/user/${user._id}`)
      .send({ featuredProjectIds: ['not-an-object-id'] });
    expect(invalidProject.status).toBe(400);

    const protectedField = await request(app)
      .patch(`/user/${user._id}`)
      .send({ positions: ['admin'] });
    expect(protectedField.status).toBe(400);
    expect(protectedField.body.unsupportedFields).toContain('positions');
  });
});
