const mongoose = require('mongoose');
const Attendance = require('../models/Attendance');
require('dotenv').config();

const cleanupAttendanceDuplicates = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const attendances = await Attendance.find({});
        let totalCleaned = 0;

        for (const attendance of attendances) {
            const userRecords = {};
            const uniqueRecords = [];
            let hasDuplicates = false;

            // Sort records by markedAt desc so we keep the latest one
            attendance.records.sort((a, b) => new Date(b.markedAt) - new Date(a.markedAt));

            for (const record of attendance.records) {
                const userId = record.user.toString();
                if (!userRecords[userId]) {
                    userRecords[userId] = true;
                    uniqueRecords.push(record);
                } else {
                    hasDuplicates = true;
                    console.log(`Removing duplicate for user ${userId} in attendance ${attendance._id}`);
                }
            }

            if (hasDuplicates) {
                attendance.records = uniqueRecords;
                await attendance.save();
                totalCleaned++;
                console.log(`Cleaned attendance ${attendance._id}`);
            }
        }

        console.log(`Cleanup complete. Total documents cleaned: ${totalCleaned}`);
        process.exit(0);
    } catch (error) {
        console.error('Error cleaning attendance data:', error);
        process.exit(1);
    }
};

cleanupAttendanceDuplicates();
