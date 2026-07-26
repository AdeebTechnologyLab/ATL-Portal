const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { uploadSubmission } = require('../config/cloudinary');
const moment = require('moment-timezone');
const Assignment = require('../models/Assignment');
const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');
const Fee = require('../models/Fee');
const UserNotification = require('../models/UserNotification');
const { sendPushNotification } = require('../utils/pushHelper');

// Helper function to check if student has overdue fees (more than 7 days past due)
const hasOverdueFee = async (userId, courseId) => {
    const fee = await Fee.findOne({ user: userId, course: courseId });
    if (!fee || !fee.installments || fee.installments.length === 0) {
        return false; // No fee record, allow submission
    }

    const now = new Date();
    for (const inst of fee.installments) {
        if (inst.status !== 'verified' && inst.status !== 'paid') {
            const dueDate = new Date(inst.dueDate);
            const daysPastDue = Math.floor((now - dueDate) / (1000 * 60 * 60 * 24));
            if (daysPastDue >= 0) {
                return true; // Has overdue fee
            }
        }
    }
    return false;
};

// @route   GET /api/assignments/course/:courseId
// @desc    Get assignments for a course
// @access  Private (Teacher, Admin, Student, Intern)
router.get('/course/:courseId', protect, async (req, res) => {
    try {
        const courseId = req.params.courseId;
        const userRole = req.user.role;
        const userId = req.user.id;

        let assignments;

        if (userRole === 'teacher' || userRole === 'admin') {
            // Teachers/Admins see all assignments with all submissions
            assignments = await Assignment.find({ course: courseId })
                .populate('createdBy', 'name')
                .populate('submissions.user', 'name email rollNo photo role')
                .sort('-createdAt');
        } else {
            // Students/Interns - check enrollment first
            const enrollment = await Enrollment.findOne({
                user: userId,
                course: courseId
            });

            if (!enrollment) {
                return res.status(403).json({ success: false, message: 'Not enrolled in this course' });
            }

            // Get assignments that are assigned to this user or to 'all'
            assignments = await Assignment.find({
                course: courseId,
                $or: [
                    { publishDate: { $lte: new Date() } },
                    { publishDate: { $exists: false } },
                    { publishDate: null },
                    { createdBy: userId } // Allow creator to see it regardless
                ],
                $and: [
                    {
                        $or: [
                            { assignedUsers: userId },
                            { "submissions.user": userId }
                        ]
                    }
                ]
            })
                .populate('createdBy', 'name')
                .sort('-createdAt');

            // Filter submissions to only show current user's submission
            assignments = assignments.map(assignment => {
                const assignmentObj = assignment.toObject();
                if (assignmentObj.submissions) {
                    assignmentObj.submissions = assignmentObj.submissions.filter(
                        s => s.user.toString() === userId
                    );
                }
                return assignmentObj;
            });
        }

        res.json({ success: true, assignments });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/assignments/user/:userId
// @desc    Get assignments for a specific user
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
            return res.json({ success: true, assignments: [] });
        }

        const resolvedUserId = user._id;

        const enrollments = await Enrollment.find({ user: resolvedUserId });

        if (enrollments.length === 0) {
            return res.json({ success: true, assignments: [] });
        }

        const courseIds = enrollments.map(e => e.course);

        const assignments = await Assignment.find({
            course: { $in: courseIds },
            $or: [
                { assignedUsers: resolvedUserId },
                { "submissions.user": resolvedUserId }
            ]
        })
            .populate('course', 'title')
            .sort('-createdAt');

        // Filter submissions to only show the target user's submission
        const resolvedUserIdStr = resolvedUserId.toString();
        const sanitizedAssignments = assignments.map(assignment => {
            const assignmentObj = assignment.toObject();
            if (assignmentObj.submissions) {
                assignmentObj.submissions = assignmentObj.submissions.filter(
                    s => s.user && s.user.toString() === resolvedUserIdStr
                );
            }
            return assignmentObj;
        });

        res.json({ success: true, assignments: sanitizedAssignments });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   POST /api/assignments
// @desc    Create assignment
// @access  Private (Teacher, Admin)
router.post('/', protect, authorize('teacher', 'admin'), async (req, res) => {
    try {
        const { courseId, title, description, dueDate, publishDate, totalMarks, assignTo, assignedUsers: selectedUsers, selectedUsers: altSelectedUsers } = req.body;

        // Validate required fields early
        if (!courseId || !title) {
            return res.status(400).json({ success: false, message: 'Course ID and title are required' });
        }

        const course = await Course.findById(courseId).maxTimeMS(10000);
        if (!course) {
            return res.status(404).json({ success: false, message: 'Course not found' });
        }

        let assignedUsers = [];
        if (assignTo === 'all') {
            // Get all enrolled users (including pending so they see it immediately)
            const enrollments = await Enrollment.find({ course: courseId }).maxTimeMS(10000);
            assignedUsers = enrollments.map(e => e.user);
        } else {
            assignedUsers = selectedUsers || altSelectedUsers || [];
        }

        // Parse and set due date to end of day in Pakistan time (23:59:59 PKT)
        let assignmentDueDate = dueDate;
        if (dueDate) {
            assignmentDueDate = moment.tz(dueDate, 'Asia/Karachi').endOf('day').toDate();
        }

        const assignment = await Assignment.create({
            course: courseId,
            title,
            description,
            dueDate: assignmentDueDate,
            publishDate: publishDate || Date.now(),
            totalMarks: totalMarks || 100,
            assignTo,
            assignedUsers,
            createdBy: req.user.id
        });

        // Notify students via socket
        const io = req.app.get('io');
        if (io) {
            const notificationData = {
                type: 'new_assignment',
                courseId: courseId.toString(),
                assignmentId: assignment._id.toString(),
                title: assignment.title
            };

            if (assignTo === 'all') {
                // Emit to all students in the course room (not implemented yet, so let's emit to individuals or a course room if we had one)
                // Since we don't have course-specific rooms yet, let's emit to individual students
                assignedUsers.forEach(userId => {
                    io.to(userId.toString()).emit('new_assignment', notificationData);
                });
            } else {
                assignedUsers.forEach(userId => {
                    io.to(userId.toString()).emit('new_assignment', notificationData);
                });
            }
        }

        // Send push notifications and save to database
        assignedUsers.forEach(async (userId) => {
            const userIdStr = userId.toString();
            
            // Push notification
            sendPushNotification(userIdStr, {
                title: 'New Assignment 📝',
                body: `A new assignment "${title}" has been posted in your course.`,
                icon: '/logo.png',
                image: '/logo.png',
                badge: '/logo.png',
                url: '/student/assignments'
            });

            // Persistent Notification
            try {
                await UserNotification.create({
                    user: userIdStr,
                    title: 'New Assignment 📝',
                    message: `A new assignment "${title}" has been posted in your course.`,
                    type: 'assignment_assigned'
                });
            } catch (err) {
                console.error('Error creating persistent notification:', err);
            }
        });

        res.status(201).json({ success: true, assignment });
    } catch (error) {
        console.error('Assignment creation error:', error);

        // Handle timeout errors specifically
        if (error.name === 'MongooseError' || error.message?.includes('timeout')) {
            return res.status(503).json({
                success: false,
                message: 'Server is busy. Please try again in a moment.',
                retryable: true
            });
        }

        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   POST /api/assignments/:id/submit
// @desc    Submit assignment
// @access  Private (Student, Intern)
router.post('/:id/submit', protect, uploadSubmission.single('file'), async (req, res) => {
    try {
        const { notes } = req.body;
        const submittedFileUrl = Array.isArray(req.body.fileUrl)
            ? req.body.fileUrl[req.body.fileUrl.length - 1]
            : req.body.fileUrl;
        const assignment = await Assignment.findById(req.params.id);

        if (!assignment) {
            return res.status(404).json({ success: false, message: 'Assignment not found' });
        }

        // Check for overdue fee payment (more than 7 days past due)
        const isOverdue = await hasOverdueFee(req.user.id, assignment.course);
        if (isOverdue) {
            return res.status(403).json({
                success: false,
                message: 'You have an overdue fee payment. Please pay your installment to submit assignments.',
                code: 'FEE_OVERDUE'
            });
        }

        // Check if student is paused in this course
        const enrollmentForPause = await Enrollment.findOne({ user: req.user.id, course: assignment.course });
        if (enrollmentForPause && enrollmentForPause.isPaused) {
            return res.status(403).json({
                success: false,
                message: 'Your access to this course has been temporarily paused by your teacher.',
                code: 'PAUSED'
            });
        }

        // Check if user is assigned
        if (assignment.assignTo !== 'all' && !assignment.assignedUsers.includes(req.user.id)) {
            return res.status(403).json({ success: false, message: 'Not assigned to this assignment' });
        }

        // Check if already submitted
        const existingSubmissionIndex = assignment.submissions.findIndex(
            s => s.user.toString() === req.user.id
        );

        if (existingSubmissionIndex !== -1) {
            const existingSubmission = assignment.submissions[existingSubmissionIndex];
            const deadlineNotPassed = !assignment.dueDate || new Date(assignment.dueDate) > new Date();

            // Allow resubmission if:
            // 1. Submission was rejected (can always resubmit)
            // 2. Deadline has not passed (teacher extended the deadline)
            if (existingSubmission.status !== 'rejected' && !deadlineNotPassed) {
                return res.status(400).json({ success: false, message: 'Already submitted. Resubmission is only allowed if rejected or if the deadline has been extended.' });
            }

            // Update the existing submission in-place
            existingSubmission.notes = notes || req.body.notes || existingSubmission.notes;
            existingSubmission.fileUrl = req.file ? req.file.path : (submittedFileUrl || existingSubmission.fileUrl);
            if (req.body.googleDriveFileId) {
                existingSubmission.googleDriveFile = {
                    id: req.body.googleDriveFileId,
                    name: req.body.googleDriveFileName || '',
                    mimeType: req.body.googleDriveFileMimeType || '',
                    size: Number(req.body.googleDriveFileSize || 0),
                    thumbnailLink: req.body.googleDriveThumbnailLink || ''
                };
            }
            existingSubmission.submittedAt = moment().tz('Asia/Karachi').toDate();
            existingSubmission.status = 'submitted';
            // Clear marks and feedback so teacher grades fresh submission
            existingSubmission.marks = undefined;
            existingSubmission.feedback = undefined;

            await assignment.save();

            // Emit socket event to notify teachers about resubmission
            const io = req.app.get('io');
            if (io) {
                const course = await Course.findById(assignment.course).populate('teachers', '_id name');
                if (course && course.teachers && course.teachers.length > 0) {
                    const submissionData = {
                        type: 'assignment_submission',
                        courseId: assignment.course.toString(),
                        assignmentId: assignment._id.toString(),
                        assignmentTitle: assignment.title,
                        studentId: req.user.id,
                        studentName: req.user.name
                    };
                    for (const teacher of course.teachers) {
                        io.to(teacher._id.toString()).emit('new_submission', submissionData);
                        // Push notification
                        sendPushNotification(teacher._id.toString(), {
                            title: 'Assignment Resubmitted 🔄',
                            body: `${req.user.name} resubmitted: ${assignment.title}`,
                            icon: '/logo.png',
                            image: '/logo.png',
                            badge: '/logo.png',
                            url: '/teacher/dashboard'
                        });
                    }
                }
            }

            return res.json({ success: true, message: 'Assignment resubmitted' });
        }

        // Add submission
        assignment.submissions.push({
            user: req.user.id,
            notes: notes || req.body.notes,
            fileUrl: req.file ? req.file.path : submittedFileUrl || null,
            ...(req.body.googleDriveFileId ? {
                googleDriveFile: {
                    id: req.body.googleDriveFileId,
                    name: req.body.googleDriveFileName || '',
                    mimeType: req.body.googleDriveFileMimeType || '',
                    size: Number(req.body.googleDriveFileSize || 0),
                    thumbnailLink: req.body.googleDriveThumbnailLink || ''
                }
            } : {}),
            submittedAt: moment().tz('Asia/Karachi').toDate()
        });

        await assignment.save();

        // Emit socket event to notify teachers about new submission
        const io = req.app.get('io');
        if (io) {
            // Get the course to find teachers
            const course = await Course.findById(assignment.course).populate('teachers', '_id name');
            if (course && course.teachers && course.teachers.length > 0) {
                const submissionData = {
                    type: 'assignment_submission',
                    courseId: assignment.course.toString(),
                    assignmentId: assignment._id.toString(),
                    assignmentTitle: assignment.title,
                    studentId: req.user.id,
                    studentName: req.user.name
                };

                console.log('📝 Assignment submitted, notifying teachers:', course.teachers.map(t => t._id.toString()));

                // Notify each teacher of the course
                for (const teacher of course.teachers) {
                    const teacherRoom = teacher._id.toString();
                    console.log(`📤 Emitting new_submission to teacher room: ${teacherRoom}`);

                    // Check if room has any sockets
                    const room = io.sockets.adapter.rooms.get(teacherRoom);
                    console.log(`   Room ${teacherRoom} has ${room ? room.size : 0} sockets`);

                    io.to(teacherRoom).emit('new_submission', submissionData);
                    // Push notification
                    sendPushNotification(teacher._id.toString(), {
                        title: 'New Submission 📥',
                        body: `${req.user.name} submitted: ${assignment.title}`,
                        icon: '/logo.png',
                        image: '/logo.png',
                        badge: '/logo.png',
                        url: '/teacher/dashboard'
                    });
                }
            } else {
                console.log('⚠️ No teachers found for course:', assignment.course);
            }
        } else {
            console.log('⚠️ Socket.io not available');
        }

        res.json({ success: true, message: 'Assignment submitted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   PUT /api/assignments/:assignmentId/grade/:submissionId
// @desc    Grade a submission
// @access  Private (Teacher, Admin)
router.put('/:assignmentId/grade/:submissionId', protect, authorize('teacher', 'admin'), async (req, res) => {
    try {
        const { marks, feedback, status } = req.body;
        const assignment = await Assignment.findById(req.params.assignmentId);

        if (!assignment) {
            return res.status(404).json({ success: false, message: 'Assignment not found' });
        }

        const submission = assignment.submissions.id(req.params.submissionId);
        if (!submission) {
            return res.status(404).json({ success: false, message: 'Submission not found' });
        }

        // Require feedback when rejecting
        if (status === 'rejected' && (!feedback || !feedback.trim())) {
            return res.status(400).json({ success: false, message: 'Feedback is required when rejecting a submission' });
        }

        submission.marks = marks !== undefined ? marks : submission.marks;
        submission.feedback = feedback || submission.feedback;
        submission.status = status || 'graded';
        submission.gradedBy = req.user.id;
        submission.gradedAt = moment().tz('Asia/Karachi').toDate();

        await assignment.save();

        // Send a push notification if the assignment was rejected
        if (status === 'rejected') {
            sendPushNotification(submission.user, {
                title: 'Assignment Rejected',
                body: `Your submission for "${assignment.title}" has been rejected. Feedback: ${feedback}`,
                icon: '/logo.png',
                url: `/`
            });
        }

        // Emit browser notification via Socket.IO for both grading and rejection
        const io = req.app.get('io');
        const studentId = submission.user.toString();
        let nTitle = '';
        let nMessage = '';

        if (status === 'rejected') {
            nTitle = 'Assignment Rejected';
            nMessage = `Your submission for "${assignment.title}" has been rejected. Feedback: ${feedback}`;
        } else if (status === 'graded') {
            nTitle = 'Assignment Graded';
            nMessage = `Your submission for "${assignment.title}" has been graded. Marks: ${marks}/${assignment.totalMarks}`;
        }

        if (nTitle && nMessage) {
            // Socket notification (real-time in-app)
            if (io) {
                io.to(studentId).emit('new_browser_notification', {
                    title: nTitle,
                    message: nMessage,
                    url: '/student/assignments'
                });
            }

            // Web push notification (works even when tab closed)
            sendPushNotification(studentId, {
                title: nTitle,
                body: nMessage,
                icon: '/logo.png',
                image: '/logo.png',
                badge: '/logo.png',
                url: '/student/assignments'
            });

            // Persistent Notification
            try {
                await UserNotification.create({
                    user: studentId,
                    title: nTitle,
                    message: nMessage,
                    type: 'graded'
                });
            } catch (err) {
                console.error('Error creating persistent notification:', err);
            }
        }

        res.json({ success: true, assignment });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   DELETE /api/assignments/:assignmentId/submissions/:submissionId
// @desc    Delete a submission
// @access  Private (Teacher, Admin)
router.delete('/:assignmentId/submissions/:submissionId', protect, authorize('teacher', 'admin'), async (req, res) => {
    try {
        const assignment = await Assignment.findById(req.params.assignmentId);

        if (!assignment) {
            return res.status(404).json({ success: false, message: 'Assignment not found' });
        }

        const initialLength = assignment.submissions.length;
        assignment.submissions = assignment.submissions.filter(
            sub => sub._id.toString() !== req.params.submissionId
        );

        if (assignment.submissions.length === initialLength) {
            return res.status(404).json({ success: false, message: 'Submission not found' });
        }

        await assignment.save();
        res.json({ success: true, message: 'Submission deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/assignments/my
// @desc    Get assignments for current user (only those created after user registration)
// @access  Private
router.get('/my', protect, async (req, res) => {
    try {
        console.log(`📚 Fetching assignments for user: ${req.user.id} (role: ${req.user.role})`);
        // Get user's enrolled courses and registration date
        const enrollments = await Enrollment.find({ user: req.user.id });
        console.log(`📋 User has ${enrollments.length} enrollments`);

        if (enrollments.length === 0) {
            console.log(`⚠️ User has no enrollments, returning empty assignments`);
            return res.json({ success: true, assignments: [] });
        }

        const courseIds = enrollments.map(e => e.course);
        console.log(`📚 Enrolled course IDs: ${courseIds.join(', ')}`);

        // Get user registration date from first enrollment (all should have same registrationDate)
        const userRegistrationDate = enrollments.length > 0 && enrollments[0].registrationDate
            ? enrollments[0].registrationDate
            : new Date(0); // Fallback to epoch if no registration date

        console.log(`📅 User registration date: ${userRegistrationDate}`);

        // Get assignments for those courses
        // Show assignment if:
        // 1. assignTo is 'all' (meant for everyone in the course)
        // 2. OR user is specifically in assignedUsers
        // 3. OR user has already made a submission
        const assignments = await Assignment.find({
            course: { $in: courseIds },
            $and: [
                {
                    $or: [
                        { publishDate: { $lte: new Date() } },
                        { publishDate: { $exists: false } },
                        { publishDate: null }
                    ]
                },
                {
                    $or: [
                        { assignedUsers: req.user.id },
                        { "submissions.user": req.user.id }
                    ]
                }
            ]
        })
            .populate('course', 'title bookLink')
            .sort('-createdAt');

        console.log(`✅ Found ${assignments.length} assignments matching criteria`);

        // SECURITY: Only return the current user's submission
        const sanitizedAssignments = assignments.map(assignment => {
            const assignmentObj = assignment.toObject();
            if (assignmentObj.submissions) {
                assignmentObj.submissions = assignmentObj.submissions.filter(
                    s => s.user.toString() === req.user.id
                );
            }
            return assignmentObj;
        });

        console.log(`📤 Returning ${sanitizedAssignments.length} sanitized assignments`);
        res.json({ success: true, assignments: sanitizedAssignments });
    } catch (error) {
        console.error('❌ Error fetching user assignments:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   PUT /api/assignments/:id
// @desc    Update assignment
// @access  Private (Teacher, Admin)
router.put('/:id', protect, authorize('teacher', 'admin'), async (req, res) => {
    try {
        // properties to update
        const updateData = { ...req.body };

        // If dueDate is provided, set it to end of day in Pakistan time (23:59:59 PKT)
        if (updateData.dueDate) {
            updateData.dueDate = moment.tz(updateData.dueDate, 'Asia/Karachi').endOf('day').toDate();
        }

        const assignment = await Assignment.findById(req.params.id);
        if (!assignment) {
            return res.status(404).json({ success: false, message: 'Assignment not found' });
        }

        // If assignTo is updated to 'all', we need to update assignedUsers list
        if (updateData.assignTo === 'all') {
            const enrollments = await Enrollment.find({ course: assignment.course });
            updateData.assignedUsers = enrollments.map(e => e.user);
        }

        const updatedAssignment = await Assignment.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        );

        res.json({ success: true, assignment: updatedAssignment });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   DELETE /api/assignments/:id
// @desc    Delete assignment
// @access  Private (Teacher, Admin)
router.delete('/:id', protect, authorize('teacher', 'admin'), async (req, res) => {
    try {
        const assignment = await Assignment.findById(req.params.id);

        if (!assignment) {
            return res.status(404).json({ success: false, message: 'Assignment not found' });
        }

        await assignment.deleteOne();
        res.json({ success: true, message: 'Assignment deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
