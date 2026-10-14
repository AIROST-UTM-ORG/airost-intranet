const dotenv = require('dotenv');
dotenv.config = () => ({ parsed: {} });

process.env.NODE_ENV = 'test';
process.env.PORT = '4002';
process.env.PASSPORT_SECRET = 'documentation-test-secret';
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

// Models
let User;
let Project;
let ProjectMember;
let DocumentationSpace;
let Document;

// Test entities
let adminUser;
let creatorUser;
let leadUser;
let memberUser;
let selectedUser;
let outsiderUser;
let testProject;

// Session agents
let adminAgent;
let creatorAgent;
let leadAgent;
let memberAgent;
let selectedAgent;
let outsiderAgent;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  app = require('../server');
  User = require('../models/User');
  Project = require('../models/Project');
  ProjectMember = require('../models/ProjectMember');
  DocumentationSpace = require('../models/DocumentationSpace');
  Document = require('../models/Document');

  // Seed test users
  adminUser = await User.create({
    googleID: 'google-admin',
    name: 'Admin User',
    email: 'admin@airost.com',
    photo: 'https://example.com/admin.jpg',
    position: ['admin', 'executive'],
  });

  creatorUser = await User.create({
    googleID: 'google-creator',
    name: 'Creator User',
    email: 'creator@airost.com',
    photo: 'https://example.com/creator.jpg',
    position: ['member'],
  });

  leadUser = await User.create({
    googleID: 'google-lead',
    name: 'Project Lead',
    email: 'lead@airost.com',
    photo: 'https://example.com/lead.jpg',
    position: ['member'],
  });

  memberUser = await User.create({
    googleID: 'google-member',
    name: 'Project Member',
    email: 'member@airost.com',
    photo: 'https://example.com/member.jpg',
    position: ['member'],
  });

  selectedUser = await User.create({
    googleID: 'google-selected',
    name: 'Selected Member',
    email: 'selected@airost.com',
    photo: 'https://example.com/selected.jpg',
    position: ['member'],
  });

  outsiderUser = await User.create({
    googleID: 'google-outsider',
    name: 'Outsider User',
    email: 'outsider@airost.com',
    photo: 'https://example.com/outsider.jpg',
    position: ['member'],
  });

  // Seed test project
  testProject = await Project.create({
    projectId: 101,
    title: 'Airost Intranet',
    description: 'Internal club platform',
    lead: 'Project Lead',
  });

  // Seed project members
  await ProjectMember.create({
    projectId: testProject._id,
    userId: leadUser._id,
    role: 'lead',
  });

  await ProjectMember.create({
    projectId: testProject._id,
    userId: memberUser._id,
    role: 'member',
  });

  // Initialize authenticated supertest agents
  adminAgent = request.agent(app);
  await adminAgent.post('/test/auth/login').send({ userId: adminUser._id });

  creatorAgent = request.agent(app);
  await creatorAgent.post('/test/auth/login').send({ userId: creatorUser._id });

  leadAgent = request.agent(app);
  await leadAgent.post('/test/auth/login').send({ userId: leadUser._id });

  memberAgent = request.agent(app);
  await memberAgent.post('/test/auth/login').send({ userId: memberUser._id });

  selectedAgent = request.agent(app);
  await selectedAgent.post('/test/auth/login').send({ userId: selectedUser._id });

  outsiderAgent = request.agent(app);
  await outsiderAgent.post('/test/auth/login').send({ userId: outsiderUser._id });
}, 60000);

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (mongoServer) {
    await mongoServer.stop();
  }
});

