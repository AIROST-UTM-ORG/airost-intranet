const passport = require('passport');
const asyncHandler = require('../../shared/utils/asyncHandler');
const AppError = require('../../shared/errors/AppError');
const { sendSuccess, sendError } = require('../../shared/utils/apiResponse');
const { OK, UNAUTHORIZED } = require('../../shared/constants/httpStatus');
const { getClientUrl, getSessionUser, clearSessionCookie, isLegacyAuthRequest } = require('./auth.service');

const loginSuccess = asyncHandler(async (req, res) => {
  if (!req.user) {
    if (isLegacyAuthRequest(req)) return res.status(UNAUTHORIZED).json({ success: false, message: 'User not authenticated' });
    throw new AppError(UNAUTHORIZED, 'UNAUTHENTICATED', 'User not authenticated');
  }
  const user = await getSessionUser(req.user);
  if (isLegacyAuthRequest(req)) return res.status(OK).json({ success: true, message: 'Successfully authenticated', user });
  return sendSuccess(res, { user }, OK);
});

const loginFailed = asyncHandler(async (req, res) => isLegacyAuthRequest(req)
  ? res.status(UNAUTHORIZED).json({ success: false, message: 'Authentication failed' })
  : sendError(res, UNAUTHORIZED, 'AUTH_FAILED', 'Authentication failed'));

const logout = asyncHandler(async (req, res) => {
  if (typeof req.logout === 'function') {
    await new Promise((resolve, reject) => {
      if (req.logout.length > 0) req.logout((error) => error ? reject(error) : resolve());
      else { req.logout(); resolve(); }
    });
  }
  if (req.session) {
    await new Promise((resolve, reject) => req.session.destroy((error) => error ? reject(error) : resolve()));
  }
  clearSessionCookie(res);
  if (req.accepts('json') && !req.accepts('html')) {
    if (isLegacyAuthRequest(req)) return res.status(OK).json({ success: true, message: 'Successfully logged out' });
    return sendSuccess(res, { message: 'Successfully logged out' }, OK);
  }
  return res.redirect(getClientUrl('/login'));
});

const startGoogleAuth = asyncHandler((req, res, next) =>
  passport.authenticate('google', { scope: ['profile', 'email'], prompt: 'select_account' })(req, res, next));

const finishGoogleAuth = asyncHandler((req, res, next) =>
  passport.authenticate('google', {
    successRedirect: getClientUrl(), failureRedirect: getClientUrl('/login'), failureFlash: true,
  })(req, res, next));

module.exports = { loginSuccess, loginFailed, logout, startGoogleAuth, finishGoogleAuth };
