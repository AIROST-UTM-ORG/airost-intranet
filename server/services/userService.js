// Compatibility facade retained for unmigrated callers.
const memberService = require('../src/features/members/member.service');
const { formatUsers } = require('../src/features/members/member.formatter');
const { isValidPhotoUrl, normalizeSocialUrl } = require('../src/features/members/member.profile.helpers');

module.exports = {
  getFilteredUsers: async (filters) => (await memberService.getUsers(filters)).data,
  formatUsers,
  isValidPhotoUrl,
  normalizeSocialUrl,
};
