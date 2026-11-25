jest.mock('../../../src/features/members/member.repository', () => ({
  findDirectoryUsers: jest.fn(),
  countDirectoryUsers: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findAllUsers: jest.fn(),
  findAllVerifiedUsers: jest.fn(),
  findUserByEmail: jest.fn(),
  addPositionToUser: jest.fn(),
  createUser: jest.fn(),
}));

const repository = require('../../../src/features/members/member.repository');
const service = require('../../../src/features/members/member.service');
const { PLATFORM_ROLES } = require('../../../src/shared/constants/roles');

describe('member service behavior', () => {
  beforeEach(() => jest.resetAllMocks());

  test('returns a paginated directory with a total count for explicit pagination', async () => {
    repository.findDirectoryUsers.mockResolvedValue([{ name: 'Ada', positions: ['member'] }]);
    repository.countDirectoryUsers.mockResolvedValue(41);

    const result = await service.getUsers({ page: 1, limit: 20 });

    expect(result).toEqual({
      data: [expect.objectContaining({ name: 'Ada', positions: ['member'] })],
      meta: { page: 1, limit: 20, total: 41 },
    });
    expect(repository.findDirectoryUsers).toHaveBeenCalledWith({ isActive: true }, { skip: 0, limit: 20 });
  });

  test('returns the default directory page when called without options', async () => {
    repository.findDirectoryUsers.mockResolvedValue([]);
    repository.countDirectoryUsers.mockResolvedValue(0);

    await expect(service.getUsers()).resolves.toEqual({
      data: [],
      meta: { page: 1, limit: 20, total: 0 },
    });
    expect(repository.findDirectoryUsers).toHaveBeenCalledWith({ isActive: true }, { skip: 0, limit: 20 });
  });

  test('applies search, role, year, and requested page to the directory result', async () => {
    repository.findDirectoryUsers.mockResolvedValue([]);
    repository.countDirectoryUsers.mockResolvedValue(0);

    const result = await service.getUsers({ search: 'a.*', role: 'admin', year: 'Year 3', page: 3, limit: 7 });

    const [filter, pagination] = repository.findDirectoryUsers.mock.calls[0];
    expect(filter.isActive).toBe(true);
    expect(filter.positions).toBe('admin');
    expect(filter.year).toBe('Year 3');
    expect(filter.$or).toHaveLength(4);
    expect(filter.$or.every((condition) => Object.values(condition)[0].test('a.*'))).toBe(true);
    expect(filter.$or.every((condition) => !Object.values(condition)[0].test('aaaa'))).toBe(true);
    expect(pagination).toEqual({ skip: 14, limit: 7 });
    expect(result.meta).toEqual({ page: 3, limit: 7, total: 0 });
  });

  test('propagates repository failures so the HTTP error middleware can handle them', async () => {
    const error = new Error('database unavailable');
    repository.countDirectoryUsers.mockRejectedValue(error);
    await expect(service.getUsers({})).rejects.toBe(error);
  });

  test('allows a member to update their own profile and returns a formatted persisted profile', async () => {
    const user = {
      _id: '507f1f77bcf86cd799439011',
      name: 'After',
      googleId: 'private-google-id',
      featuredProjectIds: [{ _id: 'project-id', title: 'Featured project' }],
      save: jest.fn(),
    };
    repository.findByIdAndUpdate.mockResolvedValue(user);

    const result = await service.updateProfile(user._id, { name: 'After' }, { _id: user._id, positions: ['member'] });

    expect(repository.findByIdAndUpdate).toHaveBeenCalledWith(user._id, { name: 'After' });
    expect(user.save).not.toHaveBeenCalled();
    expect(result).toEqual(expect.objectContaining({ name: 'After' }));
    expect(result).not.toHaveProperty('googleId');
    expect(result).not.toHaveProperty('__v');
    expect(result.featuredProjectIds).toEqual([{ _id: 'project-id', title: 'Featured project' }]);
  });

  test('allows a case-insensitive platform admin to update another profile', async () => {
    const user = { _id: '507f1f77bcf86cd799439012', name: 'After', save: jest.fn() };
    repository.findByIdAndUpdate.mockResolvedValue(user);
    await service.updateProfile(user._id, { name: 'After' }, { _id: '507f1f77bcf86cd799439013', positions: ['AdMiN'] });
    expect(repository.findByIdAndUpdate).toHaveBeenCalledWith(user._id, { name: 'After' });
    expect(user.save).not.toHaveBeenCalled();
  });

  test('rejects a non-admin changing another member before reading or writing the target', async () => {
    await expect(service.updateProfile('507f1f77bcf86cd799439011', { name: 'Intruder' }, {
      _id: '507f1f77bcf86cd799439012', positions: ['member'],
    })).rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' });
    expect(repository.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  test('returns a not found error when an authorized target does not exist', async () => {
    repository.findByIdAndUpdate.mockResolvedValue(null);
    await expect(service.updateProfile('507f1f77bcf86cd799439011', {}, { _id: '507f1f77bcf86cd799439011' }))
      .rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' });
  });

  test('propagates a profile persistence failure instead of returning success', async () => {
    const error = new Error('profile persistence failed');
    repository.findByIdAndUpdate.mockRejectedValue(error);

    await expect(service.updateProfile('507f1f77bcf86cd799439011', { name: 'Updated' }, { _id: '507f1f77bcf86cd799439011' }))
      .rejects.toBe(error);
  });

  describe('isAdmin', () => {
    test('recognizes platform admin role using PLATFORM_ROLES.ADMIN with case-insensitivity and trimming', () => {
      expect(PLATFORM_ROLES.ADMIN).toBe('admin');

      // Valid variations of admin
      expect(service.isAdmin({ positions: ['member', 'ADMIN'] })).toBe(true);
      expect(service.isAdmin({ positions: ['  admin  '] })).toBe(true);
      expect(service.isAdmin({ positions: ['\tAdMiN\n'] })).toBe(true);
      expect(service.isAdmin({ position: 'ADMIN' })).toBe(true);
      expect(service.isAdmin({ position: '  admin  ' })).toBe(true);
      expect(service.isAdmin({ position: 'AdMiN' })).toBe(true);
      expect(service.isAdmin({ positions: 'admin' })).toBe(true);

      // Mixed array with non-string and null elements
      expect(service.isAdmin({ positions: [null, undefined, 123, 'ADMIN', false] })).toBe(true);
    });

    test('rejects non-admin roles and near-matches', () => {
      // Other roles
      expect(service.isAdmin({ positions: ['project lead'] })).toBe(false);
      expect(service.isAdmin({ positions: ['advisor'] })).toBe(false);
      expect(service.isAdmin({ positions: ['member', 'developer'] })).toBe(false);
      expect(service.isAdmin({ position: 'project lead' })).toBe(false);
      expect(service.isAdmin({ position: 'advisor' })).toBe(false);

      // Substrings or near matches
      expect(service.isAdmin({ positions: ['administrator'] })).toBe(false);
      expect(service.isAdmin({ positions: ['sysadmin'] })).toBe(false);
      expect(service.isAdmin({ positions: ['admin_user'] })).toBe(false);
      expect(service.isAdmin({ positions: ['not-admin'] })).toBe(false);
      expect(service.isAdmin({ position: 'administrator' })).toBe(false);

      // Empty or invalid values
      expect(service.isAdmin(null)).toBe(false);
      expect(service.isAdmin(undefined)).toBe(false);
      expect(service.isAdmin({})).toBe(false);
      expect(service.isAdmin({ positions: [] })).toBe(false);
      expect(service.isAdmin({ positions: [''] })).toBe(false);
      expect(service.isAdmin({ positions: ['   '] })).toBe(false);
      expect(service.isAdmin({ position: '' })).toBe(false);
      expect(service.isAdmin({ position: 123 })).toBe(false);
      expect(service.isAdmin({ positions: [123, null] })).toBe(false);
    });
  });

  describe('getMergedUserList', () => {
    test('merges and normalizes registered and verified users', async () => {
      repository.findAllUsers.mockResolvedValue([
        {
          _id: 'u-1',
          name: 'Alice',
          email: 'Alice@example.com',
          photoUrl: 'https://example.com/alice.png',
          positions: ['member'],
          googleId: 'secret-gid',
          __v: 0,
        },
        {
          _id: 'u-2',
          name: 'Bob',
          email: 'bob@example.com',
          photo: 'https://example.com/bob.png',
          position: 'lead',
        },
      ]);
      repository.findAllVerifiedUsers.mockResolvedValue([
        {
          _id: 'v-1',
          name: 'Alice Verified',
          email: 'alice@example.com',
          position: ['member'],
        },
        {
          _id: 'v-2',
          name: 'Charlie',
          email: 'charlie@example.com',
          position: ['advisor'],
        },
      ]);

      const result = await service.getMergedUserList();

      expect(repository.findAllUsers).toHaveBeenCalledTimes(1);
      expect(repository.findAllVerifiedUsers).toHaveBeenCalledTimes(1);

      expect(result).toHaveLength(3);

      const alice = result.find((u) => u.email === 'Alice@example.com');
      expect(alice).toEqual({
        _id: 'u-1',
        email: 'Alice@example.com',
        name: 'Alice',
        photo: 'https://example.com/alice.png',
        position: ['member'],
        loggedIn: true,
        verified: true,
      });
      expect(alice).not.toHaveProperty('googleId');
      expect(alice).not.toHaveProperty('__v');

      const bob = result.find((u) => u.email === 'bob@example.com');
      expect(bob).toEqual({
        _id: 'u-2',
        email: 'bob@example.com',
        name: 'Bob',
        photo: 'https://example.com/bob.png',
        position: ['lead'],
        loggedIn: true,
        verified: false,
      });

      const charlie = result.find((u) => u.email === 'charlie@example.com');
      expect(charlie).toEqual({
        _id: 'v-2',
        email: 'charlie@example.com',
        name: 'Charlie',
        photo: '',
        position: ['advisor'],
        loggedIn: false,
        verified: true,
      });
    });

    test('performs case-insensitive and whitespace-tolerant email merging and deduplication', async () => {
      // User has uppercase and whitespace
      repository.findAllUsers.mockResolvedValue([
        {
          _id: 'u-upper',
          name: 'Upper Alice',
          email: '  ALICE@EXAMPLE.COM  ',
          positions: ['member'],
        },
      ]);
      // VerifiedUser has lowercase and duplicates
      repository.findAllVerifiedUsers.mockResolvedValue([
        {
          _id: 'v-1',
          name: 'Alice In Verified',
          email: 'alice@example.com',
          position: ['member'],
        },
        {
          _id: 'v-2',
          name: 'Charlie Duplicate 1',
          email: '  CHARLIE@DOMAIN.COM  ',
          position: 'advisor',
        },
        {
          _id: 'v-3',
          name: 'Charlie Duplicate 2',
          email: 'charlie@domain.com',
          position: ['advisor'],
        },
      ]);

      const result = await service.getMergedUserList();

      // Alice should be merged, loggedIn true, verified true, and only appear ONCE
      const aliceMatches = result.filter((u) => u.email.trim().toLowerCase() === 'alice@example.com');
      expect(aliceMatches).toHaveLength(1);
      expect(aliceMatches[0].loggedIn).toBe(true);
      expect(aliceMatches[0].verified).toBe(true);

      // Charlie should only appear ONCE despite duplicates in VerifiedUser
      const charlieMatches = result.filter((u) => u.email.trim().toLowerCase() === 'charlie@domain.com');
      expect(charlieMatches).toHaveLength(1);
      expect(charlieMatches[0].loggedIn).toBe(false);
      expect(charlieMatches[0].verified).toBe(true);
      expect(charlieMatches[0].position).toEqual(['advisor']);
    });

    test('normalizes positions and photos when fields are missing or non-standard', async () => {
      repository.findAllUsers.mockResolvedValue([
        {
          _id: 'u-empty',
          name: 'No Position User',
          email: 'none@example.com',
        },
      ]);
      repository.findAllVerifiedUsers.mockResolvedValue([
        {
          _id: 'v-single',
          name: 'Single Pos Verified',
          email: 'single@example.com',
          position: 'member',
        },
      ]);

      const result = await service.getMergedUserList();

      const emptyUser = result.find((u) => u.email === 'none@example.com');
      expect(emptyUser.position).toEqual([]);
      expect(emptyUser.photo).toBe('');

      const singleUser = result.find((u) => u.email === 'single@example.com');
      expect(singleUser.position).toEqual(['member']);
    });

    test('handles empty or missing lists gracefully', async () => {
      repository.findAllUsers.mockResolvedValue(null);
      repository.findAllVerifiedUsers.mockResolvedValue(null);

      const result = await service.getMergedUserList();
      expect(result).toEqual([]);
    });

    test('propagates repository query rejections', async () => {
      const error = new Error('Database connection failed');
      repository.findAllUsers.mockRejectedValue(error);
      repository.findAllVerifiedUsers.mockResolvedValue([]);

      await expect(service.getMergedUserList()).rejects.toThrow('Database connection failed');
    });
  });

  describe('createVerifiedUser', () => {
    test('updates existing user by adding position when user exists (200)', async () => {
      const existing = { _id: 'existing-id', email: 'exist@example.com' };
      repository.findUserByEmail.mockResolvedValue(existing);
      repository.addPositionToUser.mockResolvedValue({ modifiedCount: 1 });

      const result = await service.createVerifiedUser({
        name: 'Existing',
        email: 'exist@example.com',
        position: 'admin',
      });

      expect(repository.findUserByEmail).toHaveBeenCalledWith('exist@example.com');
      expect(repository.addPositionToUser).toHaveBeenCalledWith('existing-id', 'admin');
      expect(result).toEqual({ status: 200, data: { createStatus: 'success' } });
      expect(repository.createUser).not.toHaveBeenCalled();
    });

    test('normalizes email with trimming and lowercasing before looking up existing user', async () => {
      const existing = { _id: 'existing-id', email: 'exist@example.com' };
      repository.findUserByEmail.mockResolvedValue(existing);
      repository.addPositionToUser.mockResolvedValue({ modifiedCount: 1 });

      const result = await service.createVerifiedUser({
        name: 'Existing',
        email: '  EXIST@EXAMPLE.COM  ',
        position: 'lead',
      });

      expect(repository.findUserByEmail).toHaveBeenCalledWith('exist@example.com');
      expect(repository.addPositionToUser).toHaveBeenCalledWith('existing-id', 'lead');
      expect(result).toEqual({ status: 200, data: { createStatus: 'success' } });
    });

    test('creates new user when user does not exist (201)', async () => {
      repository.findUserByEmail.mockResolvedValue(null);
      repository.createUser.mockResolvedValue({ _id: 'new-id' });

      const result = await service.createVerifiedUser({
        name: 'New Person',
        email: 'new@example.com',
        position: 'member',
      });

      expect(repository.findUserByEmail).toHaveBeenCalledWith('new@example.com');
      expect(repository.createUser).toHaveBeenCalledWith({
        name: 'New Person',
        email: 'new@example.com',
        positions: ['member'],
      });
      expect(result).toEqual({ status: 201, data: { createStatus: 'success' } });
      expect(repository.addPositionToUser).not.toHaveBeenCalled();
    });

    test('propagates repository failures during createVerifiedUser', async () => {
      const error = new Error('Database write failed');
      repository.findUserByEmail.mockRejectedValue(error);

      await expect(service.createVerifiedUser({
        name: 'New Person',
        email: 'new@example.com',
        position: 'member',
      })).rejects.toThrow('Database write failed');
    });
  });
});
