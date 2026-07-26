const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });
const Course = require('./models/Course');
const User = require('./models/User');

const run = async () => {
    await mongoose.connect(process.env.MONGODB_URI);
    const teacher = await User.findOne({ email: 'teacher@test.com' });
    const courses = await Course.find();
    console.log('TID:', teacher._id.toString());
    courses.forEach(c => {
        const cid = c.teacher ? (c.teacher._id || c.teacher).toString() : 'null';
        console.log(`C: ${c.title} | T_ID: ${cid} | Match: ${cid === teacher._id.toString()}`);
    });
    process.exit();
};
run();
