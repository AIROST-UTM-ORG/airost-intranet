const validateTestLoginPayload = (body = {}) => {
  const userId = typeof body?.userId === 'string' ? body.userId.trim() : '';
  if (!body || typeof body !== 'object' || Array.isArray(body) || !userId) {
    return { valid: false, message: 'userId is required' };
  }
  return { valid: true, sanitizedData: { userId } };
};

module.exports = { validateTestLoginPayload };
