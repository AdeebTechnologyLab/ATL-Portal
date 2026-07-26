const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });
const Course = require('./models/Course');
const User = require('./models/User');

const debugTeacherCourses = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB Connected');

        // 1. Find the teacher
        const teacher = await User.findOne({ email: 'teacher@test.com' });
        if (!teacher) {
            console.log('Teacher (teacher@test.com) NOT found');
            return;
        }

        console.log(`Teacher Found: ${teacher.name}`);
        console.log(`Teacher ID: ${teacher._id}`);

        // 2. Find ALL courses to see who they are assigned to
        const allCourses = await Course.find().populate('teacher', 'name email');
        console.log(`\n--- All Courses (${allCourses.length}) ---`);
        allCourses.forEach(c => {
            console.log(`ID: ${c._id}`);
            console.log(`Title: ${c.title}`);
            console.log(`Teacher Ref (Raw): ${c.teacher?._id || c.teacher}`);
            console.log(`Teacher Name: ${c.teacher?.name || 'NONE'}`);
            console.log(`Matches current teacher: ${String(c.teacher?._id || c.teacher) === String(teacher._id)}`);
            console.log('---------------------------');
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
};

debugTeacherCourses();
