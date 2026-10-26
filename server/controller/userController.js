const mongoose = require('mongoose');
const userService = require('../services/userService');

// Return all users from the canonical User collection using the directory-safe fields.
const getUsers = async (req, res) => {
  try {
    const users = await userService.getAllUsers();
    return res.json(users);
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

    const users = await userService.getFilteredUsers({ search, role, year, page, limit });
    return res.json(users);
  } catch (error) {
    console.error('Unable to filter member directory:', error);
    return res.status(500).json({ error: 'Unable to filter member directory.' });
  }
};

// Update a User profile
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

  if (updates.featuredProjectIds !== undefined) {
    if (!Array.isArray(updates.featuredProjectIds) || updates.featuredProjectIds.some((projectId) => !mongoose.Types.ObjectId.isValid(projectId))) {
      return res.status(400).json({ error: 'featuredProjectIds must be an array of valid project ids.' });
    }
    updates.featuredProjectIds = [...new Set(updates.featuredProjectIds.map(String))];
  }
  if (
    updates.origin !== undefined &&
    (updates.origin === null ||
      typeof updates.origin !== 'object' ||
      Array.isArray(updates.origin) ||
      (updates.origin.state !== undefined && (typeof updates.origin.state !== 'string' || updates.origin.state.length > 100)) ||
      (updates.origin.country !== undefined && (typeof updates.origin.country !== 'string' || updates.origin.country.length > 100)))
  ) {
    return res.status(400).json({ error: 'origin must contain state and country fields.' });
  }
  if (updates.name !== undefined && (typeof updates.name !== 'string' || !updates.name.trim() || updates.name.trim().length > 100)) {
    return res.status(400).json({ error: 'Name must be a non-empty string.' });
  }
  if (updates.year !== undefined && (typeof updates.year !== 'string' || updates.year.length > 50)) {
    return res.status(400).json({ error: 'Year must be a string under 50 characters.' });
  }
  if (updates.course !== undefined && (typeof updates.course !== 'string' || updates.course.length > 120)) {
    return res.status(400).json({ error: 'Course must be a string under 120 characters.' });
  }
  if (updates.description !== undefined && (typeof updates.description !== 'string' || updates.description.length > 1000)) {
    return res.status(400).json({ error: 'Description must be a string under 1000 characters.' });
  }
  if (updates.photoUrl !== undefined) {
    if (!userService.isValidPhotoUrl(updates.photoUrl)) {
      return res.status(400).json({ error: 'photoUrl must be a valid HTTP/HTTPS URL or supported image data URI.' });
    }
    updates.photoUrl = updates.photoUrl.trim();
  }
  for (const socialField of ['instagramUrl', 'linkedinUrl', 'githubUrl']) {
    if (updates[socialField] !== undefined) {
      const normalizedUrl = userService.normalizeSocialUrl(updates[socialField], socialField.replace('Url', ''));
      if (normalizedUrl === null) {
        return res.status(400).json({
          error: `${socialField} must be an HTTPS profile URL for the correct platform or a valid handle.`,
        });
      }
      updates[socialField] = normalizedUrl;
    }
  }

  try {
    const updatedUser = await userService.updateUser(id, updates);
    if (!updatedUser) {
      return res.status(404).json({ error: 'Not found' });
    }
    return res.status(200).json(updatedUser);
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
