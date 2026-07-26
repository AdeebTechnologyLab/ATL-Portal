const mongoose = require('mongoose');

// Counter for generating sequential roll numbers
const counterSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    value: {
        type: Number,
        default: 0
    }
});

// Get next roll number (0001, 0002, etc.)
// This is the unified ID generator for all roles (Student, Intern, Teacher, etc.)
counterSchema.statics.getNextRollNo = async function () {
    // Increment atomically. If it doesn't exist, upsert creates it with value 1.
    const counter = await this.findOneAndUpdate(
        { name: 'rollNo' },
        { $inc: { value: 1 } },
        { new: true, upsert: true }
    );

    return String(counter.value).padStart(4, '0');
};

// Get next teacher ID (Legacy - Use getNextRollNo for unified identity)
counterSchema.statics.getNextTeacherId = async function () {
    const counter = await this.findOneAndUpdate(
        { name: 'teacherId' },
        { $inc: { value: 1 } },
        { new: true, upsert: true }
    );
    return 't' + String(counter.value).padStart(4, '0');
};

module.exports = mongoose.model('Counter', counterSchema);
