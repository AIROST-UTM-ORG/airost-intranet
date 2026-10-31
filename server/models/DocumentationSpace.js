const mongoose = require('mongoose');

const documentationSpaceSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 120,
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000,
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    default: null,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  accessType: {
    type: String,
    enum: ['all', 'project_members', 'selected'],
    required: true,
    default: 'all',
  },
  updateType: {
    type: String,
    enum: ['all', 'project_members', 'selected'],
    required: true,
    default: 'selected',
  },
  accessMembers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  updateMembers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
}, { timestamps: true });

documentationSpaceSchema.index({ projectId: 1 });
documentationSpaceSchema.index({ createdBy: 1 });

module.exports = mongoose.model('DocumentationSpace', documentationSpaceSchema);
