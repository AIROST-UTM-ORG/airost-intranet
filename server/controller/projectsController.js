const projectController = require('../src/features/projects/project.controller');
const taskController = require('../src/features/projects/task.controller');

module.exports = {
  ...projectController,
  getProjectBoard: taskController.getProjectBoard,
  createProjectBoard: taskController.createProjectBoard,
  refreshProjectBoard: taskController.refreshProjectBoard,
  updateProjectBoard: taskController.updateTask,
  getTaskHistoryController: taskController.getTaskHistory,
  getProjectTasksHistoryController: taskController.getProjectHistory,
};
