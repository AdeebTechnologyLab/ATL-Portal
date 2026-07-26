const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const Fee = require('../models/Fee');

const cleanupBrokenReferences = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lms_adeeb');
        console.log('Connected to MongoDB');

        // 1. Get all valid Course IDs
        const allCourses = await Course.find({}, '_id');
        const validCourseIds = allCourses.map(c => c._id.toString());
        console.log(`Valid courses in DB: ${validCourseIds.length}`);

        // 2. Find Fee records with broken course IDs
        const allFees = await Fee.find({});
        const brokenFees = allFees.filter(f => f.course && !validCourseIds.includes(f.course.toString()));
        console.log(`Found ${brokenFees.length} Fee records with broken course references`);

        if (brokenFees.length > 0) {
            const idsToDelete = brokenFees.map(f => f._id);
            await Fee.deleteMany({ _id: { $in: idsToDelete } });
            console.log(`Deleted ${brokenFees.length} broken Fee records`);
        }

        // 3. Find Enrollment records with broken course IDs
        const allEnrollments = await Enrollment.find({});
        const brokenEnrollments = allEnrollments.filter(e => e.course && !validCourseIds.includes(e.course.toString()));
        console.log(`Found ${brokenEnrollments.length} Enrollment records with broken course references`);

        if (brokenEnrollments.length > 0) {
            const idsToDelete = brokenEnrollments.map(e => e._id);
            await Enrollment.deleteMany({ _id: { $in: idsToDelete } });
            console.log(`Deleted ${brokenEnrollments.length} broken Enrollment records`);
        }

        console.log('Broken reference cleanup complete!');
        process.exit(0);
    } catch (error) {
        console.error('Error during cleanup:', error);
        process.exit(1);
    }
};

cleanupBrokenReferences();
