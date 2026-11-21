jest.mock('../../../src/features/members/member.service', () => ({ updateProfile: jest.fn() }));

const memberService = require('../../../src/features/members/member.service');
const { updateUser } = require('../../../controller/userController');

describe('legacy user controller compatibility', () => {
  beforeEach(() => jest.resetAllMocks());

  test('delegates profile updates with the authenticated caller context', async () => {
    const id = '507f1f77bcf86cd799439011';
    const caller = { _id: id, positions: ['member'] };
    const req = {
      params: { id },
      body: { name: 'Updated Name' },
      user: caller,
      isAuthenticated: () => true,
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    memberService.updateProfile.mockResolvedValue({ _id: id, name: 'Updated Name' });

    await updateUser(req, res);

    expect(memberService.updateProfile).toHaveBeenCalledWith(id, { name: 'Updated Name' }, caller);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ _id: id, name: 'Updated Name' });
  });
});
