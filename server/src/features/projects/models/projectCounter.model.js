const mongoose = require('mongoose');

const projectCounterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  sequence: { type: Number, required: true, min: 0 },
});

module.exports = mongoose.models.ProjectCounter
  || mongoose.model('ProjectCounter', projectCounterSchema);
