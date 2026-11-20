const User = require('./member.model');
const VerifiedUser = require('./verifiedUser.model');
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
const findByIdAndUpdate = (id, updates) => User.findByIdAndUpdate(id, { $set: updates }, { new: true, runValidators: true });
const findProfileById = (id) => User.findById(id).select('-googleId -__v').populate(projectProjection);
const findAllUsers = () => User.find()
  .select('_id email name photoUrl positions googleId')
  .lean();
const findAllVerifiedUsers = () => VerifiedUser.find().lean();
const findUserByEmail = (email) => User.findOne({ email });
const addPositionToUser = (id, position) => User.updateOne({ _id: id }, { $addToSet: { positions: position } });
const createUser = (user) => User.create(user);

module.exports = {
  findDirectoryUsers,
  countDirectoryUsers,
  findById,
  findByIdAndUpdate,
  findProfileById,
  findAllUsers,
  findAllVerifiedUsers,
  findUserByEmail,
  addPositionToUser,
  createUser,
};
