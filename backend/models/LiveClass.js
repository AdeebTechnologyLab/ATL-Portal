const mongoose = require('mongoose');

const liveClassSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Title is required']
    },
    link: {
        type: String,
        required: [true, 'Live class link is required']
    },
    description: {
        type: String,
        default: ''
    },
    visibility: {
        type: String,
        enum: ['all', 'student', 'intern'],
        default: 'all'
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        default: null
    },
    isActive: {
        type: Boolean,
        default: true
    },
    startTime: {
        type: Date,
        default: Date.now
    },
    endTime: {
        type: Date,
        default: null
    },
    autoEndMinutes: {
        type: Number,
        default: null  // null = no auto-end; number = minutes until auto-delete
    }
}, {
    timestamps: true
});

// Index for active classes
liveClassSchema.index({ isActive: 1, visibility: 1 });
liveClassSchema.index({ createdBy: 1 });

module.exports = mongoose.model('LiveClass', liveClassSchema);
