const express = require('express');
const {
    getProjects,
    getProjectById,
    createProject,
    updateProject,
    deleteProject,
    getProjectBoard,
    createProjectBoard,
    updateProjectBoard,
    refreshProjectBoard,
    getTaskHistoryController,
    getProjectTasksHistoryController
} = require('../controller/projectsController');
const { requireAuth, optionalAuth } = require('../middleware/authMiddleware');

const router = express.Router();

// Tracking & Board routes (defined before /:id parameter to avoid collisions)
router.get('/tracking/:uid', optionalAuth, getProjectBoard);
router.post('/tracking', requireAuth, createProjectBoard);
router.put('/tracking', requireAuth, refreshProjectBoard);
router.put('/update', requireAuth, updateProjectBoard);

// Task History routes
router.get('/tasks/:taskId/history', optionalAuth, getTaskHistoryController);
router.get('/:projectId/history', optionalAuth, getProjectTasksHistoryController);

// Projects CRUD routes
router.get('/', optionalAuth, getProjects);
router.get('/:id', optionalAuth, getProjectById);
router.post('/', requireAuth, createProject);
router.put('/:id', requireAuth, updateProject);
router.patch('/:id', requireAuth, updateProject);
router.delete('/:id', requireAuth, deleteProject);

module.exports = router;