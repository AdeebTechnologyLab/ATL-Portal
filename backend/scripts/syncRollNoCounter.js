const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

// Load env from parent directory of this script's directory (backend/.env)
dotenv.config({ path: path.join(__dirname, '../.env') });

const Counter = require('../models/Counter');
const User = require('../models/User');

async function syncCounter() {
    try {
        const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
        if (!mongoUri) {
            console.error('❌ MONGODB_URI not found in .env');
            process.exit(1);
        }

        await mongoose.connect(mongoUri);
        console.log('✅ Connected to MongoDB');

        // 1. Find all users with numeric roll numbers
        const users = await User.find({ rollNo: { $regex: /^\d+$/ } }).select('rollNo');
        
        let maxVal = 0;
        users.forEach(u => {
            const val = parseInt(u.rollNo, 10);
            if (!isNaN(val) && val > maxVal) {
                maxVal = val;
            }
        });

        console.log(`📊 Current maximum Roll Number in database: ${String(maxVal).padStart(4, '0')}`);

        // 2. Update the counter
        const nextVal = maxVal + 1;
        const counter = await Counter.findOneAndUpdate(
            { name: 'rollNo' },
            { $set: { value: maxVal } }, // Set to maxVal, so the next getNextRollNo() gives maxVal + 1
            { new: true, upsert: true }
        );

        console.log(`🚀 Counter 'rollNo' has been synchronized to: ${counter.value}`);
        console.log(`✨ The next user will automatically receive Roll Number: ${String(nextVal).padStart(4, '0')}`);

        await mongoose.disconnect();
        console.log('👋 Done!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error syncing counter:', err);
        process.exit(1);
    }
}

syncCounter();
