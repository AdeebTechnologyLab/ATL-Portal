const mongoose = require('mongoose');

const certificateSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        default: null   // null for teacher certificates (not tied to a course)
    },
    rollNo: {
        type: String,
        required: true
    },
    skills: String,
    duration: String,
    passoutDate: String,
    certificateLink: String,
    // For teacher certificates: admin-selected courses to display on the verify page
    selectedCourses: [{ type: String }],
    issuedAt: {
        type: Date,
        default: Date.now
    },
    issuedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Compound index: unique per user+course combination.
// sparse:true so multiple null-course teacher certs don't conflict among different users.
certificateSchema.index({ user: 1, course: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Certificate', certificateSchema);
