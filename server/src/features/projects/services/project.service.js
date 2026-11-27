const repository = require('../project.repository');
const mongoose = require('mongoose');
const AppError = require('../../../shared/errors/AppError');
const { INTERNAL_SERVER_ERROR, NOT_FOUND } = require('../../../shared/constants/httpStatus');

const getProjects = () => repository.findAllProjects();

const createProject = async (data) => {
  await repository.ensureProjectIndexes();
  for (let attempt = 0; ; attempt += 1) {
    const session = await mongoose.startSession();
    let saved;
    let stage = 'counter';
    try {
      await session.withTransaction(async () => {
        stage = 'counter';
        const projectId = await repository.allocateProjectId(session);
        const project = { ...data, projectId };
        stage = 'project';
        saved = await repository.createProject(project, session);
        stage = 'board';
        await repository.createBoard(project, session);
      });
      return saved;
    } catch (error) {
      const projectIdConflict = stage === 'project'
        && error.code === 11000
        && error.keyPattern?.projectId;
      if (projectIdConflict && attempt < 2) continue;
      throw new AppError(INTERNAL_SERVER_ERROR, 'INTERNAL_SERVER_ERROR', error.message);
    } finally {
      await session.endSession();
    }
  }
};

const deleteProject = async (id) => {
  const session = await mongoose.startSession();
  let deletedProject;
  try {
    await session.withTransaction(async () => {
      deletedProject = await repository.findProjectByProjectId(id, session);
      if (!deletedProject) throw new AppError(NOT_FOUND, 'NOT_FOUND', 'Project not found');
      await repository.deleteProjectByProjectId(id, session);
      await repository.deleteBoard(id, session);
    });
  } finally {
    await session.endSession();
  }
  return { message: 'Project and project board deleted successfully', deletedProject };
};

module.exports = { getProjects, createProject, deleteProject };
