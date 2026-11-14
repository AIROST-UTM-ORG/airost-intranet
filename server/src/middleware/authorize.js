/**
 * Middleware to authorize users based on their roles.
 */

const AppError = require('../shared/errors/AppError');
const { UNAUTHORIZED, FORBIDDEN } = require('../shared/constants/httpStatus');
const { PLATFORM_ROLES } = require('../shared/constants/roles');

const getUserRoles = (user) => {
  if (!user) return [];
  const positions = Array.isArray(user.positions)
    ? user.positions
    : [user.positions || user.position].filter(Boolean);
  return [user.role, user.platformRole, ...positions]
    .filter((role) => typeof role === 'string')
    .map((role) => role.trim().toLowerCase());
};

const requireRole = (...roles) => {
  const targetRoles = roles.flat().filter(Boolean).map((role) => String(role).trim().toLowerCase());
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError(UNAUTHORIZED, 'UNAUTHENTICATED', 'Authentication is required'));
    }
    const userRoles = getUserRoles(req.user);
    const hasRole = targetRoles.some((role) =>
      userRoles.some((userRole) => userRole === role || userRole.includes(role))
    );
    if (hasRole) return next();
    return next(new AppError(FORBIDDEN, 'FORBIDDEN', 'You do not have permission to perform this action'));
  };
};

const requireAdmin = requireRole(PLATFORM_ROLES.ADMIN);

module.exports = { requireRole, requireAdmin };
