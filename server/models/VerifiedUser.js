const mongoose = require('mongoose');

const verifiedUserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  position: {
    type: Array,
    required: true,
  },
});

// Retained as a legacy reference for the admin migration.
module.exports = mongoose.models.VerifiedUser || mongoose.model('VerifiedUser', verifiedUserSchema);
