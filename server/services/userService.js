// Compatibility facade retained until legacy service cleanup in #90.
const memberService = require('../src/features/members/member.service');
const { formatUser, formatUsers } = require('../src/features/members/member.formatter');

const isValidPhotoUrl = (value) => {
  if (typeof value !== 'string') return false;
  const url = value.trim();
  if (!url) return true;
  if (url.startsWith('data:image/')) return url.length <= 2 * 1024 * 1024 && /^data:image\/(?:jpeg|png|webp);base64,[a-zA-Z0-9+/]+={0,2}$/i.test(url);
  try { return url.length <= 2048 && ['http:', 'https:'].includes(new URL(url).protocol); } catch { return false; }
};

const normalizeSocialUrl = (value, network) => {
  if (typeof value !== 'string') return null;
  const field = `${network}Url`;
  try {
    return require('../src/features/members/member.validation').validateUpdateProfile({ params: { id: '000000000000000000000000' }, body: { [field]: value } }).sanitizedData[field] ?? null;
  } catch { return null; }
};

module.exports = {
  getFilteredUsers: async (filters) => (await memberService.getUsers(filters)).data,
  updateUser: async (id, updates) => formatUser(await memberService.updateProfile(id, updates, { _id: id, positions: [] })),
  formatUsers,
  isValidPhotoUrl,
  normalizeSocialUrl,
};
