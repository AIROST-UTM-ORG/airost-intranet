const mongoose = require('mongoose');
const ProjectBoard = require('../models/ProjectBoard');
const Project = require('../models/Project');
const { trackTaskChanges, trackTaskCreation, getTaskHistory, getProjectHistory } = require('../utils/historyHelper');
const { checkProjectPermission, isAdmin } = require('../middleware/authMiddleware');

// Helper to find project by projectId (number) or _id (ObjectId)
const findProjectByIdOrNumber = async (idParam) => {
    const isNum = !isNaN(idParam) && !isNaN(parseFloat(idParam));
    const isObjectId = mongoose.Types.ObjectId.isValid(idParam);

    const conditions = [];
    if (isNum) conditions.push({ projectId: Number(idParam) });
    if (isObjectId) conditions.push({ _id: idParam });

    if (conditions.length === 0) return null;
    return await Project.findOne({ $or: conditions });
};

// GET all projects
const getProjects = async (req, res) => {
    try {
        let projects = await Project.find().sort({ createdAt: -1 });

        // If user is authenticated, decorate each project with permissions
        const projectsWithPerms = projects.map(p => {
            const doc = p.toObject();
            if (req.user) {
                doc.permissions = checkProjectPermission(p, req.user);
            } else {
                doc.permissions = { canView: true, canEdit: false, canDelete: false, role: 'unauthenticated' };
            }
            return doc;
        });

        return res.status(200).json(projectsWithPerms);
    } catch (error) {
        console.error("Error in getProjects:", error.message);
        return res.status(500).json({ error: "Failed to retrieve projects" });
    }
};

// GET a single project by id/projectId
const getProjectById = async (req, res) => {
    try {
        const project = await findProjectByIdOrNumber(req.params.id);
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        const doc = project.toObject();
        if (req.user) {
            doc.permissions = checkProjectPermission(project, req.user);
        } else {
            doc.permissions = { canView: true, canEdit: false, canDelete: false, role: 'unauthenticated' };
        }

        return res.status(200).json(doc);
    } catch (error) {
        console.error("Error in getProjectById:", error.message);
        return res.status(500).json({ error: "Failed to retrieve project" });
    }
};

// POST create a new project
const createProject = async (req, res) => {
    try {
        const { title, description, lead, field, category, teamMembers, access } = req.body;

        // Input Validation
        if (!title || typeof title !== 'string' || title.trim().length < 2) {
            return res.status(400).json({ error: 'Project title is required (minimum 2 characters)' });
        }
        if (!description || typeof description !== 'string' || description.trim().length < 3) {
            return res.status(400).json({ error: 'Project description is required' });
        }
        if (!lead || typeof lead !== 'string' || lead.trim().length === 0) {
            return res.status(400).json({ error: 'Project lead is required' });
        }

        // Determine next projectId
        const lastProject = await Project.findOne({}, {}, { sort: { projectId: -1 } });
        const nextProjectId = lastProject && typeof lastProject.projectId === 'number' ? lastProject.projectId + 1 : 1;

        const creator = req.user ? (req.user.email || req.user.name) : lead.trim();

        const newProjectData = {
            projectId: nextProjectId,
            title: title.trim(),
            description: description.trim(),
            lead: lead.trim(),
            category: (category || field || 'Web development').trim(),
            teamMembers: Array.isArray(teamMembers) ? teamMembers : [],
            access: Array.isArray(access) ? access : [],
            createdBy: creator,
            owner: creator,
        };

        const savedProject = await Project.create(newProjectData);

        await ProjectBoard.findOneAndUpdate(
            { projectId: nextProjectId },
            { $setOnInsert: { projectId: nextProjectId, tasks: [] } },
            { upsert: true, new: true }
        );

        console.log(`Created project #${nextProjectId}: "${savedProject.title}" by ${creator}`);
        return res.status(201).json(savedProject);
    } catch (error) {
        console.error("Error in createProject:", error.message);
        return res.status(500).json({ error: error.message });
    }
};

// PUT/PATCH update a project
const updateProject = async (req, res) => {
    try {
        const projectIdParam = req.params.id;
        const project = await findProjectByIdOrNumber(projectIdParam);

        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        // Authorization check
        const permission = checkProjectPermission(project, req.user);
        if (!permission.canEdit) {
            return res.status(403).json({
                error: 'Forbidden: You do not have permission to update this project. Only project owners, leads, or administrators can update projects.'
            });
        }

        const { title, description, lead, field, category, teamMembers, access } = req.body;

        // Only lead, owner, or admin can modify team members, lead, or access
        const isLeadOrAdmin = permission.role === 'lead' || permission.role === 'admin';
        if (!isLeadOrAdmin && (lead !== undefined || teamMembers !== undefined || access !== undefined)) {
            return res.status(403).json({
                error: 'Forbidden: Only project owners, leads, or administrators can change project lead, members, or access permissions.'
            });
        }

        // Input validation if fields are provided
        if (title !== undefined) {
            if (typeof title !== 'string' || title.trim().length < 2) {
                return res.status(400).json({ error: 'Project title must be at least 2 characters' });
            }
            project.title = title.trim();
        }

        if (description !== undefined) {
            if (typeof description !== 'string' || description.trim().length < 3) {
                return res.status(400).json({ error: 'Project description is required' });
            }
            project.description = description.trim();
        }

        if (lead !== undefined) {
            if (typeof lead !== 'string' || lead.trim().length === 0) {
                return res.status(400).json({ error: 'Project lead cannot be empty' });
            }
            project.lead = lead.trim();
        }

        if (category !== undefined || field !== undefined) {
            project.category = (category || field || project.category).trim();
        }

        if (teamMembers !== undefined) {
            if (!Array.isArray(teamMembers)) {
                return res.status(400).json({ error: 'Team members must be an array' });
            }
            project.teamMembers = [...new Set(teamMembers.map(m => typeof m === 'string' ? m.trim() : '').filter(Boolean))];
        }

        if (access !== undefined) {
            if (!Array.isArray(access)) {
                return res.status(400).json({ error: 'Access list must be an array' });
            }
            project.access = [...new Set(access.map(a => typeof a === 'string' ? a.trim() : '').filter(Boolean))];
        }

        const updatedProject = await project.save();
        console.log(`Updated project #${project.projectId}: "${updatedProject.title}"`);
        return res.status(200).json(updatedProject);
    } catch (error) {
        console.error("Error in updateProject:", error.message);
        return res.status(500).json({ error: error.message });
    }
};

