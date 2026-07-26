const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const DailyTask = require('../models/DailyTask');
const Course = require('../models/Course');
const Fee = require('../models/Fee');
const UserNotification = require('../models/UserNotification');
const { sendPushNotification } = require('../utils/pushHelper');

// Debug middleware to log all requests to this router
router.use((req, res, next) => {
    console.log(`📥 Daily Tasks Router - ${req.method} ${req.originalUrl}`);
    next();
});

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

// @route   POST /api/daily-tasks
// @desc    Submit a daily task (Intern / Student)
// @access  Private (Intern, Student)
router.post('/', protect, authorize('intern', 'student'), async (req, res) => {
    try {
        const { courseId, content, workLink, taskId } = req.body;
        console.log(`✏️ Daily task submission request:`);
        console.log(`   User: ${req.user.id} (${req.user.name}, role: ${req.user.role})`);
        console.log(`   Course: ${courseId}`);
        console.log(`   TaskId: ${taskId || 'new submission'}`);
        console.log(`   Content length: ${content?.length || 0} chars`);

        // Verify enrollment/course exists
        const course = await Course.findById(courseId);
        if (!course) {
            console.log(`❌ Course not found: ${courseId}`);
            return res.status(404).json({ success: false, message: 'Course not found' });
        }
        console.log(`✅ Course found: ${course.title}`);

        // Check for overdue fee payment (more than 7 days past due)
        const isOverdue = await hasOverdueFee(req.user.id, courseId);
        if (isOverdue) {
            console.log(`❌ User has overdue fee`);
            return res.status(403).json({
                success: false,
                message: 'You have an overdue fee payment. Please pay your installment to submit daily tasks.',
                code: 'FEE_OVERDUE'
            });
        }

        // Check if student is paused in this course
        const enrollment = await require('../models/Enrollment').findOne({ user: req.user.id, course: courseId });
        if (enrollment && enrollment.isPaused) {
            console.log(`❌ User is paused in this course`);
            return res.status(403).json({
                success: false,
                message: 'Your access to this course has been temporarily paused by your teacher.',
                code: 'PAUSED'
            });
        }

        let task;
        if (taskId) {
            // Resubmission case
            task = await DailyTask.findOne({ _id: taskId, user: req.user.id });
            if (!task) {
                return res.status(404).json({ success: false, message: 'Task not found or unauthorized' });
            }
            if (task.status !== 'rejected') {
                return res.status(400).json({ success: false, message: 'Only rejected tasks can be resubmitted' });
            }

            task.content = content || task.content;
            task.workLink = workLink !== undefined ? workLink : task.workLink;
            task.status = 'submitted';
            task.marks = 0;
            task.feedback = '';
            await task.save();
        } else {
            // New submission
            task = await DailyTask.create({
                user: req.user.id,
                course: courseId,
                content,
                workLink
            });
            console.log(`✅ New daily task created with ID: ${task._id}`);
        }

        // Notify teachers via Socket and Push
        const io = req.app.get('io');
        if (io) {
            const course = await Course.findById(courseId).populate('teachers', '_id name');
            if (course && course.teachers) {
                for (const teacher of course.teachers) {
                    const teacherId = teacher._id.toString();
                    
                    // Socket event
                    io.to(teacherId).emit('new_daily_task', {
                        studentName: req.user.name,
                        courseTitle: course.title,
                        taskId: task._id
                    });

                    // Push Notification
                    sendPushNotification(teacherId, {
                        title: 'New Work Log 📝',
                        body: `${req.user.name} submitted a work log for ${course.title}`,
                        icon: '/logo.png',
                        image: '/logo.png',
                        badge: '/logo.png',
                        url: '/teacher/dashboard'
                    });
                }
            }
        }

        res.status(taskId ? 200 : 201).json({
            success: true,
            data: task
        });
    } catch (error) {
        console.error(`❌ Error submitting daily task:`, error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/daily-tasks/course/:courseId
// @desc    Get all daily tasks for a course (Teacher)
// @access  Private (Teacher, Admin)
router.get('/course/:courseId', protect, authorize('teacher', 'admin'), async (req, res) => {
    try {
        const tasks = await DailyTask.find({ course: req.params.courseId })
            .populate('user', 'name email rollNo photo role')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            count: tasks.length,
            data: tasks
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/daily-tasks/my/:courseId
// @desc    Get my daily tasks for a specific course (Intern)
// @access  Private (Intern, Student)
router.get('/my/:courseId', protect, authorize('intern', 'student'), async (req, res) => {
    try {
        console.log(`📝 Fetching daily tasks for user: ${req.user.id}, course: ${req.params.courseId}`);
        const tasks = await DailyTask.find({
            course: req.params.courseId,
            user: req.user.id
        }).sort({ createdAt: -1 });
        console.log(`📊 Found ${tasks.length} daily tasks`);

        res.json({
            success: true,
            count: tasks.length,
            data: tasks
        });
    } catch (error) {
        console.error(`❌ Error fetching daily tasks for user:`, error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   PUT /api/daily-tasks/:id/grade
// @desc    Grade a daily task (Teacher)
// @access  Private (Teacher)
router.put('/:id/grade', protect, authorize('teacher', 'admin'), async (req, res) => {
    try {
        const { marks, feedback, status } = req.body;

        let task = await DailyTask.findById(req.params.id);
        if (!task) {
            return res.status(404).json({ success: false, message: 'Task not found' });
        }

        task.marks = marks !== undefined ? marks : task.marks;
        task.feedback = feedback || task.feedback;
        task.gradedBy = req.user.id;
        task.gradedAt = Date.now();
        task.status = status || 'graded';

        await task.save();

        // Notify student/intern
        const studentId = task.user.toString();
        const notificationTitle = status === 'rejected' ? 'Work Log Rejected ❌' : 'Work Log Graded ✅';
        const notificationMessage = status === 'rejected' 
            ? `Your work log has been rejected. Feedback: ${feedback || 'Please review.'}`
            : `Your work log has been graded. Marks: ${marks}/10`;

        // Push Notification
        sendPushNotification(studentId, {
            title: notificationTitle,
            body: notificationMessage,
            icon: '/logo.png',
            image: '/logo.png',
            badge: '/logo.png',
            url: '/student/daily-tasks'
        });

        // Persistent Notification
        try {
            await UserNotification.create({
                user: studentId,
                title: notificationTitle,
                message: notificationMessage,
                type: 'graded'
            });
        } catch (err) {
            console.error('Error creating daily task notification:', err);
        }

        res.json({
            success: true,
            data: task
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   DELETE /api/daily-tasks/:id
// @desc    Delete a daily task (Teacher, Admin, or Owner if pending)
// @access  Private
router.delete('/:id', protect, async (req, res) => {
    try {
        const task = await DailyTask.findById(req.params.id);
        if (!task) {
            return res.status(404).json({ success: false, message: 'Task not found' });
        }

        // Only allow teacher/admin or the owner (if not verified yet)
        const isTeacher = req.user.role === 'teacher' || req.user.role === 'admin';
        const isOwner = task.user.toString() === req.user.id;

        if (!isTeacher && !isOwner) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        // Owner (student/intern) cannot delete if task is verified or graded by teacher
        if (isOwner && !isTeacher && (task.status === 'verified' || task.status === 'graded')) {
            return res.status(400).json({ success: false, message: 'Cannot delete a task that has been graded by the teacher.' });
        }

        await task.deleteOne();

        res.json({
            success: true,
            message: 'Task deleted successfully'
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   PUT /api/daily-tasks/:id
// @desc    Edit a daily task (Student/Intern - only if not graded)
// @access  Private (Student, Intern)
router.put('/:id', protect, authorize('student', 'intern'), async (req, res) => {
    try {
        const task = await DailyTask.findById(req.params.id);
        if (!task) {
            return res.status(404).json({ success: false, message: 'Task not found' });
        }

        // Only the owner can edit
        if (task.user.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        // Cannot edit if teacher has graded or verified
        if (task.status === 'verified' || task.status === 'graded') {
            return res.status(400).json({ success: false, message: 'Cannot edit a task that has already been graded by the teacher.' });
        }

        const { content, workLink } = req.body;
        task.content = content || task.content;
        task.workLink = workLink !== undefined ? workLink : task.workLink;
        await task.save();

        res.json({ success: true, data: task });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/daily-tasks/user/:userId
// @desc    Get all daily tasks for a specific user (Intern/Student)
// @access  Private (Teacher, Admin)
router.get('/user/:userId', protect, authorize('teacher', 'admin'), async (req, res) => {
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
            return res.json({ success: true, count: 0, data: [] });
        }

        const resolvedUserId = user._id;

        const tasks = await DailyTask.find({ user: resolvedUserId })
            .populate('course', 'title category')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            count: tasks.length,
            data: tasks
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
