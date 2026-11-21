jest.mock('../../../src/features/members/member.model', () => ({
  find: jest.fn(),
  countDocuments: jest.fn(),
  findById: jest.fn(),
}));

const User = require('../../../src/features/members/member.model');
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

  test('loads an updated public profile with populated featured projects', async () => {
    const profile = { _id: 'member-id', name: 'Ada' };
    const query = makeQuery(profile);
    User.findById.mockReturnValue(query);
    await expect(repository.findProfileById('member-id')).resolves.toBe(profile);
    expect(query.select).toHaveBeenCalledWith('-googleId -__v');
    expect(query.populate).toHaveBeenCalledWith({ path: 'featuredProjectIds', select: '_id projectId title description lead' });
  });
});
