const express = require('express');
const { getUsers, updateUser } = require('../controller/userController');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

// Get users with optional search, filtering, and pagination.
router.get('/users', requireAuth, getUsers);

// UPDATE a User
router.patch('/:id', requireAuth, updateUser);

module.exports = router;
