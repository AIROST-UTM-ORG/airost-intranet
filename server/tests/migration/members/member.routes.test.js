jest.mock('../../../src/features/members/member.repository', () => ({
  findDirectoryUsers: jest.fn(),
  countDirectoryUsers: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findProfileById: jest.fn(),
}));

const express = require('express');
const request = require('supertest');
const repository = require('../../../src/features/members/member.repository');
const routes = require('../../../src/routes');
const { globalErrorHandler } = require('../../../src/middleware/errorHandler');

const app = express();
app.use(express.json());
app.use((req, _res, next) => {
  if (req.get('x-user-id')) req.user = { _id: req.get('x-user-id'), positions: [req.get('x-position') || 'member'] };
  next();
});
app.use(routes);
app.use(globalErrorHandler);

describe('registered member HTTP routes', () => {
  beforeEach(() => jest.resetAllMocks());

  test.each(['/api/user/users', '/user/users'])('%s requires authentication', async (path) => {
    const response = await request(app).get(path);
    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({ success: false, error: { code: 'UNAUTHENTICATED' } });
    expect(repository.findDirectoryUsers).not.toHaveBeenCalled();
  });

  test('canonical and legacy directory routes share the success envelope and metadata', async () => {
    repository.findDirectoryUsers.mockResolvedValue([{ _id: 'member-1', name: 'Ada', googleId: 'secret', positions: ['member'] }]);
    repository.countDirectoryUsers.mockResolvedValue(1);
    const canonical = await request(app).get('/api/user/users?page=1&limit=5').set('x-user-id', 'viewer');
    const legacy = await request(app).get('/user/users?page=1&limit=5').set('x-user-id', 'viewer');

    expect(canonical.status).toBe(200);
    expect(canonical.body).toEqual({
      success: true,
      data: [expect.objectContaining({ _id: 'member-1', name: 'Ada', loggedIn: true })],
      meta: { page: 1, limit: 5, total: 1 },
    });
    expect(canonical.body).toEqual(legacy.body);
    expect(canonical.body.data[0]).not.toHaveProperty('googleId');
  });

  test('invalid profile payload returns the documented 400 validation error', async () => {
    const response = await request(app)
      .patch('/api/user/507f1f77bcf86cd799439011')
      .set('x-user-id', '507f1f77bcf86cd799439011')
      .send({ positions: ['admin'] });
    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ success: false, error: { code: 'VALIDATION_ERROR' } });
    expect(repository.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  test('rejects a malformed profile ID before attempting a database lookup', async () => {
    const response = await request(app)
      .patch('/api/user/not-an-object-id')
      .set('x-user-id', '507f1f77bcf86cd799439011')
      .send({ name: 'Changed' });

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
    expect(repository.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  test('valid requests from non-admin users cannot update another profile', async () => {
    const response = await request(app)
      .patch('/api/user/507f1f77bcf86cd799439011')
      .set('x-user-id', '507f1f77bcf86cd799439012')
      .set('x-position', 'member')
      .send({ name: 'Changed' });
    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({ success: false, error: { code: 'FORBIDDEN' } });
    expect(repository.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  test('profile updates return a sanitized success envelope', async () => {
    const user = { _id: '507f1f77bcf86cd799439011', name: 'New', save: jest.fn() };
    repository.findByIdAndUpdate.mockResolvedValue(user);
    repository.findProfileById.mockResolvedValue({ _id: user._id, name: 'New', googleId: 'secret', __v: 1 });
    const response = await request(app)
      .patch(`/api/user/${user._id}`)
      .set('x-user-id', user._id)
      .send({ name: 'New' });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ success: true, data: { _id: user._id, name: 'New' } });
    expect(response.body.data).not.toHaveProperty('googleId');
    expect(response.body.data).not.toHaveProperty('__v');
    expect(repository.findByIdAndUpdate).toHaveBeenCalledWith(user._id, { name: 'New' });
    expect(user.save).not.toHaveBeenCalled();
  });
});
