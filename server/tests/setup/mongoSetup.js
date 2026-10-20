/**
 * MongoDB Memory Server setup for isolated tests.
 * Never connects to the production database.
 */
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let mongoServer;

/**
 * Start an in-memory MongoDB instance and connect mongoose to it.
 */
const connect = async () => {
  mongoose.set('strictQuery', false);
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
};

/**
 * Clear all collections between tests.
 */
const clearDatabase = async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
};

/**
 * Stop the in-memory server and close the mongoose connection.
 */
const closeDatabase = async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongoServer.stop();
};

module.exports = { connect, clearDatabase, closeDatabase };
