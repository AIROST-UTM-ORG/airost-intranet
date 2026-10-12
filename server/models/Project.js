const mongoose = require('mongoose'); 

const projectSchema = new mongoose.Schema({
    projectId: {
        type: Number,
        required: true,
        unique: true,
    },
    title: {
        type: String,
        required: true,
        trim: true,
    },
    description: {
        type: String,
        required: true,
        trim: true,
    },
    lead: {
        type: String,
        required: true,
        trim: true,
    },
    category: {
        type: String,
        default: 'Web development',
        trim: true,
    },
    teamMembers: {
        type: [String],
        default: [],
    },
    access: {
        type: [String],
        default: [],
    },
    createdBy: {
        type: String,
        trim: true,
    },
    owner: {
        type: String,
        trim: true,
    },
}, { timestamps: true });

module.exports = mongoose.model('Project', projectSchema);