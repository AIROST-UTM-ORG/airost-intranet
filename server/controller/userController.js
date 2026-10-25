const User = require('../models/User');
const mongoose = require('mongoose');

// Return the public directory projection from the canonical User collection.
const getUsers = async (req, res) => {
  try {
    const users = await User.find({ isActive: true })
      .select('_id email name photoUrl positions year course origin description instagramUrl linkedinUrl githubUrl featuredProjectIds googleId isActive')
      .populate({ path: 'featuredProjectIds', select: '_id projectId title description lead' })
      .sort({ name: 1 })
      .lean();

    return res.json(users.map(({ googleId, isActive, ...user }) => ({
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
    })));
  } catch (error) {
    console.error('Unable to fetch member directory:', error);
    return res.status(500).json({ error: 'Unable to fetch member directory.' });
  }
}

//update a User
const updateUser = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).json({ error: 'No such User' });
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
    if (updates.origin && (typeof updates.origin !== 'object' || Array.isArray(updates.origin))) {
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
  getUsers
};
