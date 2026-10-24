const express = require('express');
const { getUsers, updateUser } = require('../controller/userController');
const router = express.Router();

// Get all users
router.get('/users', getUsers);

//UPDATE a User
router.patch('/:id', updateUser);

module.exports = router;