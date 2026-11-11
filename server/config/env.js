/**
 * This file is used to validate the environment variables required for the application to run in production.
 */
require('dotenv').config();

const validateEnv = (env = process.env) => {
  if (env.NODE_ENV !== 'production') return [];

  const missing = [];
  if (!(env.MONGODB_URI || env.MONGO_URI)) missing.push('MONGODB_URI (or MONGO_URI)');
  for (const key of ['PASSPORT_SECRET', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET']) {
    if (!env[key]) missing.push(key);
  }
  if (missing.length) {
    throw new Error(`Missing required production environment variables: ${missing.join(', ')}`);
  }
  return [];
};

validateEnv();

module.exports = { validateEnv };
