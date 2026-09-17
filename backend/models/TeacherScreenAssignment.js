const mongoose = require('mongoose');

const teacherScreenAssignmentSchema = new mongoose.Schema({
    teacher: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    screenId: {
        type: String,
        required: true,
        trim: true
    },
    assignedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, { timestamps: true });

teacherScreenAssignmentSchema.index({ teacher: 1, screenId: 1 }, { unique: true });
teacherScreenAssignmentSchema.index({ screenId: 1 });

module.exports = mongoose.model('TeacherScreenAssignment', teacherScreenAssignmentSchema);
