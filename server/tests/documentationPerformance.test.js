const dotenv = require('dotenv');
dotenv.config = () => ({ parsed: {} });

process.env.NODE_ENV = 'test';
process.env.PORT = '4003';
process.env.PASSPORT_SECRET = 'documentation-perf-secret';
process.env.REACT_APP_URL = 'http://localhost:3000';
process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
process.env.GOOGLE_CLIENT_SECRET = 'test-google-client-secret';
process.env.CREDENTIALS = JSON.stringify({
  client_email: 'test@example.com',
  private_key: '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDQ2LZkXQJsjwzN\n-----END PRIVATE KEY-----\n',
});
process.env.CALENDAR_ID = 'test-calendar';

const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let mongoServer;
let app;
let adminUser;
let memberUser;
let adminAgent;
let memberAgent;
let testProject;

// Query logging accumulator
let executedQueries = [];
const debugLogger = (collectionName, method, query) => {
  // Ignore system/session collection operations
  if (collectionName !== 'sessions') {
    executedQueries.push({ collection: collectionName, method });
  }
};

describe('Documentation Performance & Query Count Sanity (N+1 Verification)', () => {
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    app = require('../server');
    const User = require('../models/User');
    const Project = require('../models/Project');
    const ProjectMember = require('../models/ProjectMember');
    const DocumentationSpace = require('../models/DocumentationSpace');
    const Document = require('../models/Document');

    // Create users
    adminUser = await User.create({
      googleID: 'perf-admin-google',
      name: 'Perf Admin',
      email: 'perf.admin@airost.com',
      photo: 'https://example.com/admin.jpg',
      position: ['admin'],
    });

    memberUser = await User.create({
      googleID: 'perf-member-google',
      name: 'Perf Member',
      email: 'perf.member@airost.com',
      photo: 'https://example.com/member.jpg',
      position: ['member'],
    });

    testProject = await Project.create({
      projectId: 901,
      title: 'Perf Project',
      description: 'Project for scalability testing',
      lead: 'Perf Lead',
    });

    await ProjectMember.create({
      projectId: testProject._id,
      userId: memberUser._id,
      role: 'member',
    });

    // Authenticate agents
    adminAgent = request.agent(app);
    await adminAgent.post('/test/auth/login').send({ userId: adminUser._id });

    memberAgent = request.agent(app);
    await memberAgent.post('/test/auth/login').send({ userId: memberUser._id });

    // Seed 200 spaces and 2000 documents in bulk
    console.log('Seeding 200 spaces and 2000 documents for N+1 performance verification...');
    const spacesToInsert = [];
    for (let i = 1; i <= 200; i++) {
      spacesToInsert.push({
        title: `Perf Space ${i}`,
        description: `Description for space ${i}`,
        projectId: i % 2 === 0 ? testProject._id : null,
        createdBy: i % 3 === 0 ? adminUser._id : memberUser._id,
        accessType: i % 4 === 0 ? 'project_members' : 'all',
        updateType: 'all',
      });
    }
    const createdSpaces = await DocumentationSpace.insertMany(spacesToInsert);

    const docsToInsert = [];
    for (let sIdx = 0; sIdx < createdSpaces.length; sIdx++) {
      const space = createdSpaces[sIdx];
      // 10 docs per space = 2000 documents
      for (let d = 1; d <= 10; d++) {
        docsToInsert.push({
          spaceId: space._id,
          title: `Document ${d} for Space ${sIdx + 1}`,
          url: `https://docs.google.com/document/d/perf-${sIdx}-${d}`,
          provider: 'google_doc',
          area: d % 2 === 0 ? 'development' : 'general',
          createdBy: memberUser._id,
          archived: d === 10, // 1 archived doc per space
        });
      }
    }
    await Document.insertMany(docsToInsert);
    console.log('Seeding complete. Attaching query listener.');

    mongoose.set('debug', debugLogger);
  }, 60000);

  afterAll(async () => {
    mongoose.set('debug', false);
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  beforeEach(() => {
    executedQueries = [];
  });

  it('Space List (GET /doc/spaces): verifies O(1) query count regardless of 200 spaces dataset', async () => {
    executedQueries = [];
    const res = await memberAgent.get('/doc/spaces');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(150);

    // If an N+1 bug existed, there would be >= 200 queries (1 per space to count docs)
    // In our optimized pipeline:
    // 1. Projects lookup / ProjectMember lookup
    // 2. Spaces find
    // 3. Document count aggregation ($match + $group)
    const dbOperations = executedQueries.length;
    console.log(`[PERF RESULT] GET /doc/spaces executed ${dbOperations} database queries for ${res.body.length} spaces.`);

    // Strict assertion: must NOT scale with 200 spaces (e.g. must be under 10 queries total)
    expect(dbOperations).toBeLessThan(10);
  });

  it('Document Search (GET /doc/search): verifies constant query count across 2000 documents', async () => {
    executedQueries = [];
    const res = await memberAgent.get('/doc/search?q=Document&limit=20');

    expect(res.status).toBe(200);
    expect(res.body.documents.length).toBe(20);

    const dbOperations = executedQueries.length;
    console.log(`[PERF RESULT] GET /doc/search executed ${dbOperations} database queries across 2000 documents.`);

    // Strict assertion: searching documents across 200 spaces must be bounded and O(1)
    expect(dbOperations).toBeLessThan(8);
  });

  it('Admin Oversight List (GET /doc/admin/spaces): verifies pagination and constant query count on 200 spaces', async () => {
    executedQueries = [];
    const res = await adminAgent.get('/doc/admin/spaces?page=1&limit=25');

    expect(res.status).toBe(200);
    expect(res.body.spaces.length).toBe(25);
    expect(res.body.total).toBe(200);

    const dbOperations = executedQueries.length;
    console.log(`[PERF RESULT] GET /doc/admin/spaces executed ${dbOperations} database queries for page 1 of 200 spaces.`);

    // Strict assertion: Paginated admin listing must only perform count, find page, and batch aggregate counts
    expect(dbOperations).toBeLessThan(8);
  });
});
