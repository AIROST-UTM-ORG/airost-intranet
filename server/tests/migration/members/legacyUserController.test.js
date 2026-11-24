const memberController = require('../../../src/features/members/member.controller');
const legacyController = require('../../../controller/userController');

describe('legacy user controller compatibility', () => {
  test('forwards current and legacy export names to the feature controller', () => {
    expect(legacyController.getUsers).toBe(memberController.getUsers);
    expect(legacyController.updateProfile).toBe(memberController.updateProfile);
    expect(legacyController.updateUser).toBe(memberController.updateProfile);
  });
});
