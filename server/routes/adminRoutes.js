const express = require('express');
const { createVerifiedUser, getUsers } = require('../controller/adminController');
const router = express.Router();

// Get all users
router.get('/users', getUsers);

// Create a new verified user
router.post('/users/verified', createVerifiedUser);


module.exports = router;