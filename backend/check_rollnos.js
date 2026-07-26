const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');

async function check() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const users = await User.find({ rollNo: { $exists: true, $ne: null } }).limit(10);
        console.log('Users with Roll Numbers:');
        users.forEach(u => {
            console.log(`- ${u.email} (${u.role}): ${u.rollNo}`);
        });

        const counts = await User.countDocuments({ rollNo: { $exists: true, $ne: null } });
        console.log(`Total users with roll numbers: ${counts}`);

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

check();
