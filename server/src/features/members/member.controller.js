const asyncHandler = require('../../shared/utils/asyncHandler');
const { sendSuccess } = require('../../shared/utils/apiResponse');
const service = require('./member.service');

const getUsers = asyncHandler(async (req, res) => {
  const { data, meta } = await service.getUsers(req.sanitizedData);
  return sendSuccess(res, data, 200, meta);
});

const updateProfile = asyncHandler(async (req, res) => {
  const user = await service.updateProfile(req.params.id, req.sanitizedData, req.user);
  return sendSuccess(res, user);
});

module.exports = { getUsers, updateProfile };
