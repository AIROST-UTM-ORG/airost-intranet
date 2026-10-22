const dotenv = require('dotenv');
// Prevent dotenv from reading server/.env in test environment
dotenv.config = () => ({ parsed: {} });

// Set isolated test environment variables before importing modules
process.env.NODE_ENV = 'test';
process.env.PORT = '4001';
process.env.PASSPORT_SECRET = 'smoke-test-secret';
process.env.REACT_APP_URL = 'http://localhost:3000';
process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
process.env.GOOGLE_CLIENT_SECRET = 'test-google-client-secret';
process.env.CREDENTIALS = JSON.stringify({
  client_email: 'smoke-test@example.com',
  private_key: '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDQ2LZkXQJsjwzN\n-----END PRIVATE KEY-----\n'
});
process.env.CALENDAR_ID = 'smoke-test-calendar';

const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let mongoServer;
let app;

beforeAll(async () => {
  // Spin up an in-memory MongoDB instance
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();

  // Connect mongoose exclusively to the in-memory database
  await mongoose.connect(uri);

  // Require Express app after DB is connected and test env vars are populated
  app = require('../server');
}, 60000);

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (mongoServer) {
    await mongoServer.stop();
  }
});

describe('Server Test Setup Smoke Tests', () => {
  it('connects to in-memory MongoDB instead of remote Atlas', () => {
    expect(mongoose.connection.readyState).toBe(1);
    expect(mongoose.connection.host).toMatch(/127\.0\.0\.1|localhost/);
    expect(process.env.MONGO_URI).toBeFalsy();
  });

  it('GET /auth/login/failed returns 401 UNAUTHENTICATED', async () => {
    const res = await request(app).get('/auth/login/failed');
    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({
      success: false,
      message: 'Authentication failed',
    });
  });

  it('GET /auth/login/success returns 403 when session is unauthenticated', async () => {
    const res = await request(app).get('/auth/login/success');
    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({
      success: false,
      message: 'User not authenticated',
    });
  });
});
