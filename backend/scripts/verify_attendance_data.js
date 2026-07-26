const mongoose = require('mongoose');
const Attendance = require('../models/Attendance');
require('dotenv').config();

const verifyAttendanceData = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const attendances = await Attendance.find({});
        let totalDuplicates = 0;

        for (const attendance of attendances) {
            const userCounts = {};
            const duplicates = [];

            attendance.records.forEach(record => {
                const userId = record.user.toString();
                if (userCounts[userId]) {
                    userCounts[userId]++;
                    if (userCounts[userId] === 2) { // Only push once
                        duplicates.push(userId);
                    }
                } else {
                    userCounts[userId] = 1;
                }
            });

            if (duplicates.length > 0) {
                console.log(`Found duplicates in Attendance ID: ${attendance._id}, Date: ${attendance.date}`);
                console.log('Duplicate User IDs:', duplicates);
                totalDuplicates += duplicates.length;
            }
        }

        console.log(`Verification complete. Total duplicate sets found: ${totalDuplicates}`);
        process.exit(0);
    } catch (error) {
        console.error('Error verifying attendance data:', error);
        process.exit(1);
    }
};

verifyAttendanceData();
