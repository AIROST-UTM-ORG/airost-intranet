jest.mock('../../../src/features/members/member.model', () => ({
  find: jest.fn(),
  countDocuments: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findOne: jest.fn(),
  updateOne: jest.fn(),
  create: jest.fn(),
}));

jest.mock('../../../src/features/members/verifiedUser.model', () => ({ find: jest.fn() }));

const User = require('../../../src/features/members/member.model');
const VerifiedUser = require('../../../src/features/members/verifiedUser.model');
const repository = require('../../../src/features/members/member.repository');

const makeQuery = (result) => {
  const query = {
    select: jest.fn(() => query),
    populate: jest.fn(() => query),
    sort: jest.fn(() => query),
    skip: jest.fn(() => query),
    limit: jest.fn(() => query),
    lean: jest.fn().mockResolvedValue(result),
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
  };
  return query;
};

describe('member persistence behavior', () => {
  beforeEach(() => jest.resetAllMocks());

  test('returns a directory page with public profile fields and populated featured projects', async () => {
    const rows = [{ _id: 'member-id', name: 'Ada', featuredProjectIds: [{ title: 'Portal' }] }];
    const query = makeQuery(rows);
    User.find.mockReturnValue(query);

    await expect(repository.findDirectoryUsers({ isActive: true }, { skip: 10, limit: 5 })).resolves.toBe(rows);

    expect(User.find).toHaveBeenCalledWith({ isActive: true });
    expect(query.select).toHaveBeenCalledWith('_id email name photoUrl positions year course origin description instagramUrl linkedinUrl githubUrl featuredProjectIds googleId isActive');
    expect(query.populate).toHaveBeenCalledWith({ path: 'featuredProjectIds', select: '_id projectId title description lead' });
    expect(query.sort).toHaveBeenCalledWith({ name: 1 });
    expect(query.skip).toHaveBeenCalledWith(10);
    expect(query.limit).toHaveBeenCalledWith(5);
    expect(query.lean).toHaveBeenCalledTimes(1);
  });

  test('propagates a directory query failure', async () => {
    const error = new Error('query failed');
    const query = makeQuery([]);
    query.lean.mockRejectedValue(error);
    User.find.mockReturnValue(query);
    await expect(repository.findDirectoryUsers({}, { skip: 0, limit: 20 })).rejects.toBe(error);
  });

  test('counts matching active directory users', async () => {
    User.countDocuments.mockResolvedValue(9);
    await expect(repository.countDirectoryUsers({ isActive: true, positions: 'member' })).resolves.toBe(9);
    expect(User.countDocuments).toHaveBeenCalledWith({ isActive: true, positions: 'member' });
  });

  test('loads a profile document for an authorized update', async () => {
    const profile = { _id: 'member-id' };
    User.findById.mockResolvedValue(profile);
    await expect(repository.findById('member-id')).resolves.toBe(profile);
    expect(User.findById).toHaveBeenCalledWith('member-id');
  });

  test('returns null when a profile ID does not match a stored user', async () => {
    User.findById.mockResolvedValue(null);

    await expect(repository.findById('missing-member-id')).resolves.toBeNull();
  });

  test('updates only supplied fields with MongoDB set semantics', async () => {
    const updatedUser = { _id: 'member-id', name: 'Ada' };
    User.findByIdAndUpdate.mockResolvedValue(updatedUser);

    await expect(repository.findByIdAndUpdate('member-id', { name: 'Ada' })).resolves.toBe(updatedUser);

    expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
      'member-id',
      { $set: { name: 'Ada' } },
      { new: true, runValidators: true },
    );
  });

  test('loads an updated public profile with populated featured projects', async () => {
    const profile = { _id: 'member-id', name: 'Ada' };
    const query = makeQuery(profile);
    User.findById.mockReturnValue(query);
    await expect(repository.findProfileById('member-id')).resolves.toBe(profile);
    expect(query.select).toHaveBeenCalledWith('-googleId -__v');
    expect(query.populate).toHaveBeenCalledWith({ path: 'featuredProjectIds', select: '_id projectId title description lead' });
  });

  test('loads User rows needed by the admin merge without authentication internals', async () => {
    const rows = [{ _id: 'member-id', email: 'member@example.com', name: 'Ada' }];
    const query = makeQuery(rows);
    User.find.mockReturnValue(query);

    await expect(repository.findAllUsers()).resolves.toBe(rows);

    expect(query.select).toHaveBeenCalledWith('_id email name photoUrl positions googleId');
    expect(query.lean).toHaveBeenCalledTimes(1);
  });

  test('loads legacy VerifiedUser rows for the service merge', async () => {
    const rows = [{ email: 'placeholder@example.com', name: 'Placeholder', position: ['member'] }];
    const query = makeQuery(rows);
    VerifiedUser.find.mockReturnValue(query);

    await expect(repository.findAllVerifiedUsers()).resolves.toBe(rows);
    expect(VerifiedUser.find).toHaveBeenCalledWith();
    expect(query.lean).toHaveBeenCalledTimes(1);
  });

  test('looks up a User by normalized email and adds a position without replacing existing positions', async () => {
    const user = { _id: 'member-id' };
    User.findOne.mockResolvedValue(user);
    User.updateOne.mockResolvedValue({ modifiedCount: 1 });

    await expect(repository.findUserByEmail('member@example.com')).resolves.toBe(user);
    await expect(repository.addPositionToUser(user._id, 'advisor')).resolves.toEqual({ modifiedCount: 1 });

    expect(User.findOne).toHaveBeenCalledWith({ email: 'member@example.com' });
    expect(User.updateOne).toHaveBeenCalledWith({ _id: user._id }, { $addToSet: { positions: 'advisor' } });
  });

  test('creates a placeholder User through the repository', async () => {
    const userData = { name: 'New Member', email: 'new@example.com', positions: ['member'] };
    const created = { _id: 'created-id', ...userData };
    User.create.mockResolvedValue(created);

    await expect(repository.createUser(userData)).resolves.toBe(created);
    expect(User.create).toHaveBeenCalledWith(userData);
  });
});
