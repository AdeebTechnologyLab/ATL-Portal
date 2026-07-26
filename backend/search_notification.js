const mongoose = require('mongoose');
const Notification = require('./models/Notification');
require('dotenv').config();

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to DB");
    
    const notifications = await Notification.find({
        message: /Class Timing/i
    });
    
    console.log(`Found ${notifications.length} notifications:`);
    notifications.forEach(n => {
        console.log(`- ID: ${n._id}`);
        console.log(`  Title: ${n.title}`);
        console.log(`  Message: ${n.message}`);
    });

    process.exit(0);
}

run().catch(err => {
    console.error(err);
    process.exit(1);
});
