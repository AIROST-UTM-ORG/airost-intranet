const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  projectId: {
    type: Number,
    required: true,
  },
  title: String,
  description: String,
  lead: String,
}, { timestamps: true });

module.exports = mongoose.models.Project || mongoose.model('Project', projectSchema);
