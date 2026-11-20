jest.mock('../../../src/features/members/member.repository', () => ({
  findDirectoryUsers: jest.fn(),
  countDirectoryUsers: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findProfileById: jest.fn(),
  findAllUsers: jest.fn(),
  findAllVerifiedUsers: jest.fn(),
  findUserByEmail: jest.fn(),
  addPositionToUser: jest.fn(),
  createUser: jest.fn(),
}));

const repository = require('../../../src/features/members/member.repository');
const service = require('../../../src/features/members/member.service');
const adminService = require('../../../src/features/members/admin/admin.service');

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
    const user = { _id: '507f1f77bcf86cd799439011', name: 'After', save: jest.fn() };
    repository.findByIdAndUpdate.mockResolvedValue(user);
    repository.findProfileById.mockResolvedValue({ _id: user._id, name: 'After', googleId: 'secret', __v: 1 });

    const result = await service.updateProfile(user._id, { name: 'After' }, { _id: user._id, positions: ['member'] });

    expect(repository.findByIdAndUpdate).toHaveBeenCalledWith(user._id, { name: 'After' });
    expect(user.save).not.toHaveBeenCalled();
    expect(result).toEqual(expect.objectContaining({ name: 'After' }));
    expect(result).not.toHaveProperty('googleId');
    expect(result).not.toHaveProperty('__v');
  });

  test('allows a case-insensitive platform admin to update another profile', async () => {
    const user = { _id: '507f1f77bcf86cd799439012', name: 'After', save: jest.fn() };
    repository.findByIdAndUpdate.mockResolvedValue(user);
    repository.findProfileById.mockResolvedValue({ _id: user._id, name: 'After' });
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
    expect(repository.findProfileById).not.toHaveBeenCalled();
  });

  test('recognizes only the platform admin role', () => {
    expect(adminService.isAdmin({ positions: ['member', 'ADMIN'] })).toBe(true);
    expect(adminService.isAdmin({ positions: ['project lead'] })).toBe(false);
    expect(adminService.isAdmin(null)).toBe(false);
  });

  test('merges logged-in users with verified placeholders and sets flags from VerifiedUser records', async () => {
    repository.findAllUsers.mockResolvedValue([
      { _id: 'logged-verified', email: 'verified@example.com', name: 'Verified', googleId: 'private-id', positions: ['member'] },
      { _id: 'logged-unverified', email: 'unverified@example.com', name: 'Unverified', googleId: 'private-id-2', positions: [] },
    ]);
    repository.findAllVerifiedUsers.mockResolvedValue([
      { _id: 'verified-row', email: 'verified@example.com', name: 'Verified', position: ['member'] },
      { _id: 'placeholder-row', email: 'placeholder@example.com', name: 'Placeholder', position: ['member'] },
    ]);

    const result = await adminService.getMergedUserList();

    expect(result).toEqual([
      expect.objectContaining({ email: 'verified@example.com', loggedIn: true, verified: true }),
      expect.objectContaining({ email: 'unverified@example.com', loggedIn: true, verified: false }),
      expect.objectContaining({ email: 'placeholder@example.com', loggedIn: false, verified: true }),
    ]);
    expect(result).toHaveLength(3);
    expect(result[0]).not.toHaveProperty('googleId');
  });

  test('creates a placeholder User and reports CREATED when the email is new', async () => {
    repository.findUserByEmail.mockResolvedValue(null);
    repository.createUser.mockResolvedValue({ _id: 'created-id' });

    await expect(adminService.createVerifiedUser({ name: 'New Member', email: 'new@example.com', position: 'member' }))
      .resolves.toEqual({ status: 201, data: { createStatus: 'success' } });
    expect(repository.createUser).toHaveBeenCalledWith({ name: 'New Member', email: 'new@example.com', positions: ['member'] });
    expect(repository.addPositionToUser).not.toHaveBeenCalled();
  });

  test('adds a position to an existing User without creating a duplicate', async () => {
    repository.findUserByEmail.mockResolvedValue({ _id: 'existing-id' });
    repository.addPositionToUser.mockResolvedValue({ modifiedCount: 1 });

    await expect(adminService.createVerifiedUser({ name: 'Existing', email: 'existing@example.com', position: 'advisor' }))
      .resolves.toEqual({ status: 200, data: { createStatus: 'success' } });
    expect(repository.addPositionToUser).toHaveBeenCalledWith('existing-id', 'advisor');
    expect(repository.createUser).not.toHaveBeenCalled();
  });
});
