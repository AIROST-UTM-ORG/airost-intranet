const repository = require('../project.repository');
const AppError = require('../../../shared/errors/AppError');
const { INTERNAL_SERVER_ERROR, NOT_FOUND } = require('../../../shared/constants/httpStatus');

const getProjects = () => repository.findAllProjects();

const createProject = async (data) => {
  const latest = await repository.findLatestProject();
  const project = { ...data, projectId: (latest?.projectId ?? 0) + 1 };
  const saved = await repository.createProject(project);
  try {
    await repository.createBoard(project);
  } catch (error) {
    await repository.deleteProjectById(saved._id);
    throw new AppError(INTERNAL_SERVER_ERROR, 'INTERNAL_SERVER_ERROR', error.message);
  }
  return saved;
};

const deleteProject = async (id) => {
  const deletedProject = await repository.deleteProjectByProjectId(id);
  if (!deletedProject) throw new AppError(NOT_FOUND, 'NOT_FOUND', 'Project not found');
  await repository.deleteBoard(id);
  return { message: 'Project and project board deleted successfully', deletedProject };
};

module.exports = { getProjects, createProject, deleteProject };
