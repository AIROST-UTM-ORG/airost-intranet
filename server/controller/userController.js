// Compatibility exports retained until legacy controller cleanup in #90.
const memberController = require('../src/features/members/member.controller');

module.exports = {
  ...memberController,
  updateUser: memberController.updateProfile,
};
