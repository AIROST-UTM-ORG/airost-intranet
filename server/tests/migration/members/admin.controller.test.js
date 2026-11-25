jest.mock('../../../src/features/members/member.service', () => ({
  getMergedUserList: jest.fn(),
  createVerifiedUser: jest.fn(),
}));

const memberService = require('../../../src/features/members/member.service');
const {
  isLegacyAdminRequest,
  getUsers,
  createVerifiedUser,
} = require('../../../src/features/members/admin.controller');
const legacyAdminController = require('../../../controller/adminController');
const legacyAdminRoutes = require('../../../routes/adminRoutes');
const featureAdminRoutes = require('../../../src/features/members/admin.routes');

describe('admin controller unit tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('legacy shims compatibility', () => {
    test('legacy controller re-exports feature controller handlers', () => {
      expect(legacyAdminController.getUsers).toBe(getUsers);
      expect(legacyAdminController.createVerifiedUser).toBe(createVerifiedUser);
    });

    test('legacy routes re-exports feature routes router', () => {
      expect(legacyAdminRoutes).toBe(featureAdminRoutes);
    });
  });

  describe('isLegacyAdminRequest', () => {
    test('returns true for legacy /admin routes', () => {
      expect(isLegacyAdminRequest({ baseUrl: '/admin' })).toBe(true);
    });

    test('returns true for routes not starting with /api', () => {
      expect(isLegacyAdminRequest({ baseUrl: '' })).toBe(true);
      expect(isLegacyAdminRequest({ baseUrl: '/other' })).toBe(true);
      expect(isLegacyAdminRequest({ baseUrl: '/admin/users' })).toBe(true);
    });

    test('safely handles empty or missing req/baseUrl without throwing', () => {
      expect(isLegacyAdminRequest({})).toBe(true);
      expect(isLegacyAdminRequest({ baseUrl: undefined })).toBe(true);
      expect(isLegacyAdminRequest(null)).toBe(true);
      expect(isLegacyAdminRequest(undefined)).toBe(true);
    });

    test('returns false for canonical /api/admin routes', () => {
      expect(isLegacyAdminRequest({ baseUrl: '/api/admin' })).toBe(false);
      expect(isLegacyAdminRequest({ baseUrl: '/api/v1/admin' })).toBe(false);
      expect(isLegacyAdminRequest({ baseUrl: '/api/admin/users' })).toBe(false);
    });
  });

  describe('getUsers', () => {
    const mockUsers = [
      {
        _id: 'user-1',
        email: 'alice@example.com',
        name: 'Alice',
        photo: 'https://example.com/alice.png',
        position: ['admin'],
        loggedIn: true,
        verified: true,
      },
      {
        _id: 'user-2',
        email: 'bob@example.com',
        name: 'Bob',
        photo: '',
        position: ['member'],
        loggedIn: false,
        verified: true,
      },
    ];

    test('returns raw array with 200 on legacy admin request', async () => {
      memberService.getMergedUserList.mockResolvedValue(mockUsers);
      const req = { baseUrl: '/admin' };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      await getUsers(req, res, next);

      expect(memberService.getMergedUserList).toHaveBeenCalledTimes(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockUsers);
      expect(next).not.toHaveBeenCalled();
    });

    test('returns envelope with 200 on canonical api request', async () => {
      memberService.getMergedUserList.mockResolvedValue(mockUsers);
      const req = { baseUrl: '/api/admin' };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      await getUsers(req, res, next);

      expect(memberService.getMergedUserList).toHaveBeenCalledTimes(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockUsers,
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('forwards service errors to next()', async () => {
      const error = new Error('Service failure');
      memberService.getMergedUserList.mockRejectedValue(error);
      const req = { baseUrl: '/api/admin' };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      await getUsers(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('createVerifiedUser', () => {
    const sanitizedData = {
      name: 'Charlie',
      email: 'charlie@example.com',
      position: 'member',
    };

    test('returns raw data and 201 on legacy admin request for new user', async () => {
      memberService.createVerifiedUser.mockResolvedValue({
        status: 201,
        data: { createStatus: 'success' },
      });
      const req = { baseUrl: '/admin', sanitizedData };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      await createVerifiedUser(req, res, next);

      expect(memberService.createVerifiedUser).toHaveBeenCalledWith(sanitizedData);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ createStatus: 'success' });
      expect(next).not.toHaveBeenCalled();
    });

    test('returns raw data and 200 on legacy admin request for existing user update', async () => {
      memberService.createVerifiedUser.mockResolvedValue({
        status: 200,
        data: { createStatus: 'success' },
      });
      const req = { baseUrl: '/admin', sanitizedData };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      await createVerifiedUser(req, res, next);

      expect(memberService.createVerifiedUser).toHaveBeenCalledWith(sanitizedData);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ createStatus: 'success' });
      expect(next).not.toHaveBeenCalled();
    });

    test('returns envelope and 201 on canonical api request for new user', async () => {
      memberService.createVerifiedUser.mockResolvedValue({
        status: 201,
        data: { createStatus: 'success' },
      });
      const req = { baseUrl: '/api/admin', sanitizedData };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      await createVerifiedUser(req, res, next);

      expect(memberService.createVerifiedUser).toHaveBeenCalledWith(sanitizedData);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: { createStatus: 'success' },
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('returns envelope and 200 on canonical request for existing user update', async () => {
      memberService.createVerifiedUser.mockResolvedValue({
        status: 200,
        data: { createStatus: 'success' },
      });
      const req = { baseUrl: '/api/admin', sanitizedData };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      await createVerifiedUser(req, res, next);

      expect(memberService.createVerifiedUser).toHaveBeenCalledWith(sanitizedData);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: { createStatus: 'success' },
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('falls back to req.body when req.sanitizedData is not present', async () => {
      memberService.createVerifiedUser.mockResolvedValue({
        status: 200,
        data: { createStatus: 'success' },
      });
      const req = { baseUrl: '/api/admin', body: sanitizedData };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      await createVerifiedUser(req, res, next);

      expect(memberService.createVerifiedUser).toHaveBeenCalledWith(sanitizedData);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test('forwards service errors to next()', async () => {
      const error = new Error('Database error');
      memberService.createVerifiedUser.mockRejectedValue(error);
      const req = { baseUrl: '/api/admin', sanitizedData };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      await createVerifiedUser(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
    });
  });
});
