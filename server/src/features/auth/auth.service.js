const AppError = require('../../shared/errors/AppError');
const { INTERNAL_SERVER_ERROR } = require('../../shared/constants/httpStatus');

const getClientUrl = (path = '') => {
  const baseUrl = (process.env.REACT_APP_URL || '').trim().replace(/\/+$/, '');
  const cleanPath = path ? (path.startsWith('/') ? path : `/${path}`) : '';
  if (!baseUrl) return cleanPath || '/';
  return cleanPath ? `${baseUrl}${cleanPath}` : baseUrl;
};

const getSessionUser = async (user) => {
  await user.populate({ path: 'featuredProjectIds', select: '_id projectId title description lead' });
  const result = user.toObject();
  delete result.googleId;
  delete result.__v;
  return result;
};

const isLegacyAuthRequest = (req) => req.baseUrl === '/auth';

const logoutSession = async (req) => {
  const failures = [];
  const passportLogoutAvailable = typeof req.logout === 'function';
  let passportLogoutCompleted = !passportLogoutAvailable;
  const sessionPresent = Boolean(req.session);
  let sessionLogoutPersisted = null;
  let sessionDestroyed = sessionPresent ? false : null;

  if (passportLogoutAvailable) {
    try {
      if (req.logout.length > 0) {
        await new Promise((resolve, reject) => {
          req.logout((error) => error ? reject(error) : resolve());
        });
      } else {
        req.logout();
      }
      passportLogoutCompleted = true;
    } catch (error) {
      failures.push(error);
    }
  }

  if (req.session) {
    if (
      passportLogoutAvailable
      && passportLogoutCompleted
      && req.session.passport
      && typeof req.session.save === 'function'
    ) {
      try {
        await new Promise((resolve, reject) => {
          req.session.save((error) => error ? reject(error) : resolve());
        });
        sessionLogoutPersisted = true;
      } catch (error) {
        failures.push(error);
      }
    }

    try {
      await new Promise((resolve, reject) => {
        req.session.destroy((error) => error ? reject(error) : resolve());
      });
      sessionDestroyed = true;
    } catch (error) {
      failures.push(error);
    }
  }

  if (failures.length) {
    const error = new AppError(
      INTERNAL_SERVER_ERROR,
      'LOGOUT_FAILED',
      'Logout could not be completed fully',
      { passportLogoutCompleted, sessionPresent, sessionLogoutPersisted, sessionDestroyed }
    );
    error.cause = failures.length === 1
      ? failures[0]
      : new AggregateError(failures, 'Multiple logout operations failed');
    throw error;
  }
};

const clearSessionCookie = (res) => {
  const isProduction = process.env.NODE_ENV === 'production';
  res.clearCookie('connect.sid', {
    path: '/', httpOnly: true,
    secure: isProduction && process.env.COOKIE_SECURE !== 'false',
    sameSite: isProduction ? 'none' : 'lax',
  });
};

module.exports = { getClientUrl, getSessionUser, logoutSession, clearSessionCookie, isLegacyAuthRequest };
