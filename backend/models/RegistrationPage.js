const mongoose = require('mongoose');

const sectionSchema = new mongoose.Schema({
    title: { type: String, default: '' },
    items: [{ type: String }],
    type: { type: String, enum: ['list', 'grid', 'badges'], default: 'list' }
}, { _id: false });

const registrationPageSchema = new mongoose.Schema({
    formType: {
        type: String,
        enum: ['student', 'intern', 'job', 'teacher'],
        required: true,
        unique: true
    },
    announcement: {
        heading: { type: String, default: 'Announcement' },
        text: { type: String, default: '' }
    },
    statusInfo: {
        label: { type: String, default: 'Status' },
        value: { type: String, default: 'Open' },
        valueColor: { type: String, default: 'green' },
        dateLabel: { type: String, default: 'Last Date To Apply' },
        dateValue: { type: String, default: 'Always Open' }
    },
    typeBadge: {
        text: { type: String, default: 'Type: On-Site / Remote' },
        color: { type: String, default: 'primary' }
    },
    sections: [sectionSchema],
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('RegistrationPage', registrationPageSchema);
