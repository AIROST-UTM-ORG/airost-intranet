const TaskHistory = require('../models/TaskHistory');

/**
 * Helper function to create a history entry
 */
const createHistoryEntry = async (taskId, projectId, changeType, field, oldValue, newValue, changedBy) => {
    try {
        const changeDescription = generateChangeDescription(field, oldValue, newValue, changeType);
        
        const historyEntry = new TaskHistory({
            taskId,
            projectId,
            changeType,
            field,
            oldValue,
            newValue,
            changedBy,
            changeDescription
        });

        await historyEntry.save();
        return historyEntry;
    } catch (error) {
        console.error('Error creating history entry:', error);
        throw error;
    }
};

/**
 * Generate human-readable change descriptions
 */
const generateChangeDescription = (field, oldValue, newValue, changeType) => {
    if (changeType === 'created') {
        return 'Task created';
    }
    
    if (changeType === 'deleted') {
        return 'Task deleted';
    }

    switch (field) {
        case 'title':
            return `Title changed from "${oldValue}" to "${newValue}"`;
        case 'description':
            return oldValue ? `Description updated` : `Description added`;
        case 'column':
            return `Status changed from "${oldValue}" to "${newValue}"`;
        case 'assignee':
            if (!oldValue) {
                return `Assigned to ${newValue}`;
            } else if (!newValue) {
                return `Unassigned from ${oldValue}`;
            } else {
                return `Reassigned from ${oldValue} to ${newValue}`;
            }
        case 'priority':
            return `Priority changed from "${oldValue}" to "${newValue}"`;
        case 'dueDate':
            if (!oldValue) {
                return `Due date set to ${new Date(newValue).toLocaleDateString()}`;
            } else if (!newValue) {
                return `Due date removed`;
            } else {
                return `Due date changed from ${new Date(oldValue).toLocaleDateString()} to ${new Date(newValue).toLocaleDateString()}`;
            }
        default:
            return `${field} updated`;
    }
};

/**
 * Compare two values properly, handling different data types
 */
const valuesAreEqual = (oldValue, newValue, field) => {
    // Handle null/undefined values
    if (oldValue == null && newValue == null) return true;
    if (oldValue == null || newValue == null) return false;

    // Handle dates specially
    if (field === 'dueDate') {
        const oldDate = oldValue ? new Date(oldValue) : null;
        const newDate = newValue ? new Date(newValue) : null;
        
        if (oldDate == null && newDate == null) return true;
        if (oldDate == null || newDate == null) return false;
        
        // Compare dates by converting to ISO string to avoid timezone issues
        return oldDate.toISOString() === newDate.toISOString();
    }

    // Handle strings (trim whitespace for comparison)
    if (typeof oldValue === 'string' && typeof newValue === 'string') {
        return oldValue.trim() === newValue.trim();
    }

    // Default comparison
    return oldValue === newValue;
};

/**
 * Track changes between old and new task objects
 */
const trackTaskChanges = async (oldTask, newTask, projectId, changedBy) => {
    const fieldsToTrack = ['title', 'description', 'column', 'assignee', 'priority', 'dueDate'];
    const historyEntries = [];

    for (const field of fieldsToTrack) {
        const oldValue = oldTask ? oldTask[field] : null;
        const newValue = newTask[field];

        // Only create history entry if values are actually different
        if (!valuesAreEqual(oldValue, newValue, field)) {
            try {
                const entry = await createHistoryEntry(
                    newTask.task_id,
                    projectId,
                    'updated',
                    field,
                    oldValue,
                    newValue,
                    changedBy
                );
                historyEntries.push(entry);
            } catch (error) {
                console.error(`Error tracking change for field ${field}:`, error);
            }
        }
    }

    return historyEntries;
};

/**
 * Track task creation
 */
const trackTaskCreation = async (task, projectId, createdBy) => {
    try {
        return await createHistoryEntry(
            task.task_id,
            projectId,
            'created',
            'task_created',
            null,
            null,
            createdBy
        );
    } catch (error) {
        console.error('Error tracking task creation:', error);
        throw error;
    }
};

/**
 * Track task deletion
 */
const trackTaskDeletion = async (task, projectId, deletedBy) => {
    try {
        return await createHistoryEntry(
            task.task_id,
            projectId,
            'deleted',
            'task_deleted',
            null,
            null,
            deletedBy
        );
    } catch (error) {
        console.error('Error tracking task deletion:', error);
        throw error;
    }
};

/**
 * Get task history by task ID
 */
const getTaskHistory = async (taskId) => {
    try {
        return await TaskHistory.find({ taskId }).sort({ timestamp: -1 });
    } catch (error) {
        console.error('Error fetching task history:', error);
        throw error;
    }
};

/**
 * Get project history by project ID
 */
const getProjectHistory = async (projectId) => {
    try {
        return await TaskHistory.find({ projectId }).sort({ timestamp: -1 });
    } catch (error) {
        console.error('Error fetching project history:', error);
        throw error;
    }
};

module.exports = {
    createHistoryEntry,
    trackTaskChanges,
    trackTaskCreation,
    trackTaskDeletion,
    getTaskHistory,
    getProjectHistory,
    generateChangeDescription,
    valuesAreEqual
};
