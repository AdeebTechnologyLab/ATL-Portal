const mongoose = require('mongoose');
const User = require('./models/User');
const Attendance = require('./models/Attendance');

require('dotenv').config();

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to DB");
    
    // Choose specific user ID: Salman Adeeb
    const userIdInput = "697fa91ef525fb948dcac612";
    
    const query = mongoose.Types.ObjectId.isValid(userIdInput) 
        ? { $or: [{ _id: userIdInput }, { rollNo: userIdInput }] }
        : { rollNo: userIdInput };

    const user = await User.findOne(query);
    if (!user) {
        console.log("User not found!");
        process.exit(0);
    }
    
    const resolvedUserId = user._id;
    console.log("Resolved User ID:", resolvedUserId);

    const attendances = await Attendance.find({
        'records.user': resolvedUserId
    }).populate('course', 'title category').sort('-date');
    
    console.log(`Found ${attendances.length} attendance raw records!`);
    
    const result = {};
    const resolvedUserIdStr = resolvedUserId.toString();
    
    attendances.forEach(att => {
        if (!att.course) return; // Skip if course is missing
        const courseId = att.course._id.toString();

        if (!result[courseId]) {
            result[courseId] = {
                courseId,
                courseTitle: att.course.title,
                courseCategory: att.course.category,
                present: 0,
                absent: 0,
                logs: []
            };
        }

        const record = att.records.find(r => r.user && r.user.toString() === resolvedUserIdStr);
        const status = record ? record.status : 'absent';

        if (status === 'present') result[courseId].present++;
        else if (status === 'absent') result[courseId].absent++;

        result[courseId].logs.push({
            date: att.date,
            status,
            isHoliday: att.isHoliday,
            note: att.note
        });
    });
    
    const finalData = Object.values(result);
    console.log("Final data to send to frontend:", JSON.stringify(finalData, null, 2));

    process.exit(0);
}

run().catch(console.error);
