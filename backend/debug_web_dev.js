const mongoose = require('mongoose');
require('dotenv').config();
const Course = require('./models/Course');
const DailyTask = require('./models/DailyTask');
const User = require('./models/User');

const debug = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        const courses = await Course.find({ title: /Web Development/i }).populate('teacher', 'name email');
        console.log(`Found ${courses.length} courses matching "Web Development"`);

        for (const c of courses) {
            console.log(`Course: ${c.title} [${c._id}] | Teacher: ${c.teacher?.name} | Audience: ${c.targetAudience}`);
            const count = await DailyTask.countDocuments({ course: c._id });
            console.log(` - Has ${count} daily tasks`);
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

debug();
