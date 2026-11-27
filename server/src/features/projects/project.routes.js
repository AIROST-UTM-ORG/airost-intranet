const express = require('express');
const { requireAuth } = require('../../middleware/authenticate');
const { validate } = require('../../middleware/validate');
const projectController = require('./controller/project.controller');
const taskController = require('./controller/task.controller');
const {
  validateCreateProject,
  validateCreateOrUpdateProjectBoard,
  validateProjectIdParam,
  validateUpdateTask,
} = require('./project.validation');

const router = express.Router();
router.get('/tracking/:uid', validate(validateProjectIdParam('uid')), taskController.getProjectBoard);
router.post('/tracking', requireAuth, validate(validateCreateOrUpdateProjectBoard), taskController.createProjectBoard);
router.put('/tracking', requireAuth, validate(validateCreateOrUpdateProjectBoard), taskController.refreshProjectBoard);
router.put('/update', requireAuth, validate(validateUpdateTask), taskController.updateTask);
router.get('/tasks/:taskId/history', taskController.getTaskHistory);
router.get('/:projectId/history', validate(validateProjectIdParam('projectId')), taskController.getProjectHistory);
router.get('/', projectController.getProjects);
router.post('/', validate(validateCreateProject), projectController.createProject);
router.delete('/:id', validate(validateProjectIdParam('id')), projectController.deleteProject);

module.exports = router;
