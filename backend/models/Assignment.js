const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    fileUrl: String,
    googleDriveFile: {
        id: String,
        name: String,
        mimeType: String,
        size: Number,
        thumbnailLink: String
    },
    notes: String,
    submittedAt: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['submitted', 'graded', 'rejected'],
        default: 'submitted'
    },
    marks: Number,
    feedback: String,
    gradedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    gradedAt: Date
});

const assignmentSchema = new mongoose.Schema({
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    },
    title: {
        type: String,
        required: [true, 'Title is required']
    },
    description: String,
    dueDate: {
        type: Date,
        required: true
    },
    totalMarks: {
        type: Number,
        default: 100
    },
    assignTo: {
        type: String,
        enum: ['all', 'selected', 'none'],
        default: 'all'
    },
    assignedUsers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    submissions: [submissionSchema],
    publishDate: {
        type: Date,
        default: Date.now
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Indexes for faster queries
assignmentSchema.index({ course: 1 });
assignmentSchema.index({ course: 1, createdAt: -1 });
assignmentSchema.index({ createdBy: 1 });

module.exports = mongoose.model('Assignment', assignmentSchema);
