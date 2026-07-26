const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { lockTodayAttendance } = require('./controllers/attendanceController');
const Course = require('./models/Course');
const User = require('./models/User');
const Enrollment = require('./models/Enrollment');
const Attendance = require('./models/Attendance');

dotenv.config();

async function verifyLock() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        // 1. Create a dummy course active today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        console.log('Today date for check:', today.toISOString());

        const course = await Course.findOneAndUpdate(
            { title: 'Test Attendance Course' },
            {
                title: 'Test Attendance Course',
                status: 'active',
                startDate: new Date(Date.now() - 86400000), // yesterday
                endDate: new Date(Date.now() + 86400000)   // tomorrow
            },
            { upsert: true, new: true }
        );
        console.log('Test course ID:', course._id);

        // 2. Create a dummy student
        const student = await User.findOneAndUpdate(
            { email: 'test_student@example.com' },
            { name: 'Test Student', role: 'intern', isVerified: true },
            { upsert: true, new: true }
        );
        console.log('Student ID:', student._id);

        // 3. Enroll student
        await Enrollment.findOneAndUpdate(
            { user: student._id, course: course._id },
            { status: 'enrolled' },
            { upsert: true }
        );

        // 4. Ensure no attendance for today yet
        await Attendance.deleteOne({ course: course._id, date: today });

        // 5. Run the lock function
        console.log('Running lockTodayAttendance...');
        const count = await lockTodayAttendance();
        console.log('Lock returned processed courses count:', count);

        // 6. Verify record created and student marked absent
        const attendance = await Attendance.findOne({ course: course._id, date: today });
        if (attendance) {
            console.log('Attendance Record Found. isLocked:', attendance.isLocked);
            const record = attendance.records.find(r => r.user.toString() === student._id.toString());
            if (record) {
                console.log('Student record found. Status:', record.status);
                if (record.status === 'absent' && attendance.isLocked) {
                    console.log('✅ VERIFICATION SUCCESSFUL: Student auto-marked correctly and locked.');
                }
            } else {
                console.log('❌ Student record missing in attendance document');
            }
        } else {
            console.log('❌ Attendance record NOT FOUND for course', course._id, 'on date', today.toISOString());
        }

        // Cleanup
        await Attendance.deleteOne({ course: course._id, date: today });
        await Enrollment.deleteOne({ user: student._id, course: course._id });
        await Course.deleteOne({ _id: course._id });
        await User.deleteOne({ _id: student._id });

        process.exit(0);
    } catch (error) {
        console.error('Verification failed:', error);
        process.exit(1);
    }
}

verifyLock();
