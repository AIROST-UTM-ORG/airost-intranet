/**
 * This middleware handles 404 Not Found errors by delegating to the notFoundHandler function defined in the errorHandler module.
 */
const { NOT_FOUND } = require('../shared/constants/httpStatus');
const AppError = require('../shared/errors/AppError');

const notFoundHandler = (req, res, next) => {
  next(new AppError(NOT_FOUND, 'NOT_FOUND', `Route not found: ${req.method} ${req.originalUrl}`));
};


module.exports = { notFoundHandler };
