const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');

dotenv.config();

const findSalmans = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lms');
        const users = await User.find({ name: /Salman Adeeb/i });
        console.log('Found', users.length, 'users matching Salman Adeeb:');
        users.forEach(u => {
            console.log({
                id: u._id,
                name: u.name,
                email: u.email,
                role: u.role,
                isVerified: u.isVerified,
                dob: u.dob
            });
        });
        await mongoose.disconnect();
    } catch (e) { console.error(e); }
};

findSalmans();
