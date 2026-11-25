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

const parseDateValue = (value, isEnd = false) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'string') {
    if (isEnd && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
      return new Date(`${value.trim()}T23:59:59.999Z`);
    }
    return new Date(value);
  }
  if (typeof value === 'object' && !Array.isArray(value)) {
    if (value.dateTime) return new Date(value.dateTime);
    if (value.date) {
      if (isEnd && /^\d{4}-\d{2}-\d{2}$/.test(String(value.date).trim())) {
        return new Date(`${String(value.date).trim()}T23:59:59.999Z`);
      }
      return new Date(value.date);
    }
  }
  return null;
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

  const startDate = parseDateValue(start, false);
  const endDate = parseDateValue(end, true);
  if (startDate && endDate && startDate > endDate) {
    throw new AppError(BAD_REQUEST, 'VALIDATION_ERROR', 'End date must be greater than or equal to start date');
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
