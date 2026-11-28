const asyncHandler = require("../../../shared/utils/asyncHandler");
const { sendSuccess } = require("../../../shared/utils/apiResponse");
const projectService = require("../services/project.service");

const isLegacyProjectRequest = (req) => req.baseUrl === "/projects";

const getProjects = asyncHandler(async (req, res) => {
  const projects = await projectService.getProjects();
  if (isLegacyProjectRequest(req)) return res.status(200).json(projects);
  return sendSuccess(res, projects);
});

const createProject = asyncHandler(async (req, res) => {
  const project = await projectService.createProject(req.sanitizedData);
  if (isLegacyProjectRequest(req)) return res.status(201).json(project);
  return sendSuccess(res, project, 201);
});

const deleteProject = asyncHandler(async (req, res) => {
  const result = await projectService.deleteProject(req.sanitizedData.projectId);
  if (isLegacyProjectRequest(req)) return res.status(200).json(result);
  return sendSuccess(res, result);
});

module.exports = { getProjects, createProject, deleteProject };
