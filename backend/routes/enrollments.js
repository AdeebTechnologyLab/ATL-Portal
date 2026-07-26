const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Fee = require('../models/Fee');
const Assignment = require('../models/Assignment');
const Test = require('../models/Test');
const DailyTask = require('../models/DailyTask');
const moment = require('moment-timezone');

// @route   GET /api/enrollments/my
// @desc    Get current user's enrollments
// @access  Private
router.get('/my', protect, async (req, res) => {
    try {
        const enrollments = await Enrollment.find({ user: req.user.id })
            .populate({
                path: 'course',
                populate: { path: 'teachers', select: 'name email specialization photo' }
            })
            .sort('-createdAt');

        // Calculate attendance stats for each enrollment and update active status
        const data = await Promise.all(enrollments.map(async (e) => {
            // Only run auto-status update if enrollment is NOT already explicitly active
            // (i.e., explicitly set active by admin during fee verification)
            // This prevents auto-deactivation from overriding admin's decision
            if (!e.isActive || e.status !== 'enrolled') {
                const wasActive = e.isActive;
                const nowActive = e.updateActiveStatus();
                if (wasActive !== nowActive) {
                    await e.save();
                }
            }

            const eObj = e.toObject();
            const courseId = e.course?._id;

            if (courseId) {
                const totalClasses = await Attendance.countDocuments({
                    course: courseId,
                    'records.user': req.user.id
                });
                const attendedClasses = await Attendance.countDocuments({
                    course: courseId,
                    records: { $elemMatch: { user: req.user.id, status: 'present' } }
                });

                const userId = req.user.id.toString();

                const courseAssignments = await Assignment.find({ course: courseId });
                const applicableAssignments = courseAssignments.filter(a => 
                    a.assignTo === 'all' || (a.assignedUsers && a.assignedUsers.map(id => id.toString()).includes(userId))
                );
                const totalAssignments = applicableAssignments.length;
                const submittedAssignments = applicableAssignments.filter(a => 
                    a.submissions && a.submissions.some(sub => sub.user.toString() === userId)
                ).length;

                const courseTests = await Test.find({ course: courseId });
                const applicableTests = courseTests.filter(t => 
                    t.assignTo === 'all' || (t.assignedUsers && t.assignedUsers.map(id => id.toString()).includes(userId))
                );
                const totalTests = applicableTests.length;
                const submittedTests = applicableTests.filter(t => 
                    t.submissions && t.submissions.some(sub => sub.user.toString() === userId)
                ).length;

                const submittedDailyTasks = await DailyTask.countDocuments({ course: courseId, user: req.user.id });

                const attendanceProg = totalClasses > 0 ? (attendedClasses / totalClasses) * 100 : 0;
                const assignmentProg = totalAssignments > 0 ? (submittedAssignments / totalAssignments) * 100 : 0;
                const testProg = totalTests > 0 ? (submittedTests / totalTests) * 100 : 0;
                const classLogProg = totalClasses > 0 ? (submittedDailyTasks / totalClasses) * 100 : 0;

                let activeMetricsCount = 0;
                let totalPercent = 0;

                if (totalClasses > 0) {
                    activeMetricsCount += 2;
                    totalPercent += attendanceProg + classLogProg;
                }
                if (totalAssignments > 0) {
                    activeMetricsCount += 1;
                    totalPercent += assignmentProg;
                }
                if (totalTests > 0) {
                    activeMetricsCount += 1;
                    totalPercent += testProg;
                }

                eObj.totalClasses = totalClasses;
                eObj.attendedClasses = attendedClasses;
                eObj.progress = activeMetricsCount > 0 ? Math.round(totalPercent / activeMetricsCount) : 0;
            } else {
                eObj.totalClasses = 0;
                eObj.attendedClasses = 0;
                eObj.progress = 0;
            }

            return eObj;
        }));

        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/enrollments/user/:userId
// @desc    Get enrollments for a specific user (Admin, Teacher)
// @access  Private (Admin, Teacher)
router.get('/user/:userId', protect, authorize('admin', 'teacher'), async (req, res) => {
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

        const enrollments = await Enrollment.find({ user: resolvedUserId })
            .populate({
                path: 'course',
                populate: { path: 'teachers', select: 'name email specialization photo' }
            })
            .sort('-createdAt');

        // Calculate attendance stats for each enrollment
        const data = await Promise.all(enrollments.map(async (e) => {
            const eObj = e.toObject();
            const courseId = e.course?._id;

            if (courseId) {
                const resolvedUserIdStr = resolvedUserId.toString();

                // Keep academic reports aligned with the student's portal.
                // The portal shows every attendance entry recorded for this user/course,
                // including valid classes attended before the formal enrollment was verified.
                const attendanceRecords = await Attendance.find({
                    course: courseId,
                    'records.user': resolvedUserId
                }).sort('date');

                const detailedAttendance = attendanceRecords.map(record => {
                    const userRecord = record.records.find(
                        (r) => r.user && r.user.toString() === resolvedUserIdStr
                    );
                    return {
                        date: record.date,
                        status: userRecord ? userRecord.status : 'absent'
                    };
                });

                const totalClasses = attendanceRecords.length;
                const attendedClasses = detailedAttendance.filter(r => r.status === 'present').length;
                const absentClasses = detailedAttendance.filter(r => r.status === 'absent').length;
                const attendancePercentage = totalClasses > 0
                    ? Math.round((attendedClasses / totalClasses) * 100)
                    : 0;

                const userId = resolvedUserIdStr;

                const courseAssignments = await Assignment.find({ course: courseId });
                const applicableAssignments = courseAssignments.filter(a => 
                    a.assignTo === 'all' || (a.assignedUsers && a.assignedUsers.map(id => id.toString()).includes(userId))
                );
                const totalAssignments = applicableAssignments.length;
                const submittedAssignments = applicableAssignments.filter(a => 
                    a.submissions && a.submissions.some(sub => sub.user.toString() === userId)
                ).length;

                const courseTests = await Test.find({ course: courseId });
                const applicableTests = courseTests.filter(t => 
                    t.assignTo === 'all' || (t.assignedUsers && t.assignedUsers.map(id => id.toString()).includes(userId))
                );
                const totalTests = applicableTests.length;
                const submittedTests = applicableTests.filter(t => 
                    t.submissions && t.submissions.some(sub => sub.user.toString() === userId)
                ).length;

                const submittedDailyTasks = await DailyTask.countDocuments({ course: courseId, user: resolvedUserId });

                const attendanceProg = totalClasses > 0 ? (attendedClasses / totalClasses) * 100 : 0;
                const assignmentProg = totalAssignments > 0 ? (submittedAssignments / totalAssignments) * 100 : 0;
                const testProg = totalTests > 0 ? (submittedTests / totalTests) * 100 : 0;
                const classLogProg = totalClasses > 0 ? (submittedDailyTasks / totalClasses) * 100 : 0;

                let activeMetricsCount = 0;
                let totalPercent = 0;

                if (totalClasses > 0) {
                    activeMetricsCount += 2;
                    totalPercent += attendanceProg + classLogProg;
                }
                if (totalAssignments > 0) {
                    activeMetricsCount += 1;
                    totalPercent += assignmentProg;
                }
                if (totalTests > 0) {
                    activeMetricsCount += 1;
                    totalPercent += testProg;
                }

                eObj.totalClasses = totalClasses;
                eObj.attendedClasses = attendedClasses;
                eObj.absentClasses = absentClasses;
                eObj.attendancePercentage = attendancePercentage;
                eObj.attendanceDetails = detailedAttendance;
                eObj.progress = activeMetricsCount > 0 ? Math.round(totalPercent / activeMetricsCount) : 0;
            } else {
                eObj.totalClasses = 0;
                eObj.attendedClasses = 0;
                eObj.progress = 0;
            }

            return eObj;
        }));

        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   POST /api/enrollments
// @desc    Enroll in a course (creates pending enrollment with installments)
// @access  Private
router.post('/', protect, async (req, res) => {
    try {
        const { courseId, installments, internshipDurationMonths } = req.body;

        // Check if course exists and is active
        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({ success: false, message: 'Course not found' });
        }
        if (!course.isActive) {
            return res.status(400).json({ success: false, message: 'Course is not active' });
        }

        // Check if already enrolled
        const existingEnrollment = await Enrollment.findOne({ user: req.user.id, course: courseId });
        if (existingEnrollment) {
            return res.status(400).json({ success: false, message: 'Already enrolled in this course' });
        }

        // Get user registration date
        const user = await User.findById(req.user.id);
        const selectedDuration = Number(internshipDurationMonths);
        if (user.role === 'intern' && ![3, 6, 12].includes(selectedDuration)) {
            return res.status(400).json({
                success: false,
                message: 'Please select an internship duration: 3, 6, or 12 months'
            });
        }

        // Create enrollment with installments
        const enrollmentData = {
            user: req.user.id,
            course: courseId,
            status: 'pending', // Will change to 'enrolled' when first installment verified
            registrationDate: user.createdAt,
            feeStatus: 'pending',
            isActive: false // Will become true when first installment verified
        };
        if (user.role === 'intern') {
            enrollmentData.internshipDurationMonths = selectedDuration;
            user.internshipDurationMonths = selectedDuration;
            await user.save();
        }

        // If installments provided, add them; otherwise create single default installment
        if (installments && installments.length > 0) {
            enrollmentData.installments = installments.map((inst, index) => ({
                installmentNumber: index + 1,
                amount: inst.amount,
                dueDate: inst.dueDate,
                status: 'pending'
            }));
        } else {
            // Single default installment for full fee
            enrollmentData.installments = [{
                installmentNumber: 1,
                amount: course.fee,
                dueDate: new Date(), // Due on the day of enrollment
                status: 'pending'
            }];
        }

        const enrollment = await Enrollment.create(enrollmentData);

        // Also create a corresponding Fee record for the management system
        await Fee.create({
            user: req.user.id,
            course: courseId,
            totalFee: course.fee,
            installments: enrollmentData.installments.map(inst => ({
                amount: inst.amount,
                dueDate: inst.dueDate,
                status: 'pending'
            })),
            status: 'pending'
        });

        res.status(201).json({
            success: true,
            enrollment,
            message: 'Enrollment created. Please submit payment for verification.'
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   PUT /api/enrollments/:id/verify-installment
// @desc    Admin verifies an installment payment
// @access  Private (Admin)
router.put('/:id/verify-installment', protect, authorize('admin'), async (req, res) => {
    try {
        const { installmentNumber, paymentProof } = req.body;

        const enrollment = await Enrollment.findById(req.params.id);
        if (!enrollment) {
            return res.status(404).json({ success: false, message: 'Enrollment not found' });
        }

        // Find the installment
        const installment = enrollment.installments.find(
            inst => inst.installmentNumber === installmentNumber
        );

        if (!installment) {
            return res.status(404).json({ success: false, message: 'Installment not found' });
        }

        // Update installment status
        installment.status = 'verified';
        installment.paidDate = new Date();
        installment.verifiedBy = req.user.id;
        installment.verifiedAt = new Date();
        if (paymentProof) installment.paymentProof = paymentProof;

        // Update enrollment status
        const allVerified = enrollment.installments.every(inst => inst.status === 'verified');
        const firstVerified = enrollment.installments[0].status === 'verified';

        if (allVerified) {
            enrollment.feeStatus = 'verified';
            enrollment.status = 'enrolled';
            enrollment.isActive = true;
            if (!enrollment.enrollmentDate) {
                enrollment.enrollmentDate = new Date();
                // Increment course enrolled count
                await Course.findByIdAndUpdate(enrollment.course, { $inc: { enrolledCount: 1 } });
            }
        } else if (firstVerified) {
            enrollment.feeStatus = 'partial';
            enrollment.status = 'enrolled';
            enrollment.isActive = true;
            if (!enrollment.enrollmentDate) {
                enrollment.enrollmentDate = new Date();
                // Increment course enrolled count
                await Course.findByIdAndUpdate(enrollment.course, { $inc: { enrolledCount: 1 } });
            }
        }

        await enrollment.save();

        res.json({
            success: true,
            enrollment,
            message: `Installment ${installmentNumber} verified successfully`
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   PUT /api/enrollments/check-overdue
// @desc    Check and update overdue enrollments (cron job endpoint)
// @access  Private (Admin)
router.put('/check-overdue', protect, authorize('admin'), async (req, res) => {
    try {
        const now = new Date();
        const enrollments = await Enrollment.find({ isActive: true });

        let updatedCount = 0;

        for (const enrollment of enrollments) {
            const lastInstallment = enrollment.installments[enrollment.installments.length - 1];

            // Check if last installment is overdue
            if (lastInstallment &&
                lastInstallment.status !== 'verified' &&
                now > lastInstallment.dueDate) {

                enrollment.isActive = false;
                enrollment.feeStatus = 'overdue';
                enrollment.status = 'suspended';
                await enrollment.save();
                updatedCount++;
            }
        }

        res.json({
            success: true,
            message: `Checked enrollments. ${updatedCount} suspended due to overdue payments.`
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   PUT /api/enrollments/:id/complete
// @desc    Mark enrollment as completed
// @access  Private (Admin)
router.put('/:id/complete', protect, authorize('admin'), async (req, res) => {
    try {
        const { grade, percentage } = req.body;

        const enrollment = await Enrollment.findByIdAndUpdate(
            req.params.id,
            {
                status: 'completed',
                grade,
                percentage,
                completedAt: new Date()
            },
            { new: true }
        );

        if (!enrollment) {
            return res.status(404).json({ success: false, message: 'Enrollment not found' });
        }

        res.json({ success: true, enrollment });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/enrollments/all
// @desc    Get all enrollments (admin)
// @access  Private (Admin, Teacher)
router.get('/all', protect, authorize('admin', 'teacher'), async (req, res) => {
    try {
        const enrollments = await Enrollment.find()
            .populate('user', 'name email rollNo role photo guardianPhone attendType lastSeen')
            .populate('course', 'title city durationMonths')
            .sort('-createdAt');

        // Sync statuses - only for enrollments that are NOT explicitly active
        for (let e of enrollments) {
            try {
                // Only auto-update status if enrollment is not already confirmed active by admin
                if (!e.isActive || e.status !== 'enrolled') {
                    const wasActive = e.isActive;
                    const nowActive = e.updateActiveStatus();
                    if (wasActive !== nowActive) {
                        await e.save();
                    }
                }
            } catch (err) {
                console.error(`Sync error for enrollment ${e?._id}:`, err.message);
            }
        }

        res.json({ success: true, count: enrollments.length, data: enrollments });
    } catch (error) {
        console.error('CRITICAL ERROR in GET /api/enrollments/all:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   DELETE /api/enrollments/:id
// @desc    Withdraw from a course (only if fee not verified)
// @access  Private
router.delete('/:id', protect, async (req, res) => {
    try {
        const enrollment = await Enrollment.findById(req.params.id);

        if (!enrollment) {
            return res.status(404).json({ success: false, message: 'Enrollment not found' });
        }

        // Ensure user owns this enrollment
        if (enrollment.user.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(401).json({ success: false, message: 'Not authorized' });
        }

        // Check if fee is verified
        // We check if ANY installment is verified
        const isVerified = enrollment.installments.some(inst => inst.status === 'verified');

        if (isVerified && req.user.role !== 'admin') {
            return res.status(400).json({
                success: false,
                message: 'Cannot withdraw from a course after fee verification. Please contact admin.'
            });
        }

        // Delete associated Fee record
        await Fee.findOneAndDelete({
            user: enrollment.user,
            course: enrollment.course
        });

        // Delete the enrollment
        await enrollment.deleteOne();

        // Admin removal of the user's final course/skill should move them to Registered (Old),
        // not back into the new-registration queue.
        if (req.user.role === 'admin') {
            const hasOtherEnrollment = await Enrollment.exists({ user: enrollment.user });
            if (!hasOtherEnrollment) {
                await User.findByIdAndUpdate(enrollment.user, { registeredOld: true });
            }
        }

        res.json({ success: true, message: 'Course withdrawal successful' });
    } catch (error) {
        console.error('Error withdrawing from course:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   PUT /api/enrollments/:id/pause
// @desc    Pause a student enrollment (Teacher, Admin)
// @access  Private (Teacher, Admin)
router.put('/:id/pause', protect, authorize('teacher', 'admin'), async (req, res) => {
    try {
        const enrollment = await Enrollment.findById(req.params.id);
        if (!enrollment) {
            return res.status(404).json({ success: false, message: 'Enrollment not found' });
        }

        const now = new Date();
        enrollment.isPaused = true;
        enrollment.pausedAt = now;
        // Push a new open pause period (to: null means still paused)
        enrollment.pausedPeriods.push({ from: now, to: null });
        await enrollment.save();

        res.json({ success: true, enrollment, message: 'Student has been paused successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   PUT /api/enrollments/:id/resume
// @desc    Resume a paused student enrollment (Teacher, Admin)
// @access  Private (Teacher, Admin)
router.put('/:id/resume', protect, authorize('teacher', 'admin'), async (req, res) => {
    try {
        const enrollment = await Enrollment.findById(req.params.id);
        if (!enrollment) {
            return res.status(404).json({ success: false, message: 'Enrollment not found' });
        }

        const now = new Date();
        enrollment.isPaused = false;
        enrollment.pausedAt = undefined;
        // Close the last open pause period
        const lastPeriod = enrollment.pausedPeriods[enrollment.pausedPeriods.length - 1];
        if (lastPeriod && !lastPeriod.to) {
            lastPeriod.to = now;
            enrollment.markModified('pausedPeriods');
        }
        await enrollment.save();

        res.json({ success: true, enrollment, message: 'Student has been resumed successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
