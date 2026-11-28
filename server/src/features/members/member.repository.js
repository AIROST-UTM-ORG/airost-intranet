const User = require('./models/member.model');
const VerifiedUser = require('./models/verifiedUser.model');
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

const findAllUsers = () => User.find().select('_id email name photoUrl positions googleId').lean();

const findAllVerifiedUsers = () => VerifiedUser.find().lean();

const findUserByEmail = (email) => User.findOne({
  email: typeof email === 'string' ? email.toLowerCase().trim() : email,
});

const addPositionToUser = (id, position) => User.updateOne({ _id: id }, { $addToSet: { positions: position } });

const createUser = (doc) => User.create(doc);

module.exports = {
  findDirectoryUsers,
  countDirectoryUsers,
  findById,
  findByIdAndUpdate,
  findAllUsers,
  findAllVerifiedUsers,
  findUserByEmail,
  addPositionToUser,
  createUser,
};
