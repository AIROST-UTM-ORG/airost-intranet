const express = require('express');
const { authenticate } = require('../../middleware/authenticate');
const { validate } = require('../../middleware/validate');
const { validateGetUsers, validateUpdateProfile } = require('./member.validation');
const controller = require('./member.controller');

const router = express.Router();
router.get('/users', authenticate, validate(validateGetUsers), controller.getUsers);
router.patch('/:id', authenticate, validate(validateUpdateProfile), controller.updateProfile);

module.exports = router;
