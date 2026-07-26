const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    title: {
        type: String,
        trim: true,
        default: ''
    },
    message: {
        type: String,
        required: [true, 'Notification message is required'],
        trim: true
    },
    type: {
        type: String,
        enum: ['info', 'warning', 'success', 'error', 'red', 'blue', 'green', 'yellow', 'orange', 'pink', 'purple', 'black', 'brown', 'white', 'gray', 'magenta'],
        default: 'info'
    },
    isHtml: {
        type: Boolean,
        default: false
    },
    showLifetime: {
        type: Boolean,
        default: false
    },
    startDate: {
        type: Date,
        required: function () {
            return !this.showLifetime;
        }
    },
    endDate: {
        type: Date,
        required: function () {
            return !this.showLifetime;
        }
    },
    isActive: {
        type: Boolean,
        default: true
    },
    targetAudience: {
        type: [String],
        enum: ['all', 'student', 'teacher', 'intern', 'course_creator', 'job'],
        default: ['all']
    },
    targetLocation: {
        type: [String],
        enum: ['all', 'both', 'islamabad', 'bahawalpur'],
        default: ['both']
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

// Virtual to check if notification is currently active based on time
notificationSchema.virtual('isCurrentlyEffective').get(function () {
    if (!this.isActive) return false;
    if (this.showLifetime) return true;
    const now = new Date();
    return now >= this.startDate && now <= this.endDate;
});

module.exports = mongoose.model('Notification', notificationSchema);
