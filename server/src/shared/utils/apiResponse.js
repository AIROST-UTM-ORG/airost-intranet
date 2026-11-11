/**
 * Builds consistent success and error JSON responses for API handlers.
 */
const sendSuccess = (res, data, status = 200, meta) => {
  const payload = { success: true, data };
  if (meta !== undefined) payload.meta = meta;
  return res.status(status).json(payload);
};

const sendError = (res, status, code, message, details) => {
  const error = { code, message };
  if (details !== undefined && details !== null) error.details = details;
  return res.status(status).json({ success: false, error });
};

module.exports = { sendSuccess, sendError };
