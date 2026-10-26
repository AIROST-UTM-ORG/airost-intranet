const User = require('../models/User');
const mongoose = require('mongoose');

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

// Return all users from the canonical User collection using the directory-safe fields.
const getUsers = async (req, res) => {
  try {
    const users = await userDirectoryQuery({});
    return res.json(formatUsers(users));
  } catch (error) {
    console.error('Unable to fetch users:', error);
    return res.status(500).json({ error: 'Unable to fetch users.' });
  }
};

// Return active directory users with optional search, role, year, and pagination filters.
const filterUsers = async (req, res) => {
  try {
    const { search, role, year } = req.query;
    const page = req.query.page === undefined ? 1 : Number(req.query.page);
    const limit = req.query.limit === undefined ? 20 : Number(req.query.limit);

    if (search !== undefined && (typeof search !== 'string' || search.trim().length > 100)) {
      return res.status(400).json({ error: 'Invalid search parameter.' });
    }
    if (role !== undefined && (typeof role !== 'string' || !role.trim() || role.length > 80)) {
      return res.status(400).json({ error: 'Invalid role parameter.' });
    }
    if (year !== undefined && (typeof year !== 'string' || !year.trim() || year.length > 40)) {
      return res.status(400).json({ error: 'Invalid year parameter.' });
    }
    if (!Number.isInteger(page) || page < 1) {
      return res.status(400).json({ error: 'Invalid page parameter.' });
    }
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      return res.status(400).json({ error: 'Invalid limit parameter.' });
    }

    const filter = { isActive: true };
    if (search?.trim()) {
      const term = new RegExp(escapeRegExp(search.trim()), 'i');
      filter.$or = [{ name: term }, { email: term }, { course: term }, { description: term }];
    }
    if (role !== undefined) filter.positions = role.trim();
    if (year !== undefined) filter.year = year.trim();

    const users = await userDirectoryQuery(filter)
      .skip((page - 1) * limit)
      .limit(limit);

    return res.json(formatUsers(users));
  } catch (error) {
    console.error('Unable to filter member directory:', error);
    return res.status(500).json({ error: 'Unable to filter member directory.' });
  }
}

//update a User
const updateUser = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).json({ error: 'No such User' });
  }

  if (typeof req.isAuthenticated !== 'function' || !req.isAuthenticated()) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const callerId = req.user?._id?.toString();
  const positions = Array.isArray(req.user?.positions) ? req.user.positions : [req.user?.positions];
  const isAdmin = positions.some((position) => typeof position === 'string' && position.toLowerCase() === 'admin');
  if (callerId?.toLowerCase() !== id.toLowerCase() && !isAdmin) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const editableFields = ['name', 'photoUrl', 'year', 'course', 'origin', 'description', 'instagramUrl', 'linkedinUrl', 'githubUrl', 'featuredProjectIds'];
  const requestEntries = Object.entries(req.body || {});
  const unsupportedFields = requestEntries.map(([key]) => key).filter((key) => !editableFields.includes(key));
  if (unsupportedFields.length) {
    return res.status(400).json({
      error: 'Payload contains unsupported fields.',
      unsupportedFields,
    });
  }
  const updates = Object.fromEntries(requestEntries);

  try {
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ error: 'Not found' });

    if (updates.featuredProjectIds !== undefined) {
      if (!Array.isArray(updates.featuredProjectIds) || updates.featuredProjectIds.some((projectId) => !mongoose.Types.ObjectId.isValid(projectId))) {
        return res.status(400).json({ error: 'featuredProjectIds must be an array of valid project ids.' });
      }
      updates.featuredProjectIds = [...new Set(updates.featuredProjectIds.map(String))];
    }
    if (updates.origin !== undefined && (updates.origin === null || typeof updates.origin !== 'object' || Array.isArray(updates.origin))) {
      return res.status(400).json({ error: 'origin must contain state and country fields.' });
    }
    if (updates.name !== undefined && (typeof updates.name !== 'string' || !updates.name.trim())) {
      return res.status(400).json({ error: 'Name must be a non-empty string.' });
    }

    Object.assign(user, updates);
    await user.save();
    const safeUser = await User.findById(user._id)
      .select('-googleId -__v')
      .populate({ path: 'featuredProjectIds', select: '_id projectId title description lead' });
    return res.status(200).json(safeUser);
  } catch (error) {
    console.error('Unable to update user profile:', error);
    return res.status(500).json({ error: 'Unable to update user profile.' });
  }
};

module.exports = {
  updateUser,
  getUsers,
  filterUsers,
};
