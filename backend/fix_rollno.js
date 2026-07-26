const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: './.env' });

const User = require('./models/User');
const Counter = require('./models/Counter');

mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/lms')
  .then(async () => {
    console.log('MongoDB Connected');

    // Find duplicates based on rollNo but different emails
    const duplicates = await User.aggregate([
        { $match: { rollNo: { $ne: null } } },
        { $group: { _id: "$rollNo", emails: { $addToSet: "$email" }, count: { $sum: 1 }, docs: { $push: "$_id" } } },
        { $match: { "emails.1": { $exists: true } } }
    ]);

    console.log(`Duplicate rollNos across different emails: ${duplicates.length}`);
    
    for (const dup of duplicates) {
        console.log(`RollNo ${dup._id} is shared by emails: ${dup.emails.join(', ')}`);
        
        // Keep the first email's roll number, and re-assign the others
        const firstEmail = dup.emails[0];
        const otherEmails = dup.emails.slice(1);
        
        for (const emailToFix of otherEmails) {
            // Give them a new roll number
            const counter = await Counter.findOneAndUpdate(
                { name: 'rollNo' },
                { $inc: { value: 1 } },
                { new: true, upsert: true }
            );
            const newRollNo = String(counter.value).padStart(4, '0');
            console.log(`Assigning new rollNo ${newRollNo} to ${emailToFix}`);
            
            await User.updateMany({ email: emailToFix }, { $set: { rollNo: newRollNo } });
        }
    }
    
    // Ensure Counter is correctly initialized
    const lastUser = await User.findOne({ rollNo: { $regex: /^\d+$/ } }).sort({ rollNo: -1 });
    const counter = await Counter.findOne({ name: 'rollNo' });
    
    if (lastUser && counter) {
        const maxVal = parseInt(lastUser.rollNo, 10);
        if (counter.value < maxVal) {
            console.log(`Fixing counter: current=${counter.value}, maxVal=${maxVal}`);
            await Counter.updateOne({ name: 'rollNo' }, { $set: { value: maxVal } });
        }
    }

    console.log("Done fixing.");
    process.exit(0);
  });
