/**
 * Converts unmatched routes and uncaught errors into consistent API responses.
 */

const AppError = require('../shared/errors/AppError');
const { sendError } = require('../shared/utils/apiResponse');
const { BAD_REQUEST, CONFLICT, INTERNAL_SERVER_ERROR } = require('../shared/constants/httpStatus');

const globalErrorHandler = (error, req, res, next) => {
  if (res.headersSent) return next(error);

  let status = Number.isInteger(error.status) ? error.status
    : Number.isInteger(error.statusCode) ? error.statusCode : INTERNAL_SERVER_ERROR;
  let code = typeof error.code === 'string' ? error.code : undefined;
  let message = error.message;
  const details = error.details;

  if (error.name === 'ValidationError') {
    status = BAD_REQUEST;
    code = code || 'VALIDATION_ERROR';
  } else if (error.name === 'CastError') {
    status = BAD_REQUEST;
    code = code || 'INVALID_ID';
    message = `Invalid ${error.path}: ${error.value}`;
  } else if (error.code === 11000) {
    status = CONFLICT;
    code = 'DUPLICATE_KEY';
    message = 'Resource already exists';
  }

  code = code || (status === INTERNAL_SERVER_ERROR ? 'INTERNAL_SERVER_ERROR' : 'REQUEST_ERROR');
  if (status === INTERNAL_SERVER_ERROR && !(error instanceof AppError)) {
    message = 'An unexpected error occurred';
  }

  if (status >= INTERNAL_SERVER_ERROR) console.error(error);
  return sendError(res, status, code, message, details);
};

module.exports = { globalErrorHandler, errorHandler: globalErrorHandler };
