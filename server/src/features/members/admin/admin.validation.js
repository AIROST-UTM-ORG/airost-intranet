const AppError = require('../../../shared/errors/AppError');
const { BAD_REQUEST } = require('../../../shared/constants/httpStatus');

const validateCreateVerifiedUser = (req) => {
  const body = req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new AppError(BAD_REQUEST, 'VALIDATION_ERROR', 'Request body must be an object.');
  }

  const unsupportedFields = Object.keys(body).filter((field) => !['name', 'email', 'position'].includes(field));
  if (unsupportedFields.length) {
    throw new AppError(BAD_REQUEST, 'VALIDATION_ERROR', 'Payload contains unsupported fields.', { unsupportedFields });
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const position = typeof body.position === 'string' ? body.position.trim() : '';
  if (!name || !email || !position) {
    throw new AppError(BAD_REQUEST, 'VALIDATION_ERROR', 'Name, email, and position are required.');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new AppError(BAD_REQUEST, 'VALIDATION_ERROR', 'Email must be a valid email address.');
  }

  return { sanitizedData: { name, email, position } };
};

module.exports = { validateCreateVerifiedUser };
