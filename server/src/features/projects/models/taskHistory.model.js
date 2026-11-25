const mongoose = require('mongoose');

const taskHistorySchema = new mongoose.Schema({
  taskId: {
    type: String,
    required: true,
    index: true,
  },
  projectId: {
    type: Number,
    required: true,
    index: true,
  },
  changeType: {
    type: String,
    enum: ['created', 'updated', 'deleted'],
    required: true,
  },
  field: {
    type: String,
    enum: ['title', 'description', 'column', 'assignee', 'priority', 'dueDate', 'task_created', 'task_deleted'],
    required: true,
  },
  oldValue: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
  newValue: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
  changedBy: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  changeDescription: {
    type: String,
    required: true,
  },
}, { timestamps: true });

taskHistorySchema.index({ taskId: 1, timestamp: -1 });
taskHistorySchema.index({ projectId: 1, timestamp: -1 });

module.exports = mongoose.models.TaskHistory || mongoose.model('TaskHistory', taskHistorySchema);
