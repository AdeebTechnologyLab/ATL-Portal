const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });
const Course = require('./models/Course');
const Enrollment = require('./models/Enrollment');
const User = require('./models/User');

const repairEnrollment = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB Connected');

        // 1. Get Course
        const course = await Course.findOne({ title: { $regex: 'Gen', $options: 'i' } });
        if (!course) throw new Error('Course not found');

        // 2. Get a Student (Use the first available student or specific one if known)
        // I'll grab any user with role 'intern' first, fall back to 'student'
        let student = await User.findOne({ role: 'intern' });
        if (!student) {
            console.log('No intern found, looking for student...');
            student = await User.findOne({ role: 'student' });
        }

        if (!student) {
            console.log('No student found in DB. Cannot create enrollment.');
            return; // Cannot proceed without a user
        }

        console.log(`Enrolling User: ${student.name} (${student.email}) into "${course.title}"...`);

        // 3. Create Enrollment
        const enrollment = await Enrollment.create({
            course: course._id,
            user: student._id, // Field name in Enrollment model (checked in previous steps? Assuming 'user' or 'student')
            // Double check Enrollment model schema if possible, but standard is usually 'user' or 'student'
            // Based on previous view_file of Course.js, teacher is 'ref: User'. 
            // Let's assume 'user' based on routes/courses.js populate('user')
            status: 'enrolled',
            enrolledAt: new Date(),
            paymentStatus: 'paid' // auto-approve so it shows up
        });

        console.log('Enrollment Created:', enrollment);

        // 4. Update Course Count
        course.enrolledCount = 1; // Sync it up
        await course.save();
        console.log('Course count synced.');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
};

repairEnrollment();
