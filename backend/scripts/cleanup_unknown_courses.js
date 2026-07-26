const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const Fee = require('../models/Fee');
const Assignment = require('../models/Assignment');

const deleteUnknownCourses = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lms_adeeb');
        console.log('Connected to MongoDB');

        // 1. Find all courses with title "Unknown Course"
        const unknownCourses = await Course.find({ title: 'Unknown Course' });

        if (unknownCourses.length === 0) {
            console.log('No courses found with title "Unknown Course"');
            process.exit(0);
        }

        const courseIds = unknownCourses.map(c => c._id);
        console.log(`Found ${unknownCourses.length} courses to delete:`, courseIds);

        // 2. Delete linked data
        const enrollmentDelete = await Enrollment.deleteMany({ course: { $in: courseIds } });
        console.log(`Deleted ${enrollmentDelete.deletedCount} linked Enrollments`);

        const feeDelete = await Fee.deleteMany({ course: { $in: courseIds } });
        console.log(`Deleted ${feeDelete.deletedCount} linked Fee records`);

        const assignmentDelete = await Assignment.deleteMany({ course: { $in: courseIds } });
        console.log(`Deleted ${assignmentDelete.deletedCount} linked Assignments`);

        // 3. Delete the courses themselves
        const courseDelete = await Course.deleteMany({ _id: { $in: courseIds } });
        console.log(`Deleted ${courseDelete.deletedCount} Course records`);

        console.log('Cleanup complete!');
        process.exit(0);
    } catch (error) {
        console.error('Error during cleanup:', error);
        process.exit(1);
    }
};

deleteUnknownCourses();
