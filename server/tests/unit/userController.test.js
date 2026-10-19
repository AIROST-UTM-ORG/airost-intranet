jest.mock('../../models/User', () => ({
  findByIdAndUpdate: jest.fn(),
}));

const mongoose = require('mongoose');
const User = require('../../models/User');
const { updateUser } = require('../../controller/userController');

const createResponse = () => {
  const res = {
    status: jest.fn(),
    json: jest.fn(),
  };
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  return res;
};

describe('updateUser', () => {
  beforeEach(() => {
    User.findByIdAndUpdate.mockReset();
  });

  test('requires an authenticated account', async () => {
    const res = createResponse();

    await updateUser({ params: { id: new mongoose.Types.ObjectId().toString() } }, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(User.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  test('only permits updating the authenticated account', async () => {
    const res = createResponse();
    const requestedId = new mongoose.Types.ObjectId();
    const authenticatedId = new mongoose.Types.ObjectId();

    await updateUser({
      params: { id: requestedId.toString() },
      user: { _id: authenticatedId },
      body: { name: 'Someone else' },
    }, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(User.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  test('saves editable profile fields but ignores account permissions and unknown fields', async () => {
    const res = createResponse();
    const id = new mongoose.Types.ObjectId();
    const updatedUser = { _id: id, name: 'Ada Lovelace' };
    User.findByIdAndUpdate.mockResolvedValue(updatedUser);

    await updateUser({
      params: { id: id.toString() },
      user: { _id: id },
      body: {
        name: 'Ada Lovelace',
        profileTitle: 'Student Developer',
        position: ['admin'],
        email: 'changed@example.com',
        unexpected: true,
        featuredProject: {
          title: 'Campus Buddy',
          technologies: ['React'],
          owner: 'not-editable',
        },
      },
    }, res);

    expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
      id.toString(),
      {
        $set: {
          name: 'Ada Lovelace',
          profileTitle: 'Student Developer',
          featuredProject: {
            title: 'Campus Buddy',
            technologies: ['React'],
          },
        },
      },
      { new: true, runValidators: true }
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(updatedUser);
  });

  test('rejects malformed featured project data', async () => {
    const res = createResponse();
    const id = new mongoose.Types.ObjectId();

    await updateUser({
      params: { id: id.toString() },
      user: { _id: id },
      body: { featuredProject: ['not', 'an', 'object'] },
    }, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(User.findByIdAndUpdate).not.toHaveBeenCalled();
  });
});
