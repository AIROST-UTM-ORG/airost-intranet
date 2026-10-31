/**
 * MongoDB Memory Server setup for isolated tests.
 * Never connects to the production database.
 */
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

let mongoServer;
let testDbPath;

/**
 * Start an in-memory MongoDB instance and connect mongoose to it.
 */
const connect = async () => {
  mongoose.set('strictQuery', false);
  testDbPath = path.resolve(__dirname, '../../node_modules/.cache/mongodb-memory-server/test-data');
  fs.rmSync(testDbPath, { recursive: true, force: true });
  fs.mkdirSync(testDbPath, { recursive: true });
  mongoServer = await MongoMemoryServer.create({ instance: { dbPath: testDbPath } });
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
  fs.rmSync(testDbPath, { recursive: true, force: true });
};

module.exports = { connect, clearDatabase, closeDatabase };