describe('Documentation Backend API Tests', () => {
  describe('1. Unauthenticated Requests (401)', () => {
    it('returns 401 UNAUTHENTICATED on GET /doc/spaces without session', async () => {
      const res = await request(app).get('/doc/spaces');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('returns 401 UNAUTHENTICATED on POST /doc/spaces without session', async () => {
      const res = await request(app).post('/doc/spaces').send({ title: 'Test Space' });
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    });
  });

  describe('2. Validation Failures (400 VALIDATION_ERROR & INVALID_ID)', () => {
    it('rejects space creation with missing title', async () => {
      const res = await adminAgent.post('/doc/spaces').send({
        description: 'Valid description',
      });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details.some((d) => d.field === 'title')).toBe(true);
    });

    it('rejects space creation with missing description', async () => {
      const res = await adminAgent.post('/doc/spaces').send({
        title: 'Valid Title',
      });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details.some((d) => d.field === 'description')).toBe(true);
    });

    it('rejects unknown fields on space creation', async () => {
      const res = await adminAgent.post('/doc/spaces').send({
        title: 'Valid Title',
        description: 'Valid Description',
        maliciousField: 'hack',
      });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details.some((d) => d.field === 'maliciousField')).toBe(true);
    });

    it('rejects project_members accessType on standalone space', async () => {
      const res = await adminAgent.post('/doc/spaces').send({
        title: 'Standalone Space',
        description: 'No project space',
        accessType: 'project_members',
      });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details.some((d) => d.field === 'accessType')).toBe(true);
    });

    it('rejects invalid ObjectId parameter format with 400 INVALID_ID', async () => {
      const res = await adminAgent.get('/doc/spaces/invalid-hex-id');
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_ID');
    });

    it('rejects bad URL schemes (http://) on document creation', async () => {
      const space = await DocumentationSpace.create({
        title: 'URL Validation Space',
        description: 'Test space',
        createdBy: adminUser._id,
        accessType: 'all',
        updateType: 'all',
      });

      const res = await adminAgent.post(`/doc/spaces/${space._id}/documents`).send({
        title: 'Insecure Link',
        url: 'http://docs.google.com/document/d/123/edit',
      });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details.some((d) => d.field === 'url')).toBe(true);
    });

    it('rejects javascript: URLs on document creation', async () => {
      const space = await DocumentationSpace.create({
        title: 'XSS Test Space',
        description: 'Test space',
        createdBy: adminUser._id,
        accessType: 'all',
        updateType: 'all',
      });

      const res = await adminAgent.post(`/doc/spaces/${space._id}/documents`).send({
        title: 'XSS Link',
        url: 'javascript:alert(1)',
      });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('3. Document Provider Derivation', () => {
    let testSpace;

    beforeAll(async () => {
      testSpace = await DocumentationSpace.create({
        title: 'Provider Test Space',
        description: 'Testing provider derivation',
        createdBy: adminUser._id,
        accessType: 'all',
        updateType: 'all',
      });
    });

    it('derives google_doc from docs.google.com', async () => {
      const res = await adminAgent.post(`/doc/spaces/${testSpace._id}/documents`).send({
        title: 'Google Doc Link',
        url: 'https://docs.google.com/document/d/1abc123/edit',
      });
      expect(res.status).toBe(201);
      expect(res.body.provider).toBe('google_doc');
    });

    it('derives google_drive from drive.google.com', async () => {
      const res = await adminAgent.post(`/doc/spaces/${testSpace._id}/documents`).send({
        title: 'Google Drive Link',
        url: 'https://drive.google.com/drive/folders/1folder123',
      });
      expect(res.status).toBe(201);
      expect(res.body.provider).toBe('google_drive');
    });

    it('derives external_url for any other HTTPS host', async () => {
      const res = await adminAgent.post(`/doc/spaces/${testSpace._id}/documents`).send({
        title: 'Figma Design',
        url: 'https://www.figma.com/file/12345/App-Design',
      });
      expect(res.status).toBe(201);
      expect(res.body.provider).toBe('external_url');
    });
  });

  describe('4. Optional URL on Document PATCH', () => {
    it('preserves existing url and provider when url is omitted or empty on PATCH', async () => {
      const space = await DocumentationSpace.create({
        title: 'Patch URL Space',
        description: 'Test space',
        createdBy: adminUser._id,
        accessType: 'all',
        updateType: 'all',
      });

      const doc = await Document.create({
        spaceId: space._id,
        title: 'Original Title',
        url: 'https://docs.google.com/document/d/123',
        provider: 'google_doc',
        area: 'development',
        createdBy: adminUser._id,
        archived: false,
      });

      const res = await adminAgent.patch(`/doc/documents/${doc._id}`).send({
        title: 'Updated Title Only',
        url: '', // Screen 13: Leave empty to keep the current link
      });
      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Updated Title Only');
      expect(res.body.url).toBe('https://docs.google.com/document/d/123');
      expect(res.body.provider).toBe('google_doc');
    });
  });

  describe('5. Space Detail Area Counts and Archived Count Accuracy', () => {
    it('accurately computes active documentCount, areaCounts, and archivedCount', async () => {
      const space = await DocumentationSpace.create({
        title: 'Counting Space',
        description: 'Test space for document counting',
        createdBy: adminUser._id,
        accessType: 'all',
        updateType: 'all',
      });

      // 2 development active docs
      await Document.create({
        spaceId: space._id,
        title: 'Dev 1',
        url: 'https://docs.google.com/d1',
        provider: 'google_doc',
        area: 'development',
        createdBy: adminUser._id,
        archived: false,
      });
      await Document.create({
        spaceId: space._id,
        title: 'Dev 2',
        url: 'https://docs.google.com/d2',
        provider: 'google_doc',
        area: 'development',
        createdBy: adminUser._id,
        archived: false,
      });

      // 1 testing active doc
      await Document.create({
        spaceId: space._id,
        title: 'Test 1',
        url: 'https://docs.google.com/t1',
        provider: 'google_doc',
        area: 'testing',
        createdBy: adminUser._id,
        archived: false,
      });

      // 2 archived docs
      await Document.create({
        spaceId: space._id,
        title: 'Archived 1',
        url: 'https://docs.google.com/a1',
        provider: 'google_doc',
        area: 'development',
        createdBy: adminUser._id,
        archived: true,
      });
      await Document.create({
        spaceId: space._id,
        title: 'Archived 2',
        url: 'https://docs.google.com/a2',
        provider: 'google_doc',
        area: 'general',
        createdBy: adminUser._id,
        archived: true,
      });

      const res = await adminAgent.get(`/doc/spaces/${space._id}`);
      expect(res.status).toBe(200);
      expect(res.body.documentCount).toBe(3);
      expect(res.body.archivedCount).toBe(2);
      expect(res.body.areaCounts).toEqual({
        general: 0,
        requirements: 0,
        design: 0,
        development: 2,
        testing: 1,
        deployment: 0,
      });
    });
  });

  describe('6. Permission Matrix: Space Creation (admin vs lead vs outsider)', () => {
    it('allows Admin to create a project-linked space', async () => {
      const res = await adminAgent.post('/doc/spaces').send({
        title: 'Admin Created Project Space',
        description: 'Admin created',
        projectId: testProject._id,
        accessType: 'project_members',
        updateType: 'project_members',
      });
      expect(res.status).toBe(201);
    });

    it('allows Project Lead to create a space for their project', async () => {
      const res = await leadAgent.post('/doc/spaces').send({
        title: 'Lead Created Space',
        description: 'Lead created',
        projectId: testProject._id,
        accessType: 'project_members',
        updateType: 'project_members',
      });
      expect(res.status).toBe(201);
    });

    it('rejects regular project member from creating a space for the project (403)', async () => {
      const res = await memberAgent.post('/doc/spaces').send({
        title: 'Member Attempt Space',
        description: 'Should fail',
        projectId: testProject._id,
      });
      expect(res.status).toBe(403);
    });

    it('rejects non-admin from creating a standalone space without a project (403)', async () => {
      const res = await leadAgent.post('/doc/spaces').send({
        title: 'Standalone Space Attempt',
        description: 'Should fail',
      });
      expect(res.status).toBe(403);
    });
  });

  describe('7. Permission Matrix: View & Update (404 Stealth vs 403 Forbidden)', () => {
    let restrictedSpace;

    beforeAll(async () => {
      restrictedSpace = await DocumentationSpace.create({
        title: 'Restricted Project Space',
        description: 'Only for project members',
        projectId: testProject._id,
        createdBy: creatorUser._id,
        accessType: 'project_members',
        updateType: 'selected',
        accessMembers: [],
        updateMembers: [selectedUser._id],
      });
    });

    it('Admin can view restricted space (200)', async () => {
      const res = await adminAgent.get(`/doc/spaces/${restrictedSpace._id}`);
      expect(res.status).toBe(200);
      expect(res.body.canUpdate).toBe(true);
      expect(res.body.canManage).toBe(true);
    });

    it('Creator can view and update restricted space (200)', async () => {
      const res = await creatorAgent.get(`/doc/spaces/${restrictedSpace._id}`);
      expect(res.status).toBe(200);
      expect(res.body.canUpdate).toBe(true);
      expect(res.body.canManage).toBe(true);
    });

    it('Project Member has view rights (200) but canUpdate is false (Read-only UI)', async () => {
      const res = await memberAgent.get(`/doc/spaces/${restrictedSpace._id}`);
      expect(res.status).toBe(200);
      expect(res.body.canUpdate).toBe(false);
      expect(res.body.canManage).toBe(false);
    });

    it('Project Member with view-only receives 403 FORBIDDEN when attempting to add document', async () => {
      const res = await memberAgent.post(`/doc/spaces/${restrictedSpace._id}/documents`).send({
        title: 'Unauthorized Doc',
        url: 'https://docs.google.com/unauthorized',
      });
      expect(res.status).toBe(403);
    });

    it('Project Member with view-only receives 403 FORBIDDEN when requesting includeArchived=true', async () => {
      const res = await memberAgent.get(`/doc/spaces/${restrictedSpace._id}/documents?includeArchived=true`);
      expect(res.status).toBe(403);
    });

    it('Selected User in updateMembers can update documents (201)', async () => {
      const res = await selectedAgent.post(`/doc/spaces/${restrictedSpace._id}/documents`).send({
        title: 'Selected Member Doc',
        url: 'https://docs.google.com/selected',
      });
      expect(res.status).toBe(201);
    });

    it('Outsider without view rights receives 404 NOT_FOUND (View Stealth Rule)', async () => {
      const res = await outsiderAgent.get(`/doc/spaces/${restrictedSpace._id}`);
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('Outsider attempting to add document to unviewable space receives 404 NOT_FOUND', async () => {
      const res = await outsiderAgent.post(`/doc/spaces/${restrictedSpace._id}/documents`).send({
        title: 'Outsider Doc',
        url: 'https://docs.google.com/outsider',
      });
      expect(res.status).toBe(404);
    });
  });

  describe('8. Document Archiving and Restoration Flow', () => {
    let testSpace;
    let testDoc;

    beforeAll(async () => {
      testSpace = await DocumentationSpace.create({
        title: 'Archive Flow Space',
        description: 'Test space',
        createdBy: adminUser._id,
        accessType: 'all',
        updateType: 'all',
      });

      testDoc = await Document.create({
        spaceId: testSpace._id,
        title: 'Archivable Document',
        url: 'https://docs.google.com/archivable',
        provider: 'google_doc',
        area: 'requirements',
        createdBy: adminUser._id,
        archived: false,
      });
    });

    it('archives document via DELETE /doc/documents/:documentId', async () => {
      const res = await adminAgent.delete(`/doc/documents/${testDoc._id}`);
      expect(res.status).toBe(200);
      expect(res.body.document.archived).toBe(true);

      const dbDoc = await Document.findById(testDoc._id);
      expect(dbDoc.archived).toBe(true);
    });

    it('excludes archived document from active document listings', async () => {
      const res = await adminAgent.get(`/doc/spaces/${testSpace._id}/documents`);
      expect(res.status).toBe(200);
      expect(res.body.some((d) => d._id === String(testDoc._id))).toBe(false);
    });

    it('restores archived document via PATCH /doc/documents/:documentId with archived: false', async () => {
      const res = await adminAgent.patch(`/doc/documents/${testDoc._id}`).send({
        archived: false,
      });
      expect(res.status).toBe(200);
      expect(res.body.archived).toBe(false);

      const dbDoc = await Document.findById(testDoc._id);
      expect(dbDoc.archived).toBe(false);
    });
  });

  describe('9. Permanent Hard Deletions (Admin only)', () => {
    let testSpace;
    let testDoc;

    beforeEach(async () => {
      testSpace = await DocumentationSpace.create({
        title: 'Deletion Space',
        description: 'Space to be hard deleted',
        createdBy: creatorUser._id,
        accessType: 'all',
        updateType: 'all',
      });

      testDoc = await Document.create({
        spaceId: testSpace._id,
        title: 'Doc to hard delete',
        url: 'https://docs.google.com/hard-delete',
        provider: 'google_doc',
        area: 'general',
        createdBy: creatorUser._id,
        archived: false,
      });
    });

    it('rejects non-admin from permanently deleting a document (403)', async () => {
      const res = await creatorAgent.delete(`/doc/documents/${testDoc._id}/permanent`);
      expect(res.status).toBe(403);
    });

    it('allows Admin to permanently delete a document from the database', async () => {
      const res = await adminAgent.delete(`/doc/documents/${testDoc._id}/permanent`);
      expect(res.status).toBe(200);

      const check = await Document.findById(testDoc._id);
      expect(check).toBeNull();
    });

    it('rejects non-admin from deleting a documentation space (403)', async () => {
      const res = await creatorAgent.delete(`/doc/spaces/${testSpace._id}`);
      expect(res.status).toBe(403);
    });

    it('allows Admin to delete space and cascade deletes its documents', async () => {
      const res = await adminAgent.delete(`/doc/spaces/${testSpace._id}`);
      expect(res.status).toBe(200);
      expect(res.body.deletedDocumentsCount).toBeGreaterThanOrEqual(1);

      const checkSpace = await DocumentationSpace.findById(testSpace._id);
      expect(checkSpace).toBeNull();

      const checkDoc = await Document.findById(testDoc._id);
      expect(checkDoc).toBeNull();
    });
  });

  describe('10. Missing Document and Non-Existent Resources (404)', () => {
    it('returns 404 for non-existent document ID', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const res = await adminAgent.get(`/doc/documents/${nonExistentId}`);
      // Since GET /doc/documents/:id is not defined, Express router falls through or returns 404
      expect(res.status).toBe(404);
    });

    it('returns 404 when patching non-existent document', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const res = await adminAgent.patch(`/doc/documents/${nonExistentId}`).send({
        title: 'New Title',
      });
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });
});
