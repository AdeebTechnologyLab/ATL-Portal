const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const Fee = require('../models/Fee');

const cleanupOrphanedData = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lms_adeeb');
        console.log('Connected to MongoDB');

        // 1. Find Fee records with null course
        const orphanedFees = await Fee.find({ course: null });
        console.log(`Found ${orphanedFees.length} orphaned Fee records (course is null)`);

        if (orphanedFees.length > 0) {
            const feeIds = orphanedFees.map(f => f._id);
            await Fee.deleteMany({ _id: { $in: feeIds } });
            console.log(`Deleted ${orphanedFees.length} Fee records`);
        }

        // 2. Find Enrollment records with null course
        const orphanedEnrollments = await Enrollment.find({ course: null });
        console.log(`Found ${orphanedEnrollments.length} orphaned Enrollment records (course is null)`);

        if (orphanedEnrollments.length > 0) {
            const enrollIds = orphanedEnrollments.map(e => e._id);
            await Enrollment.deleteMany({ _id: { $in: enrollIds } });
            console.log(`Deleted ${orphanedEnrollments.length} Enrollment records`);
        }

        console.log('Orphaned cleanup complete!');
        process.exit(0);
    } catch (error) {
        console.error('Error during cleanup:', error);
        process.exit(1);
    }
};

cleanupOrphanedData();
