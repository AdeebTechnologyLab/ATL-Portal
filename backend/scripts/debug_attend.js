
const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

// Load env vars
dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('../models/User');

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
        console.log('MongoDB Connected');

        // Check Students
        const students = await User.find({ role: 'student' });
        const studentTypes = {};
        students.forEach(u => {
            const type = u.attendType === undefined ? 'UNDEFINED' : `"${u.attendType}"`;
            studentTypes[type] = (studentTypes[type] || 0) + 1;
        });

        // Check Interns
        const interns = await User.find({ role: 'intern' });
        const internTypes = {};
        interns.forEach(u => {
            const type = u.attendType === undefined ? 'UNDEFINED' : `"${u.attendType}"`;
            internTypes[type] = (internTypes[type] || 0) + 1;
        });

        console.log('--- STUDENT attendType COUNTS ---');
        console.log(JSON.stringify(studentTypes, null, 2));

        console.log('--- INTERN attendType COUNTS ---');
        console.log(JSON.stringify(internTypes, null, 2));

    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}
run();
