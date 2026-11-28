const projectController = require('../src/features/projects/controller/project.controller');
const taskController = require('../src/features/projects/controller/task.controller');

module.exports = {
  ...projectController,
  getProjectBoard: taskController.getProjectBoard,
  createProjectBoard: taskController.createProjectBoard,
  refreshProjectBoard: taskController.refreshProjectBoard,
  updateProjectBoard: taskController.updateTask,
  getTaskHistoryController: taskController.getTaskHistory,
  getProjectTasksHistoryController: taskController.getProjectHistory,
};
