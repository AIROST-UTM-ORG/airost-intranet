const { SOCIAL_URL_REGEX } = require('../../shared/utils/validators');

const SOCIAL_HOSTS = {
  instagram: ['instagram.com', 'www.instagram.com'],
  linkedin: ['linkedin.com', 'www.linkedin.com'],
  github: ['github.com', 'www.github.com'],
};

const CANONICAL_HOSTS = {
  instagram: 'www.instagram.com',
  linkedin: 'www.linkedin.com',
  github: 'github.com',
};

const PROFILE_PATHS = {
  instagram: /^\/[a-zA-Z0-9._-]+\/?$/,
  linkedin: /^\/in\/[a-zA-Z0-9._-]+\/?$/,
  github: /^\/[a-zA-Z0-9._-]+\/?$/,
};

const isValidPhotoUrl = (value) => {
  if (typeof value !== 'string') return false;
  const url = value.trim();
  if (!url) return true;
  if (url.startsWith('data:image/')) {
    return url.length <= 2 * 1024 * 1024 && /^data:image\/(?:jpeg|png|webp);base64,[a-zA-Z0-9+/]+={0,2}$/i.test(url);
  }
  try {
    return url.length <= 2048 && ['http:', 'https:'].includes(new URL(url).protocol);
  } catch {
    return false;
  }
};

const normalizeSocialUrl = (value, network) => {
  if (typeof value !== 'string' || !SOCIAL_URL_REGEX[network] || !SOCIAL_HOSTS[network]) return null;
  const trimmed = value.trim();
  if (value.length > 300 || (trimmed && !SOCIAL_URL_REGEX[network].test(trimmed))) return null;
  if (!trimmed) return '';

  if (/^https:\/\//i.test(trimmed)) {
    let url;
    try {
      url = new URL(trimmed);
    } catch {
      return null;
    }

    if (
      !SOCIAL_HOSTS[network].includes(url.hostname.toLowerCase()) ||
      (url.port && url.port !== '443') ||
      url.username ||
      url.password ||
      !PROFILE_PATHS[network].test(url.pathname) ||
      url.search ||
      url.hash
    ) return null;

    url.hostname = CANONICAL_HOSTS[network];
    return url.href;
  }

  const handle = trimmed.replace(/^@/, '').replace(/\/$/, '');
  const path = network === 'linkedin'
    ? `/in/${encodeURIComponent(handle)}/`
    : `/${encodeURIComponent(handle)}${network === 'instagram' ? '/' : ''}`;
  return `https://${CANONICAL_HOSTS[network]}${path}`;
};

module.exports = { isValidPhotoUrl, normalizeSocialUrl };
