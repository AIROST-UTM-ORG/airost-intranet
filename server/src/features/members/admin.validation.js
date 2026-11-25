const AppError = require('../../shared/errors/AppError');
const { BAD_REQUEST } = require('../../shared/constants/httpStatus');

const EMAIL_REGEX = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/;
const ALLOWED_KEYS = ['name', 'email', 'position'];

const invalid = (message, details) => {
  throw new AppError(BAD_REQUEST, 'VALIDATION_ERROR', message, details);
};

const validateCreateVerifiedUser = (req) => {
  const body = req?.body;

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    invalid('Request body must be an object.');
  }

  const extraKeys = Object.keys(body).filter((key) => !ALLOWED_KEYS.includes(key));
  if (extraKeys.length > 0) {
    invalid('Payload contains unsupported fields.', { unsupportedFields: extraKeys });
  }

  const { name, email, position } = body;

  if (typeof name !== 'string' || !name.trim() || name.trim().length > 100) {
    invalid('Name must be a non-empty string under 100 characters.');
  }

  if (typeof email !== 'string' || !email.trim() || !EMAIL_REGEX.test(email.trim())) {
    invalid('Email must be a valid email address.');
  }

  if (typeof position !== 'string' || !position.trim() || position.trim().length > 80) {
    invalid('Position must be a non-empty string under 80 characters.');
  }

  return {
    sanitizedData: {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      position: position.trim(),
    },
  };
};

module.exports = {
  validateCreateVerifiedUser,
};
