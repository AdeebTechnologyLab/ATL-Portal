const mongoose = require('mongoose');

const userNotificationSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    message: {
        type: String,
        required: true,
        trim: true
    },
    type: {
        type: String,
        enum: [
            'task_application', 'task_assigned', 'task_submitted', 'task_completed', 'task_paid',
            'assignment_assigned', 'assignment_submission', 'new_assignment',
            'test_assigned', 'graded', 'user_profile_updated', 'general'
        ],
        default: 'general'
    },
    relatedTask: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PaidTask'
    },
    relatedUser: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    isRead: {
        type: Boolean,
        default: false
    },
    readAt: {
        type: Date
    }
}, {
    timestamps: true
});

// Index for efficient queries
userNotificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('UserNotification', userNotificationSchema);
