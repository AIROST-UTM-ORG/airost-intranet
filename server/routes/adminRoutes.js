const express = require('express');
const { createVerifiedUser, getUsers } = require('../controller/adminController');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

// Get all users
router.get('/users', requireAuth, getUsers);

// Create a new verified user
router.post('/users/verified', requireAuth, createVerifiedUser);


// module.exports = router;

// Compatibility route export retained until legacy route cleanup in #90.
module.exports = require('../src/features/members/admin/admin.routes');
