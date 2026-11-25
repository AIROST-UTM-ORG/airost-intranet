const express = require('express');
const { requireAuth } = require('../../middleware/authenticate');
const { validate } = require('../../middleware/validate');
const projectController = require('./controller/project.controller');
const taskController = require('./controller/task.controller');
const { validateCreateProject, validateUpdateTask } = require('./project.validation');

const router = express.Router();
router.get('/tracking/:uid', taskController.getProjectBoard);
router.post('/tracking', requireAuth, taskController.createProjectBoard);
router.put('/tracking', requireAuth, taskController.refreshProjectBoard);
router.put('/update', requireAuth, validate(validateUpdateTask), taskController.updateTask);
router.get('/tasks/:taskId/history', taskController.getTaskHistory);
router.get('/:projectId/history', taskController.getProjectHistory);
router.get('/', projectController.getProjects);
router.post('/', validate(validateCreateProject), projectController.createProject);
router.delete('/:id', projectController.deleteProject);

module.exports = router;
