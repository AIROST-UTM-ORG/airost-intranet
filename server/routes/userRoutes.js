const express = require('express');
const { getUsers, filterUsers, updateUser } = require('../controller/userController');
const router = express.Router();

// Get all users
router.get('/users', getUsers);
router.get('/filter', filterUsers);

//UPDATE a User
router.patch('/:id', updateUser);

module.exports = router;
