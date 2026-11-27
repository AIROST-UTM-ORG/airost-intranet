const Project = require("./models/project.model");
const ProjectBoard = require("./models/projectBoard.model");
const TaskHistory = require("./models/taskHistory.model");
const ProjectCounter = require('./models/projectCounter.model');

const findAllProjects = () => Project.find();
const ensureProjectIndexes = () => Promise.all([Project.init(), ProjectBoard.init()]);
const findProjectById = (id) => Project.findById(id);
const findProjectsMatchingLead = (regex) => Project.find({ lead: { $regex: regex } }).select('_id').lean();
const findProjectsForLeadConditions = (conditions) => Project.find({ $or: conditions }).select('_id lead').lean();
const findProjectsMatchingSearch = (regex) => Project.find({
  $or: [{ title: { $regex: regex } }, { name: { $regex: regex } }],
}).select('_id');
const findHighestProjectId = (session) =>
  Project.findOne({}, { projectId: 1 }).sort({ projectId: -1 }).session(session || null).lean();
const allocateProjectId = async (session) => {
  const latest = await findHighestProjectId(session);
  await ProjectCounter.findOneAndUpdate(
    { _id: 'projects' },
    { $max: { sequence: latest?.projectId ?? 0 } },
    { upsert: true, new: true, setDefaultsOnInsert: true, session },
  );
  const counter = await ProjectCounter.findOneAndUpdate(
    { _id: 'projects' },
    { $inc: { sequence: 1 } },
    { upsert: true, new: true, session },
  );
  return counter.sequence;
};
const createProject = (project, session) => new Project(project).save({ session });
const findProjectByProjectId = (projectId, session) =>
  Project.findOne({ projectId }).session(session || null);
const deleteProjectByProjectId = (projectId, session) =>
  Project.findOneAndDelete({ projectId }, { session });
const findBoard = (filter, session) => ProjectBoard.findOne(filter).session(session || null);
const createBoard = (board, session) => new ProjectBoard(board).save({ session });
const deleteBoard = (projectId, session) => ProjectBoard.findOneAndDelete({ projectId }, { session });
const updateBoardTasks = (projectId, tasks, session) =>
  ProjectBoard.findOneAndUpdate(
    { projectId },
    { $set: { tasks } },
    { new: true, session },
  );
const saveBoard = (board, session) => board.save({ session });

const updateTask = (projectId, taskId, task, session) =>
  ProjectBoard.findOneAndUpdate(
    { projectId, "tasks.task_id": taskId },
    { $set: { "tasks.$": task } },
    { new: true, session },
  );


const findTaskHistory = (taskId) =>
  TaskHistory.find({ taskId }).sort({ timestamp: -1 });
const findProjectHistory = (projectId) =>
  TaskHistory.find({ projectId }).sort({ timestamp: -1 });
const createHistory = (entry, session) => new TaskHistory(entry).save({ session });

module.exports = {
  findAllProjects,
  ensureProjectIndexes,
  findProjectById,
  findProjectsMatchingLead,
  findProjectsForLeadConditions,
  findProjectsMatchingSearch,
  findHighestProjectId,
  allocateProjectId,
  createProject,
  deleteProjectByProjectId,
  findProjectByProjectId,
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
