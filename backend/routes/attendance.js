const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const moment = require('moment-timezone');
const Attendance = require('../models/Attendance');
const {
    parseAttendanceDateInput,
    getAttendanceDayRange,
    formatAttendanceDate,
    findAttendanceByCourseDay,
} = require('../utils/attendanceDate');
const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');
const { sendPushNotification } = require('../utils/pushHelper');

// Lock function is now handled in controllers/attendanceController.js

// @route   GET /api/attendance/my/:courseId
// @desc    Get current user's attendance history for a course
// @access  Private
router.get('/my/:courseId', protect, async (req, res) => {
    try {
        const { courseId } = req.params;

        // Find all attendance records for this course that contain a record for this user
        const attendances = await Attendance.find({
            course: courseId,
            'records.user': req.user.id
        }).sort('date');

        // Extract only the current user's status for each date
        const myHistory = attendances.map(a => {
            const userRecord = a.records.find(r => r.user.toString() === req.user.id);
            return {
                date: a.date,
                status: userRecord ? userRecord.status : 'absent',
                markedAt: userRecord ? userRecord.markedAt : null
            };
        });

        res.json({ success: true, attendances: myHistory });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   POST /api/attendance/range-report
// @desc    Get attendance for several courses and dates in one request
// @access  Private (Teacher, Admin)
router.post('/range-report', protect, authorize('teacher', 'admin'), async (req, res) => {
    try {
        const { courseIds, startDate, endDate } = req.body;
        if (!Array.isArray(courseIds) || courseIds.length === 0 || !startDate || !endDate) {
            return res.status(400).json({ success: false, message: 'Courses, start date and end date are required' });
        }

        const start = getAttendanceDayRange(startDate).start;
        const end = getAttendanceDayRange(endDate).end;
        if (start > end) {
            return res.status(400).json({ success: false, message: 'Start date cannot be after end date' });
        }

        const requestedCourseIds = [...new Set(courseIds.map(String))];
        let allowedCourseIds = requestedCourseIds;
        if (req.user.role === 'teacher') {
            const teacherCourses = await Course.find({
                _id: { $in: requestedCourseIds },
                teachers: req.user.id
            }).select('_id');
            allowedCourseIds = teacherCourses.map((course) => course._id);
        }

        const attendances = await Attendance.find({
            course: { $in: allowedCourseIds },
            date: { $gte: start, $lte: end }
        })
            .populate('records.user', 'name rollNo photo role')
            .sort({ date: 1 });

        const data = attendances.map((attendance) => ({
            courseId: String(attendance.course),
            date: formatAttendanceDate(attendance.date),
            records: attendance.records
        }));

        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/attendance/:courseId/:date
// @desc    Get attendance for a course on a date
// @access  Private (Teacher, Admin)
router.get('/:courseId/:date', protect, authorize('teacher', 'admin'), async (req, res) => {
    try {
        const { courseId, date } = req.params;

        const attendanceDate = parseAttendanceDateInput(date);

        let attendance = await findAttendanceByCourseDay(Attendance, courseId, date);
        if (attendance) {
            await attendance.populate('records.user', 'name rollNo photo role');
        }

        // If no attendance record exists, create empty one
        if (!attendance) {
            attendance = {
                course: courseId,
                date: attendanceDate,
                records: [],
                isLocked: false
            };
        }

        res.json({
            success: true,
            attendance,
            canEdit: !attendance.isLocked // Simply check if locked by cron or admin
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   POST /api/attendance
// @desc    Mark attendance
// @access  Private (Teacher, Admin)
router.post('/', protect, authorize('teacher', 'admin'), async (req, res) => {
    try {
        const { courseId, date, records } = req.body;

        const attendanceDate = parseAttendanceDateInput(date);

        let attendance = await findAttendanceByCourseDay(Attendance, courseId, date);

        if (!attendance) {
            attendance = new Attendance({
                course: courseId,
                date: attendanceDate,
                records: []
            });
        }

        // Fetch all enrollments for this course to check for paused status
        const enrollments = await Enrollment.find({ course: courseId });
        const pausedUserIds = new Set(
            enrollments.filter(e => e.isPaused).map(e => (e.user?._id || e.user)?.toString())
        );

        // Update records
        for (const record of records) {
            const userIdStr = record.userId.toString();

            // Skip if user is paused
            if (pausedUserIds.has(userIdStr)) {
                console.log(`⏸️ Skipping attendance for paused user: ${userIdStr}`);
                continue;
            }


            // Find existing record index
            const existingIndex = attendance.records.findIndex(
                r => (r.user?._id || r.user)?.toString() === userIdStr
            );

            if (existingIndex >= 0) {
                // Update existing record
                attendance.records[existingIndex].status = record.status;
                attendance.records[existingIndex].mode = record.mode || 'onsite';
                attendance.records[existingIndex].markedBy = req.user.id;
                attendance.records[existingIndex].markedAt = moment().tz('Asia/Karachi').toDate();
            } else {
                // Add new record
                attendance.records.push({
                    user: record.userId,
                    status: record.status,
                    mode: record.mode || 'onsite',
                    markedBy: req.user.id,
                    markedAt: moment().tz('Asia/Karachi').toDate()
                });
            }
        }

        await attendance.save();

        // Emit browser notifications for each updated record
        const io = req.app.get('io');
        const courseData = await Course.findById(courseId).select('title');
        const cTitle = courseData ? courseData.title : 'Course';
        const displayDate = moment(attendanceDate).tz('Asia/Karachi').format('MMM D, YYYY');

        for (const record of records) {
            const studentId = record.userId.toString();
            const notifPayload = {
                title: 'Attendance Marked',
                body: `Your attendance for "${cTitle}" on ${displayDate} is marked as ${record.status}.`,
                icon: '/logo.png',
                image: '/logo.png',
                badge: '/logo.png',
                url: '/student/attendance'
            };

            // Socket notification (real-time in-app)
            if (io) {
                io.to(studentId).emit('new_browser_notification', {
                    title: notifPayload.title,
                    message: notifPayload.body,
                    url: notifPayload.url
                });
                
                io.to(studentId).emit('attendance_updated', {
                    courseId: courseId,
                    date: date,
                    status: record.status
                });
            }

            // Web push notification (works even when tab closed)
            sendPushNotification(studentId, notifPayload);
        }

        res.json({ success: true, attendance });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/attendance/report/:courseId
// @desc    Get attendance report for a course
// @access  Private (Teacher, Admin)
router.get('/report/:courseId', protect, authorize('teacher', 'admin'), async (req, res) => {
    try {
        const attendances = await Attendance.find({ course: req.params.courseId })
            .populate('records.user', 'name rollNo')
            .sort('date');

        res.json({ success: true, attendances });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Import SystemSetting for global holidays
const SystemSetting = require('../models/SystemSetting');

// @route   GET /api/attendance/global-holidays
// @desc    Get global holiday days (applies to all courses)
// @access  Private
router.get('/global-holidays', protect, async (req, res) => {
    try {
        const holidaySetting = await SystemSetting.findOne({ key: 'globalHolidayDays' });
        res.json({ success: true, holidayDays: holidaySetting?.value || [] });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   PUT /api/attendance/global-holidays
// @desc    Update global holiday days (Admin only)
// @access  Private (Admin)
router.put('/global-holidays', protect, authorize('admin'), async (req, res) => {
    try {
        const { holidayDays } = req.body;

        // Validate holidayDays array
        if (!Array.isArray(holidayDays) || !holidayDays.every(d => d >= 0 && d <= 6)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid holiday days. Must be array of numbers 0-6 (Sunday-Saturday)'
            });
        }

        const setting = await SystemSetting.findOneAndUpdate(
            { key: 'globalHolidayDays' },
            {
                value: holidayDays,
                description: 'Weekly off days for attendance (0=Sunday, 5=Friday, 6=Saturday)',
                updatedBy: req.user.id
            },
            { new: true, upsert: true }
        );

        res.json({ success: true, holidayDays: setting.value });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/attendance/stats/:courseId
// @desc    Get attendance statistics for a course (excluding holidays)
// @access  Private (Teacher, Admin)
router.get('/stats/:courseId', protect, authorize('teacher', 'admin'), async (req, res) => {
    try {
        const courseId = req.params.courseId;
        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({ success: false, message: 'Course not found' });
        }

        // Get global holiday settings
        const holidaySetting = await SystemSetting.findOne({ key: 'globalHolidayDays' });
        const globalHolidayDays = holidaySetting?.value || [];

        // Get all attendance records (excluding holidays)
        const attendances = await Attendance.find({
            course: courseId,
            isHoliday: { $ne: true }
        }).populate('records.user', 'name rollNo');

        // Calculate stats
        const totalDays = attendances.length;
        const stats = {};

        attendances.forEach(att => {
            att.records.forEach(record => {
                const userId = record.user?._id?.toString() || record.user?.toString();
                if (!userId) return;

                if (!stats[userId]) {
                    stats[userId] = {
                        name: record.user?.name || 'Unknown',
                        rollNo: record.user?.rollNo || '',
                        present: 0,
                        absent: 0,
                        totalDays: 0
                    };
                }
                stats[userId].totalDays++;
                if (record.status === 'present') {
                    stats[userId].present++;
                } else {
                    stats[userId].absent++;
                }
            });
        });

        // Calculate percentages
        Object.values(stats).forEach(s => {
            s.percentage = s.totalDays > 0 ? Math.round((s.present / s.totalDays) * 100) : 0;
        });

        res.json({
            success: true,
            totalDays,
            holidayDays: globalHolidayDays,
            studentStats: Object.values(stats)
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

const mongoose = require('mongoose');

// @route   GET /api/attendance/student/:userId
// @desc    Get attendance history for a specific student across all courses
// @access  Private (Teacher, Admin)
router.get('/student/:userId', protect, authorize('teacher', 'admin'), async (req, res) => {
    try {
        const User = require('../models/User');
        const mongoose = require('mongoose');
        const userIdInput = req.params.userId;

        // Advanced Identity Resolution: Find the actual user by ID or Roll Number
        const query = mongoose.Types.ObjectId.isValid(userIdInput)
            ? { $or: [{ _id: userIdInput }, { rollNo: userIdInput }] }
            : { rollNo: userIdInput };

        const user = await User.findOne(query);
        if (!user) {
            return res.json({ success: true, data: [] });
        }

        const resolvedUserId = user._id;

        // 1. Get all courses the student is enrolled in
        const Enrollment = require('../models/Enrollment');
        const enrollments = await Enrollment.find({ user: resolvedUserId });
        const courseIds = enrollments.map(e => e.course);

        // 2. Find ALL attendance records for those courses
        const attendances = await Attendance.find({
            course: { $in: courseIds }
        })
            .populate('course', 'title category')
            .sort('-date');

        // Organize by course
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
                dateKey: formatAttendanceDate(att.date),
                status,
                isHoliday: att.isHoliday,
                note: att.note
            });
        });

        res.json({ success: true, data: Object.values(result) });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;

