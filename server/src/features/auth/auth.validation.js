const validateTestLoginPayload = (body = {}) => {
  if (!body || typeof body !== 'object' || Array.isArray(body) ||
      !body.userId || typeof body.userId !== 'string') {
    return { valid: false, message: 'userId is required' };
  }
  return { valid: true, sanitizedData: { userId: body.userId } };
};

module.exports = { validateTestLoginPayload };
