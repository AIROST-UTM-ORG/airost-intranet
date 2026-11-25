const asyncHandler = require('../../shared/utils/asyncHandler');
const { sendSuccess } = require('../../shared/utils/apiResponse');
const memberService = require('./member.service');

const isLegacyAdminRequest = (req) => req?.baseUrl === '/admin' || !req?.baseUrl?.startsWith('/api');

const getUsers = asyncHandler(async (req, res) => {
  const users = await memberService.getMergedUserList();
  if (isLegacyAdminRequest(req)) {
    return res.status(200).json(users);
  }
  return sendSuccess(res, users, 200);
});

const createVerifiedUser = asyncHandler(async (req, res) => {
  const payload = req.sanitizedData || req.body;
  const { status, data } = await memberService.createVerifiedUser(payload);
  if (isLegacyAdminRequest(req)) {
    return res.status(status).json(data);
  }
  return sendSuccess(res, data, status);
});

module.exports = {
  isLegacyAdminRequest,
  getUsers,
  createVerifiedUser,
};
