const User = require('./member.model');
const projectProjection = { path: 'featuredProjectIds', select: '_id projectId title description lead' };

const findDirectoryUsers = (filter, { skip, limit }) => User.find(filter)
  .select('_id email name photoUrl positions year course origin description instagramUrl linkedinUrl githubUrl featuredProjectIds googleId isActive')
  .populate(projectProjection)
  .sort({ name: 1 })
  .skip(skip)
  .limit(limit)
  .lean();

const countDirectoryUsers = (filter) => User.countDocuments(filter);
const findById = (id) => User.findById(id);
const buildProfileUpdate = (updates) => Object.entries(updates).reduce((set, [field, value]) => {
  if (field === 'origin' && value && typeof value === 'object' && !Array.isArray(value)) {
    for (const [originField, originValue] of Object.entries(value)) {
      if (originField === 'state' || originField === 'country') set[`origin.${originField}`] = originValue;
    }
    return set;
  }

  set[field] = value;
  return set;
}, {});

const findByIdAndUpdate = (id, updates) => User.findByIdAndUpdate(
  id,
  { $set: buildProfileUpdate(updates) },
  { new: true, runValidators: true },
).populate(projectProjection);
const findProfileById = (id) => User.findById(id).select('-googleId -__v').populate(projectProjection);

module.exports = { findDirectoryUsers, countDirectoryUsers, findById, findByIdAndUpdate, findProfileById };
