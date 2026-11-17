const getClientUrl = (path = '') => {
  const baseUrl = (process.env.REACT_APP_URL || '').trim().replace(/\/+$/, '');
  const cleanPath = path ? (path.startsWith('/') ? path : `/${path}`) : '';
  if (!baseUrl) return cleanPath || '/';
  return cleanPath ? `${baseUrl}${cleanPath}` : baseUrl;
};

const getSessionUser = async (user) => {
  await user.populate({ path: 'featuredProjectIds', select: '_id projectId title description lead' });
  const result = user.toObject();
  delete result.googleId;
  delete result.googleID;
  delete result.__v;
  return result;
};

const isLegacyAuthRequest = (req) => req.baseUrl === '/auth';

const clearSessionCookie = (res) => {
  const isProduction = process.env.NODE_ENV === 'production';
  res.clearCookie('connect.sid', {
    path: '/', httpOnly: true,
    secure: isProduction && process.env.COOKIE_SECURE !== 'false',
    sameSite: isProduction ? 'none' : 'lax',
  });
};

module.exports = { getClientUrl, getSessionUser, clearSessionCookie, isLegacyAuthRequest };
