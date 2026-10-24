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
let sampleSpace;
let DocumentationSpace;
let Document;

// Query logging accumulator
let executedQueries = [];
const debugLogger = (collectionName, method, query) => {
  // Ignore system/session collection operations
  if (collectionName !== 'sessions') {
    executedQueries.push({ collection: collectionName, method });
  }
};

const seedSpacesAndDocs = async (startIdx, count) => {
  const spacesToInsert = [];
  for (let i = startIdx; i < startIdx + count; i++) {
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
    // 10 docs per space (9 active, 1 archived)
    for (let d = 1; d <= 10; d++) {
      docsToInsert.push({
        spaceId: space._id,
        title: `Document ${d} for Space ${startIdx + sIdx}`,
        url: `https://docs.google.com/document/d/perf-${startIdx + sIdx}-${d}`,
        provider: 'google_doc',
        area: d % 2 === 0 ? 'development' : 'general',
        createdBy: memberUser._id,
        archived: d === 10,
      });
    }
  }
  await Document.insertMany(docsToInsert);
  return createdSpaces;
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
    DocumentationSpace = require('../models/DocumentationSpace');
    Document = require('../models/Document');

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

    // Seed initial 50 spaces and 500 documents
    console.log('Seeding initial 50 spaces and 500 documents for O(1) query scaling verification...');
    const initialSpaces = await seedSpacesAndDocs(1, 50);
    sampleSpace = initialSpaces[0];

    // Ensure all model indexes are initialized
    await Promise.all([
      User.init(),
      Project.init(),
      ProjectMember.init(),
      DocumentationSpace.init(),
      Document.init(),
    ]);

    // Warm-up call
    await memberAgent.get('/doc/spaces');

    // Attach query logger after seeding and warm-up
    mongoose.set('debug', debugLogger);
  }, 60000);

  afterAll(async () => {
    mongoose.set('debug', false);
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  const queryCounts50 = {};
  const queryCounts200 = {};

  // Phase 1: Benchmark at 50 spaces
  describe('Phase 1: Measure Query Counts at 50 Spaces (500 documents)', () => {
    it('measures GET /doc/spaces at 50 spaces', async () => {
      executedQueries = [];
      const res = await memberAgent.get('/doc/spaces');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(35);
      queryCounts50['GET /doc/spaces'] = executedQueries.length;
    });

    it('measures GET /doc/spaces?projectId= at 50 spaces', async () => {
      executedQueries = [];
      const res = await memberAgent.get(`/doc/spaces?projectId=${testProject._id}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      queryCounts50['GET /doc/spaces?projectId='] = executedQueries.length;
    });

    it('measures GET /doc/search at 50 spaces (500 documents)', async () => {
      executedQueries = [];
      const res = await memberAgent.get('/doc/search?q=Document&limit=20');
      expect(res.status).toBe(200);
      expect(res.body.documents.length).toBe(20);
      queryCounts50['GET /doc/search'] = executedQueries.length;
    });

    it('measures GET /doc/admin/spaces at 50 spaces', async () => {
      executedQueries = [];
      const res = await adminAgent.get('/doc/admin/spaces?page=1&limit=25');
      expect(res.status).toBe(200);
      expect(res.body.spaces.length).toBe(25);
      expect(res.body.total).toBe(50);
      queryCounts50['GET /doc/admin/spaces'] = executedQueries.length;
    });

    it('measures GET /doc/spaces/:id/documents at 50 spaces', async () => {
      executedQueries = [];
      const res = await memberAgent.get(`/doc/spaces/${sampleSpace._id}/documents`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(9);
      queryCounts50['GET /doc/spaces/:id/documents'] = executedQueries.length;
    });

    it('measures GET /projects (linkable projects) at 50 spaces', async () => {
      executedQueries = [];
      const res = await memberAgent.get('/projects');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      queryCounts50['GET /projects'] = executedQueries.length;
    });
  });

  // Phase 2: Seed remaining 150 spaces and benchmark at 200 spaces
  describe('Phase 2: Measure Query Counts at 200 Spaces (2000 documents) & Assert O(1) Equality', () => {
    beforeAll(async () => {
      // Temporarily detach logger during seeding of the remaining 150 spaces
      mongoose.set('debug', false);
      console.log('Seeding additional 150 spaces and 1500 documents (total 200 spaces)...');
      await seedSpacesAndDocs(51, 150);
      console.log('200 spaces and 2000 documents ready. Resuming query listener.');
      mongoose.set('debug', debugLogger);
    }, 60000);

    it('asserts GET /doc/spaces query count does NOT scale with dataset size (50 vs 200 spaces)', async () => {
      executedQueries = [];
      const res = await memberAgent.get('/doc/spaces');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(150);

      queryCounts200['GET /doc/spaces'] = executedQueries.length;

      // Query count must be strictly equal between 50 and 200 spaces
      expect(queryCounts200['GET /doc/spaces']).toBe(queryCounts50['GET /doc/spaces']);
      // Generous absolute cap <= 15
      expect(queryCounts200['GET /doc/spaces']).toBeLessThanOrEqual(15);
    });

    it('asserts GET /doc/spaces?projectId= query count does NOT scale with dataset size', async () => {
      executedQueries = [];
      const res = await memberAgent.get(`/doc/spaces?projectId=${testProject._id}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);

      queryCounts200['GET /doc/spaces?projectId='] = executedQueries.length;

      expect(queryCounts200['GET /doc/spaces?projectId=']).toBe(queryCounts50['GET /doc/spaces?projectId=']);
      expect(queryCounts200['GET /doc/spaces?projectId=']).toBeLessThanOrEqual(15);
    });

    it('asserts GET /doc/search query count does NOT scale with dataset size', async () => {
      executedQueries = [];
      const res = await memberAgent.get('/doc/search?q=Document&limit=20');
      expect(res.status).toBe(200);
      expect(res.body.documents.length).toBe(20);

      queryCounts200['GET /doc/search'] = executedQueries.length;

      expect(queryCounts200['GET /doc/search']).toBe(queryCounts50['GET /doc/search']);
      expect(queryCounts200['GET /doc/search']).toBeLessThanOrEqual(15);
    });

    it('asserts GET /doc/admin/spaces query count does NOT scale with dataset size', async () => {
      executedQueries = [];
      const res = await adminAgent.get('/doc/admin/spaces?page=1&limit=25');
      expect(res.status).toBe(200);
      expect(res.body.spaces.length).toBe(25);
      expect(res.body.total).toBe(200);

      queryCounts200['GET /doc/admin/spaces'] = executedQueries.length;

      expect(queryCounts200['GET /doc/admin/spaces']).toBe(queryCounts50['GET /doc/admin/spaces']);
      expect(queryCounts200['GET /doc/admin/spaces']).toBeLessThanOrEqual(15);
    });

    it('asserts GET /doc/spaces/:id/documents query count does NOT scale with dataset size', async () => {
      executedQueries = [];
      const res = await memberAgent.get(`/doc/spaces/${sampleSpace._id}/documents`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(9);

      queryCounts200['GET /doc/spaces/:id/documents'] = executedQueries.length;

      expect(queryCounts200['GET /doc/spaces/:id/documents']).toBe(queryCounts50['GET /doc/spaces/:id/documents']);
      expect(queryCounts200['GET /doc/spaces/:id/documents']).toBeLessThanOrEqual(15);
    });

    it('asserts GET /projects (linkable projects) query count does NOT scale with dataset size', async () => {
      executedQueries = [];
      const res = await memberAgent.get('/projects');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);

      queryCounts200['GET /projects'] = executedQueries.length;

      expect(queryCounts200['GET /projects']).toBe(queryCounts50['GET /projects']);
      expect(queryCounts200['GET /projects']).toBeLessThanOrEqual(15);
    });

    it('outputs query scaling comparison table', () => {
      console.log('\n================== QUERY COUNT SCALING SUMMARY ==================');
      console.log('| Endpoint                      | 50 Spaces | 200 Spaces | Status  |');
      console.log('|-------------------------------|-----------|------------|---------|');
      for (const ep of Object.keys(queryCounts50)) {
        const c50 = queryCounts50[ep];
        const c200 = queryCounts200[ep];
        const status = c50 === c200 && c200 <= 15 ? 'PASS O(1)' : 'FAIL';
        console.log(`| ${ep.padEnd(29)} | ${String(c50).padEnd(9)} | ${String(c200).padEnd(10)} | ${status.padEnd(7)} |`);
      }
      console.log('=================================================================\n');
    });
  });
});
