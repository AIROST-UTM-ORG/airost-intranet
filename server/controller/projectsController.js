const ProjectBoard = require('../models/ProjectBoard')
const Project = require('../models/Project')
const { trackTaskChanges, trackTaskCreation, getTaskHistory, getProjectHistory } = require('../utils/historyHelper')

const getProjects = async (req, res) => {
    try {
        let projects = await Project.find().sort({ projectId: 1 })
        res.status(200).json(projects)
    } catch (error) {
        console.error("Error fetching projects:", error.message)
        res.status(500).json({ message: 'Error fetching projects', error: error.message })
    }
}

const createProject = async (req, res) => {
    try {
        const lastProject = await Project.findOne({}, {}, { sort: { 'projectId': -1 } })
        const nextProjectId = (lastProject && typeof lastProject.projectId === 'number')
            ? lastProject.projectId + 1
            : 1;

        const newProject = {
            title: req.body.title,
            description: req.body.description || "",
            lead: req.body.lead || "",
            projectId: nextProjectId,
        };

        const savedNewProject = await Project.create(newProject)

        await ProjectBoard.findOneAndUpdate(
            { projectId: savedNewProject.projectId },
            { $setOnInsert: { projectId: savedNewProject.projectId, tasks: [] } },
            { upsert: true, new: true }
        )

        res.status(201).json(savedNewProject)
    } catch (error) {
        console.error("Error creating project:", error.message)
        res.status(500).json({ message: 'Error creating project', error: error.message })
    }
}

const getProjectBoard = async (req, res) => {
    const projectId = req.params.uid;
    if (!isNaN(projectId)) {
        try {
            let projectBoard = await ProjectBoard.findOne({ "projectId": Number(projectId) })
            if (!projectBoard) {
                return res.status(200).json({ projectId: Number(projectId), tasks: [] })
            }
            res.status(200).json(projectBoard)
        } catch (error) {
            console.error("Error fetching project board:", error.message)
            res.status(500).json({ message: 'Error fetching project board', error: error.message })
        }
    } else {
        console.log(`projectId: ${projectId} is not a number`)
        res.status(400).json({ message: `projectId: ${projectId} is not a number` })
    }
}

const createProjectBoard = async (req, res) => {
    // if projectId(docuemnt) is not available in the db, then create a new document
    try {
        const existingBoard = await ProjectBoard.findOne({ projectId: req.body.projectId })
        if (!existingBoard) {
            const newProjectBoard = await ProjectBoard.create(req.body)
            
            // Track task creation for new tasks
            if (req.body.tasks && req.body.tasks.length > 0) {
                for (const task of req.body.tasks) {
                    await trackTaskCreation(task, req.body.projectId, task.createdBy || 'system');
                }
            }
            
            res.status(201).json(newProjectBoard)
            console.log("Created new project board")
        } else {
            // If the board already exists, update the existing project board with the new tasks
            const oldTasks = existingBoard.tasks || [];
            existingBoard.tasks = req.body.tasks
            await existingBoard.save()
            
            // Track new tasks that were added
            if (req.body.tasks && req.body.tasks.length > 0) {
                for (const newTask of req.body.tasks) {
                    const existingTask = oldTasks.find(t => t.task_id === newTask.task_id);
                    if (!existingTask) {
                        await trackTaskCreation(newTask, req.body.projectId, newTask.createdBy || 'system');
                    }
                }
            }
            
            res.status(200).json(existingBoard)
            console.log(`Creating tasks...Project board with id ${existingBoard.projectId} already exists, tasks updated.`);
        }
    } catch (error) {
        console.log("Error creating/updating project board: ", error.message);
        res.status(400).json(error.message);
    }
}

const refreshProjectBoard = async (req, res) => {
    try {
        const updatedProjectBoard = await ProjectBoard.findOneAndUpdate(
            { projectId: req.body.projectId },
            { $set: { tasks: req.body.tasks } },
            { new: true }
        )
        res.status(200).json(updatedProjectBoard)
    } catch (error) {
        console.error("Error refreshing project board:", error.message)
        res.status(500).json({ message: 'Error refreshing project board', error: error.message })
    }
}

const updateProjectBoard = async (req, res) => {
    try {
        // First, get the current task to compare changes
        const currentBoard = await ProjectBoard.findOne({
            projectId: req.body.projectId,
            "tasks.task_id": req.body.tasks.task_id,
        });
        
        const oldTask = currentBoard ? currentBoard.tasks.find(t => t.task_id === req.body.tasks.task_id) : null;
        
        // Update the project board
        const updatedProjectBoard = await ProjectBoard.findOneAndUpdate(
            {
                projectId: req.body.projectId,
                "tasks.task_id": req.body.tasks.task_id,
            },
            {
                $set: { "tasks.$": req.body.tasks }
            },
            { new: true }
        )
        // Track the changes
        if (oldTask) {
            const changedBy = req.body.changedBy || req.body.tasks.assignee || 'system';
            await trackTaskChanges(oldTask, req.body.tasks, req.body.projectId, changedBy);
        }
        
        console.log("Updating project...update successfully at document ", req.body.projectId, "at ", req.body.tasks)
        res.status(200).json(updatedProjectBoard)

    } catch (error) {
        console.error("Error updating project board:", error.message)
        res.status(500).json({ message: 'Error updating project board', error: error.message });
    }
}

const deleteProject = async (req, res) => {
    try {
        const projectId = req.params.id;
        
        // Delete the project
        const deletedProject = await Project.findOneAndDelete({ projectId: projectId });
        
        if (!deletedProject) {
            return res.status(404).json({ message: 'Project not found' });
        }
        
        // Delete the corresponding project board
        await ProjectBoard.findOneAndDelete({ projectId: projectId });
        
        res.status(200).json({ 
            message: 'Project and project board deleted successfully',
            deletedProject 
        });
    } catch (error) {
        console.error("Error deleting project:", error.message);
        res.status(500).json({ message: 'Error deleting project', error: error.message });
    }
}

const getTaskHistoryController = async (req, res) => {
    try {
        const { taskId } = req.params;
        const history = await getTaskHistory(taskId);
        res.status(200).json(history);
    } catch (error) {
        console.error('Error fetching task history:', error.message);
        res.status(500).json({ message: 'Error fetching task history', error: error.message });
    }
}

const getProjectTasksHistoryController = async (req, res) => {
    try {
        const { projectId } = req.params;
        const history = await getProjectHistory(parseInt(projectId));
        res.status(200).json(history);
    } catch (error) {
        console.error('Error fetching project history:', error.message);
        res.status(500).json({ message: 'Error fetching project history', error: error.message });
    }
}

module.exports = {
    getProjects,
    createProject,
    deleteProject,
    getProjectBoard,
    createProjectBoard,
    updateProjectBoard,
    refreshProjectBoard,
    getTaskHistoryController,
    getProjectTasksHistoryController
}
