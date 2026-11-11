/**
 * Middleware to validate request data using a provided validator function.
 */
const AppError = require('../shared/errors/AppError');
const { BAD_REQUEST } = require('../shared/constants/httpStatus');

const validate = (validator) => (req, res, next) => {
  try {
    const result = validator(req);
    if (result === false || result?.valid === false) {
      const message = result?.message || 'Request validation failed';
      return next(new AppError(BAD_REQUEST, 'VALIDATION_ERROR', message, result?.details));
    }
    const sanitizedData = result && typeof result === 'object' && 'sanitizedData' in result
      ? result.sanitizedData
      : result;
    if (sanitizedData !== undefined) req.sanitizedData = sanitizedData;
    return next();
  } catch (error) {
    return next(error instanceof AppError
      ? error
      : new AppError(BAD_REQUEST, 'VALIDATION_ERROR', error.message || 'Request validation failed'));
  }
};

module.exports = { validate };
