const asyncHandler = require('../../../shared/utils/asyncHandler');
const { sendSuccess } = require('../../../shared/utils/apiResponse');
const taskService = require('../services/task.service');

const isLegacyProjectRequest = (req) => req.baseUrl === '/projects';

const getProjectBoard = asyncHandler(async (req, res) => {
  const board = await taskService.getProjectBoard(req.sanitizedData.projectId);
  if (isLegacyProjectRequest(req)) return res.status(200).json(board);
  return sendSuccess(res, board);
});
const createProjectBoard = asyncHandler(async (req, res) => {
  const { board, status } = await taskService.createOrUpdateProjectBoard(req.sanitizedData, req.user);
  if (isLegacyProjectRequest(req)) return res.status(status).json(board);
  return sendSuccess(res, board, status);
});
const refreshProjectBoard = asyncHandler(async (req, res) => {
  const board = await taskService.refreshProjectBoard(req.sanitizedData, req.user);
  if (isLegacyProjectRequest(req)) return res.status(200).json(board);
  return sendSuccess(res, board);
});
const updateTask = asyncHandler(async (req, res) => {
  const board = await taskService.updateTask(req.sanitizedData, req.user);
  if (isLegacyProjectRequest(req)) return res.status(200).json(board);
  return sendSuccess(res, board);
});
const getTaskHistory = asyncHandler(async (req, res) => {
  const history = await taskService.getTaskHistory(req.params.taskId);
  if (isLegacyProjectRequest(req)) return res.status(200).json(history);
  return sendSuccess(res, history);
});
const getProjectHistory = asyncHandler(async (req, res) => {
  const history = await taskService.getProjectHistory(req.sanitizedData.projectId);
  if (isLegacyProjectRequest(req)) return res.status(200).json(history);
  return sendSuccess(res, history);
});

module.exports = { getProjectBoard, createProjectBoard, refreshProjectBoard, updateTask, getTaskHistory, getProjectHistory };
