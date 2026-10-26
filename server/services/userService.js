const User = require('../models/User');

const MAX_PHOTO_URL_LENGTH = 2048;
const MAX_DATA_URL_LENGTH = 2 * 1024 * 1024;
const MAX_SOCIAL_URL_LENGTH = 300;
const SOCIAL_NETWORKS = {
  instagram: {
    hosts: ['instagram.com', 'www.instagram.com'],
    canonicalHost: 'www.instagram.com',
    profilePath: (handle) => `/${handle}/`,
  },
  linkedin: {
    hosts: ['linkedin.com', 'www.linkedin.com'],
    canonicalHost: 'www.linkedin.com',
    profilePath: (handle) => `/in/${handle}/`,
  },
  github: {
    hosts: ['github.com', 'www.github.com'],
    canonicalHost: 'github.com',
    profilePath: (handle) => `/${handle}`,
  },
};

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const formatUsers = (users) => users.map(({ googleId, isActive, ...user }) => ({
  ...user,
  positions: user.positions || [],
  year: user.year || '',
  course: user.course || '',
  origin: user.origin || { state: '', country: '' },
  description: user.description || '',
  photoUrl: user.photoUrl || '',
  instagramUrl: user.instagramUrl || '',
  linkedinUrl: user.linkedinUrl || '',
  githubUrl: user.githubUrl || '',
  featuredProjectIds: user.featuredProjectIds || [],
  loggedIn: Boolean(googleId),
  verified: Boolean(user.positions?.length),
}));

const userDirectoryQuery = (filter) => User.find(filter)
  .select('_id email name photoUrl positions year course origin description instagramUrl linkedinUrl githubUrl featuredProjectIds googleId isActive')
  .populate({ path: 'featuredProjectIds', select: '_id projectId title description lead' })
  .sort({ name: 1 })
  .lean();

/**
 * Fetch all users using the directory-safe projection.
 */
const getAllUsers = async () => {
  const users = await userDirectoryQuery({});
  return formatUsers(users);
};

/**
 * Fetch active users matching search, role, and year criteria with pagination.
 */
const getFilteredUsers = async ({ search, role, year, page = 1, limit = 20 }) => {
  const filter = { isActive: true };

  if (search?.trim()) {
    const term = new RegExp(escapeRegExp(search.trim()), 'i');
    filter.$or = [{ name: term }, { email: term }, { course: term }, { description: term }];
  }
  if (role !== undefined) {
    filter.positions = role.trim();
  }
  if (year !== undefined) {
    filter.year = year.trim();
  }

  const users = await userDirectoryQuery(filter)
    .skip((page - 1) * limit)
    .limit(limit);

  return formatUsers(users);
};

/**
 * Find a user document by ID.
 */
const findUserById = async (id) => {
  return User.findById(id);
};

/**
 * Update a user profile and return the sanitized, populated user.
 */
const updateUser = async (id, updates) => {
  const user = await User.findById(id);
  if (!user) {
    return null;
  }

  Object.assign(user, updates);
  await user.save();

  return User.findById(user._id)
    .select('-googleId -__v')
    .populate({ path: 'featuredProjectIds', select: '_id projectId title description lead' });
};

/**
 * Validate HTTP URL
 */
const isHttpUrl = (value) => {
  try {
    const { protocol } = new URL(value);
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
};

/**
 * Validate photo URL
 */
const isValidPhotoUrl = (value) => {
  if (typeof value !== 'string') return false;

  const url = value.trim();
  if (!url) return true;

  if (url.startsWith('data:image/')) {
    return url.length <= MAX_DATA_URL_LENGTH && /^data:image\/(?:jpeg|png|webp);base64,[a-zA-Z0-9+/]+={0,2}$/i.test(url);
  }

  return url.length <= MAX_PHOTO_URL_LENGTH && isHttpUrl(url);
};

/** Validate and canonicalize a social profile URL or handle for its network. */
const normalizeSocialUrl = (value, network) => {
  if (typeof value !== 'string' || !SOCIAL_NETWORKS[network]) return null;

  const input = value.trim();
  if (!input) return '';
  if (input.length > MAX_SOCIAL_URL_LENGTH) return null;

  const networkConfig = SOCIAL_NETWORKS[network];
  const looksLikeUrl = input.startsWith('//') || /^[a-z][a-z0-9+.-]*:/i.test(input);
  if (looksLikeUrl) {
    try {
      const url = new URL(input);
      if (
        url.protocol !== 'https:' ||
        !networkConfig.hosts.includes(url.hostname.toLowerCase()) ||
        (url.port && url.port !== '443') ||
        url.username ||
        url.password
      ) {
        return null;
      }

      url.hostname = networkConfig.canonicalHost;
      return url.href;
    } catch {
      return null;
    }
  }

  if (!/^@?[a-zA-Z0-9._-]+$/.test(input)) return null;
  const handle = input.replace(/^@/, '');
  if (!handle) return null;

  return `https://${networkConfig.canonicalHost}${networkConfig.profilePath(encodeURIComponent(handle))}`;
};

module.exports = {
  getAllUsers,
  getFilteredUsers,
  findUserById,
  updateUser,
  formatUsers,
  isValidPhotoUrl,
  normalizeSocialUrl,
};
