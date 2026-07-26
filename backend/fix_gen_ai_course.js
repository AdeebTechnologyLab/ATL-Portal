const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });
const Course = require('./models/Course');

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB Connected');
    } catch (err) {
        console.error('Error connecting:', err.message);
        process.exit(1);
    }
};

const fixCourse = async () => {
    await connectDB();

    try {
        // Find the Gen AI course
        const courses = await Course.find({ title: { $regex: 'Gen', $options: 'i' } }); // Fuzzy search

        console.log(`Found ${courses.length} courses matching 'Gen'`);

        for (const course of courses) {
            console.log(`--------------------------------`);
            console.log(`Title: ${course.title}`);
            console.log(`ID: ${course._id}`);
            console.log(`Current TargetAudience: ${course.targetAudience}`);
            console.log(`Status: ${course.status}`);

            // Update to interns if it seems like the one user wants
            // User implies this should be for interns
            if (course.targetAudience !== 'interns') {
                console.log('Updating to "interns"...');
                course.targetAudience = 'interns';
                await course.save();
                console.log('UPDATED successfully.');
            } else {
                console.log('Already set to interns.');
            }
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Done.');
    }
};

fixCourse();
