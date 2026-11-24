const AppError = require('../../shared/errors/AppError');
const { BAD_REQUEST } = require('../../shared/constants/httpStatus');
const { isValidDate } = require('../../shared/utils/dateUtils');

const isValidDateInput = (value) => {
  if (!value) return false;
  if (typeof value === 'string' || value instanceof Date) {
    return isValidDate(value);
  }
  if (typeof value === 'object' && !Array.isArray(value)) {
    const dateVal = value.dateTime || value.date;
    return Boolean(dateVal && isValidDate(dateVal));
  }
  return false;
};

const validateAddEvent = (req) => {
  if (!req || typeof req !== 'object') {
    throw new AppError(BAD_REQUEST, 'VALIDATION_ERROR', 'Request body is required');
  }
  const body = 'body' in req ? req.body : req;
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new AppError(BAD_REQUEST, 'VALIDATION_ERROR', 'Request body is required');
  }

  const { summary, start, end, description, location } = body;

  if (typeof summary !== 'string' || !summary.trim()) {
    throw new AppError(BAD_REQUEST, 'VALIDATION_ERROR', 'Summary is required and must be a non-empty string');
  }

  if (!isValidDateInput(start)) {
    throw new AppError(BAD_REQUEST, 'VALIDATION_ERROR', 'Start date is required and must be a valid date');
  }

  if (!isValidDateInput(end)) {
    throw new AppError(BAD_REQUEST, 'VALIDATION_ERROR', 'End date is required and must be a valid date');
  }

  return {
    sanitizedData: {
      summary: summary.trim(),
      start,
      end,
      description: typeof description === 'string' ? description.trim() : description,
      location: typeof location === 'string' ? location.trim() : location,
    },
  };
};

module.exports = {
  validateAddEvent,
};
