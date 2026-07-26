const mongoose = require('mongoose');
const dotenv = require('dotenv');
const moment = require('moment-timezone');
const User = require('./models/User');

dotenv.config();

const testBirthdays = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lms');
        console.log('Connected to DB');
        
        const users = await User.find({ 
            dob: { $exists: true, $ne: null },
            isVerified: true 
        }).select('name photo dob role birthdayWishes rollNo');
        
        console.log('Total verified users with DOB:', users.length);

        const birthdayPeople = users.filter(user => {
            const dob = moment(user.dob);
            const birthMonth = dob.month();
            const birthDay = dob.date();
            
            const today = moment().tz('Asia/Karachi').startOf('day');
            console.log(`Checking ${user.name}: DOB ${user.dob.toISOString()}, Month ${birthMonth}, Day ${birthDay}, Today ${today.format()}`);
            
            const yearsToCheck = [today.year() - 1, today.year(), today.year() + 1];
            
            const isMatch = yearsToCheck.some(year => {
                const birthDate = moment().tz('Asia/Karachi').year(year).month(birthMonth).date(birthDay).startOf('day');
                const startWindow = moment(birthDate).subtract(1, 'days').startOf('day');
                const endWindow = moment(birthDate).add(1, 'days').endOf('day');
                const match = today.isBetween(startWindow, endWindow, null, '[]');
                if (match) console.log(`  MATCH for year ${year}: Window ${startWindow.format()} to ${endWindow.format()}`);
                return match;
            });
            return isMatch;
        });
        
        console.log('Birthday people found:', birthdayPeople.map(p => p.name));
        
        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
};

testBirthdays();
