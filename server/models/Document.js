const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  spaceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DocumentationSpace',
    required: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 120,
  },
  url: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2048,
  },
  provider: {
    type: String,
    enum: ['google_doc', 'google_drive', 'external_url'],
    required: true,
  },
  area: {
    type: String,
    enum: ['general', 'requirements', 'design', 'development', 'testing', 'deployment'],
    default: 'general',
    required: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  archived: {
    type: Boolean,
    default: false,
    required: true,
  },
}, { timestamps: true });

documentSchema.index({ spaceId: 1 });
documentSchema.index({ archived: 1 });
documentSchema.index({ area: 1 });
documentSchema.index({ spaceId: 1, archived: 1, area: 1 });

module.exports = mongoose.model('Document', documentSchema);
