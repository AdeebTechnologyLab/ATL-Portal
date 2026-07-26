const mongoose = require('mongoose');
require('dotenv').config();
const Course = require('./models/Course');
const User = require('./models/User');

const debug = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        const courses = await Course.find({}).populate('teacher', 'name email');
        console.log(`Found ${courses.length} total courses:`);

        courses.forEach(c => {
            console.log(` - ID: ${c._id} | Title: ${c.title} | Teacher: ${c.teacher?.name} (${c.teacher?._id}) | Audience: ${c.targetAudience}`);
        });

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

debug();
