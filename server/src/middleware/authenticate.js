/**
 * Middleware to authenticate requests.
 * It checks if the user is authenticated by verifying the presence of a user object in the request or by calling the `isAuthenticated` method if it exists.
 * If the user is not authenticated, it throws an `AppError` with a 401 Unauthorized status.
 */

const AppError = require('../shared/errors/AppError');
const { UNAUTHORIZED } = require('../shared/constants/httpStatus');

const authenticate = (req, res, next) => {
  const authenticated = typeof req.isAuthenticated === 'function'
    ? req.isAuthenticated() && Boolean(req.user)
    : Boolean(req.user);

  if (authenticated) return next();
  return next(new AppError(UNAUTHORIZED, 'UNAUTHENTICATED', 'Authentication is required'));
};

module.exports = { authenticate, requireAuth: authenticate };
