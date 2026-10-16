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

  describe('11. Architecture & Service Layer Isolation', () => {
    it('ensures docController.js does not require anything from ../models', () => {
      const fs = require('fs');
      const path = require('path');
      const controllerPath = path.join(__dirname, '../controller/docController.js');
      const content = fs.readFileSync(controllerPath, 'utf8');

      const modelRequireRegex = /require\s*\(\s*['"][^'"]*models\/[^'"]*['"]\s*\)/g;
      const matches = content.match(modelRequireRegex);
      expect(matches).toBeNull();
    });
  });

  describe('12. Safe & Explicit Project Lead / Member Resolution', () => {
    const docService = require('../services/docService');
    let warnSpy;

    beforeEach(() => {
      warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
      warnSpy.mockRestore();
    });

    it('allows ObjectId match as the strongest unique identifier', async () => {
      const objectIdUser = await User.create({
        googleID: 'google-id-lead',
        name: 'ObjectId Leader',
        email: 'idlead@airost.com',
        photo: 'https://example.com/idlead.jpg',
        position: ['member'],
      });

      const objectIdProject = await Project.create({
        projectId: 201,
        title: 'ObjectId Project',
        description: 'Test project with ObjectId lead',
        lead: objectIdUser._id.toString(),
      });

      const role = await docService.getUserProjectRole(objectIdUser._id, objectIdProject._id);
      expect(role).toBe('lead');

      const agent = request.agent(app);
      await agent.post('/test/auth/login').send({ userId: objectIdUser._id });

      const res = await agent.post('/doc/spaces').send({
        title: 'ObjectId Lead Space',
        description: 'Testing ObjectId lead space creation',
        projectId: objectIdProject._id.toString(),
        accessType: 'all',
        updateType: 'selected',
      });
      expect(res.status).toBe(201);
    });

    it('allows email match as second strongest unique identifier (case-insensitive exact match)', async () => {
      const emailUser = await User.create({
        googleID: 'google-email-lead',
        name: 'Email Leader',
        email: 'Lead.Email@Airost.org',
        photo: 'https://example.com/emaillead.jpg',
        position: ['member'],
      });

      const emailProject = await Project.create({
        projectId: 202,
        title: 'Email Project',
        description: 'Test project with email lead',
        lead: 'lead.email@airost.org',
      });

      const role = await docService.getUserProjectRole(emailUser._id, emailProject._id);
      expect(role).toBe('lead');

      const agent = request.agent(app);
      await agent.post('/test/auth/login').send({ userId: emailUser._id });

      const res = await agent.post('/doc/spaces').send({
        title: 'Email Lead Space',
        description: 'Testing email lead space creation',
        projectId: emailProject._id.toString(),
        accessType: 'all',
        updateType: 'selected',
      });
      expect(res.status).toBe(201);
    });

    it('allows unique display name match when exactly ONE active user has that name', async () => {
      const uniqueNameUser = await User.create({
        googleID: 'google-unique-lead',
        name: 'Zara UniqueLeader',
        email: 'zara@airost.com',
        photo: 'https://example.com/zara.jpg',
        position: ['member'],
      });

      const uniqueProject = await Project.create({
        projectId: 203,
        title: 'Unique Name Project',
        description: 'Test project with unique name lead',
        lead: 'Zara UniqueLeader',
      });

      const role = await docService.getUserProjectRole(uniqueNameUser._id, uniqueProject._id);
      expect(role).toBe('lead');

      const agent = request.agent(app);
      await agent.post('/test/auth/login').send({ userId: uniqueNameUser._id });

      const res = await agent.post('/doc/spaces').send({
        title: 'Unique Name Space',
        description: 'Testing unique name space creation',
        projectId: uniqueProject._id.toString(),
        accessType: 'all',
        updateType: 'selected',
      });
      expect(res.status).toBe(201);
    });

    it('denies DUPLICATE names for both users and logs server-side warning without user details', async () => {
      const dupUser1 = await User.create({
        googleID: 'google-dup-1',
        name: 'Jordan Duplicate',
        email: 'jordan1@airost.com',
        photo: 'https://example.com/j1.jpg',
        position: ['member'],
      });

      const dupUser2 = await User.create({
        googleID: 'google-dup-2',
        name: 'Jordan Duplicate',
        email: 'jordan2@airost.com',
        photo: 'https://example.com/j2.jpg',
        position: ['member'],
      });

      const dupProject = await Project.create({
        projectId: 204,
        title: 'Duplicate Lead Project',
        description: 'Test project with duplicate name lead',
        lead: 'Jordan Duplicate',
      });

      // Both users denied
      const role1 = await docService.getUserProjectRole(dupUser1._id, dupProject._id);
      expect(role1).toBeNull();

      const role2 = await docService.getUserProjectRole(dupUser2._id, dupProject._id);
      expect(role2).toBeNull();

      // Verify warning contains project id and count (2), but NEVER user details
      expect(warnSpy).toHaveBeenCalled();
      const warningMessage = warnSpy.mock.calls[0][0];
      expect(warningMessage).toContain(String(dupProject._id));
      expect(warningMessage).toContain('2');
      expect(warningMessage).not.toContain(dupUser1.email);
      expect(warningMessage).not.toContain(dupUser2.email);
      expect(warningMessage).not.toContain(String(dupUser1._id));
      expect(warningMessage).not.toContain(String(dupUser2._id));

      // Both users denied from creating spaces linked to this project (not linkable)
      const agent1 = request.agent(app);
      await agent1.post('/test/auth/login').send({ userId: dupUser1._id });

      const res1 = await agent1.post('/doc/spaces').send({
        title: 'Dup User 1 Space',
        description: 'Trying to create space with ambiguous lead',
        projectId: dupProject._id.toString(),
        accessType: 'all',
        updateType: 'selected',
      });
      expect(res1.status).toBe(403);
      expect(res1.body.error.code).toBe('FORBIDDEN');

      const agent2 = request.agent(app);
      await agent2.post('/test/auth/login').send({ userId: dupUser2._id });

      const res2 = await agent2.post('/doc/spaces').send({
        title: 'Dup User 2 Space',
        description: 'Trying to create space with ambiguous lead',
        projectId: dupProject._id.toString(),
        accessType: 'all',
        updateType: 'selected',
      });
      expect(res2.status).toBe(403);
      expect(res2.body.error.code).toBe('FORBIDDEN');
    });

    it('handles name with different case/whitespace consistently and rejects partial matching', async () => {
      const caseUser = await User.create({
        googleID: 'google-case-lead',
        name: 'Morgan CaseLead',
        email: 'morgan@airost.com',
        photo: 'https://example.com/morgan.jpg',
        position: ['member'],
      });

      const whitespaceProject = await Project.create({
        projectId: 205,
        title: 'Whitespace Lead Project',
        description: 'Testing whitespace and case tolerance',
        lead: '   mOrGaN   cAsElEaD   ',
      });

      const role = await docService.getUserProjectRole(caseUser._id, whitespaceProject._id);
      expect(role).toBe('lead');

      // Rejects partial match
      const partialProject = await Project.create({
        projectId: 206,
        title: 'Partial Lead Project',
        description: 'Partial name should fail',
        lead: 'Morgan',
      });

      const partialRole = await docService.getUserProjectRole(caseUser._id, partialProject._id);
      expect(partialRole).toBeNull();
    });

    it('denies user when project has no lead (null, empty, or whitespace)', async () => {
      const normalUser = await User.create({
        googleID: 'google-normal-user',
        name: 'Normal User',
        email: 'normal@airost.com',
        photo: 'https://example.com/normal.jpg',
        position: ['member'],
      });

      const noLeadProject = await Project.create({
        projectId: 207,
        title: 'No Lead Project',
        description: 'Project without lead',
        lead: '   ',
      });

      const role = await docService.getUserProjectRole(normalUser._id, noLeadProject._id);
      expect(role).toBeNull();

      const agent = request.agent(app);
      await agent.post('/test/auth/login').send({ userId: normalUser._id });

      const res = await agent.post('/doc/spaces').send({
        title: 'No Lead Space',
        description: 'Should fail 403',
        projectId: noLeadProject._id.toString(),
        accessType: 'all',
        updateType: 'selected',
      });
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('denies user who is not on the project', async () => {
      const projectWithOtherLead = await Project.create({
        projectId: 208,
        title: 'Other Lead Project',
        description: 'Project with someone else as lead',
        lead: adminUser._id.toString(),
      });

      const role = await docService.getUserProjectRole(creatorUser._id, projectWithOtherLead._id);
      expect(role).toBeNull();
    });

    it('enforces permission matrix effects: canCreateSpace, project_members view/update access, and linkable projects', async () => {
      // 1. Create duplicate user setup
      const dupMember = await User.create({
        googleID: 'google-dup-matrix',
        name: 'Taylor Ambiguous',
        email: 'taylor.dup1@airost.com',
        photo: 'https://example.com/t1.jpg',
        position: ['member'],
      });
      await User.create({
        googleID: 'google-dup-matrix-2',
        name: 'Taylor Ambiguous',
        email: 'taylor.dup2@airost.com',
        photo: 'https://example.com/t2.jpg',
        position: ['member'],
      });

      const dupProj = await Project.create({
        projectId: 209,
        title: 'Matrix Project',
        description: 'Project testing matrix effects',
        lead: 'Taylor Ambiguous',
      });

      // Space restricted to project_members for view and update
      const restrictedSpace = await DocumentationSpace.create({
        title: 'Restricted Project Space',
        description: 'Members only space',
        projectId: dupProj._id,
        createdBy: adminUser._id,
        accessType: 'project_members',
        updateType: 'project_members',
        accessMembers: [],
        updateMembers: [],
      });

      const dupAgent = request.agent(app);
      await dupAgent.post('/test/auth/login').send({ userId: dupMember._id });

      // View Stealth Rule: Ambiguous/denied lead receives 404 NOT_FOUND, not 403
      const viewRes = await dupAgent.get(`/doc/spaces/${restrictedSpace._id}`);
      expect(viewRes.status).toBe(404);
      expect(viewRes.body.error.code).toBe('NOT_FOUND');

      // Update denied (also stealth 404 since unviewable)
      const updateRes = await dupAgent.post(`/doc/spaces/${restrictedSpace._id}/documents`).send({
        title: 'Unauthorized Doc',
        url: 'https://docs.google.com/unauthorized',
        area: 'general',
      });
      expect(updateRes.status).toBe(404);

      // Linkable project: Cannot create space linked to this project (403 FORBIDDEN)
      const createRes = await dupAgent.post('/doc/spaces').send({
        title: 'Attempted Linked Space',
        description: 'Should fail because not authorized lead',
        projectId: dupProj._id.toString(),
        accessType: 'all',
        updateType: 'selected',
      });
      expect(createRes.status).toBe(403);
      expect(createRes.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('13. Read Endpoints: GET /doc/spaces?projectId= and GET /doc/search', () => {
    let projA;
    let projB;
    let spaceA;
    let spaceB;
    let standaloneSpace;
    let secretSpace;
    let selectedSpace;

    let docA1;
    let docA2;
    let docArchived;
    let docRegex;
    let docSecret;
    let docSelected;

    beforeAll(async () => {
      // 1. Create two test projects
      projA = await Project.create({
        projectId: 301,
        title: 'Alpha Project',
        description: 'First test project for read endpoints',
        lead: leadUser._id.toString(),
      });

      projB = await Project.create({
        projectId: 302,
        title: 'Beta Project',
        description: 'Second test project for read endpoints',
        lead: adminUser._id.toString(),
      });

      // Join memberships
      await ProjectMember.create({
        projectId: projA._id,
        userId: leadUser._id,
        role: 'lead',
      });
      await ProjectMember.create({
        projectId: projA._id,
        userId: memberUser._id,
        role: 'member',
      });

      // 2. Spaces
      spaceA = await DocumentationSpace.create({
        title: 'Alpha Documentation',
        description: 'Docs for Alpha',
        projectId: projA._id,
        createdBy: leadUser._id,
        accessType: 'all',
        updateType: 'project_members',
        accessMembers: [],
        updateMembers: [],
      });

      spaceB = await DocumentationSpace.create({
        title: 'Beta Documentation',
        description: 'Docs for Beta',
        projectId: projB._id,
        createdBy: adminUser._id,
        accessType: 'all',
        updateType: 'selected',
        accessMembers: [],
        updateMembers: [],
      });

      standaloneSpace = await DocumentationSpace.create({
        title: 'Club General Portal',
        description: 'Standalone portal for everyone',
        projectId: null,
        createdBy: adminUser._id,
        accessType: 'all',
        updateType: 'selected',
        accessMembers: [],
        updateMembers: [],
      });

      secretSpace = await DocumentationSpace.create({
        title: 'Secret Alpha Research',
        description: 'Visible only to Alpha project members',
        projectId: projA._id,
        createdBy: leadUser._id,
        accessType: 'project_members',
        updateType: 'project_members',
        accessMembers: [],
        updateMembers: [],
      });

      selectedSpace = await DocumentationSpace.create({
        title: 'Selected Advisory Space',
        description: 'Visible only to selected members',
        projectId: null,
        createdBy: adminUser._id,
        accessType: 'selected',
        updateType: 'selected',
        accessMembers: [selectedUser._id],
        updateMembers: [selectedUser._id],
      });

      // 3. Documents
      docA1 = await Document.create({
        spaceId: spaceA._id,
        title: 'Designsort Specs for Microservice',
        url: 'https://docs.google.com/design-specs',
        provider: 'google_doc',
        area: 'design',
        createdBy: leadUser._id,
        archived: false,
      });

      docA2 = await Document.create({
        spaceId: spaceA._id,
        title: 'System Architecture Designsort',
        url: 'https://docs.google.com/arch-design',
        provider: 'google_doc',
        area: 'design',
        createdBy: leadUser._id,
        archived: false,
      });

      docArchived = await Document.create({
        spaceId: spaceA._id,
        title: 'Design Archive Draft (Old)',
        url: 'https://docs.google.com/design-archive',
        provider: 'google_doc',
        area: 'design',
        createdBy: leadUser._id,
        archived: true,
      });

      docRegex = await Document.create({
        spaceId: spaceA._id,
        title: 'Network Protocol (v1.0.0) [RFC.*]',
        url: 'https://docs.google.com/network-spec',
        provider: 'google_doc',
        area: 'development',
        createdBy: leadUser._id,
        archived: false,
      });

      docSecret = await Document.create({
        spaceId: secretSpace._id,
        title: 'Secret Formula and Algorithms',
        url: 'https://docs.google.com/secret-algorithms',
        provider: 'google_doc',
        area: 'requirements',
        createdBy: leadUser._id,
        archived: false,
      });

      docSelected = await Document.create({
        spaceId: selectedSpace._id,
        title: 'Selected Confidential Advisory Guideline',
        url: 'https://docs.google.com/advisory-guideline',
        provider: 'google_doc',
        area: 'general',
        createdBy: adminUser._id,
        archived: false,
      });
    });

    it('GET /doc/spaces?projectId=: returns only matching and viewable spaces with full metadata', async () => {
      const res = await memberAgent.get(`/doc/spaces?projectId=${projA._id}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);

      // Should only contain spaces linked to projA
      res.body.forEach((space) => {
        expect(space.projectId._id).toBe(projA._id.toString());
      });

      const titles = res.body.map((s) => s.title);
      expect(titles).toContain('Alpha Documentation');
      expect(titles).toContain('Secret Alpha Research');
      expect(titles).not.toContain('Beta Documentation');
      expect(titles).not.toContain('Club General Portal');

      // Verify shape: myAccess, canManage, documentCount, activeDocumentCount
      const spaceObj = res.body.find((s) => s.title === 'Alpha Documentation');
      expect(spaceObj).toHaveProperty('myAccess');
      expect(spaceObj).toHaveProperty('canManage');
      expect(spaceObj).toHaveProperty('documentCount');
      expect(spaceObj).toHaveProperty('activeDocumentCount');
      expect(spaceObj.documentCount).toBeGreaterThanOrEqual(1);
    });

    it('GET /doc/spaces?projectId=: rejects invalid ObjectId format with 400 INVALID_ID', async () => {
      const res = await memberAgent.get('/doc/spaces?projectId=not-a-valid-hex-id');
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_ID');
    });

    it('GET /doc/spaces?projectId=: returns empty array if user has no viewable spaces for that project', async () => {
      const nonViewableProj = await Project.create({
        projectId: 303,
        title: 'Locked Secret Project',
        description: 'Locked project',
        lead: adminUser._id.toString(),
      });

      await DocumentationSpace.create({
        title: 'Locked Space',
        description: 'Restricted space',
        projectId: nonViewableProj._id,
        createdBy: adminUser._id,
        accessType: 'selected',
        updateType: 'selected',
        accessMembers: [],
        updateMembers: [],
      });

      const res = await outsiderAgent.get(`/doc/spaces?projectId=${nonViewableProj._id}`);
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('GET /doc/search: rejects unauthenticated request with 401 UNAUTHENTICATED', async () => {
      const res = await request(app).get('/doc/search?q=design');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('GET /doc/search: rejects missing, too short (<2), or too long (>100) q with 400 VALIDATION_ERROR', async () => {
      // Missing q
      const resMissing = await memberAgent.get('/doc/search');
      expect(resMissing.status).toBe(400);
      expect(resMissing.body.error.code).toBe('VALIDATION_ERROR');

      // Too short
      const resShort = await memberAgent.get('/doc/search?q=a');
      expect(resShort.status).toBe(400);
      expect(resShort.body.error.code).toBe('VALIDATION_ERROR');

      // Whitespace only
      const resWhitespace = await memberAgent.get('/doc/search?q=%20%20%20');
      expect(resWhitespace.status).toBe(400);
      expect(resWhitespace.body.error.code).toBe('VALIDATION_ERROR');

      // Too long (>100 chars)
      const longQ = 'x'.repeat(101);
      const resLong = await memberAgent.get(`/doc/search?q=${longQ}`);
      expect(resLong.status).toBe(400);
      expect(resLong.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('GET /doc/search: rejects query-object injection (q[$ne]=x) with 400 VALIDATION_ERROR', async () => {
      const res = await memberAgent.get('/doc/search?q[$ne]=test');
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('GET /doc/search: rejects invalid limit with 400 VALIDATION_ERROR and respects valid limit', async () => {
      // Limit 0 (out of range)
      const resZero = await memberAgent.get('/doc/search?q=design&limit=0');
      expect(resZero.status).toBe(400);
      expect(resZero.body.error.code).toBe('VALIDATION_ERROR');

      // Limit 25 (out of range)
      const resHigh = await memberAgent.get('/doc/search?q=design&limit=25');
      expect(resHigh.status).toBe(400);
      expect(resHigh.body.error.code).toBe('VALIDATION_ERROR');

      // Limit non-integer
      const resNonInt = await memberAgent.get('/doc/search?q=design&limit=abc');
      expect(resNonInt.status).toBe(400);
      expect(resNonInt.body.error.code).toBe('VALIDATION_ERROR');

      // Valid limit 1
      const resValid = await memberAgent.get('/doc/search?q=design&limit=1');
      expect(resValid.status).toBe(200);
      expect(resValid.body.documents.length).toBe(1);
    });

    it('GET /doc/search: matches case-insensitively and sorts prefix match first, then alphabetical', async () => {
      const res = await memberAgent.get('/doc/search?q=designsort');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('documents');

      const docs = res.body.documents;
      expect(docs.length).toBe(2);

      // Prefix match ("Designsort Specs...") must appear before substring match ("System Architecture Designsort")
      expect(docs[0].title).toBe('Designsort Specs for Microservice');
      expect(docs[1].title).toBe('System Architecture Designsort');

      // Check fields conforming strictly to contract: _id, title, url, provider, area, spaceId, space
      expect(docs[0]).toHaveProperty('_id');
      expect(docs[0]).toHaveProperty('title');
      expect(docs[0]).toHaveProperty('url');
      expect(docs[0]).toHaveProperty('provider');
      expect(docs[0]).toHaveProperty('area');
      expect(docs[0]).toHaveProperty('spaceId');
      expect(docs[0]).toHaveProperty('space');
      expect(docs[0].space).toHaveProperty('_id');
      expect(docs[0].space).toHaveProperty('title', 'Alpha Documentation');
    });

    it('GET /doc/search: treats regex characters literally without interpreting as RegExp patterns', async () => {
      // Query with parentheses and square brackets: "(v1.0.0) [RFC.*]"
      const resLiteral = await memberAgent.get('/doc/search?q=(v1.0.0)');
      expect(resLiteral.status).toBe(200);
      expect(resLiteral.body.documents.length).toBe(1);
      expect(resLiteral.body.documents[0].title).toBe('Network Protocol (v1.0.0) [RFC.*]');

      // Query with regex wildcard ".*" should match literal ".*" and not act as wildcard
      const resWildcard = await memberAgent.get('/doc/search?q=RFC.*');
      expect(resWildcard.status).toBe(200);
      expect(resWildcard.body.documents.length).toBe(1);
      expect(resWildcard.body.documents[0].title).toBe('Network Protocol (v1.0.0) [RFC.*]');
    });

    it('GET /doc/search: strictly excludes archived documents', async () => {
      // "Design Archive Draft (Old)" is archived: true
      const res = await memberAgent.get('/doc/search?q=Archive');
      expect(res.status).toBe(200);
      const titles = res.body.documents.map((d) => d.title);
      expect(titles).not.toContain('Design Archive Draft (Old)');
    });

    it('GET /doc/search: enforces view scoping across personas (Admin, Project Lead, Member, Selected, Outsider)', async () => {
      // Secret Alpha Research document: visible to Admin, Lead, Member; invisible to Selected, Outsider
      const resAdmin = await adminAgent.get('/doc/search?q=Secret%20Formula');
      expect(resAdmin.status).toBe(200);
      expect(resAdmin.body.documents.length).toBe(1);

      const resLead = await leadAgent.get('/doc/search?q=Secret%20Formula');
      expect(resLead.status).toBe(200);
      expect(resLead.body.documents.length).toBe(1);

      const resMember = await memberAgent.get('/doc/search?q=Secret%20Formula');
      expect(resMember.status).toBe(200);
      expect(resMember.body.documents.length).toBe(1);

      const resOutsider = await outsiderAgent.get('/doc/search?q=Secret%20Formula');
      expect(resOutsider.status).toBe(200);
      expect(resOutsider.body.documents.length).toBe(0);

      // Selected Advisory Space document: visible to Selected and Admin; invisible to Outsider and Member
      const resSelected = await selectedAgent.get('/doc/search?q=Selected%20Confidential');
      expect(resSelected.status).toBe(200);
      expect(resSelected.body.documents.length).toBe(1);

      const resOutsiderSel = await outsiderAgent.get('/doc/search?q=Selected%20Confidential');
      expect(resOutsiderSel.status).toBe(200);
      expect(resOutsiderSel.body.documents.length).toBe(0);
    });

    it('Parity test: for each persona, every document returned by search belongs to a space that GET /doc/spaces returns for that persona', async () => {
      const personas = [
        { name: 'Admin', agent: adminAgent },
        { name: 'Lead', agent: leadAgent },
        { name: 'Member', agent: memberAgent },
        { name: 'Selected', agent: selectedAgent },
        { name: 'Outsider', agent: outsiderAgent },
      ];

      for (const persona of personas) {
        // 1. Get visible space IDs via GET /doc/spaces
        const spacesRes = await persona.agent.get('/doc/spaces');
        expect(spacesRes.status).toBe(200);
        const visibleSpaceIds = new Set(spacesRes.body.map((s) => s._id.toString()));

        // 2. Search for documents with a broad query ("Design")
        const searchRes = await persona.agent.get('/doc/search?q=Design&limit=20');
        expect(searchRes.status).toBe(200);

        // 3. Assert every returned document belongs to a space visible in GET /doc/spaces
        for (const doc of searchRes.body.documents) {
          expect(visibleSpaceIds.has(doc.spaceId.toString())).toBe(true);
          expect(visibleSpaceIds.has(doc.space._id.toString())).toBe(true);
        }
      }
    });
  });

  describe('14. Admin Oversight Endpoints & Internal Event Hook System', () => {
    const docEvents = require('../utils/docEvents');
    let errorSpy;

    beforeEach(() => {
      errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      docEvents.removeAllDocEventListeners();
    });

    afterEach(() => {
      errorSpy.mockRestore();
      docEvents.removeAllDocEventListeners();
    });

    it('GET /doc/admin/spaces: rejects unauthenticated caller with 401 UNAUTHENTICATED', async () => {
      const res = await request(app).get('/doc/admin/spaces');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('GET /doc/admin/spaces: rejects non-admin caller with 403 FORBIDDEN (no stealth on admin endpoints)', async () => {
      const resMember = await memberAgent.get('/doc/admin/spaces');
      expect(resMember.status).toBe(403);
      expect(resMember.body.error.code).toBe('FORBIDDEN');

      const resLead = await leadAgent.get('/doc/admin/spaces');
      expect(resLead.status).toBe(403);
      expect(resLead.body.error.code).toBe('FORBIDDEN');
    });

    it('GET /doc/admin/spaces: rejects invalid page or limit parameters with 400 VALIDATION_ERROR', async () => {
      const resInvalidPage = await adminAgent.get('/doc/admin/spaces?page=0');
      expect(resInvalidPage.status).toBe(400);
      expect(resInvalidPage.body.error.code).toBe('VALIDATION_ERROR');

      const resNegativePage = await adminAgent.get('/doc/admin/spaces?page=-5');
      expect(resNegativePage.status).toBe(400);
      expect(resNegativePage.body.error.code).toBe('VALIDATION_ERROR');

      const resInvalidLimit = await adminAgent.get('/doc/admin/spaces?limit=101');
      expect(resInvalidLimit.status).toBe(400);
      expect(resInvalidLimit.body.error.code).toBe('VALIDATION_ERROR');

      const resZeroLimit = await adminAgent.get('/doc/admin/spaces?limit=0');
      expect(resZeroLimit.status).toBe(400);
      expect(resZeroLimit.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('GET /doc/admin/spaces: returns spaces of all users with correct document counts and pagination metadata', async () => {
      const adminListProject = await Project.create({
        projectId: 301,
        title: 'Project Admin Oversight',
        description: 'Testing admin oversight list',
      });

      const userA = await User.create({
        googleID: 'google-admin-list-a',
        name: 'User Alpha Oversight',
        email: 'alpha.oversight@airost.com',
        photo: 'https://example.com/a.jpg',
        position: ['member'],
      });

      const userB = await User.create({
        googleID: 'google-admin-list-b',
        name: 'User Beta Oversight',
        email: 'beta.oversight@airost.com',
        photo: 'https://example.com/b.jpg',
        position: ['member'],
      });

      const space1 = await DocumentationSpace.create({
        title: 'Alpha Oversight Space 1',
        description: 'First oversight space',
        projectId: adminListProject._id,
        createdBy: userA._id,
        accessType: 'all',
        updateType: 'selected',
        accessMembers: [],
        updateMembers: [userA._id, userB._id],
      });

      const space2 = await DocumentationSpace.create({
        title: 'Beta Oversight Space 2',
        description: 'Second oversight space (standalone)',
        projectId: null,
        createdBy: userB._id,
        accessType: 'all',
        updateType: 'all',
        accessMembers: [],
        updateMembers: [],
      });

      await Document.create([
        {
          spaceId: space1._id,
          title: 'Active Doc 1',
          url: 'https://docs.google.com/doc1',
          provider: 'google_doc',
          area: 'general',
          createdBy: userA._id,
          archived: false,
        },
        {
          spaceId: space1._id,
          title: 'Active Doc 2',
          url: 'https://docs.google.com/doc2',
          provider: 'google_doc',
          area: 'development',
          createdBy: userA._id,
          archived: false,
        },
        {
          spaceId: space1._id,
          title: 'Archived Doc 1',
          url: 'https://docs.google.com/doc3',
          provider: 'google_doc',
          area: 'testing',
          createdBy: userA._id,
          archived: true,
        },
      ]);

      await Document.create({
        spaceId: space2._id,
        title: 'Active Doc Space 2',
        url: 'https://docs.google.com/doc4',
        provider: 'google_doc',
        area: 'general',
        createdBy: userB._id,
        archived: false,
      });

      const res = await adminAgent.get('/doc/admin/spaces?page=1&limit=50');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('spaces');
      expect(res.body).toHaveProperty('page', 1);
      expect(res.body).toHaveProperty('limit', 50);
      expect(typeof res.body.total).toBe('number');
      expect(res.body.total).toBeGreaterThanOrEqual(2);

      const foundSpace1 = res.body.spaces.find((s) => s._id.toString() === space1._id.toString());
      expect(foundSpace1).toBeDefined();
      expect(foundSpace1.title).toBe('Alpha Oversight Space 1');
      expect(foundSpace1.documentCount).toBe(2);
      expect(foundSpace1.archivedCount).toBe(1);
      expect(foundSpace1.accessMembersCount).toBe(0);
      expect(foundSpace1.updateMembersCount).toBe(2);
      expect(foundSpace1.owner).toEqual({
        _id: userA._id.toString(),
        name: 'User Alpha Oversight',
        email: 'alpha.oversight@airost.com',
      });
      expect(foundSpace1.project).toEqual({
        _id: adminListProject._id.toString(),
        title: 'Project Admin Oversight',
      });

      const foundSpace2 = res.body.spaces.find((s) => s._id.toString() === space2._id.toString());
      expect(foundSpace2).toBeDefined();
      expect(foundSpace2.title).toBe('Beta Oversight Space 2');
      expect(foundSpace2.documentCount).toBe(1);
      expect(foundSpace2.archivedCount).toBe(0);
      expect(foundSpace2.project).toBeNull();
      expect(foundSpace2.owner).toEqual({
        _id: userB._id.toString(),
        name: 'User Beta Oversight',
        email: 'beta.oversight@airost.com',
      });

      const resPage1 = await adminAgent.get('/doc/admin/spaces?page=1&limit=1');
      expect(resPage1.status).toBe(200);
      expect(resPage1.body.spaces.length).toBe(1);
      expect(resPage1.body.page).toBe(1);
      expect(resPage1.body.limit).toBe(1);
    });

    it('GET /doc/admin/spaces: correctly filters by q matching space title, project title, or owner name (with regex escaping)', async () => {
      const qProject = await Project.create({
        projectId: 302,
        title: 'Quantum Robotics Search Project',
        description: 'Unique project title for q filter',
      });

      const qUser = await User.create({
        googleID: 'google-q-user',
        name: 'Xavier Zephyr',
        email: 'xavier.zephyr@airost.com',
        photo: 'https://example.com/xz.jpg',
        position: ['member'],
      });

      const spaceByTitle = await DocumentationSpace.create({
        title: 'Hyperdrive Telemetry Handbook',
        description: 'Matched by space title',
        projectId: null,
        createdBy: adminUser._id,
        accessType: 'all',
        updateType: 'all',
      });

      const spaceByProject = await DocumentationSpace.create({
        title: 'General Guides for Robotics',
        description: 'Matched by project title',
        projectId: qProject._id,
        createdBy: adminUser._id,
        accessType: 'all',
        updateType: 'all',
      });

      const spaceByOwner = await DocumentationSpace.create({
        title: 'Zephyr Laboratory Manual',
        description: 'Matched by owner name Xavier Zephyr',
        projectId: null,
        createdBy: qUser._id,
        accessType: 'all',
        updateType: 'all',
      });

      // Match by space title
      const resSpaceTitle = await adminAgent.get('/doc/admin/spaces?q=Telemetry');
      expect(resSpaceTitle.status).toBe(200);
      expect(resSpaceTitle.body.spaces.some((s) => s._id.toString() === spaceByTitle._id.toString())).toBe(true);

      // Match by project title
      const resProjTitle = await adminAgent.get('/doc/admin/spaces?q=Quantum%20Robotics');
      expect(resProjTitle.status).toBe(200);
      expect(resProjTitle.body.spaces.some((s) => s._id.toString() === spaceByProject._id.toString())).toBe(true);

      // Match by owner name
      const resOwnerName = await adminAgent.get('/doc/admin/spaces?q=Xavier');
      expect(resOwnerName.status).toBe(200);
      expect(resOwnerName.body.spaces.some((s) => s._id.toString() === spaceByOwner._id.toString())).toBe(true);

      // Regex special characters treated literally without crashing
      const spaceWithRegexChars = await DocumentationSpace.create({
        title: 'Test Space [v1.0] (Special)*',
        description: 'Contains regex characters',
        projectId: null,
        createdBy: adminUser._id,
        accessType: 'all',
        updateType: 'all',
      });

      const resRegex = await adminAgent.get('/doc/admin/spaces?q=[v1.0]');
      expect(resRegex.status).toBe(200);
      expect(resRegex.body.spaces.some((s) => s._id.toString() === spaceWithRegexChars._id.toString())).toBe(true);
    });

    it('PATCH /doc/admin/spaces/:spaceId/owner: rejects unauthenticated (401) and non-admin (403)', async () => {
      const space = await DocumentationSpace.create({
        title: 'Owner Guard Test Space',
        description: 'Testing owner guard',
        createdBy: creatorUser._id,
        accessType: 'all',
        updateType: 'all',
      });

      const resUnauth = await request(app)
        .patch(`/doc/admin/spaces/${space._id}/owner`)
        .send({ userId: memberUser._id.toString() });
      expect(resUnauth.status).toBe(401);
      expect(resUnauth.body.error.code).toBe('UNAUTHENTICATED');

      const resNonAdmin = await memberAgent
        .patch(`/doc/admin/spaces/${space._id}/owner`)
        .send({ userId: memberUser._id.toString() });
      expect(resNonAdmin.status).toBe(403);
      expect(resNonAdmin.body.error.code).toBe('FORBIDDEN');
    });

    it('PATCH /doc/admin/spaces/:spaceId/owner: rejects invalid IDs, missing space, missing userId, unknown fields', async () => {
      const space = await DocumentationSpace.create({
        title: 'Validation Space',
        description: 'Testing validation',
        createdBy: creatorUser._id,
        accessType: 'all',
        updateType: 'all',
      });

      // Invalid spaceId
      const resInvalidSpaceId = await adminAgent
        .patch('/doc/admin/spaces/invalid-hex-space-id/owner')
        .send({ userId: memberUser._id.toString() });
      expect(resInvalidSpaceId.status).toBe(400);
      expect(resInvalidSpaceId.body.error.code).toBe('INVALID_ID');

      // Invalid userId
      const resInvalidUserId = await adminAgent
        .patch(`/doc/admin/spaces/${space._id}/owner`)
        .send({ userId: 'not-a-valid-hex-user-id' });
      expect(resInvalidUserId.status).toBe(400);
      expect(resInvalidUserId.body.error.code).toBe('INVALID_ID');

      // Missing userId
      const resMissingUserId = await adminAgent
        .patch(`/doc/admin/spaces/${space._id}/owner`)
        .send({});
      expect(resMissingUserId.status).toBe(400);
      expect(resMissingUserId.body.error.code).toBe('VALIDATION_ERROR');

      // Unknown fields
      const resUnknownFields = await adminAgent
        .patch(`/doc/admin/spaces/${space._id}/owner`)
        .send({ userId: memberUser._id.toString(), extraField: true });
      expect(resUnknownFields.status).toBe(400);
      expect(resUnknownFields.body.error.code).toBe('VALIDATION_ERROR');

      // Non-existent spaceId
      const fakeSpaceId = new mongoose.Types.ObjectId().toString();
      const resNonExistentSpace = await adminAgent
        .patch(`/doc/admin/spaces/${fakeSpaceId}/owner`)
        .send({ userId: memberUser._id.toString() });
      expect(resNonExistentSpace.status).toBe(404);
      expect(resNonExistentSpace.body.error.code).toBe('NOT_FOUND');
    });

    it('PATCH /doc/admin/spaces/:spaceId/owner: rejects non-existent or inactive user', async () => {
      const space = await DocumentationSpace.create({
        title: 'Inactive User Space',
        description: 'Testing inactive user rejection',
        createdBy: creatorUser._id,
        accessType: 'all',
        updateType: 'all',
      });

      // Non-existent user
      const fakeUserId = new mongoose.Types.ObjectId().toString();
      const resNonExistentUser = await adminAgent
        .patch(`/doc/admin/spaces/${space._id}/owner`)
        .send({ userId: fakeUserId });
      expect(resNonExistentUser.status).toBe(400);
      expect(resNonExistentUser.body.error.code).toBe('VALIDATION_ERROR');

      // Inactive user
      const inactiveUser = await User.create({
        googleID: 'google-inactive-user',
        name: 'Inactive Former Member',
        email: 'inactive@airost.com',
        photo: 'https://example.com/inactive.jpg',
        position: ['member'],
        isActive: false,
      });

      const resInactive = await adminAgent
        .patch(`/doc/admin/spaces/${space._id}/owner`)
        .send({ userId: inactiveUser._id.toString() });
      expect(resInactive.status).toBe(400);
      expect(resInactive.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('PATCH /doc/admin/spaces/:spaceId/owner: reassigns owner, old owner loses creator rights, new owner gains them', async () => {
      const initialOwner = await User.create({
        googleID: 'google-initial-owner',
        name: 'Initial Space Creator',
        email: 'initial.creator@airost.com',
        photo: 'https://example.com/init.jpg',
        position: ['member'],
      });

      const targetOwner = await User.create({
        googleID: 'google-target-owner',
        name: 'Target New Owner',
        email: 'target.owner@airost.com',
        photo: 'https://example.com/target.jpg',
        position: ['member'],
      });

      const transferSpace = await DocumentationSpace.create({
        title: 'Transferable Space',
        description: 'Space for testing ownership transfer',
        createdBy: initialOwner._id,
        accessType: 'all',
        updateType: 'selected',
        accessMembers: [],
        updateMembers: [],
      });

      const initialAgent = request.agent(app);
      await initialAgent.post('/test/auth/login').send({ userId: initialOwner._id });

      const targetAgent = request.agent(app);
      await targetAgent.post('/test/auth/login').send({ userId: targetOwner._id });

      // Before reassignment: initial owner can manage space (PATCH settings)
      const resBeforeInitial = await initialAgent
        .patch(`/doc/spaces/${transferSpace._id}`)
        .send({ title: 'Transferable Space - Initial Edit' });
      expect(resBeforeInitial.status).toBe(200);

      // Before reassignment: target owner cannot manage space (403)
      const resBeforeTarget = await targetAgent
        .patch(`/doc/spaces/${transferSpace._id}`)
        .send({ title: 'Transferable Space - Target Illegal Edit' });
      expect(resBeforeTarget.status).toBe(403);
      expect(resBeforeTarget.body.error.code).toBe('FORBIDDEN');

      // Admin reassigns ownership to targetOwner
      const resReassign = await adminAgent
        .patch(`/doc/admin/spaces/${transferSpace._id}/owner`)
        .send({ userId: targetOwner._id.toString() });
      expect(resReassign.status).toBe(200);
      expect(resReassign.body).toHaveProperty('space');
      expect(resReassign.body.space.createdBy.toString()).toBe(targetOwner._id.toString());

      // After reassignment: initial owner has LOST creator rights (403 FORBIDDEN)
      const resAfterInitial = await initialAgent
        .patch(`/doc/spaces/${transferSpace._id}`)
        .send({ title: 'Transferable Space - Initial Should Fail' });
      expect(resAfterInitial.status).toBe(403);
      expect(resAfterInitial.body.error.code).toBe('FORBIDDEN');

      // After reassignment: target owner has GAINED creator rights (200 OK)
      const resAfterTarget = await targetAgent
        .patch(`/doc/spaces/${transferSpace._id}`)
        .send({ title: 'Transferable Space - Target Now Manages' });
      expect(resAfterTarget.status).toBe(200);
      expect(resAfterTarget.body.title).toBe('Transferable Space - Target Now Manages');
    });

    it('Event Hook System: emits each event exactly once with correct payload, and NOT on write failure', async () => {
      const emittedEvents = [];
      const eventTypes = [
        'space.created',
        'space.updated',
        'space.deleted',
        'space.owner_reassigned',
        'document.created',
        'document.updated',
        'document.archived',
        'document.restored',
        'document.deleted',
      ];

      for (const evt of eventTypes) {
        docEvents.on(evt, (payload) => {
          emittedEvents.push({ type: evt, payload });
        });
      }

      // 1. space.created
      const resSpaceCreate = await adminAgent.post('/doc/spaces').send({
        title: 'Event Hook Space',
        description: 'Testing event emissions',
        accessType: 'all',
        updateType: 'all',
      });
      expect(resSpaceCreate.status).toBe(201);
      const spaceId = resSpaceCreate.body._id;

      const spaceCreatedEvt = emittedEvents.find((e) => e.type === 'space.created');
      expect(spaceCreatedEvt).toBeDefined();
      expect(spaceCreatedEvt.payload).toEqual({
        actorId: adminUser._id.toString(),
        spaceId: spaceId.toString(),
        projectId: null,
        title: 'Event Hook Space',
      });
      expect(spaceCreatedEvt.payload).not.toHaveProperty('email');

      // 2. space.updated
      const resSpaceUpdate = await adminAgent.patch(`/doc/spaces/${spaceId}`).send({
        title: 'Event Hook Space (Updated)',
      });
      expect(resSpaceUpdate.status).toBe(200);

      const spaceUpdatedEvt = emittedEvents.find((e) => e.type === 'space.updated');
      expect(spaceUpdatedEvt).toBeDefined();
      expect(spaceUpdatedEvt.payload).toEqual({
        actorId: adminUser._id.toString(),
        spaceId: spaceId.toString(),
        projectId: null,
        title: 'Event Hook Space (Updated)',
      });

      // 3. space.owner_reassigned
      const resOwnerReassign = await adminAgent
        .patch(`/doc/admin/spaces/${spaceId}/owner`)
        .send({ userId: memberUser._id.toString() });
      expect(resOwnerReassign.status).toBe(200);

      const ownerReassignedEvt = emittedEvents.find((e) => e.type === 'space.owner_reassigned');
      expect(ownerReassignedEvt).toBeDefined();
      expect(ownerReassignedEvt.payload).toEqual({
        actorId: adminUser._id.toString(),
        spaceId: spaceId.toString(),
        projectId: null,
        title: 'Event Hook Space (Updated)',
      });

      // 4. document.created
      const resDocCreate = await adminAgent.post(`/doc/spaces/${spaceId}/documents`).send({
        title: 'Event Doc 1',
        url: 'https://docs.google.com/eventdoc1',
        area: 'general',
      });
      expect(resDocCreate.status).toBe(201);
      const docId = resDocCreate.body._id;

      const docCreatedEvt = emittedEvents.find((e) => e.type === 'document.created');
      expect(docCreatedEvt).toBeDefined();
      expect(docCreatedEvt.payload).toEqual({
        actorId: adminUser._id.toString(),
        spaceId: spaceId.toString(),
        projectId: null,
        documentId: docId.toString(),
        title: 'Event Doc 1',
      });

      // 5. document.updated
      const resDocUpdate = await adminAgent.patch(`/doc/documents/${docId}`).send({
        title: 'Event Doc 1 (Renamed)',
      });
      expect(resDocUpdate.status).toBe(200);

      const docUpdatedEvt = emittedEvents.find((e) => e.type === 'document.updated');
      expect(docUpdatedEvt).toBeDefined();
      expect(docUpdatedEvt.payload).toEqual({
        actorId: adminUser._id.toString(),
        spaceId: spaceId.toString(),
        projectId: null,
        documentId: docId.toString(),
        title: 'Event Doc 1 (Renamed)',
      });

      // 6. document.archived (via DELETE /doc/documents/:id)
      const resDocArchive = await adminAgent.delete(`/doc/documents/${docId}`);
      expect(resDocArchive.status).toBe(200);

      const docArchivedEvt = emittedEvents.find((e) => e.type === 'document.archived');
      expect(docArchivedEvt).toBeDefined();
      expect(docArchivedEvt.payload).toEqual({
        actorId: adminUser._id.toString(),
        spaceId: spaceId.toString(),
        projectId: null,
        documentId: docId.toString(),
        title: 'Event Doc 1 (Renamed)',
      });

      // 7. document.restored (via PATCH /doc/documents/:id with archived: false)
      const resDocRestore = await adminAgent.patch(`/doc/documents/${docId}`).send({
        archived: false,
      });
      expect(resDocRestore.status).toBe(200);

      const docRestoredEvt = emittedEvents.find((e) => e.type === 'document.restored');
      expect(docRestoredEvt).toBeDefined();
      expect(docRestoredEvt.payload).toEqual({
        actorId: adminUser._id.toString(),
        spaceId: spaceId.toString(),
        projectId: null,
        documentId: docId.toString(),
        title: 'Event Doc 1 (Renamed)',
      });

      // 8. document.deleted (via DELETE /doc/documents/:id/permanent)
      const resDocPermanent = await adminAgent.delete(`/doc/documents/${docId}/permanent`);
      expect(resDocPermanent.status).toBe(200);

      const docDeletedEvt = emittedEvents.find((e) => e.type === 'document.deleted');
      expect(docDeletedEvt).toBeDefined();
      expect(docDeletedEvt.payload).toEqual({
        actorId: adminUser._id.toString(),
        spaceId: spaceId.toString(),
        projectId: null,
        documentId: docId.toString(),
        title: 'Event Doc 1 (Renamed)',
      });

      // 9. space.deleted (via DELETE /doc/spaces/:spaceId)
      const resSpaceDelete = await adminAgent.delete(`/doc/spaces/${spaceId}`);
      expect(resSpaceDelete.status).toBe(200);

      const spaceDeletedEvt = emittedEvents.find((e) => e.type === 'space.deleted');
      expect(spaceDeletedEvt).toBeDefined();
      expect(spaceDeletedEvt.payload).toEqual({
        actorId: adminUser._id.toString(),
        spaceId: spaceId.toString(),
        projectId: null,
        title: 'Event Hook Space (Updated)',
      });

      // Test NOT emitted on failed write
      const eventsCountBeforeFailure = emittedEvents.length;
      const resFailed = await adminAgent.post('/doc/spaces').send({
        description: 'Missing title - will fail validation',
      });
      expect(resFailed.status).toBe(400);
      expect(emittedEvents.length).toBe(eventsCountBeforeFailure);
    });

    it('Event Hook System: throwing listener does NOT break the request', async () => {
      docEvents.on('space.created', () => {
        throw new Error('Explosive subscriber error');
      });

      const res = await adminAgent.post('/doc/spaces').send({
        title: 'Robust Subscriber Space',
        description: 'Listener will explode, request should succeed',
        accessType: 'all',
        updateType: 'all',
      });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('_id');
      expect(res.body.title).toBe('Robust Subscriber Space');
    });
  });
});
