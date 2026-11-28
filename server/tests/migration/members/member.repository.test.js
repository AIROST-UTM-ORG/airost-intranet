jest.mock('../../../src/features/members/models/member.model', () => ({
  find: jest.fn(),
  countDocuments: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findOne: jest.fn(),
  updateOne: jest.fn(),
  create: jest.fn(),
}));

jest.mock('../../../src/features/members/models/verifiedUser.model', () => ({
  find: jest.fn(),
}));

const User = require('../../../src/features/members/models/member.model');
const VerifiedUser = require('../../../src/features/members/models/verifiedUser.model');
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

  test('updates only the supplied nested origin fields without replacing the embedded object', async () => {
    const updatedUser = { _id: 'member-id', origin: { state: 'Johor', country: 'Malaysia' } };
    const query = makeQuery(updatedUser);
    User.findByIdAndUpdate.mockReturnValue(query);

    await expect(repository.findByIdAndUpdate('member-id', { origin: { state: 'Johor' } })).resolves.toBe(updatedUser);

    expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
      'member-id',
      { $set: { 'origin.state': 'Johor' } },
      { new: true, runValidators: true },
    );
    expect(query.populate).toHaveBeenCalledWith({ path: 'featuredProjectIds', select: '_id projectId title description lead' });
  });

  test('updates multiple supplied origin fields and preserves partial update semantics for other fields', async () => {
    const query = makeQuery({ _id: 'member-id' });
    User.findByIdAndUpdate.mockReturnValue(query);

    await repository.findByIdAndUpdate('member-id', {
      name: 'Ada',
      origin: { state: 'Johor', country: 'Malaysia' },
    });

    expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
      'member-id',
      { $set: { name: 'Ada', 'origin.state': 'Johor', 'origin.country': 'Malaysia' } },
      { new: true, runValidators: true },
    );
    expect(query.populate).toHaveBeenCalledWith({ path: 'featuredProjectIds', select: '_id projectId title description lead' });
  });

  test('findAllUsers selects specific fields and returns lean documents', async () => {
    const mockUsers = [{ _id: '1', email: 'test@example.com' }];
    const query = makeQuery(mockUsers);
    User.find.mockReturnValue(query);

    const result = await repository.findAllUsers();

    expect(User.find).toHaveBeenCalledWith();
    expect(query.select).toHaveBeenCalledWith('_id email name photoUrl positions googleId');
    expect(query.lean).toHaveBeenCalledTimes(1);
    expect(result).toBe(mockUsers);
  });

  test('findAllVerifiedUsers returns lean documents', async () => {
    const mockVerified = [{ _id: 'v1', email: 'ver@example.com' }];
    const query = makeQuery(mockVerified);
    VerifiedUser.find.mockReturnValue(query);

    const result = await repository.findAllVerifiedUsers();

    expect(VerifiedUser.find).toHaveBeenCalledWith();
    expect(query.lean).toHaveBeenCalledTimes(1);
    expect(result).toBe(mockVerified);
  });

  test('findUserByEmail finds one user by email with normalization', async () => {
    const user = { _id: 'u1', email: 'find@example.com' };
    User.findOne.mockResolvedValue(user);

    const result = await repository.findUserByEmail('find@example.com');

    expect(User.findOne).toHaveBeenCalledWith({ email: 'find@example.com' });
    expect(result).toBe(user);
  });

  test('findUserByEmail trims and lowercases email before querying User collection', async () => {
    const user = { _id: 'u1', email: 'find@example.com' };
    User.findOne.mockResolvedValue(user);

    const result = await repository.findUserByEmail('  FIND@EXAMPLE.COM  ');

    expect(User.findOne).toHaveBeenCalledWith({ email: 'find@example.com' });
    expect(result).toBe(user);
  });

  test('addPositionToUser updates user by adding position to positions array', async () => {
    User.updateOne.mockResolvedValue({ acknowledged: true, modifiedCount: 1 });

    const result = await repository.addPositionToUser('u1', 'admin');

    expect(User.updateOne).toHaveBeenCalledWith(
      { _id: 'u1' },
      { $addToSet: { positions: 'admin' } }
    );
    expect(result).toEqual({ acknowledged: true, modifiedCount: 1 });
  });

  test('createUser creates a new user document', async () => {
    const doc = { name: 'New', email: 'new@example.com', positions: ['member'] };
    User.create.mockResolvedValue({ _id: 'u2', ...doc });

    const result = await repository.createUser(doc);

    expect(User.create).toHaveBeenCalledWith(doc);
    expect(result).toEqual({ _id: 'u2', ...doc });
  });

  test('propagates persistence errors on findUserByEmail, addPositionToUser, and createUser', async () => {
    const error = new Error('Database disconnected');
    User.findOne.mockRejectedValue(error);
    await expect(repository.findUserByEmail('err@example.com')).rejects.toThrow('Database disconnected');

    User.updateOne.mockRejectedValue(error);
    await expect(repository.addPositionToUser('u1', 'lead')).rejects.toThrow('Database disconnected');

    User.create.mockRejectedValue(error);
    await expect(repository.createUser({ name: 'Fail' })).rejects.toThrow('Database disconnected');
  });
});
