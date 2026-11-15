const express = require('express');
const passport = require('passport');
const cors = require('cors');
const session = require('express-session');

require('./src/config/env');
require('./passport');

const { corsOptions } = require('./src/config/cors');
const routes = require('./src/routes');
const { globalErrorHandler } = require('./src/middleware/errorHandler');
const { notFoundHandler } = require('./src/middleware/notFound');

const createApp = ({ sessionStore } = {}) => {
  const app = express();

  app.set('trust proxy', 1);
  app.use(express.json());
  app.use(cors(corsOptions));

  const isProduction = process.env.NODE_ENV === 'production';
  app.use(
    session({
      secret: process.env.PASSPORT_SECRET || 'airost-intranet-test-secret',
      ...(sessionStore ? { store: sessionStore } : {}),
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
  app.use(routes);
  app.use(notFoundHandler);
  app.use(globalErrorHandler);

  return app;
};

module.exports = { createApp };