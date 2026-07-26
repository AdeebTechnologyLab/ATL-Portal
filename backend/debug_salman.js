const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const User = require('./models/User');

dotenv.config();

const checkUser = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lms');
        console.log('Connected to DB');
        
        const user = await User.findOne({ name: /Salman Adeeb/i });
        if (user) {
            console.log('User found:', {
                name: user.name,
                dob: user.dob,
                isVerified: user.isVerified,
                role: user.role
            });
        } else {
            console.log('User Salman Adeeb not found');
        }
        
        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
};

checkUser();
