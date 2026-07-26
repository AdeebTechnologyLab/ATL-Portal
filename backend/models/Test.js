const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
    question: {
        type: String,
        required: true
    },
    options: [{
        type: String
    }],
    correctOption: {
        type: Number, // Index of the correct option (0-3)
        required: true,
        default: 0
    },
    marks: {
        type: Number,
        default: 1
    }
});

const testSubmissionSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    answers: [{
        questionId: mongoose.Schema.Types.ObjectId,
        selectedOption: Number
    }],
    score: {
        type: Number,
        default: 0
    },
    totalPossibleScore: {
        type: Number,
        default: 0
    },
    submittedAt: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['completed'],
        default: 'completed'
    }
});

const testSchema = new mongoose.Schema({
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    },
    title: {
        type: String,
        required: true
    },
    description: String,
    dueDate: Date,
    scheduledAt: Date,
    questions: [questionSchema],
    totalMarks: {
        type: Number,
        required: true
    },
    duration: {
        type: Number, // in minutes
        default: 30
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
    isActive: {
        type: Boolean,
        default: true
    },
    submissions: [testSubmissionSchema],
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

testSchema.index({ course: 1 });
testSchema.index({ course: 1, createdAt: -1 });

module.exports = mongoose.model('Test', testSchema);
