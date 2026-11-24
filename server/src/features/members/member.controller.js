const asyncHandler = require('../../shared/utils/asyncHandler');
const { sendSuccess } = require('../../shared/utils/apiResponse');
const service = require('./member.service');

const isLegacyUserRequest = (req) => req.baseUrl === '/user';

const getUsers = asyncHandler(async (req, res) => {
  const { data, meta } = await service.getUsers(req.sanitizedData);
  if (isLegacyUserRequest(req)) return res.status(200).json(data);
  return sendSuccess(res, data, 200, meta);
});

const updateProfile = asyncHandler(async (req, res) => {
  const user = await service.updateProfile(req.params.id, req.sanitizedData, req.user);
  if (isLegacyUserRequest(req)) return res.status(200).json(user);
  return sendSuccess(res, user);
});

module.exports = { getUsers, updateProfile };
