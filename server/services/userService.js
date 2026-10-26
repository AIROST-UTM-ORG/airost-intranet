const User = require('../models/User');

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

module.exports = {
  getAllUsers,
  getFilteredUsers,
  findUserById,
  updateUser,
  formatUsers,
};
