const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');

const debug = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const users = await User.find({ rollNo: { $exists: true, $ne: null } });
        console.log(`\nFound ${users.length} users with roll numbers:`);
        users.forEach(u => {
            console.log(`ID: ${u._id}, Name: ${u.name}, RollNo: ${u.rollNo}, Email: ${u.email}`);
        });

        const studentsWithName = await User.find({ name: /STUDENT/i });
        console.log(`\nUsers with "STUDENT" in name (${studentsWithName.length}):`);
        studentsWithName.forEach(u => {
            console.log(`ID: ${u._id}, Name: ${u.name}, RollNo: ${u.rollNo}, Email: ${u.email}`);
        });

        await mongoose.disconnect();
    } catch (error) {
        console.error(error);
    }
};

debug();
