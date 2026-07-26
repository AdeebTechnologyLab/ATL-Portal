const mongoose = require('mongoose');
require('dotenv').config();
const DailyTask = require('./models/DailyTask');
const User = require('./models/User');
const Course = require('./models/Course');

const debug = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        const tasks = await DailyTask.find({})
            .populate('user', 'name role email')
            .populate('course', 'title targetAudience')
            .limit(10)
            .sort({ createdAt: -1 });

        console.log(`Found ${tasks.length} total tasks`);

        tasks.forEach(t => {
            console.log(`Task ID: ${t._id}`);
            console.log(`User: ${t.user?.name} (${t.user?._id}) [${t.user?.role}]`);
            console.log(`Course: ${t.course?.title} (${t.course?._id}) [${t.course?.targetAudience}]`);
            console.log(`Content: ${t.content.substring(0, 50)}...`);
            console.log('---');
        });

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

debug();
