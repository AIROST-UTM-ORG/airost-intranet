/**
 * Converts unmatched routes and uncaught errors into consistent API responses.
 */

const AppError = require('../shared/errors/AppError');
const { sendError } = require('../shared/utils/apiResponse');
const { NOT_FOUND, INTERNAL_SERVER_ERROR } = require('../shared/constants/httpStatus');

const globalErrorHandler = (error, req, res, next) => {
  if (res.headersSent) return next(error);

  const status = Number.isInteger(error.status) ? error.status
    : Number.isInteger(error.statusCode) ? error.statusCode : INTERNAL_SERVER_ERROR;
  const code = error.code || (status === INTERNAL_SERVER_ERROR ? 'INTERNAL_SERVER_ERROR' : 'REQUEST_ERROR');
  const message = status === INTERNAL_SERVER_ERROR && !(error instanceof AppError)
    ? 'An unexpected error occurred'
    : error.message;

  if (status >= INTERNAL_SERVER_ERROR) console.error(error);
  return sendError(res, status, code, message, error.details);
};

module.exports = { globalErrorHandler, errorHandler: globalErrorHandler };
