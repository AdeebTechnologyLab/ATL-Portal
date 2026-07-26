const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const readline = require('readline');

// Load env vars
// Load env vars
const envPath = path.join(__dirname, '../.env');
console.log('Loading .env from:', envPath);
const result = dotenv.config({ path: envPath });
if (result.error) {
    console.error('Error loading .env:', result.error);
}
console.log('MONGODB_URI is:', process.env.MONGODB_URI ? 'Defined' : 'UNDEFINED');

// Import Models
const User = require('../models/User');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const Assignment = require('../models/Assignment');
// const Submission = require('../models/Submission'); // Submissions are embedded in Assignment

// Checked earlier: Assignment has embedded submissionSchema, but file list didn't show Submission.js?
// Wait, file list matched "Assignment.js", "Attendance.js"...
// Let me check if Submission.js exists. Code of Assignment.js showed `submissions: [submissionSchema]`.
// But is there a separate Submission model?
// List dir showed: Assignment.js, Attendance.js, Certificate.js... User.js.
// No Submission.js in the list I saw earlier.
// So submissions are embedded in Assignment. 
// CHECK PaidTask.js: `applicants` embedded.
// CHECK DailyTask.js: Single doc per task.

const Fee = require('../models/Fee');
const Attendance = require('../models/Attendance');
const DailyTask = require('../models/DailyTask');
const Notification = require('../models/Notification');
const PaidTask = require('../models/PaidTask');
const Certificate = require('../models/Certificate');
const CertificateRequest = require('../models/CertificateRequest');
const GlobalMessage = require('../models/GlobalMessage');

// Connect to DB
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB Connected');
    } catch (err) {
        console.error('Connection failed', err);
        process.exit(1);
    }
};

const resetDb = async () => {
    await connectDB();

    const force = process.argv.includes('--force');
    if (!force) {
        console.log('Creates a "Clean Slate" for the new semester/cohort while keeping Users and Courses.');
        console.log('To execute, run: npm run db:clean -- --force');
        process.exit(0);
    }

    console.log('Starting Database Clean (Preserving ONLY Users)...');

    try {
        // 1. DELETE Collection Data
        console.log('Deleting Courses...');
        await Course.deleteMany({});

        console.log('Deleting Assignments...');
        await Assignment.deleteMany({});

        console.log('Deleting PaidTasks...');
        await PaidTask.deleteMany({});

        console.log('Deleting Enrollments...');
        await Enrollment.deleteMany({});

        console.log('Deleting Fees...');
        await Fee.deleteMany({});

        console.log('Deleting Attendance...');
        await Attendance.deleteMany({});

        console.log('Deleting DailyTasks...');
        await DailyTask.deleteMany({});

        console.log('Deleting Notifications...');
        await Notification.deleteMany({});

        console.log('Deleting Certificates...');
        await Certificate.deleteMany({});
        await CertificateRequest.deleteMany({});

        console.log('Deleting GlobalMessages...');
        await GlobalMessage.deleteMany({});

        console.log('Database Cleaned Successfully! Only Users remain.');
        process.exit(0);

    } catch (error) {
        console.error('Error cleaning database:', error);
        process.exit(1);
    }
};

resetDb();
