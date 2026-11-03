/**
 * Unit tests for authentication routing and client URL resolution.
 * Verifies that empty REACT_APP_URL does not break logout redirects
 * or Google OAuth callback success/failure redirects.
 */

const express = require('express');
const request = require('supertest');
const passport = require('passport');
const authRoutes = require('../../routes/auth');

describe('Auth Client URL Resolution (getClientUrl)', () => {
  const originalEnv = process.env.REACT_APP_URL;

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.REACT_APP_URL = originalEnv;
    } else {
      delete process.env.REACT_APP_URL;
    }
  });

  test('returns "/" for root redirect when REACT_APP_URL is empty', () => {
    process.env.REACT_APP_URL = '';
    expect(authRoutes.getClientUrl()).toBe('/');
  });

  test('returns "/" for root redirect when REACT_APP_URL is undefined', () => {
    delete process.env.REACT_APP_URL;
    expect(authRoutes.getClientUrl()).toBe('/');
  });

  test('returns "/" when REACT_APP_URL is whitespace only', () => {
    process.env.REACT_APP_URL = '   ';
    expect(authRoutes.getClientUrl()).toBe('/');
  });

  test('returns relative path when REACT_APP_URL is empty', () => {
    process.env.REACT_APP_URL = '';
    expect(authRoutes.getClientUrl('/login')).toBe('/login');
    expect(authRoutes.getClientUrl('login')).toBe('/login');
  });

  test('returns absolute URL when REACT_APP_URL is configured without trailing slash', () => {
    process.env.REACT_APP_URL = 'http://localhost:3000';
    expect(authRoutes.getClientUrl()).toBe('http://localhost:3000');
    expect(authRoutes.getClientUrl('/login')).toBe('http://localhost:3000/login');
  });

  test('strips trailing slash from REACT_APP_URL cleanly', () => {
    process.env.REACT_APP_URL = 'http://localhost:3000/';
    expect(authRoutes.getClientUrl()).toBe('http://localhost:3000');
    expect(authRoutes.getClientUrl('/login')).toBe('http://localhost:3000/login');
  });
});

describe('GET /logout redirection behavior', () => {
  const originalEnv = process.env.REACT_APP_URL;
  let testApp;

  beforeEach(() => {
    testApp = express();
    // Dummy session & logout middleware for unit testing logout redirect
    testApp.use((req, res, next) => {
      req.logout = (cb) => cb(null);
      req.session = {
        destroy: (cb) => cb(null),
      };
      next();
    });
    testApp.use('/auth', authRoutes);
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.REACT_APP_URL = originalEnv;
    } else {
      delete process.env.REACT_APP_URL;
    }
  });

  test('redirects to relative "/login" when REACT_APP_URL is empty', async () => {
    process.env.REACT_APP_URL = '';
    const res = await request(testApp).get('/auth/logout');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/login');
  });

  test('redirects to absolute login URL when REACT_APP_URL is set', async () => {
    process.env.REACT_APP_URL = 'http://localhost:3000';
    const res = await request(testApp).get('/auth/logout');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('http://localhost:3000/login');
  });
});

describe('GET /google/callback options validation', () => {
  const originalEnv = process.env.REACT_APP_URL;
  let authenticateSpy;

  beforeEach(() => {
    authenticateSpy = jest.spyOn(passport, 'authenticate').mockImplementation((strategy, options) => {
      return (req, res, next) => {
        res.status(200).json({ strategy, options });
      };
    });
  });

  afterEach(() => {
    authenticateSpy.mockRestore();
    if (originalEnv !== undefined) {
      process.env.REACT_APP_URL = originalEnv;
    } else {
      delete process.env.REACT_APP_URL;
    }
  });

  test('provides "/" as successRedirect and "/login" as failureRedirect when REACT_APP_URL is empty', async () => {
    process.env.REACT_APP_URL = '';
    const testApp = express();
    testApp.use('/auth', authRoutes);

    const res = await request(testApp).get('/auth/google/callback');
    expect(res.status).toBe(200);
    expect(res.body.strategy).toBe('google');
    expect(res.body.options).toEqual({
      successRedirect: '/',
      failureRedirect: '/login',
      failureFlash: true,
    });
  });

  test('provides configured domain in redirects when REACT_APP_URL is set', async () => {
    process.env.REACT_APP_URL = 'http://localhost:3000';
    const testApp = express();
    testApp.use('/auth', authRoutes);

    const res = await request(testApp).get('/auth/google/callback');
    expect(res.status).toBe(200);
    expect(res.body.strategy).toBe('google');
    expect(res.body.options).toEqual({
      successRedirect: 'http://localhost:3000',
      failureRedirect: 'http://localhost:3000/login',
      failureFlash: true,
    });
  });
});
