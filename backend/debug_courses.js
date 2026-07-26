const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });
const Course = require('./models/Course');
const Enrollment = require('./models/Enrollment');

const checkCourses = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB Connected');

        // 1. Check for Duplicates
        const courses = await Course.find({ title: { $regex: 'Gen', $options: 'i' } });
        console.log(`\n--- Found ${courses.length} courses matching 'Gen' ---`);

        for (const c of courses) {
            console.log(`ID: ${c._id}`);
            console.log(`Title: ${c.title}`);
            console.log(`TargetAudience: ${c.targetAudience}`);
            console.log(`Teacher: ${c.teacher}`);
            console.log(`Status: ${c.status}`);

            // 2. Check Enrollments for this course
            const count = await Enrollment.countDocuments({ course: c._id });
            console.log(`Enrollments (DB Count): ${count}`);
            console.log('-----------------------------------');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
};

checkCourses();
