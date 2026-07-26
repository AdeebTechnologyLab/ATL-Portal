const mongoose = require('mongoose');
const Attendance = require('../models/Attendance');
require('dotenv').config();

const checkDuplicateDocuments = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        // Aggregate to find duplicates based on course and date
        const duplicates = await Attendance.aggregate([
            {
                $group: {
                    _id: { course: "$course", date: "$date" },
                    count: { $sum: 1 },
                    ids: { $push: "$_id" }
                }
            },
            {
                $match: {
                    count: { $gt: 1 }
                }
            }
        ]);

        if (duplicates.length > 0) {
            console.log(`Found ${duplicates.length} duplicate document sets.`);
            duplicates.forEach(dup => {
                console.log(`Course: ${dup._id.course}, Date: ${dup._id.date}`);
                console.log('Document IDs:', dup.ids);
            });
        } else {
            console.log('No duplicate attendance documents found.');
        }

        process.exit(0);
    } catch (error) {
        console.error('Error checking duplicates:', error);
        process.exit(1);
    }
};

checkDuplicateDocuments();
