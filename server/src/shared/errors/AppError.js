/**
 * Defines the standard operational error shape used throughout the API.
 */
class AppError extends Error {
  constructor(status, code, message, details = null, isOperational = true) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.statusCode = status;
    this.code = code;
    this.details = details;
    this.isOperational = isOperational;
    Error.captureStackTrace?.(this, this.constructor);
  }
}

module.exports = AppError;