// DELETE delete a project
const deleteProject = async (req, res) => {
    try {
        const projectIdParam = req.params.id;
        const project = await findProjectByIdOrNumber(projectIdParam);

        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        // Authorization check: Only Lead, Owner, or Admin can delete
        const permission = checkProjectPermission(project, req.user);
        if (!permission.canDelete) {
            return res.status(403).json({
                error: 'Forbidden: You do not have permission to delete this project. Only project owners, leads, or administrators can delete projects.'
            });
        }

        await Project.findOneAndDelete({ _id: project._id });
        await ProjectBoard.findOneAndDelete({ projectId: project.projectId });

        console.log(`Deleted project #${project.projectId}: "${project.title}"`);
        return res.status(200).json({
            message: 'Project and project board deleted successfully',
            deletedProject: project,
        });
    } catch (error) {
        console.error("Error in deleteProject:", error.message);
        return res.status(500).json({ error: error.message });
    }
};

const getProjectBoard = async (req, res) => {
    const projectId = req.params.uid;
    if (!isNaN(projectId)) {
        try {
            let projectBoard = await ProjectBoard.findOne({ "projectId": Number(projectId) });
            if (!projectBoard) {
                return res.status(200).json({ projectId: Number(projectId), tasks: [] });
            }
            return res.status(200).json(projectBoard);
        } catch (error) {
            console.error(error.message);
            return res.status(500).json({ error: error.message });
        }
    } else {
        return res.status(400).json({ error: `projectId: ${projectId} is not a valid number` });
    }
};

const createProjectBoard = async (req, res) => {
    try {
        const existingBoard = await ProjectBoard.findOne({ projectId: req.body.projectId });
        if (!existingBoard) {
            const newProjectBoard = await ProjectBoard.create(req.body);
            if (req.body.tasks && req.body.tasks.length > 0) {
                for (const task of req.body.tasks) {
                    await trackTaskCreation(task, req.body.projectId, task.createdBy || 'system');
                }
            }
            return res.status(201).json(newProjectBoard);
        } else {
            const oldTasks = existingBoard.tasks || [];
            existingBoard.tasks = req.body.tasks;
            await existingBoard.save();

            if (req.body.tasks && req.body.tasks.length > 0) {
                for (const newTask of req.body.tasks) {
                    const existingTask = oldTasks.find(t => t.task_id === newTask.task_id);
                    if (!existingTask) {
                        await trackTaskCreation(newTask, req.body.projectId, newTask.createdBy || 'system');
                    }
                }
            }
            return res.status(200).json(existingBoard);
        }
    } catch (error) {
        console.error("Error creating/updating project board: ", error.message);
        return res.status(400).json({ error: error.message });
    }
};

const refreshProjectBoard = async (req, res) => {
    try {
        const updatedProjectBoard = await ProjectBoard.findOneAndUpdate(
            { projectId: req.body.projectId },
            { $set: { tasks: req.body.tasks } },
            { new: true }
        );
        return res.status(200).json(updatedProjectBoard);
    } catch (error) {
        console.error(error.message);
        return res.status(500).json({ error: error.message });
    }
};

const updateProjectBoard = async (req, res) => {
    try {
        const currentBoard = await ProjectBoard.findOne({
            projectId: req.body.projectId,
            "tasks.task_id": req.body.tasks.task_id,
        });

        const oldTask = currentBoard ? currentBoard.tasks.find(t => t.task_id === req.body.tasks.task_id) : null;

        const updatedProjectBoard = await ProjectBoard.findOneAndUpdate(
            {
                projectId: req.body.projectId,
                "tasks.task_id": req.body.tasks.task_id,
            },
            {
                $set: { "tasks.$": req.body.tasks }
            },
            { new: true }
        );

        if (oldTask) {
            const changedBy = req.body.changedBy || req.body.tasks.assignee || 'system';
            await trackTaskChanges(oldTask, req.body.tasks, req.body.projectId, changedBy);
        }

        return res.status(200).json(updatedProjectBoard);
    } catch (error) {
        console.error(error.message);
        return res.status(500).json({ message: 'Error updating project board', error: error.message });
    }
};

const getTaskHistoryController = async (req, res) => {
    try {
        const { taskId } = req.params;
        const history = await getTaskHistory(taskId);
        return res.status(200).json(history);
    } catch (error) {
        console.error('Error fetching task history:', error.message);
        return res.status(500).json({ message: 'Error fetching task history', error: error.message });
    }
};

const getProjectTasksHistoryController = async (req, res) => {
    try {
        const { projectId } = req.params;
        const history = await getProjectHistory(parseInt(projectId));
        return res.status(200).json(history);
    } catch (error) {
        console.error('Error fetching project history:', error.message);
        return res.status(500).json({ message: 'Error fetching project history', error: error.message });
    }
};

module.exports = {
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
};
