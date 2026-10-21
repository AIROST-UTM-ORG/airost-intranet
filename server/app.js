/**
 * app.js — Express application factory (no listen call).
 *
 * Extracted from server.js so that Supertest can import the app
 * without binding to a port and without touching the production database.
 *
 * NOTE: This file does NOT call connectDatabase() and does NOT call
 * app.listen(). Both are the responsibility of server.js (production entry)
 * and of the test setup respectively.
 */
const express = require('express');
const passport = require('passport');
const cors = require('cors');
const session = require('express-session');

// Passport strategy registration (safe to require; it won't connect to Google
// unless a real OAuth redirect is triggered)
require('./passport');

const authRoutes = require('./routes/auth');
const DocRoutes = require('./routes/docRoutes');
const adminRoutes = require('./routes/adminRoutes');
const userRoutes = require('./routes/userRoutes');
const eventRoutes = require('./routes/eventRoutes');
const projectRoutes = require('./routes/projectsRoutes');

const createApp = () => {
  const app = express();

  app.set('trust proxy', 1);
  app.use(express.json());

  const allowedOrigins = [
    process.env.REACT_APP_URL,
    'http://localhost:3000',
    'http://localhost:1234',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:1234',
  ].filter(Boolean);

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (
          allowedOrigins.includes(origin) ||
          /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
        ) {
          return callback(null, true);
        }
        return callback(new Error(`Origin ${origin} not allowed by CORS`));
      },
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      credentials: true,
      exposedHeaders: ['set-cookie'],
    })
  );

  const isProduction = process.env.NODE_ENV === 'production';
  app.use(
    session({
      secret: process.env.PASSPORT_SECRET || 'airost-intranet-test-secret',
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: isProduction && process.env.COOKIE_SECURE !== 'false',
        sameSite: isProduction ? 'none' : 'lax',
      },
      proxy: isProduction,
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());

  app.use('/auth', authRoutes);
  app.use('/api/auth', authRoutes);

  // Dedicated API namespace
  app.use('/api/airost/doc', DocRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/user', userRoutes);
  app.use('/api/projects', projectRoutes);
  app.use('/api/calendar', eventRoutes);

  // Legacy root mounts for backward compatibility
  app.use('/airost/doc', DocRoutes);
  app.use('/admin', adminRoutes);
  app.use('/user', userRoutes);
  app.use('/projects', projectRoutes);
  app.use('/calendar', eventRoutes);

  return app;
};

module.exports = { createApp };
