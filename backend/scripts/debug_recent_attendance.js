const mongoose = require('mongoose');
const Attendance = require('../models/Attendance');
const Course = require('../models/Course');
require('dotenv').config();

const debugRecentAttendance = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        // Find attendance records created/updated in the last 24 hours
        const oneDayAgo = new Date();
        oneDayAgo.setDate(oneDayAgo.getDate() - 1);

        const recent = await Attendance.find({
            updatedAt: { $gte: oneDayAgo }
        }).sort({ updatedAt: -1 }).limit(10).populate('course', 'title');

        console.log(`Found ${recent.length} recent records:`);
        recent.forEach(r => {
            console.log('---');
            console.log(`ID: ${r._id}`);
            console.log(`Course: ${r.course?.title} (${r.course?._id})`);
            console.log(`Stored Date (Raw): ${r.date}`);
            console.log(`Stored Date (ISO): ${r.date.toISOString()}`);
            console.log(`Updated At: ${r.updatedAt.toISOString()}`);

            // Check if timezone offset looks suspicious
            const d = new Date(r.date);
            console.log(`UTC Hour: ${d.getUTCHours()}`); // Should be 0
        });

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

debugRecentAttendance();
