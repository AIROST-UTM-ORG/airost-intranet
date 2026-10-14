/**
 * Global setup — runs once before all test suites.
 * Sets environment variables from .env.test so that no real credentials
 * from .env are accidentally loaded during tests.
 */
const path = require('path');
const fs = require('fs');

module.exports = async () => {
  const envTestPath = path.resolve(__dirname, '../../.env.test');

  if (fs.existsSync(envTestPath)) {
    const lines = fs.readFileSync(envTestPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const value = trimmed.slice(eqIdx + 1).trim();
      // Only set if not already defined (allows CI to override via real env vars)
      if (!(key in process.env)) {
        process.env[key] = value;
      }
    }
  }

  // Explicitly ensure we never accidentally connect to production
  process.env.MONGODB_URI = '';
  process.env.MONGO_URI = '';
  process.env.NODE_ENV = 'test';
  if (!process.env.CREDENTIALS) {
    process.env.CREDENTIALS = '{}';
  }
};
