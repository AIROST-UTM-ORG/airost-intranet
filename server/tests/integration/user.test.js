/**
 * Integration tests for the User API endpoints.
 * Uses mongodb-memory-server — never touches the production database.
 *
 * Routes tested:
 *   PATCH /user/:id
 */

const request = require('supertest');
const mongoose = require('mongoose');
const { connect, clearDatabase, closeDatabase } = require('../setup/mongoSetup');
const { createApp } = require('../../app');
const User = require('../../models/User');

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

describe.skip('PATCH /user/:id', () => {
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
      googleID: 'google-test-123',
      name: 'Old Name',
      email: 'test@example.com',
      photo: 'https://example.com/pic.jpg',
      position: ['Developer'],
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
});
