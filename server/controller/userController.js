const User = require('../models/User');
const mongoose = require('mongoose');

//update a User
const updateUser = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).json({ error: 'No such User' });
  }

  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (req.user._id.toString() !== id) {
    return res.status(403).json({ error: 'You can only update your own profile' });
  }

  const allowedFields = [
    'name',
    'photo',
    'description',
    'year',
    'course',
    'phonenum',
    'instagram',
    'profileTitle',
    'country',
    'state',
    'linkedin',
    'github',
    'featuredProject',
  ];
  const updates = {};
  for (const field of allowedFields) {
    if (Object.prototype.hasOwnProperty.call(req.body, field)) {
      updates[field] = req.body[field];
    }
  }

  if (
    Object.prototype.hasOwnProperty.call(updates, 'featuredProject') &&
    updates.featuredProject !== null &&
    (typeof updates.featuredProject !== 'object' || Array.isArray(updates.featuredProject))
  ) {
    return res.status(400).json({ error: 'Featured project must be an object or null' });
  }

  if (updates.featuredProject && typeof updates.featuredProject === 'object') {
    const projectFields = ['title', 'description', 'role', 'status', 'technologies'];
    updates.featuredProject = Object.fromEntries(
      projectFields
        .filter((field) => Object.prototype.hasOwnProperty.call(updates.featuredProject, field))
        .map((field) => [field, updates.featuredProject[field]])
    );
  }

  const user = await User.findByIdAndUpdate(
    id,
    { $set: updates },
    { new: true, runValidators: true }
  );

  if (!user) {
    return res.status(404).json({ error: 'Not found' });
  }

  res.status(200).json(user);
};

module.exports = {
  updateUser
};
