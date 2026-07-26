const mongoose = require('mongoose');
const User = require('./models/User');
const Enrollment = require('./models/Enrollment');

require('dotenv').config();

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to DB");
    
    const enrollments = await Enrollment.find().populate('user', 'name rollNo').limit(5);
    console.log("\nSample Enrollments:");
    enrollments.forEach(e => {
        console.log(`Enroll _id: ${e._id}, User: ${e.user?._id} (${e.user?.name} / ${e.user?.rollNo}), Course: ${e.course}`);
    });

    process.exit(0);
}

run().catch(console.error);
