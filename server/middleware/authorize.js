/**
 * Middleware to authorize users based on their roles.
 */

const AppError = require('../shared/errors/AppError');
const { FORBIDDEN } = require('../shared/constants/httpStatus');
const { PLATFORM_ROLES } = require('../shared/constants/roles');

const getUserRoles = (user) => [user?.role, user?.platformRole].filter(Boolean);

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) {
    return next(new AppError(FORBIDDEN, 'FORBIDDEN', 'You do not have permission to perform this action'));
  }
  if (roles.some((role) => getUserRoles(req.user).includes(role))) return next();
  return next(new AppError(FORBIDDEN, 'FORBIDDEN', 'You do not have permission to perform this action'));
};

const requireAdmin = requireRole(PLATFORM_ROLES.ADMIN);

module.exports = { requireRole, requireAdmin };
