/**
 * Connect to the MongoDB database using Mongoose.
 */
const mongoose = require('mongoose');

const connectDatabase = async (uri = process.env.MONGODB_URI || process.env.MONGO_URI) => {
  if (!uri) throw new Error('MONGODB_URI is not configured');
  return mongoose.connect(uri);
};

module.exports = { connectDatabase };
