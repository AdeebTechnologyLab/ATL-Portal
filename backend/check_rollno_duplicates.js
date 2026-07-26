const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: './.env' });

const User = require('./models/User');
const Counter = require('./models/Counter');

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/lms')
  .then(async () => {
    console.log('MongoDB Connected');
    
    // Check total users and missing roll numbers
    const totalUsers = await User.countDocuments();
    const missingRollNo = await User.countDocuments({ rollNo: { $exists: false } });
    const nullRollNo = await User.countDocuments({ rollNo: null });
    
    console.log(`Total users: ${totalUsers}`);
    console.log(`Users with missing rollNo: ${missingRollNo}`);
    console.log(`Users with null rollNo: ${nullRollNo}`);

    // Check for duplicates
    const duplicates = await User.aggregate([
        { $match: { rollNo: { $ne: null } } },
        { $group: { _id: "$rollNo", emails: { $addToSet: "$email" }, count: { $sum: 1 } } },
        { $match: { "emails.1": { $exists: true } } } // More than 1 distinct email
    ]);

    console.log(`Duplicate rollNos across different emails: ${duplicates.length}`);
    if (duplicates.length > 0) {
        console.log('Examples:', duplicates.slice(0, 3));
    }
    
    // Check Counter state
    const counter = await Counter.findOne({ name: 'rollNo' });
    console.log('Counter state:', counter);

    process.exit(0);
  });
