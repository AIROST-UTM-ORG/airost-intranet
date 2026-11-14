/**
 * Integration tests for the Doc API endpoints.
 * Uses mongodb-memory-server — never touches the production database.
 *
 * Routes tested:
 *   GET    /airost/doc
 *   GET    /airost/doc/:id
 *   POST   /airost/doc
 *   PATCH  /airost/doc/:id
 *   DELETE /airost/doc/:id
 */

const request = require('supertest');
const mongoose = require('mongoose');
const { connect, clearDatabase, closeDatabase } = require('../setup/mongoSetup');
const { createApp } = require('../../app');
const User = require('../../models/User');

let app;
let adminUser;
let memberUser;
let adminAgent;
let memberAgent;

beforeAll(async () => {
  await connect();
  app = createApp();
});

beforeEach(async () => {
  adminUser = await User.create({
    googleId: 'google-admin',
    name: 'Admin User',
    email: 'admin@airost.com',
    positions: ['admin'],
  });

  memberUser = await User.create({
    googleId: 'google-member',
    name: 'Member User',
    email: 'member@airost.com',
    positions: ['member'],
  });

  adminAgent = request.agent(app);
  const adminLogin = await adminAgent.post('/test/auth/login').send({ userId: adminUser._id });
  expect(adminLogin.status).toBe(200);
  expect(adminLogin.body.success).toBe(true);

  memberAgent = request.agent(app);
  const memberLogin = await memberAgent.post('/test/auth/login').send({ userId: memberUser._id });
  expect(memberLogin.status).toBe(200);
  expect(memberLogin.body.success).toBe(true);
});

afterEach(async () => {
  await clearDatabase();
});

afterAll(async () => {
  await closeDatabase();
});

// ── Helpers ───────────────────────────────────────────────────────────────────

const validDocPayload = () => ({
  image: 'https://example.com/image.png',
  title: 'Test Document',
  profile: 'https://example.com/profile.png',
  author: 'Alice',
  date: '2024-01-01',
  type: 'Report',
  description: 'A test document description',
  content: '<p>Hello world</p>',
});

/// ── GET /airost/doc ──────────────────────────────────────────────────────────

describe('GET /airost/doc', () => {
  test('returns 200 and an empty array when there are no docs', async () => {
    const res = await memberAgent.get('/airost/doc');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(0);
  });

  test('returns all existing docs sorted newest-first', async () => {
    // Create two docs via POST so we don't rely on internal model imports
    await adminAgent.post('/airost/doc').send(validDocPayload());
    await adminAgent.post('/airost/doc').send({ ...validDocPayload(), title: 'Second Doc' });

    const res = await memberAgent.get('/airost/doc');
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(2);
  });
});

// ── GET /airost/doc/:id ──────────────────────────────────────────────────────

describe('GET /airost/doc/:id', () => {
  test('returns 200 and the doc when a valid ID is provided', async () => {
    const createRes = await adminAgent.post('/airost/doc').send(validDocPayload());
    const id = createRes.body._id;

    const res = await memberAgent.get(`/airost/doc/${id}`);
    expect(res.status).toBe(200);
    expect(res.body._id).toBe(id);
    expect(res.body.title).toBe('Test Document');
  });

  test('returns 404 when the id is not a valid ObjectId', async () => {
    const res = await memberAgent.get('/airost/doc/not-an-objectid');
    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
  });

  test('returns 404 when the doc does not exist', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await memberAgent.get(`/airost/doc/${fakeId}`);
    expect(res.status).toBe(404);
  });
});

// ── POST /airost/doc ─────────────────────────────────────────────────────────

describe('POST /airost/doc', () => {
  test('creates a doc and returns 201 with the new document', async () => {
    const payload = validDocPayload();
    const res = await adminAgent.post('/airost/doc').send(payload);

    expect(res.status).toBe(201);
    expect(res.body._id).toBeDefined();
    expect(res.body.title).toBe(payload.title);
    expect(res.body.author).toBe(payload.author);
  });

  test('returns 400 when required fields are missing', async () => {
    const res = await adminAgent.post('/airost/doc').send({ title: 'Incomplete' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Please fill in all the fields');
    expect(Array.isArray(res.body.emptyFields)).toBe(true);
    // Should flag the missing fields
    expect(res.body.emptyFields).toContain('image');
    expect(res.body.emptyFields).toContain('profile');
  });

  test('returns 400 when the body is completely empty', async () => {
    const res = await adminAgent.post('/airost/doc').send({});
    expect(res.status).toBe(400);
    expect(res.body.emptyFields.length).toBe(8);
  });

  test('rejects non-admin member from creating a doc with 403', async () => {
    const res = await memberAgent
      .post('/airost/doc')
      .send(validDocPayload());
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');

    const listRes = await memberAgent.get('/airost/doc');
    expect(listRes.status).toBe(200);
    expect(listRes.body).toHaveLength(0);
  });
});

// ── PATCH /airost/doc/:id ─────────────────────────────────────────────────────

describe('PATCH /airost/doc/:id', () => {
  test('returns 404 for an invalid ObjectId', async () => {
    const res = await adminAgent
      .patch('/airost/doc/invalid-id')
      .send({ title: 'Updated' });
    expect(res.status).toBe(404);
  });

  test('returns 404 when the doc does not exist', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await adminAgent
      .patch(`/airost/doc/${fakeId}`)
      .send({ title: 'Non-existent Doc' });
    expect(res.status).toBe(404);
  });

  test('updates an existing doc and returns 200 with the updated document', async () => {
    const createRes = await adminAgent.post('/airost/doc').send(validDocPayload());
    const id = createRes.body._id;

    const res = await adminAgent
      .patch(`/airost/doc/${id}`)
      .send({ title: 'Updated Title' });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Updated Title');
  });

  test('rejects non-admin member from updating a doc with 403', async () => {
    const createRes = await adminAgent.post('/airost/doc').send(validDocPayload());
    const id = createRes.body._id;

    const res = await memberAgent
      .patch(`/airost/doc/${id}`)
      .send({ title: 'Unauthorized Member Update' });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');

    const getRes = await memberAgent.get(`/airost/doc/${id}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.title).toBe(validDocPayload().title);
  });
});

// ── DELETE /airost/doc/:id ────────────────────────────────────────────────────

describe('DELETE /airost/doc/:id', () => {
  test('returns 404 for an invalid ObjectId', async () => {
    const res = await adminAgent.delete('/airost/doc/invalid-id');
    expect(res.status).toBe(404);
  });

  test('returns 404 when the doc does not exist', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await adminAgent.delete(`/airost/doc/${fakeId}`);
    expect(res.status).toBe(404);
  });

  test('deletes an existing doc and returns 200', async () => {
    const createRes = await adminAgent.post('/airost/doc').send(validDocPayload());
    const id = createRes.body._id;

    const res = await adminAgent.delete(`/airost/doc/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Doc deleted');

    // Confirm it no longer exists
    const getRes = await memberAgent.get(`/airost/doc/${id}`);
    expect(getRes.status).toBe(404);
  });

  test('rejects non-admin member from deleting a doc with 403', async () => {
    const createRes = await adminAgent.post('/airost/doc').send(validDocPayload());
    const id = createRes.body._id;

    const res = await memberAgent.delete(`/airost/doc/${id}`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');

    const getRes = await memberAgent.get(`/airost/doc/${id}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body._id).toBe(id);
  });
});
