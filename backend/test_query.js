const mongoose = require('mongoose');
const User = require('./models/User');
const DailyTask = require('./models/DailyTask');

require('dotenv').config();

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to DB");
    
    // Choose specific user ID from previous output: Salman Adeeb
    const userIdInput = "697fa91ef525fb948dcac612";
    
    const query = mongoose.Types.ObjectId.isValid(userIdInput) 
        ? { $or: [{ _id: userIdInput }, { rollNo: userIdInput }] }
        : { rollNo: userIdInput };

    const user = await User.findOne(query);
    if (!user) {
        console.log("User not found!");
        process.exit(0);
    }
    
    console.log("User found:", user._id);
    
    const tasks = await DailyTask.find({ user: user._id })
        .populate('course', 'title category')
        .sort({ createdAt: -1 });

    console.log(`Found ${tasks.length} tasks!`);
    
    process.exit(0);
}

run().catch(console.error);
