
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env vars
dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('../models/User');

const checkAttendance = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
        console.log('MongoDB Connected');

        const users = await User.find({}, 'name email role attendType');

        console.log('\n--- User Attendance Types ---');
        const counts = {};

        users.forEach(u => {
            const key = `${u.role}: ${u.attendType}`;
            counts[key] = (counts[key] || 0) + 1;
        });

        console.table(counts);

        console.log('\n--- Detail for Students/Interns ---');
        users.filter(u => ['student', 'intern'].includes(u.role)).forEach(u => {
            console.log(`${u.role.padEnd(8)} | ${u.name.padEnd(20)} | attendType: '${u.attendType}'`);
        });

    } catch (err) {
        console.error(err);
    } finally {
        mongoose.connection.close();
    }
};

checkAttendance();
