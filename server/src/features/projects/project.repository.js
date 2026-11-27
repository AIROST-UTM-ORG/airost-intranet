const Project = require("./models/project.model");
const ProjectBoard = require("./models/projectBoard.model");
const TaskHistory = require("./models/taskHistory.model");

const findAllProjects = () => Project.find();
const findProjectById = (id) => Project.findById(id);
const findProjectsMatchingLead = (regex) => Project.find({ lead: { $regex: regex } }).select('_id').lean();
const findProjectsForLeadConditions = (conditions) => Project.find({ $or: conditions }).select('_id lead').lean();
const findProjectsMatchingSearch = (regex) => Project.find({
  $or: [{ title: { $regex: regex } }, { name: { $regex: regex } }],
}).select('_id');
const findLatestProject = () =>
  Project.findOne({}, {}, { sort: { createdAt: -1 } });
const createProject = (project) => Project.create(project);
const deleteProjectByProjectId = (projectId) =>
  Project.findOneAndDelete({ projectId });
const deleteProjectById = (id) => Project.findByIdAndDelete(id);

const findBoard = (filter) => ProjectBoard.findOne(filter);
const createBoard = (board) => ProjectBoard.create(board);
const deleteBoard = (projectId) => ProjectBoard.findOneAndDelete({ projectId });
const updateBoardTasks = (projectId, tasks) =>
  ProjectBoard.findOneAndUpdate(
    { projectId },
    { $set: { tasks } },
    { new: true },
  );
const saveBoard = (board) => board.save();

const updateTask = (projectId, taskId, task) =>
  ProjectBoard.findOneAndUpdate(
    { projectId, "tasks.task_id": taskId },
    { $set: { "tasks.$": task } },
    { new: true },
  );


const findTaskHistory = (taskId) =>
  TaskHistory.find({ taskId }).sort({ timestamp: -1 });
const findProjectHistory = (projectId) =>
  TaskHistory.find({ projectId }).sort({ timestamp: -1 });
const createHistory = (entry) => TaskHistory.create(entry);

module.exports = {
  findAllProjects,
  findProjectById,
  findProjectsMatchingLead,
  findProjectsForLeadConditions,
  findProjectsMatchingSearch,
  findLatestProject,
  createProject,
  deleteProjectByProjectId,
  deleteProjectById,
  findBoard,
  createBoard,
  deleteBoard,
  updateBoardTasks,
  updateTask,
  saveBoard,
  findTaskHistory,
  findProjectHistory,
  createHistory,
};
