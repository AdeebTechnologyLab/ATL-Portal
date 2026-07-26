const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });
const Course = require('./models/Course');
const Enrollment = require('./models/Enrollment');

const debugEnrollments = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB Connected');

        // 1. Find the Gen AI Course
        const course = await Course.findOne({ title: { $regex: 'Gen', $options: 'i' } });
        if (!course) {
            console.log('Course NOT found');
            return;
        }

        console.log(`Course Found: "${course.title}"`);
        console.log(`ID: ${course._id}`);
        console.log(`EnrolledCount (in Course doc): ${course.enrolledCount}`);

        // 2. Find ACTUAL Enrollments referencing this course
        const enrollments = await Enrollment.find({ course: course._id });
        console.log(`Actual Enrollments Found: ${enrollments.length}`);

        if (enrollments.length > 0) {
            console.log('Enrollments:', enrollments);
        } else {
            console.log('!!! MISMATCH DETECTED !!!');
            console.log('The Course document says 1 student is enrolled, but the Enrollment collection has 0 records for this course.');
            console.log('This usually happens if an Enrollment was deleted but the counter wasn\'t decremented, OR if the Enrollment has a broken/ different ID.');
        }

        // 3. Dump ALL enrollments to see if there's a loose one
        console.log('\n--- Dumping ALL Enrollments (Head 5) ---');
        const allEnrollments = await Enrollment.find().limit(5).populate('course', 'title');
        allEnrollments.forEach(e => {
            console.log(`Enrollment ID: ${e._id}, Student: ${e.user}, Course ID: ${e.course?._id}, Course Title: ${e.course?.title}`);
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
};

debugEnrollments();
