const mongoose = require('mongoose');
const Attendance = require('../models/Attendance');
const Course = require('../models/Course');
const User = require('../models/User');
require('dotenv').config();

const testCreateAttendance = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        // 1. Find a course and a student
        const course = await Course.findOne({ isActive: true });
        if (!course) throw new Error('No active course found');

        const student = await User.findOne({ role: 'student' }); // Adjust role if needed
        if (!student) throw new Error('No student found');

        console.log(`Testing with Course: ${course.title} (${course._id})`);

        // 2. Simulate Frontend sending "2026-02-15" (Future date to avoid conflict)
        const dateStr = "2026-02-15";
        console.log(`Frontend sends date: ${dateStr}`);

        // 3. Backend Logic (Copied from route)
        const [year, month, day] = dateStr.split('-').map(Number);
        const attendanceDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));

        console.log(`Backend constructs Date object: ${attendanceDate.toISOString()}`);

        // 4. Create Record
        // Cleanup first just in case
        await Attendance.deleteOne({ course: course._id, date: attendanceDate });

        const attendance = new Attendance({
            course: course._id,
            date: attendanceDate,
            records: [{
                user: student._id,
                status: 'present',
                markedBy: student._id, // Self-mark for test
                markedAt: new Date()
            }]
        });

        await attendance.save();
        console.log(`Saved attendance record: ${attendance._id}`);

        // 5. Verify Storage
        const saved = await Attendance.findById(attendance._id);
        console.log(`Stored Date in DB: ${saved.date.toISOString()}`);
        console.log(`Expected Date:     2026-02-15T00:00:00.000Z`);

        if (saved.date.toISOString() === '2026-02-15T00:00:00.000Z') {
            console.log('✅ TEST PASSED: Date is stored correctly in UTC.');
        } else {
            console.error('❌ TEST FAILED: Date mismatch.');
        }

        // Cleanup
        await Attendance.deleteOne({ _id: attendance._id });
        console.log('Cleaned up test record');

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

testCreateAttendance();
