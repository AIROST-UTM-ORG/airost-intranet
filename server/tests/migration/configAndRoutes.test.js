/** Regression coverage for migrated server configuration and route assembly. */

const mongoose = require('mongoose');
const { connectDatabase } = require('../../src/config/database');
const { validateEnv } = require('../../src/config/env');
const { corsOptions } = require('../../src/config/cors');
const router = require('../../src/routes');

describe('database configuration', () => {
  afterEach(() => jest.restoreAllMocks());

  test('connects using the supplied URI and returns the Mongoose result', async () => {
    const result = { connection: 'connected' };
    const connect = jest.spyOn(mongoose, 'connect').mockResolvedValue(result);
    await expect(connectDatabase('mongodb://example/test')).resolves.toBe(result);
    expect(connect).toHaveBeenCalledWith('mongodb://example/test');
  });

  test('uses either supported environment URI and rejects missing configuration', async () => {
    const previousMongo = process.env.MONGODB_URI;
    const previousLegacy = process.env.MONGO_URI;
    const connect = jest.spyOn(mongoose, 'connect').mockResolvedValue({});
    try {
      process.env.MONGODB_URI = '';
      process.env.MONGO_URI = 'mongodb://legacy/test';
      await connectDatabase();
      expect(connect).toHaveBeenCalledWith('mongodb://legacy/test');

      process.env.MONGODB_URI = '';
      process.env.MONGO_URI = '';
      await expect(connectDatabase()).rejects.toThrow('MONGODB_URI is not configured');
    } finally {
      if (previousMongo === undefined) delete process.env.MONGODB_URI;
      else process.env.MONGODB_URI = previousMongo;
      if (previousLegacy === undefined) delete process.env.MONGO_URI;
      else process.env.MONGO_URI = previousLegacy;
    }
  });
});

describe('environment validation', () => {
  test('skips production-only checks outside production', () => {
    expect(validateEnv({ NODE_ENV: 'test' })).toEqual([]);
    expect(validateEnv({ NODE_ENV: 'development' })).toEqual([]);
  });

  test('reports all missing production credentials in one error', () => {
    expect(() => validateEnv({ NODE_ENV: 'production' })).toThrow(
      'Missing required production environment variables: MONGODB_URI (or MONGO_URI), PASSPORT_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET'
    );
  });

  test('accepts either database URI name when the remaining credentials exist', () => {
    expect(validateEnv({
      NODE_ENV: 'production',
      MONGO_URI: 'mongodb://example/test',
      PASSPORT_SECRET: 'secret',
      GOOGLE_CLIENT_ID: 'client-id',
      GOOGLE_CLIENT_SECRET: 'client-secret',
    })).toEqual([]);
  });
});

describe('CORS origin policy', () => {
  const checkOrigin = (origin) => new Promise((resolve, reject) => {
    corsOptions.origin(origin, (error, allowed) => (error ? reject(error) : resolve(allowed)));
  });

  test.each([undefined, 'http://localhost:3000', 'http://127.0.0.1:4567'])('allows local or absent origin %s', async (origin) => {
    await expect(checkOrigin(origin)).resolves.toBe(true);
  });

  test('rejects an unconfigured external origin', async () => {
    await expect(checkOrigin('https://attacker.example')).rejects.toThrow(
      'Origin https://attacker.example not allowed by CORS'
    );
  });

  test('keeps credentials enabled and exposes the expected methods and headers', () => {
    expect(corsOptions.credentials).toBe(true);
    expect(corsOptions.methods).toEqual(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']);
    expect(corsOptions.exposedHeaders).toContain('set-cookie');
  });
});

describe('shared route assembly', () => {
  test('mounts canonical paths and legacy aliases', () => {
    const mounts = router.stack
      .filter((layer) => layer.name === 'router' && layer.regexp)
      .map((layer) => layer.regexp);

    for (const path of [
      '/api/auth', '/api/airost/doc', '/api/admin', '/api/user', '/api/projects', '/api/calendar',
      '/auth', '/airost/doc', '/doc', '/admin', '/user', '/projects', '/calendar',
    ]) {
      expect(mounts.some((regexp) => regexp.test(path))).toBe(true);
    }
  });
});
