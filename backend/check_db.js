const mongoose = require('mongoose');
const User = require('./models/User');
const DailyTask = require('./models/DailyTask');
const Attendance = require('./models/Attendance');

require('dotenv').config();

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to DB");
    
    const tasks = await DailyTask.find().populate('user', 'name rollNo email').limit(5);
    console.log("\nSample DailyTasks:");
    tasks.forEach(t => console.log(`Task _id: ${t._id}, User: ${t.user?._id} (${t.user?.name} / ${t.user?.rollNo})`));

    const atts = await Attendance.find({ "records.0": { $exists: true } }).populate('records.user', 'name rollNo email').limit(2);
    console.log("\nSample Attendances:");
    atts.forEach(a => {
        console.log(`Att _id: ${a._id}, records count: ${a.records.length}`);
        if(a.records.length > 0) {
           console.log(`  First record user: ${a.records[0].user?._id} (${a.records[0].user?.name} / ${a.records[0].user?.rollNo})`);
        }
    });

    process.exit(0);
}

run().catch(console.error);
