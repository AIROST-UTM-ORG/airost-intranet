const mongoose = require('mongoose');
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
require('dotenv').config({ path: __dirname + '/../.env' });
const User = require('../models/User');
const Project = require('../models/Project');
const ProjectBoard = require('../models/ProjectBoard');

const BASE_URL = 'http://localhost:4000';

async function runTests() {
  console.log('--- Starting Project Management & Authorization Regression Tests ---');
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);

  // Setup test users
  const leadEmail = 'test_lead@airost.org';
  const memberEmail = 'test_member@airost.org';
  const unauthorizedEmail = 'test_unauth@airost.org';
  const adminEmail = 'test_admin@airost.org';

  await User.findOneAndUpdate(
    { email: leadEmail },
    { googleID: 'lead_test_id', name: 'Test Lead', email: leadEmail, photo: 'https://via.placeholder.com/50', position: ['member'] },
    { upsert: true, new: true }
  );
  await User.findOneAndUpdate(
    { email: memberEmail },
    { googleID: 'member_test_id', name: 'Test Member', email: memberEmail, photo: 'https://via.placeholder.com/50', position: ['member'] },
    { upsert: true, new: true }
  );
  await User.findOneAndUpdate(
    { email: unauthorizedEmail },
    { googleID: 'unauth_test_id', name: 'Test Stranger', email: unauthorizedEmail, photo: 'https://via.placeholder.com/50', position: ['member'] },
    { upsert: true, new: true }
  );
  await User.findOneAndUpdate(
    { email: adminEmail },
    { googleID: 'admin_test_id', name: 'Test Admin', email: adminEmail, photo: 'https://via.placeholder.com/50', position: ['admin'] },
    { upsert: true, new: true }
  );

  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`  [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${testName}`);
      failed++;
    }
  }

  let createdProjectId = null;

  // Test 1: Unauthenticated create should fail (401)
  try {
    const res = await fetch(`${BASE_URL}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Anon Project', description: 'Some description', lead: 'Test Lead' })
    });
    assert(res.status === 401, 'Test 1: Unauthenticated POST /projects returns 401');
  } catch (e) {
    assert(false, `Test 1 Exception: ${e.message}`);
  }

  // Test 2: Invalid input (empty title) should fail (400)
  try {
    const res = await fetch(`${BASE_URL}/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-email': leadEmail
      },
      body: JSON.stringify({ title: '', description: 'Some description', lead: 'Test Lead' })
    });
    assert(res.status === 400, 'Test 2: POST /projects with empty title returns 400');
  } catch (e) {
    assert(false, `Test 2 Exception: ${e.message}`);
  }

  // Test 3: Invalid input (missing lead) should fail (400)
  try {
    const res = await fetch(`${BASE_URL}/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-email': leadEmail
      },
      body: JSON.stringify({ title: 'Valid Title', description: 'Some description', lead: '' })
    });
    assert(res.status === 400, 'Test 3: POST /projects with missing lead returns 400');
  } catch (e) {
    assert(false, `Test 3 Exception: ${e.message}`);
  }

  // Test 4: Valid project creation by lead
  try {
    const res = await fetch(`${BASE_URL}/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-email': leadEmail
      },
      body: JSON.stringify({
        title: 'Security Audited Project',
        description: 'Comprehensive testing for access control and CRUD features.',
        lead: leadEmail,
        category: 'Web development',
        teamMembers: [memberEmail],
        access: [memberEmail]
      })
    });
    const data = await res.json();
    assert(res.status === 201 && data.projectId && data.title === 'Security Audited Project', 'Test 4: Authenticated POST /projects succeeds (201)');
    createdProjectId = data.projectId;

    // Verify ProjectBoard was created
    const board = await ProjectBoard.findOne({ projectId: createdProjectId });
    assert(board !== null, 'Test 4b: Corresponding ProjectBoard was automatically created');
  } catch (e) {
    assert(false, `Test 4 Exception: ${e.message}`);
  }

  // Test 5: GET /projects/:id returns project and permissions for lead
  try {
    const res = await fetch(`${BASE_URL}/projects/${createdProjectId}`, {
      headers: { 'x-user-email': leadEmail }
    });
    const data = await res.json();
    assert(
      res.status === 200 && data.permissions?.role === 'lead' && data.permissions?.canEdit === true && data.permissions?.canDelete === true,
      'Test 5: Lead has role="lead", canEdit=true, canDelete=true'
    );
  } catch (e) {
    assert(false, `Test 5 Exception: ${e.message}`);
  }

  // Test 6: GET /projects/:id permissions for member
  try {
    const res = await fetch(`${BASE_URL}/projects/${createdProjectId}`, {
      headers: { 'x-user-email': memberEmail }
    });
    const data = await res.json();
    assert(
      res.status === 200 && data.permissions?.role === 'member' && data.permissions?.canEdit === true && data.permissions?.canDelete === false,
      'Test 6: Member has role="member", canEdit=true, canDelete=false'
    );
  } catch (e) {
    assert(false, `Test 6 Exception: ${e.message}`);
  }

  // Test 7: GET /projects/:id permissions for unauthorized viewer
  try {
    const res = await fetch(`${BASE_URL}/projects/${createdProjectId}`, {
      headers: { 'x-user-email': unauthorizedEmail }
    });
    const data = await res.json();
    assert(
      res.status === 200 && data.permissions?.role === 'viewer' && data.permissions?.canEdit === false && data.permissions?.canDelete === false,
      'Test 7: Non-member has role="viewer", canEdit=false, canDelete=false'
    );
  } catch (e) {
    assert(false, `Test 7 Exception: ${e.message}`);
  }

  // Test 8: Unauthorized user PUT update blocked (403)
  try {
    const res = await fetch(`${BASE_URL}/projects/${createdProjectId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-user-email': unauthorizedEmail
      },
      body: JSON.stringify({ title: 'Hacked Title' })
    });
    assert(res.status === 403, 'Test 8: Unauthorized user direct PUT /projects/:id returns 403 Forbidden');
  } catch (e) {
    assert(false, `Test 8 Exception: ${e.message}`);
  }

  // Test 9: Member PUT updating title/description allowed (200)
  try {
    const res = await fetch(`${BASE_URL}/projects/${createdProjectId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-user-email': memberEmail
      },
      body: JSON.stringify({ description: 'Updated description by member' })
    });
    const data = await res.json();
    assert(res.status === 200 && data.description === 'Updated description by member', 'Test 9: Member can update project description (200)');
  } catch (e) {
    assert(false, `Test 9 Exception: ${e.message}`);
  }

  // Test 10: Member attempting to alter team members or lead blocked (403)
  try {
    const res = await fetch(`${BASE_URL}/projects/${createdProjectId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-user-email': memberEmail
      },
      body: JSON.stringify({ lead: 'test_member@airost.org', teamMembers: [] })
    });
    assert(res.status === 403, 'Test 10: Member attempting to reassign lead or change teamMembers returns 403 Forbidden');
  } catch (e) {
    assert(false, `Test 10 Exception: ${e.message}`);
  }

  // Test 11: Member attempting to DELETE project blocked (403)
  try {
    const res = await fetch(`${BASE_URL}/projects/${createdProjectId}`, {
      method: 'DELETE',
      headers: { 'x-user-email': memberEmail }
    });
    assert(res.status === 403, 'Test 11: Member direct DELETE /projects/:id returns 403 Forbidden');
  } catch (e) {
    assert(false, `Test 11 Exception: ${e.message}`);
  }

  // Test 12: Unauthorized user attempting to DELETE project blocked (403)
  try {
    const res = await fetch(`${BASE_URL}/projects/${createdProjectId}`, {
      method: 'DELETE',
      headers: { 'x-user-email': unauthorizedEmail }
    });
    assert(res.status === 403, 'Test 12: Unauthorized user direct DELETE /projects/:id returns 403 Forbidden');
  } catch (e) {
    assert(false, `Test 12 Exception: ${e.message}`);
  }

  // Test 13: Lead updating team members and fields (200)
  try {
    const res = await fetch(`${BASE_URL}/projects/${createdProjectId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-user-email': leadEmail
      },
      body: JSON.stringify({
        title: 'Audited Project Updated By Lead',
        teamMembers: [memberEmail, unauthorizedEmail],
        category: 'Artificial Intelligence (AI)'
      })
    });
    const data = await res.json();
    assert(
      res.status === 200 && data.teamMembers.length === 2 && data.category === 'Artificial Intelligence (AI)',
      'Test 13: Lead can update title, category, and teamMembers (200)'
    );
  } catch (e) {
    assert(false, `Test 13 Exception: ${e.message}`);
  }

  // Test 14: Non-existent project GET /projects/999999 returns 404
  try {
    const res = await fetch(`${BASE_URL}/projects/999999`, {
      headers: { 'x-user-email': leadEmail }
    });
    assert(res.status === 404, 'Test 14: Querying non-existent project returns 404 Not Found');
  } catch (e) {
    assert(false, `Test 14 Exception: ${e.message}`);
  }

  // Test 15: Lead DELETE project succeeds (200) and cleans up ProjectBoard
  try {
    const res = await fetch(`${BASE_URL}/projects/${createdProjectId}`, {
      method: 'DELETE',
      headers: { 'x-user-email': leadEmail }
    });
    assert(res.status === 200, 'Test 15: Lead DELETE /projects/:id succeeds (200)');

    const projectCheck = await Project.findOne({ projectId: createdProjectId });
    const boardCheck = await ProjectBoard.findOne({ projectId: createdProjectId });
    assert(projectCheck === null && boardCheck === null, 'Test 15b: Project and ProjectBoard are completely removed from DB');
  } catch (e) {
    assert(false, `Test 15 Exception: ${e.message}`);
  }

  // Test 16: Admin DELETE permissions test
  try {
    // Create a temporary project by member
    const createRes = await fetch(`${BASE_URL}/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-email': memberEmail
      },
      body: JSON.stringify({
        title: 'Project For Admin Delete Test',
        description: 'Testing admin privilege override.',
        lead: memberEmail
      })
    });
    const proj = await createRes.json();
    const adminDelRes = await fetch(`${BASE_URL}/projects/${proj.projectId}`, {
      method: 'DELETE',
      headers: { 'x-user-email': adminEmail }
    });
    assert(adminDelRes.status === 200, 'Test 16: Admin can delete any project regardless of owner (200)');
  } catch (e) {
    assert(false, `Test 16 Exception: ${e.message}`);
  }

  // Clean up test users
  await User.deleteMany({ email: { $in: [leadEmail, memberEmail, unauthorizedEmail, adminEmail] } });

  console.log('------------------------------------------------------------');
  console.log(`Results: ${passed} Passed, ${failed} Failed`);
  console.log('------------------------------------------------------------');

  await mongoose.disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
