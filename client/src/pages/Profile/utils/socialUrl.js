const SOCIAL_PROFILES = {
  instagram: {
    hosts: ['instagram.com', 'www.instagram.com'],
    canonicalHost: 'www.instagram.com',
    profilePath: (handle) => `/${handle}/`,
  },
  github: {
    hosts: ['github.com', 'www.github.com'],
    canonicalHost: 'github.com',
    profilePath: (handle) => `/${handle}`,
  },
  linkedin: {
    hosts: ['linkedin.com', 'www.linkedin.com'],
    canonicalHost: 'www.linkedin.com',
    profilePath: (handle) => `/in/${handle}/`,
  },
};

const HANDLE_PATTERN = /^@?[a-zA-Z0-9._-]+$/;

export const getSocialUrl = (value, network) => {
  if (typeof value !== 'string' || !SOCIAL_PROFILES[network]) return null;

  const input = value.trim();
  if (!input) return null;
  const profile = SOCIAL_PROFILES[network];

  if (/^[a-z][a-z0-9+.-]*:/i.test(input)) {
    try {
      const url = new URL(input);
      if (
        url.protocol !== 'https:' ||
        !profile.hosts.includes(url.hostname.toLowerCase()) ||
        (url.port && url.port !== '443') ||
        url.username ||
        url.password
      ) return null;
      url.hostname = profile.canonicalHost;
      return url.href;
    } catch {
      return null;
    }
  }

  if (input.startsWith('//') || !HANDLE_PATTERN.test(input)) return null;
  const handle = input.replace(/^@/, '');
  return `https://${profile.canonicalHost}${profile.profilePath(encodeURIComponent(handle))}`;
};

export const isValidSocialInput = (value, network) => {
  if (typeof value !== 'string') return false;
  return !value.trim() || getSocialUrl(value, network) !== null;
};

export const getSocialErrors = (form) => ({
  instagramUrl: isValidSocialInput(form.instagramUrl, 'instagram')
    ? ''
    : 'Enter a Instagram ID or HTTPS link from instagram.com.',
  linkedinUrl: isValidSocialInput(form.linkedinUrl, 'linkedin')
    ? ''
    : 'Enter a LinkedIn ID or HTTPS link from linkedin.com.',
  githubUrl: isValidSocialInput(form.githubUrl, 'github')
    ? ''
    : 'Enter a GitHub ID or HTTPS link from github.com.',
});
