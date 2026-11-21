const { formatUser, formatUsers } = require('../../../src/features/members/member.formatter');

describe('member response formatting', () => {
  test('removes identity and persistence internals and supplies normalized public fields', () => {
    const result = formatUser({
      _id: 'member-id', name: 'Ada', googleId: 'google-secret', __v: 5, isActive: false,
      positions: null, year: null, course: null, origin: null,
      description: null, photoUrl: null, instagramUrl: null, linkedinUrl: null,
      githubUrl: null, featuredProjectIds: null,
    });
    expect(result).toEqual(expect.objectContaining({
      _id: 'member-id', name: 'Ada', positions: [], year: '', course: '',
      origin: { state: '', country: '' }, description: '', photoUrl: '',
      instagramUrl: '', linkedinUrl: '', githubUrl: '', featuredProjectIds: [],
      loggedIn: true, verified: false,
    }));
    expect(result).not.toHaveProperty('googleId');
    expect(result).not.toHaveProperty('googleID');
    expect(result).not.toHaveProperty('__v');
    expect(result).not.toHaveProperty('isActive');
  });

  test('formats Mongoose documents and keeps populated project data intact', () => {
    const document = { toObject: () => ({ name: 'Ada', googleID: 'legacy-id', positions: ['member'], featuredProjectIds: [{ _id: 'project-id', title: 'Portal' }] }) };
    expect(formatUser(document)).toEqual(expect.objectContaining({
      name: 'Ada', positions: ['member'], loggedIn: true,
      featuredProjectIds: [{ _id: 'project-id', title: 'Portal' }],
    }));
  });

  test('fills missing fields in a partial origin object', () => {
    expect(formatUser({ origin: { state: 'Johor' } }).origin).toEqual({ state: 'Johor', country: '' });
    expect(formatUser({ origin: { country: 'Malaysia' } }).origin).toEqual({ state: '', country: 'Malaysia' });
  });

  test('maps every user in a directory response', () => {
    expect(formatUsers([{ name: 'Ada', googleId: 'g1' }, { name: 'Lin', __v: 2 }])).toEqual([
      expect.objectContaining({ name: 'Ada', loggedIn: true }),
      expect.objectContaining({ name: 'Lin', loggedIn: false }),
    ]);
  });

  test('returns a nullish input unchanged for safe optional formatting', () => {
    expect(formatUser(null)).toBeNull();
    expect(formatUser(undefined)).toBeUndefined();
  });

  test('never exposes private fields when formatting multiple directory users', () => {
    const users = formatUsers([
      { name: 'Ada', googleId: 'private-google-id', __v: 2, isActive: true },
      { name: 'Lin', googleID: 'legacy-private-id', __v: 3, isActive: false },
    ]);

    for (const user of users) {
      expect(user).not.toHaveProperty('googleId');
      expect(user).not.toHaveProperty('googleID');
      expect(user).not.toHaveProperty('__v');
      expect(user).not.toHaveProperty('isActive');
    }
  });
});
