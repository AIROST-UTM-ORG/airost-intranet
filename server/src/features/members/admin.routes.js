const express = require('express');
const { authenticate } = require('../../middleware/authenticate');
const { requireAdmin } = require('../../middleware/authorize');
const { validate } = require('../../middleware/validate');
const { validateCreateVerifiedUser } = require('./admin.validation');
const controller = require('./admin.controller');

const router = express.Router();

router.get('/users', authenticate, requireAdmin, controller.getUsers);
router.post(
  '/users/verified',
  authenticate,
  requireAdmin,
  validate(validateCreateVerifiedUser),
  controller.createVerifiedUser
);

module.exports = router;
