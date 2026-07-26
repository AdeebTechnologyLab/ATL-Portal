const mongoose = require('mongoose');

const dailyTaskSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    },
    // The actual work content (could be a link or text summary)
    content: {
        type: String,
        required: [true, 'Task description is required']
    },
    workLink: {
        type: String,
        trim: true
    },
    date: {
        type: Date,
        default: Date.now
    },
    marks: {
        type: Number,
        default: 0
    },
    feedback: {
        type: String,
        default: ''
    },
    gradedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    gradedAt: Date,
    status: {
        type: String,
        enum: ['submitted', 'graded', 'verified', 'rejected'],
        default: 'submitted'
    }
}, {
    timestamps: true
});

// Prevent duplicate submissions for the same day/course by the same user if needed
// dailyTaskSchema.index({ user: 1, course: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('DailyTask', dailyTaskSchema);
