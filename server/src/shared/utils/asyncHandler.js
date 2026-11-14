/**
 * Wraps an async route handler to catch any errors and pass them to the next middleware.
 */
module.exports = (handler) => (req, res, next) =>
  Promise.resolve().then(() => handler(req, res, next)).catch(next);
