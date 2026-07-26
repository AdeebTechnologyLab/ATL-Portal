const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');

const debug = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const variations = ['0005', '005', '05', '5', 5];
        for (const v of variations) {
            const users = await User.find({ rollNo: v });
            console.log(`Searching for "${v}" (${typeof v}): Found ${users.length}`);
            users.forEach(u => console.log(`  - ID: ${u._id}, Name: ${u.name}, RollNo: ${u.rollNo}`));
        }

        await mongoose.disconnect();
    } catch (error) {
        console.error(error);
    }
};

debug();
