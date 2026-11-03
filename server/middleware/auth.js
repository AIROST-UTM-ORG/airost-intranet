/**
 * Express middleware to ensure a request is authenticated.
 * Rejects unauthenticated, expired, or invalid sessions with 401 Unauthorized.
 */
const requireAuth = (req, res, next) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({
    success: false,
    message: 'Unauthorized: Session expired or invalid',
  });
};

module.exports = { requireAuth };
