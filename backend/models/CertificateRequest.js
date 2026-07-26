const mongoose = require('mongoose');

const certificateRequestSchema = new mongoose.Schema({
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
    teacher: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'issued', 'rejected'],
        default: 'pending'
    },
    skills: String,
    duration: String,
    notes: String
}, {
    timestamps: true
});

// Avoid duplicate requests for same user and course
certificateRequestSchema.index({ user: 1, course: 1 }, { unique: true });

module.exports = mongoose.model('CertificateRequest', certificateRequestSchema);
