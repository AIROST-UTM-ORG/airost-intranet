const asyncHandler = require('../../../shared/utils/asyncHandler');
const { sendSuccess } = require('../../../shared/utils/apiResponse');
const adminService = require('./admin.service');

const getUsers = asyncHandler(async (_req, res) => {
  const users = await adminService.getMergedUserList();
  return res.status(200).json(users);
});

const createVerifiedUser = asyncHandler(async (req, res) => {
  const { status, data } = await adminService.createVerifiedUser(req.sanitizedData);
  return sendSuccess(res, data, status);
});

module.exports = { getUsers, createVerifiedUser };
