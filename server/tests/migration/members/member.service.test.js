jest.mock('../../../src/features/members/member.repository', () => ({
  findDirectoryUsers: jest.fn(),
  countDirectoryUsers: jest.fn(),
  findById: jest.fn(),
  findProfileById: jest.fn(),
}));

const repository = require('../../../src/features/members/member.repository');
const service = require('../../../src/features/members/member.service');

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
    const user = { _id: '507f1f77bcf86cd799439011', name: 'Before', save: jest.fn().mockResolvedValue(undefined) };
    repository.findById.mockResolvedValue(user);
    repository.findProfileById.mockResolvedValue({ _id: user._id, name: 'After', googleId: 'secret', __v: 1 });

    const result = await service.updateProfile(user._id, { name: 'After' }, { _id: user._id, positions: ['member'] });

    expect(user.name).toBe('After');
    expect(user.save).toHaveBeenCalledTimes(1);
    expect(result).toEqual(expect.objectContaining({ name: 'After' }));
    expect(result).not.toHaveProperty('googleId');
    expect(result).not.toHaveProperty('__v');
  });

  test('allows a case-insensitive platform admin to update another profile', async () => {
    const user = { _id: '507f1f77bcf86cd799439012', name: 'Before', save: jest.fn() };
    repository.findById.mockResolvedValue(user);
    repository.findProfileById.mockResolvedValue({ _id: user._id, name: 'After' });
    await service.updateProfile(user._id, { name: 'After' }, { _id: '507f1f77bcf86cd799439013', positions: ['AdMiN'] });
    expect(user.save).toHaveBeenCalled();
  });

  test('rejects a non-admin changing another member before reading or writing the target', async () => {
    await expect(service.updateProfile('507f1f77bcf86cd799439011', { name: 'Intruder' }, {
      _id: '507f1f77bcf86cd799439012', positions: ['member'],
    })).rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' });
    expect(repository.findById).not.toHaveBeenCalled();
  });

  test('returns a not found error when an authorized target does not exist', async () => {
    repository.findById.mockResolvedValue(null);
    await expect(service.updateProfile('507f1f77bcf86cd799439011', {}, { _id: '507f1f77bcf86cd799439011' }))
      .rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' });
  });

  test('propagates a profile persistence failure instead of returning success', async () => {
    const error = new Error('profile persistence failed');
    const user = { _id: '507f1f77bcf86cd799439011', save: jest.fn().mockRejectedValue(error) };
    repository.findById.mockResolvedValue(user);

    await expect(service.updateProfile(user._id, { name: 'Updated' }, { _id: user._id }))
      .rejects.toBe(error);
    expect(repository.findProfileById).not.toHaveBeenCalled();
  });

  test('recognizes only the platform admin role', () => {
    expect(service.isAdmin({ positions: ['member', 'ADMIN'] })).toBe(true);
    expect(service.isAdmin({ positions: ['project lead'] })).toBe(false);
    expect(service.isAdmin(null)).toBe(false);
  });
});
