const Attendance = require('../models/Attendance');
const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');
const SystemSetting = require('../models/SystemSetting');
const moment = require('moment-timezone');
const { parseAttendanceDateInput, findAttendanceByCourseDay } = require('../utils/attendanceDate');

// Called by cron job at 12:00 AM Pakistan Time to auto-save and lock yesterday's attendance
const lockTodayAttendance = async () => {
    // The cron fires at 00:00 PKT.
    // 'yesterday' in PKT: 
    const yesterdayMoment = moment().tz('Asia/Karachi').subtract(1, 'days').startOf('day');
    const yesterday = parseAttendanceDateInput(yesterdayMoment.format('YYYY-MM-DD'));

    const yesterdayDayOfWeek = yesterdayMoment.day(); // 0=Sunday, 1=Monday, ..., 6=Saturday

    console.log(`🔒 Auto-saving PKT attendance for ${yesterdayMoment.format('YYYY-MM-DD')} (PKT Day: ${yesterdayDayOfWeek}, triggered at ${new Date().toISOString()})...`);

    // Get global holiday settings
    const holidaySetting = await SystemSetting.findOne({ key: 'globalHolidayDays' });
    const globalHolidayDays = holidaySetting?.value || [];
    const isGlobalHoliday = globalHolidayDays.includes(yesterdayDayOfWeek);

    console.log(`📅 Global holidays: ${globalHolidayDays.join(', ') || 'None'}, Yesterday is holiday: ${isGlobalHoliday}`);

    // 1. Get all active courses
    const activeCourses = await Course.find({ isActive: true });

    console.log(`📚 Found ${activeCourses.length} active courses`);

    let processedCount = 0;
    let createdCount = 0;
    let holidayCount = 0;

    for (const course of activeCourses) {
        try {
            // Check if yesterday is a global holiday
            if (isGlobalHoliday) {
                // Create or update attendance record as holiday
                let attendance = await findAttendanceByCourseDay(
                    Attendance,
                    course._id,
                    yesterdayMoment.format('YYYY-MM-DD')
                );

                if (!attendance) {
                    attendance = new Attendance({
                        course: course._id,
                        date: yesterday,
                        records: [],
                        isHoliday: true,
                        isLocked: true,
                        lockedAt: new Date()
                    });
                } else {
                    attendance.isHoliday = true;
                    attendance.isLocked = true;
                    attendance.lockedAt = new Date();
                }

                await attendance.save();
                holidayCount++;
                console.log(`📅 Marked ${course.title} as HOLIDAY for ${yesterday.toISOString().split('T')[0]}`);
                continue; // Skip to next course
            }

            // 2. Find or Create attendance record for yesterday (non-holiday)
            let attendance = await findAttendanceByCourseDay(
                Attendance,
                course._id,
                yesterdayMoment.format('YYYY-MM-DD')
            );

            if (!attendance) {
                attendance = new Attendance({
                    course: course._id,
                    date: yesterday,
                    records: [],
                    isLocked: false,
                    isHoliday: false
                });
                createdCount++;
            }

            if (attendance.isLocked) continue; // Already processed

            // 3. Get all enrolled students/interns for this course
            const enrollments = await Enrollment.find({
                course: course._id,
                status: { $in: ['enrolled', 'active'] },
                isPaused: { $ne: true } // Skip paused students
            });

            // 4. Mark missing students as absent (those not already marked)
            for (const enrollment of enrollments) {
                const studentId = enrollment.user?._id || enrollment.user;
                if (!studentId) continue;

                const existingRecord = attendance.records.find(
                    r => (r.user?._id || r.user)?.toString() === studentId.toString()
                );

                if (!existingRecord) {
                    // Not marked yet -> Auto-Absent
                    attendance.records.push({
                        user: studentId,
                        status: 'absent',
                        markedAt: new Date(),
                        autoMarked: true // Flag to indicate this was auto-marked
                    });
                }
            }

            // 5. Lock it up
            attendance.isLocked = true;
            attendance.lockedAt = new Date();
            await attendance.save();
            processedCount++;
        } catch (err) {
            console.error(`Error processing course ${course.title}:`, err.message);
        }
    }

    console.log(`✅ Auto-saved & locked ${processedCount} attendance records (${createdCount} new, ${holidayCount} holidays) at 12:00 AM PKT`);
    return { processedCount, createdCount, holidayCount };
};

module.exports = { lockTodayAttendance };
