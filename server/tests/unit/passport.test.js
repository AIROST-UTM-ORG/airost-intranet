/**
 * Unit tests for Passport serialization and deserialization.
 */

const passport = require('passport');
const mongoose = require('mongoose');
const { connect, clearDatabase, closeDatabase } = require('../setup/mongoSetup');
const User = require('../../models/User');

// Require passport configuration
require('../../passport');

beforeAll(async () => {
  await connect();
});

afterEach(async () => {
  await clearDatabase();
});

afterAll(async () => {
  await closeDatabase();
});

describe('Passport Serialization & Deserialization', () => {
  test('serializeUser extracts _id from user object', (done) => {
    const fakeId = new mongoose.Types.ObjectId();
    const fakeUser = { _id: fakeId, name: 'Alice' };

    // In passport, serializeUser handlers are stored on passport._serializers
    const serializer = passport._serializers[0];
    expect(serializer).toBeDefined();

    serializer(fakeUser, (err, id) => {
      expect(err).toBeNull();
      expect(id).toBe(fakeId);
      done();
    });
  });

  test('serializeUser falls back to user value if _id is not present', (done) => {
    const serializer = passport._serializers[0];
    serializer('user-string-id', (err, id) => {
      expect(err).toBeNull();
      expect(id).toBe('user-string-id');
      done();
    });
  });

  test('deserializeUser fetches the User document from DB by ID', async () => {
    const createdUser = await User.create({
      googleID: 'gid-12345',
      name: 'Bob',
      email: 'bob@example.com',
      photo: 'https://example.com/bob.jpg',
      position: ['Member'],
    });

    const deserializer = passport._deserializers[0];
    expect(deserializer).toBeDefined();

    await new Promise((resolve) => {
      deserializer(createdUser._id, (err, user) => {
        expect(err).toBeNull();
        expect(user).not.toBeNull();
        expect(user.googleID).toBe('gid-12345');
        expect(user.email).toBe('bob@example.com');
        resolve();
      });
    });
  });

  test('deserializeUser handles object with _id', async () => {
    const createdUser = await User.create({
      googleID: 'gid-67890',
      name: 'Charlie',
      email: 'charlie@example.com',
      photo: 'https://example.com/charlie.jpg',
      position: ['Member'],
    });

    const deserializer = passport._deserializers[0];
    await new Promise((resolve) => {
      deserializer({ _id: createdUser._id }, (err, user) => {
        expect(err).toBeNull();
        expect(user).not.toBeNull();
        expect(user.googleID).toBe('gid-67890');
        resolve();
      });
    });
  });
});
