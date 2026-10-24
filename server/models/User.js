const mongoose = require('mongoose');

const originSchema = new mongoose.Schema({
  state: { type: String, default: '' },
  country: { type: String, default: '' },
}, { _id: false });

const userSchema = new mongoose.Schema({
  googleId: { type: String, unique: true, sparse: true, trim: true },
  email: { type: String, trim: true, lowercase: true },
  name: { type: String, required: true, trim: true },
  photoUrl: { type: String, default: '' },
  positions: { type: [String], default: [] },
  year: { type: String, default: '' },
  course: { type: String, default: '' },
  origin: { type: originSchema, default: () => ({}) },
  description: { type: String, default: '' },
  linkedinUrl: { type: String, default: '' },
  githubUrl: { type: String, default: '' },
  instagramUrl: { type: String, default: '' },
  featuredProjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', default: null },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
