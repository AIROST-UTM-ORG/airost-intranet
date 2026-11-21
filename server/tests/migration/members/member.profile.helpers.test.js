const { isValidPhotoUrl, normalizeSocialUrl } = require('../../../src/features/members/member.profile.helpers');

describe('member profile URL helpers', () => {
  test.each([
    ['https://example.com/avatar.png', true],
    [' data:image/png;base64,Zm9v ', true],
    ['', true],
    ['javascript:alert(1)', false],
    ['data:image/svg+xml;base64,PHN2Zz4=', false],
    [null, false],
  ])('validates photo URL %j', (value, expected) => {
    expect(isValidPhotoUrl(value)).toBe(expected);
  });

  test.each([
    ['@ada', 'instagram', 'https://www.instagram.com/ada/'],
    ['https://github.com/ada', 'github', 'https://github.com/ada'],
    ['HTTPS://GITHUB.COM/ada', 'github', 'https://github.com/ada'],
    ['https://linkedin.com/in/ada', 'linkedin', 'https://www.linkedin.com/in/ada'],
    ['', 'github', ''],
  ])('normalizes valid %s %s URL', (value, network, expected) => {
    expect(normalizeSocialUrl(value, network)).toBe(expected);
  });

  test.each([
    ['https://github.com/ada/settings', 'github'],
    ['https://linkedin.com/company/ada', 'linkedin'],
    ['http://instagram.com/ada', 'instagram'],
    ['https://instagram.com/ada?tab=posts', 'instagram'],
    ['@ada', 'unknown'],
    [null, 'github'],
  ])('rejects invalid %s %s URL', (value, network) => {
    expect(normalizeSocialUrl(value, network)).toBeNull();
  });
});
