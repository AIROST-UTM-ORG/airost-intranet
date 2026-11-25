const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: String,
  column: String,
  assignee: String,
  createdBy: String,
  description: String,
  priority: String,
  dueDate: Date,
  task_id: String,
});

const projectBoardSchema = new mongoose.Schema({
  projectId: {
    type: Number,
    required: true,
  },
  tasks: [taskSchema],
});

module.exports = mongoose.models.ProjectBoard || mongoose.model('ProjectBoard', projectBoardSchema);
