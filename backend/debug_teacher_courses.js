const mongoose = require('mongoose');
require('dotenv').config();
const Course = require('./models/Course');
const User = require('./models/User');

const debug = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        // Find all teachers
        const teachers = await User.find({ role: 'teacher' }).select('name email');
        console.log(`Found ${teachers.length} teachers`);

        for (const t of teachers) {
            const courses = await Course.find({ teacher: t._id });
            console.log(`Teacher: ${t.name} (${t._id}) has ${courses.length} courses:`);
            courses.forEach(c => {
                console.log(` - ${c.title} [${c._id}] (${c.targetAudience})`);
            });
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

debug();
