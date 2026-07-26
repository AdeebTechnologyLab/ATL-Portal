const mongoose = require('mongoose');
const Attendance = require('../models/Attendance');
const Course = require('../models/Course');
const User = require('../models/User');
require('dotenv').config();

const testCreateAttendanceVerbose = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const course = await Course.findOne({ isActive: true });
        if (!course) throw new Error('No active course');
        const student = await User.findOne({ role: 'student' });

        // Simulate "Today 11" (Feb 11, 2026)
        const dateStr = "2026-02-11";
        console.log(`\n--- TEST SIMULATION: Marking for ${dateStr} ---`);

        // Backend Logic Simulation
        const [year, month, day] = dateStr.split('-').map(Number);
        const attendanceDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));

        console.log(`Parsed Components: Year=${year}, Month=${month}, Day=${day}`);
        console.log(`Constructed UTC Date: ${attendanceDate.toISOString()}`);

        // Check what this date looks like in "Pakistan" time (GMT+5)
        // 2026-02-11T00:00:00Z => 2026-02-11 05:00:00 PKT
        // If it was "2026-02-12", it would be 2026-02-12T00:00:00Z

        // Create Record
        const record = new Attendance({
            course: course._id,
            date: attendanceDate,
            records: [{ user: student._id, status: 'present' }]
        });

        console.log(`\nCreated Mongoose Document (in memory):`);
        console.log(`Date Field: ${record.date}`);
        console.log(`Date Field (ISO): ${record.date.toISOString()}`);

        // We won't save it to pollute the DB, just verify logic
        if (record.date.toISOString() === '2026-02-11T00:00:00.000Z') {
            console.log('\n✅ LOGIC CHECK PASSED: Result is strictly Feb 11 UTC.');
        } else {
            console.log('\n❌ LOGIC CHECK FAILED: Result is NOT Feb 11 UTC.');
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

testCreateAttendanceVerbose();
