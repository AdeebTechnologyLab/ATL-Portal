const express = require('express');
const router = express.Router();

const requireActiveTeacher = (req, res, next) => {
    if (req.user.role === 'teacher' && req.user.isActive === false) {
        return res.status(403).json({
            success: false,
            message: 'Your teacher account is inactive. You cannot create or manage paid jobs.'
        });
    }
    next();
};
const { protect, authorize } = require('../middleware/auth');
const { uploadSubmission } = require('../config/cloudinary');
const PaidTask = require('../models/PaidTask');
const FinanceProject = require('../models/FinanceProject');
const User = require('../models/User');
const UserNotification = require('../models/UserNotification');
const { sendPushNotification } = require('../utils/pushHelper');

// @route   GET /api/tasks/counts
// @desc    Get assigned and submitted counts for teacher's jobs
// @access  Private/Admin, Teacher
router.get('/counts', protect, async (req, res) => {
    try {
        let matchQuery = { status: { $in: ['assigned', 'submitted'] } };
        if (req.user.role === 'teacher') {
            matchQuery.$or = [
                { jobManagers: req.user._id },
                { jobManager: req.user._id },
                { createdBy: req.user._id }
            ];
        }

        const [totalAssigned] = await PaidTask.aggregate([
            { $match: matchQuery },
            { $unwind: { path: '$assignedTo', preserveNullAndEmptyArrays: false } },
            { $count: 'total' }
        ]);

        const [totalSubmitted] = await PaidTask.aggregate([
            { $match: { status: { $in: ['assigned', 'submitted'] }, ...(req.user.role === 'teacher' ? { $or: matchQuery.$or } : {}) } },
            { $unwind: { path: '$submissions', preserveNullAndEmptyArrays: false } },
            { $group: { _id: '$submissions.user' } },
            { $count: 'total' }
        ]);

        res.json({
            success: true,
            data: {
                totalAssigned: totalAssigned?.total || 0,
                totalSubmitted: totalSubmitted?.total || 0
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/tasks
// @desc    Get all tasks
// @access  Public (for browsing), but different views based on role
router.get('/', async (req, res) => {
    try {
        const { status, search } = req.query;

        let query = {};
        if (status) query.status = status;
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { skills: { $regex: search, $options: 'i' } }
            ];
        }

        const tasks = await PaidTask.find(query)
            .populate('createdBy', 'name photo role')
            .populate('jobManager', 'name email photo role')
            .populate('jobManagers', 'name email photo role')
            .populate('assignedTo', 'name email photo')
            .populate('submissions.user', 'name email photo')
            .populate('feedback.user', 'name photo totalEarnings')
            .populate('paymentHistory.user', 'name photo totalEarnings')
            .populate('applicants.user', 'name email phone skills experience portfolio completedTasks rating totalEarnings cvUrl photo education address city cnic')
            .sort('-createdAt')
            .lean();

        res.json({ success: true, data: tasks });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   POST /api/tasks
// @desc    Create new task
// @access  Private (Admin)
router.post('/', protect, authorize('admin', 'teacher'), requireActiveTeacher, uploadSubmission.array('images', 10), async (req, res) => {
    try {
        const bodyData = { ...req.body };
        if (req.files && req.files.length > 0) {
            bodyData.images = req.files.map(file => file.path);
            bodyData.image = bodyData.images[0]; // backward compatibility
        }

        const requestedManagers = bodyData.jobManagers
            ? (Array.isArray(bodyData.jobManagers) ? bodyData.jobManagers : [bodyData.jobManagers])
            : (bodyData.jobManager ? [bodyData.jobManager] : []);
        if (req.user.role === 'admin') {
            const validTeacherCount = await User.countDocuments({ _id: { $in: requestedManagers }, role: 'teacher', isVerified: true, isActive: { $ne: false } });
            if (!requestedManagers.length || validTeacherCount !== requestedManagers.length) return res.status(400).json({ success: false, message: 'Please select valid teachers' });
        }
        const task = await PaidTask.create({
            ...bodyData,
            createdBy: req.user.id,
            jobManager: req.user.role === 'teacher' ? req.user.id : (requestedManagers[0] || null),
            jobManagers: req.user.role === 'teacher' ? [req.user.id] : requestedManagers
        });

        res.status(201).json({ success: true, task });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   PUT /api/tasks/:id
// @desc    Update task details
// @access  Private (Admin)
router.put('/:id', protect, authorize('admin', 'teacher'), requireActiveTeacher, uploadSubmission.array('images', 10), async (req, res) => {
    try {
        let task = await PaidTask.findById(req.params.id);

        if (!task) {
            return res.status(404).json({ success: false, message: 'Task not found' });
        }

        const managerIds = (task.jobManagers?.length ? task.jobManagers : [task.jobManager || task.createdBy]).map(String);
        if (req.user.role === 'teacher' && !managerIds.includes(String(req.user.id))) {
            return res.status(403).json({ success: false, message: 'Teachers can only edit jobs they created' });
        }

        const bodyData = { ...req.body };
        if (req.user.role === 'teacher') {
            delete bodyData.jobManager;
            delete bodyData.jobManagers;
        }
        if (req.user.role === 'admin' && bodyData.jobManagers) {
            const selectedManagers = Array.isArray(bodyData.jobManagers) ? bodyData.jobManagers : [bodyData.jobManagers];
            const validTeacherCount = await User.countDocuments({ _id: { $in: selectedManagers }, role: 'teacher', isVerified: true, isActive: { $ne: false } });
            if (!selectedManagers.length || validTeacherCount !== selectedManagers.length) return res.status(400).json({ success: false, message: 'Please select valid teachers' });
            bodyData.jobManagers = selectedManagers;
            bodyData.jobManager = selectedManagers[0];
        }
        // If old files are kept, client sends them as `oldImages` array or we figure out logic.
        // But for append logic, let's keep it simple: new files replace entirely?
        // Usually frontend sends new files + remaining old URLs inside bodyData.images if they managed it.
        // We'll trust frontend if it sends an existing array, and concat new ones.
        let existingImages = [];
        if (bodyData.existingImages) {
            existingImages = Array.isArray(bodyData.existingImages) ? bodyData.existingImages : [bodyData.existingImages];
        }

        if (req.files && req.files.length > 0) {
            const newImages = req.files.map(file => file.path);
            bodyData.images = [...existingImages, ...newImages];
            bodyData.image = bodyData.images[0] || '';
        } else if (existingImages.length > 0) {
            bodyData.images = existingImages;
            bodyData.image = bodyData.images[0] || '';
        }

        const previousManagerIds = (task.jobManagers?.length ? task.jobManagers : [task.jobManager]).filter(Boolean).map(String);
        task = await PaidTask.findByIdAndUpdate(req.params.id, bodyData, {
            new: true,
            runValidators: true
        });

        const newManagerIds = (task.jobManagers?.length ? task.jobManagers : [task.jobManager]).filter(Boolean).map(String);
        const newlyAssignedManagers = newManagerIds.filter(id => !previousManagerIds.includes(id));
        if (req.user.role === 'admin' && newlyAssignedManagers.length) {
            await Promise.all(newlyAssignedManagers.map(newManagerId => UserNotification.create({
                user: newManagerId,
                title: 'Job Assigned to You',
                message: `You are now managing "${task.title}" and its ${task.applicants?.length || 0} applicant(s).`,
                type: 'task_assigned',
                relatedTask: task._id
            })));

            const io = req.app.get('io');
            newlyAssignedManagers.forEach(newManagerId => {
                if (io) io.to(newManagerId).emit('new_browser_notification', {
                    title: 'Job Assigned to You',
                    message: `You can now edit "${task.title}" and chat with its applicants.`,
                    url: '/teacher/jobs'
                });
                sendPushNotification(newManagerId, { title: 'New Job to Manage', body: `You can now manage "${task.title}" and its applicants.`, icon: '/logo.png', url: '/teacher/jobs' });
            });
        }

        res.json({ success: true, task });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   POST /api/tasks/:id/apply
// @desc    Apply for a task
// @access  Private (Job role)
router.post('/:id/apply', protect, authorize('job'), async (req, res) => {
    try {
        const { message } = req.body;
        const task = await PaidTask.findById(req.params.id);

        if (!task) {
            return res.status(404).json({ success: false, message: 'Task not found' });
        }

        if (task.status !== 'open' && task.status !== 'assigned') {
            return res.status(400).json({ success: false, message: 'Task is not open for applications' });
        }

        if (task.manualStatus === 'expired' || task.manualStatus === 'completed') {
            return res.status(400).json({ success: false, message: 'Task is closed for applications' });
        }

        // Check if already applied
        const userApplications = task.applicants.filter(a => a.user.toString() === req.user.id);
        const latestApplication = userApplications.sort((a, b) => (b.cycle || 1) - (a.cycle || 1))[0];
        const alreadyApplied = latestApplication && !['completed'].includes(latestApplication.status);
        if (alreadyApplied) {
            return res.status(400).json({ success: false, message: 'Already applied for this task' });
        }

        const nextCycle = latestApplication ? (latestApplication.cycle || 1) + 1 : 1;

        task.applicants.push({
            user: req.user.id,
            message,
            appliedAt: new Date(),
            cycle: nextCycle,
            status: 'applied'
        });

        await task.save();

        // Create notification for all admin users
        const admins = await User.find({ role: 'admin' });
        const recipients = [...admins];
        const managerIdsForNotice = task.jobManagers?.length ? task.jobManagers : [task.jobManager || task.createdBy];
        const managers = await User.find({ _id: { $in: managerIdsForNotice.filter(Boolean) } });
        managers.forEach(manager => {
            if (!recipients.some(u => String(u._id) === String(manager._id))) recipients.push(manager);
        });
        const notificationPromises = recipients.map(recipient =>
            UserNotification.create({
                user: recipient._id,
                title: 'New Job Application',
                message: `${req.user.name} applied for "${task.title}"`,
                type: 'task_application',
                relatedTask: task._id,
                relatedUser: req.user.id
            })
        );
        await Promise.all(notificationPromises);
        
        // Push Notification for Admins
        recipients.forEach(recipient => {
            sendPushNotification(recipient._id.toString(), {
                title: 'New Job Application 💼',
                body: `${req.user.name} applied for "${task.title}"`,
                icon: '/logo.png',
                image: '/logo.png',
                badge: '/logo.png',
                url: recipient.role === 'teacher' ? '/teacher/jobs' : '/admin/paid-tasks'
            });
        });

        res.json({ success: true, message: 'Application submitted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   DELETE /api/tasks/:id/applicants/:userId
// @desc    Remove a pending application so the user can apply again
// @access  Private (Admin or assigned job manager teacher)
router.delete('/:id/applicants/:userId', protect, authorize('admin', 'teacher'), requireActiveTeacher, async (req, res) => {
    try {
        const task = await PaidTask.findById(req.params.id);
        if (!task) {
            return res.status(404).json({ success: false, message: 'Task not found' });
        }

        if (req.user.role === 'teacher') {
            const managerIds = (task.jobManagers?.length
                ? task.jobManagers
                : [task.jobManager || task.createdBy]).filter(Boolean).map(String);
            if (!managerIds.includes(String(req.user.id))) {
                return res.status(403).json({ success: false, message: 'You can only manage applicants for your own jobs' });
            }
        }

        const applicantId = String(req.params.userId);
        const isAssigned = (task.assignedTo || []).some(userId => String(userId) === applicantId);
        if (isAssigned) {
            return res.status(400).json({ success: false, message: 'Unassign this user before deleting the application' });
        }

        const previousCount = task.applicants.length;
        task.applicants = task.applicants.filter(applicant => String(applicant.user) !== applicantId);
        if (task.applicants.length === previousCount) {
            return res.status(404).json({ success: false, message: 'Application not found' });
        }

        await task.save();

        const io = req.app.get('io');
        if (io) {
            io.to(applicantId).emit('new_browser_notification', {
                title: 'Application Removed',
                message: `Your application for "${task.title}" was removed. You can apply again.`,
                url: '/job/tasks'
            });
        }

        res.json({ success: true, message: 'Application removed successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   PUT /api/tasks/:id/assign
// @desc    Assign task to an applicant (can be multiple)
// @access  Private (Admin or assigned job manager teacher)
router.put('/:id/assign', protect, authorize('admin', 'teacher'), requireActiveTeacher, async (req, res) => {
    try {
        const { userId } = req.body;
        const task = await PaidTask.findById(req.params.id);

        if (!task) {
            return res.status(404).json({ success: false, message: 'Task not found' });
        }

        // Initialize assignedTo if it doesn't exist (migration safety)
        if (!task.assignedTo) task.assignedTo = [];

        // Check if already assigned (robust string comparison)
        if (task.assignedTo.some(id => id.toString() === userId.toString())) {
            return res.status(400).json({ success: false, message: 'User already assigned to this task' });
        }

        task.assignedTo.push(userId);
        task.assignedAt = new Date();
        const assignApplications = task.applicants.filter(applicant => String(applicant.user) === String(userId));
        const assignApplication = assignApplications.sort((a, b) => (b.cycle || 1) - (a.cycle || 1))[0];
        if (assignApplication) assignApplication.status = 'assigned';

        // Keep status as 'assigned' if at least one person is working on it
        // If it was 'open', change to 'assigned'. If it was already 'assigned', it stays 'assigned'.
        if (task.status === 'open') {
            task.status = 'assigned';
        }

        await task.save();

        // Keep the admin Project Portfolio in sync with assigned job work.
        // The first assignment creates the project; later assignments only add
        // the new person to the same project team.
        const assignedUser = await User.findById(userId).select('name role');
        if (assignedUser) {
            const userDesignation = assignedUser.role ? assignedUser.role.charAt(0).toUpperCase() + assignedUser.role.slice(1) : 'Job User';
            const budgetNumbers = String(task.budget || '').match(/[\d,]+/g) || [];
            const clientTotal = budgetNumbers.length
                ? Number(budgetNumbers[budgetNumbers.length - 1].replace(/,/g, '')) || 0
                : 0;
            let financeProject = await FinanceProject.findOne({ sourceTask: task._id });

            if (!financeProject) {
                financeProject = await FinanceProject.create({
                    sourceTask: task._id,
                    name: task.title,
                    clientName: 'Job Posting Client',
                    clientTotal,
                    developers: [{
                        name: assignedUser.name,
                        designation: userDesignation,
                        percentage: 0,
                        totalPayable: 0,
                        paidAmount: 0
                    }],
                    companies: [],
                    status: 'processing',
                    startDate: task.assignedAt || new Date(),
                    description: `Automatically created from Job Posting: ${task.title}`,
                    createdBy: req.user.id,
                    assignedTeachers: [req.user.id]
                });
            } else {
                const assignedTeacherIds = (financeProject.assignedTeachers || []).map(id => id.toString());
                if (!assignedTeacherIds.includes(req.user.id.toString())) {
                    financeProject.assignedTeachers.push(req.user.id);
                }
                if (!(financeProject.developers || []).some(member => member.name === assignedUser.name)) {
                    financeProject.developers.push({
                        name: assignedUser.name,
                        designation: userDesignation,
                        percentage: 0,
                        totalPayable: 0,
                        paidAmount: 0
                    });
                }
                await financeProject.save();
            }
        }

        // Notify the assigned user
        const UserNotificationModel = require('../models/UserNotification');
        await UserNotificationModel.create({
            user: userId,
            title: 'Task Assigned',
            message: `You have been assigned to the task: "${task.title}". Please submit your work before the deadline.`,
            type: 'task_assigned',
            relatedTask: task._id
        });

        // Send real-time notification to the user
        const io = req.app.get('io');
        if (io) {
            io.to(userId.toString()).emit('new_browser_notification', {
                title: 'Task Assigned',
                message: `You have been assigned to the task: "${task.title}".`,
                url: '/job/tasks'
            });

            // Push Notification for Student
            sendPushNotification(userId.toString(), {
                title: 'Task Assigned 🎯',
                body: `You have been assigned to: "${task.title}"`,
                icon: '/logo.png',
                image: '/logo.png',
                badge: '/logo.png',
                url: '/job/tasks'
            });
        }

        res.json({ success: true, task });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   PUT /api/tasks/:id/unassign
// @desc    Unassign task from a user
// @access  Private (Admin or assigned job manager teacher)
router.put('/:id/unassign', protect, authorize('admin', 'teacher'), requireActiveTeacher, async (req, res) => {
    try {
        const { userId } = req.body;
        const task = await PaidTask.findById(req.params.id);

        if (!task) {
            return res.status(404).json({ success: false, message: 'Task not found' });
        }

        if (req.user.role === 'teacher') {
            const managerIds = (task.jobManagers?.length ? task.jobManagers : [task.jobManager || task.createdBy]).filter(Boolean).map(String);
            if (!managerIds.includes(String(req.user.id))) {
                return res.status(403).json({ success: false, message: 'You can only assign users to jobs you manage' });
            }
        }

        const isApplicant = (task.applicants || []).some(applicant => String(applicant.user) === String(userId));
        if (!isApplicant) {
            return res.status(400).json({ success: false, message: 'Only applicants can be assigned to this job' });
        }

        if (req.user.role === 'teacher') {
            const managerIds = (task.jobManagers?.length ? task.jobManagers : [task.jobManager || task.createdBy]).filter(Boolean).map(String);
            if (!managerIds.includes(String(req.user.id))) {
                return res.status(403).json({ success: false, message: 'You can only unassign users from jobs you manage' });
            }
        }

        // Initialize if undefined
        if (!task.assignedTo) task.assignedTo = [];

        // Remove user from assignedTo array
        task.assignedTo = task.assignedTo.filter(id => id.toString() !== userId.toString());
        task.submissions = (task.submissions || []).filter(submission => String(submission.user) !== String(userId));
        const unassignApplications = task.applicants.filter(applicant => String(applicant.user) === String(userId));
        const unassignApplication = unassignApplications.sort((a, b) => (b.cycle || 1) - (a.cycle || 1))[0];
        if (unassignApplication && unassignApplication.status !== 'completed') unassignApplication.status = 'applied';

        // Also remove any submission from this user? 
        // Typically yes, if we revoke assignment, their submission might be invalid.
        // But maybe we keep it for record? The user asked to "revoke assignment". 
        // Let's just remove assignment for now.

        // If no one is assigned anymore, set status back to 'open'
        if (task.assignedTo.length === 0) {
            task.status = 'open';
            task.assignedAt = undefined;
        }

        await task.save();

        // Remove the unassigned user from the auto-created FinanceProject
        const unassignedUser = await User.findById(userId).select('name');
        if (unassignedUser) {
            const financeProject = await FinanceProject.findOne({ sourceTask: task._id });
            if (financeProject) {
                financeProject.developers = (financeProject.developers || []).filter(
                    dev => dev.name !== unassignedUser.name
                );
                // If no developers left, delete the entire project
                if (financeProject.developers.length === 0) {
                    await FinanceProject.findByIdAndDelete(financeProject._id);
                } else {
                    await financeProject.save();
                }
            }
        }

        await UserNotification.create({
            user: userId,
            title: 'Job Unassigned',
            message: `You have been unassigned from "${task.title}".`,
            type: 'task_assigned',
            relatedTask: task._id
        });

        const io = req.app.get('io');
        if (io) io.to(String(userId)).emit('new_browser_notification', {
            title: 'Job Unassigned',
            message: `"${task.title}" has been removed from your Assigned jobs.`,
            url: '/job/tasks'
        });

        res.json({ success: true, task });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   POST /api/tasks/:id/cancel
// @desc    Cancel/withdraw assignment from a task (by the assigned user)
// @access  Private (Assigned user)
router.post('/:id/cancel', protect, async (req, res) => {
    try {
        const task = await PaidTask.findById(req.params.id);

        if (!task) {
            return res.status(404).json({ success: false, message: 'Task not found' });
        }

        // Check if user is in the assigned list
        const isAssigned = task.assignedTo && task.assignedTo.some(id => id.toString() === req.user.id || (id._id && id._id.toString() === req.user.id));

        if (!isAssigned) {
            return res.status(403).json({ success: false, message: 'You are not assigned to this task' });
        }

        // Remove user from assignedTo array
        task.assignedTo = task.assignedTo.filter(id => id.toString() !== req.user.id && (!id._id || id._id.toString() !== req.user.id));

        // Also remove them from applicants so they can apply again if they want
        if (task.applicants) {
            task.applicants = task.applicants.filter(app => app.user.toString() !== req.user.id && (!app.user._id || app.user._id.toString() !== req.user.id));
        }

        // Also remove any submission from this user if they had one
        if (task.submissions) {
            task.submissions = task.submissions.filter(sub => sub.user.toString() !== req.user.id && (!sub.user._id || sub.user._id.toString() !== req.user.id));
        }

        // If no one is assigned anymore, set status back to 'open'
        if (task.assignedTo.length === 0) {
            task.status = 'open';
            task.assignedAt = undefined;
        }

        await task.save();

        res.json({ success: true, task, message: 'Task assignment cancelled successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   POST /api/tasks/:id/submit
// @desc    Submit task work
// @access  Private (Assigned user)
router.post('/:id/submit', protect, uploadSubmission.single('file'), async (req, res) => {
    try {
        const { notes, projectLink, accountDetails } = req.body;
        const requestedAmount = Number(String(req.body.requestedAmount || '').replace(/,/g, ''));
        const task = await PaidTask.findById(req.params.id);

        if (!task) {
            return res.status(404).json({ success: false, message: 'Task not found' });
        }

        // Check if user is in the assigned list
        // Handle both simple array and populated array (ObjectId vs Object)
        const isAssigned = task.assignedTo.some(id => id.toString() === req.user.id || (id._id && id._id.toString() === req.user.id));

        if (!isAssigned) {
            return res.status(403).json({ success: false, message: 'Not authorized - You are not assigned to this task' });
        }

        if (!Number.isFinite(requestedAmount) || requestedAmount <= 0) {
            return res.status(400).json({ success: false, message: 'Please enter a valid requested payment amount' });
        }

        // Initialize submissions if undefined
        if (!task.submissions) task.submissions = [];

        // Check if already submitted
        const userApplications = task.applicants.filter(a => String(a.user) === String(req.user.id));
        const currentApplication = userApplications.sort((a, b) => (b.cycle || 1) - (a.cycle || 1))[0];
        const currentCycle = currentApplication?.cycle || 1;
        const alreadySubmitted = task.submissions.some(sub => sub.user.toString() === req.user.id && (sub.cycle || 1) === currentCycle);
        if (alreadySubmitted) {
            return res.status(400).json({ success: false, message: 'You have already submitted work for this task' });
        }

        task.submissions.push({
            user: req.user.id,
            notes,
            projectLink,
            fileUrl: req.file ? req.file.path : null,
            accountDetails,
            requestedAmount,
            submittedAt: new Date(),
            cycle: currentCycle
        });

        if (currentApplication) currentApplication.status = 'submitted';

        // We do NOT change the global task status to 'submitted' immediately because others might still be working.
        // It stays 'assigned' until Admin marks it completed? 
        // OR we can add a 'submitted' status if *everyone* submitted? 
        // For now, let's leave status as 'assigned' or 'submitted' loosely. 
        // Previously it was: status = 'submitted'.
        // If we want multiple submissions, maybe we shouldn't change global status to 'submitted' fully 
        // unless we want to indicate "at least one submission received".
        // Let's set it to 'submitted' to indicate activity, but admin needs to know WHO submitted.

        task.status = 'submitted';

        await task.save();

        // Notify Admins of Submission
        const admins = await User.find({ role: 'admin' });
        admins.forEach(admin => {
            sendPushNotification(admin._id.toString(), {
                title: 'Job Work Submitted 📤',
                body: `${req.user.name} submitted work for "${task.title}"`,
                icon: '/logo.png',
                image: '/logo.png',
                badge: '/logo.png',
                url: '/admin/paid-tasks'
            });
        });

        res.json({ success: true, message: 'Work submitted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   PUT /api/tasks/:id/admin-complete
// @desc    Admin directly completes & pays a task (the ONLY way to move to completed)
// @access  Private (Admin)
router.put('/:id/admin-complete', protect, authorize('admin'), async (req, res) => {
    try {
        const payments = Array.isArray(req.body.payments) ? req.body.payments : [];
        const paymentProof = typeof req.body.paymentProof === 'string' ? req.body.paymentProof : '';
        const task = await PaidTask.findById(req.params.id);

        if (!task) {
            return res.status(404).json({ success: false, message: 'Task not found' });
        }

        if (task.status === 'completed' && task.paymentSent) {
            return res.status(400).json({ success: false, message: 'Task is already completed' });
        }

        const payableUsers = [...new Set((task.submissions || []).map(submission => String(submission.user)))];
        if (!payableUsers.length) return res.status(400).json({ success: false, message: 'No submitted work is available for payment' });

        const paymentMap = new Map(payments.map(payment => [String(payment.userId), Number(payment.amount)]));
        for (const userId of payableUsers) {
            const amount = paymentMap.get(userId);
            if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ success: false, message: 'Enter a valid payment amount for every submitted user' });
        }

        task.status = 'completed';
        task.paymentSent = true;
        task.paymentSentAt = new Date();

        await task.save();

        if (payableUsers.length > 0) {
            const userUpdates = payableUsers.map(userId => {
                const userApplications = task.applicants.filter(applicant => String(applicant.user) === userId);
                const currentApplication = userApplications.sort((a, b) => (b.cycle || 1) - (a.cycle || 1))[0];
                const cycle = currentApplication?.cycle || 1;
                const amount = paymentMap.get(userId);
                task.paymentHistory.push({ user: userId, amount, paymentProof, cycle, paidAt: new Date(), feedbackSubmitted: false });
                if (currentApplication) currentApplication.status = 'paid';
                return User.findByIdAndUpdate(userId, { $inc: { completedTasks: 1, totalEarnings: amount } });
            });

            await Promise.all(userUpdates);
            await task.save();

            // Notify users that payment is completed
            const UserNotificationModel = require('../models/UserNotification');
            const io = req.app.get('io');

            const notificationPromises = payableUsers.map(userId =>
                UserNotificationModel.create({
                    user: userId,
                    title: 'Payment Received!',
                    message: `Payment of Rs ${paymentMap.get(String(userId)).toLocaleString()} for "${task.title}" has been completed! Please submit your feedback.`,
                    type: 'task_paid',
                    relatedTask: task._id
                })
            );
            await Promise.all(notificationPromises);

            if (io) {
                payableUsers.forEach(userId => {
                    const userIdStr = userId.toString();
                    io.to(userIdStr).emit('new_browser_notification', {
                        title: 'Payment Received!',
                        message: `Payment of Rs ${paymentMap.get(String(userId)).toLocaleString()} for "${task.title}" has been completed!`,
                        url: '/job/tasks'
                    });

                    // Push Notification for Student
                    sendPushNotification(userIdStr, {
                        title: 'Payment Received! 💰',
                        body: `Payment for "${task.title}" has been completed!`,
                        icon: '/logo.png',
                        image: '/logo.png',
                        badge: '/logo.png',
                        url: '/job/tasks'
                    });
                });
            }
        }

        res.json({ success: true, task });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   PUT /api/tasks/:id/reopen
// @desc    Reopen a completed job for a fresh application cycle
// @access  Private (Admin or assigned job manager)
router.put('/:id/reopen', protect, authorize('admin', 'teacher'), requireActiveTeacher, async (req, res) => {
    try {
        const task = await PaidTask.findById(req.params.id);

        if (!task) {
            return res.status(404).json({ success: false, message: 'Task not found' });
        }

        const managerIds = (task.jobManagers?.length
            ? task.jobManagers
            : [task.jobManager || task.createdBy]
        ).filter(Boolean).map(String);

        if (req.user.role === 'teacher' && !managerIds.includes(String(req.user.id))) {
            return res.status(403).json({ success: false, message: 'You can only reopen jobs you manage' });
        }

        // Close every user's latest application cycle so all users, including
        // previous workers, can create a new cycle when they apply again.
        const latestApplicationByUser = new Map();
        (task.applicants || []).forEach(applicant => {
            const userId = String(applicant.user);
            const existing = latestApplicationByUser.get(userId);
            if (!existing || (applicant.cycle || 1) >= (existing.cycle || 1)) {
                latestApplicationByUser.set(userId, applicant);
            }
        });
        latestApplicationByUser.forEach(applicant => {
            applicant.status = 'completed';
        });

        // Feedback and paymentHistory are intentionally preserved as history.
        task.assignedTo = [];
        task.submissions = [];
        task.assignedAt = undefined;
        task.status = 'open';
        task.manualStatus = 'active';
        task.paymentSent = false;
        task.paymentSentAt = undefined;

        await task.save();

        res.json({
            success: true,
            task,
            message: 'Job reopened for new applications; previous feedback was preserved'
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   POST /api/tasks/:id/feedback
// @desc    Add feedback after task is completed and paid
// @access  Private (Job role - assigned users only)
router.post('/:id/feedback', protect, authorize('job'), async (req, res) => {
    try {
        const { text, rating } = req.body;
        const task = await PaidTask.findById(req.params.id);

        if (!task) {
            return res.status(404).json({ success: false, message: 'Task not found' });
        }

        if (task.status !== 'completed' || !task.paymentSent) {
            return res.status(400).json({ success: false, message: 'Feedback can only be added after task is completed and payment is confirmed' });
        }

        // Check if user was assigned to this task
        const wasAssigned = task.assignedTo.some(id => id.toString() === req.user.id || (id._id && id._id.toString() === req.user.id));
        if (!wasAssigned) {
            return res.status(403).json({ success: false, message: 'Only assigned users can leave feedback' });
        }

        const userApplications = task.applicants.filter(a => String(a.user) === String(req.user.id));
        const currentApplication = userApplications.sort((a, b) => (b.cycle || 1) - (a.cycle || 1))[0];
        const currentCycle = currentApplication?.cycle || 1;
        let paymentRecord = [...(task.paymentHistory || [])].reverse().find(payment => String(payment.user) === String(req.user.id) && (payment.cycle || 1) === currentCycle && !payment.feedbackSubmitted);
        if (!paymentRecord && task.paymentSent) {
            task.paymentHistory.push({
                user: req.user.id,
                amount: 0,
                cycle: currentCycle,
                paidAt: task.paymentSentAt || new Date(),
                feedbackSubmitted: false
            });
            paymentRecord = task.paymentHistory[task.paymentHistory.length - 1];
        }
        if (!paymentRecord) return res.status(400).json({ success: false, message: 'Payment is not confirmed for this work cycle yet' });

        if (!task.feedback) task.feedback = [];
        const alreadyFeedback = task.feedback.some(f => f.user.toString() === req.user.id && (f.cycle || 1) === currentCycle);
        if (alreadyFeedback) {
            return res.status(400).json({ success: false, message: 'You have already submitted feedback for this task' });
        }

        task.feedback.push({
            user: req.user.id,
            text,
            rating: rating || 5,
            cycle: currentCycle,
            earning: paymentRecord.amount || 0,
            createdAt: new Date()
        });

        paymentRecord.feedbackSubmitted = true;
        if (currentApplication) currentApplication.status = 'completed';
        task.assignedTo = (task.assignedTo || []).filter(id => String(id) !== String(req.user.id));
        task.submissions = (task.submissions || []).filter(submission => String(submission.user) !== String(req.user.id));
        if (task.assignedTo.length === 0) {
            task.status = 'open';
            task.paymentSent = false;
            task.paymentSentAt = undefined;
        }

        await task.save();

        // Create notification for all admin users
        const UserModel = require('../models/User');
        const UserNotificationModel = require('../models/UserNotification');
        const admins = await UserModel.find({ role: 'admin' });

        const notificationPromises = admins.map(admin =>
            UserNotificationModel.create({
                user: admin._id,
                title: 'New Task Feedback',
                message: `${req.user.name} submitted feedback (Rating: ${rating || 5}) for task "${task.title}".`,
                type: 'task_completed',
                relatedTask: task._id,
                relatedUser: req.user.id
            })
        );
        await Promise.all(notificationPromises);

        // Send real-time notification to admins
        const io = req.app.get('io');
        if (io) {
            admins.forEach(admin => {
                const adminRoom = admin._id.toString();
                io.to(adminRoom).emit('new_browser_notification', {
                    title: 'New Task Feedback',
                    message: `${req.user.name} submitted feedback for task "${task.title}".`,
                    url: '/admin/paid-tasks'
                });
            });
        }

        res.json({ success: true, message: 'Feedback submitted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   PUT /api/tasks/:id/complete
// @desc    Verify and mark payment sent (Closes task for everyone)
// @access  Private (Admin)
router.put('/:id/complete', protect, authorize('admin'), async (req, res) => {
    try {
        const task = await PaidTask.findById(req.params.id);

        if (!task) {
            return res.status(404).json({ success: false, message: 'Task not found' });
        }

        task.status = 'completed';
        task.paymentSent = true;
        task.paymentSentAt = new Date();

        await task.save();

        // Update ALL assigned users' completed tasks count
        if (task.assignedTo && task.assignedTo.length > 0) {
            await User.updateMany(
                { _id: { $in: task.assignedTo } },
                { $inc: { completedTasks: 1 } }
            );
        }

        res.json({ success: true, task });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/tasks/completed-showcase
// @desc    Get all completed tasks with feedback for public showcase
// @access  Private (any authenticated user)
router.get('/completed-showcase', protect, async (req, res) => {
    try {
        const tasks = await PaidTask.find({ 'feedback.0': { $exists: true } })
            .populate('assignedTo', 'name email photo')
            .populate('feedback.user', 'name photo totalEarnings')
            .select('title description budget skills category status assignedTo feedback completedAt paymentSentAt createdAt images image')
            .sort('-paymentSentAt')
            .lean();

        res.json({ success: true, data: tasks });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/tasks/my
// @desc    Get tasks for current job user
// @access  Private (Job role)
router.get('/my', protect, authorize('job'), async (req, res) => {
    try {
        // Get tasks where user applied or is assigned (in the array)
        const tasks = await PaidTask.find({
            $or: [
                { 'applicants.user': req.user.id },
                { assignedTo: req.user.id }
            ]
        })
            .populate('assignedTo', 'name email photo')
            .populate('feedback.user', 'name photo totalEarnings')
            .populate('paymentHistory.user', 'name photo totalEarnings')
            .populate('applicants.user', 'name email photo totalEarnings completedTasks rating')
            .sort('-createdAt')
            .lean();

        res.json({ success: true, data: tasks });
    } catch (error) {
        console.error('Error in /my route:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   DELETE /api/tasks/:id
// @desc    Permanently delete a task
// @access  Private (Admin only)
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
    try {
        const task = await PaidTask.findById(req.params.id);

        if (!task) {
            return res.status(404).json({ success: false, message: 'Task not found' });
        }

        await PaidTask.findByIdAndDelete(req.params.id);

        res.json({ success: true, message: 'Task permanently deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   PUT /api/tasks/:id/feedback/:feedbackId
// @desc    Edit a feedback entry (Admin only)
// @access  Private (Admin)
router.put('/:id/feedback/:feedbackId', protect, authorize('admin'), async (req, res) => {
    try {
        const { text, rating } = req.body;
        const task = await PaidTask.findById(req.params.id);

        if (!task) {
            return res.status(404).json({ success: false, message: 'Task not found' });
        }

        const feedbackEntry = task.feedback.id(req.params.feedbackId);
        if (!feedbackEntry) {
            return res.status(404).json({ success: false, message: 'Feedback entry not found' });
        }

        if (text !== undefined) feedbackEntry.text = text;
        if (rating !== undefined) feedbackEntry.rating = rating;

        await task.save();

        res.json({ success: true, message: 'Feedback updated successfully', data: task });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   DELETE /api/tasks/:id/feedback/:feedbackId
// @desc    Delete a feedback entry (Admin only)
// @access  Private (Admin)
router.delete('/:id/feedback/:feedbackId', protect, authorize('admin'), async (req, res) => {
    try {
        const task = await PaidTask.findById(req.params.id);

        if (!task) {
            return res.status(404).json({ success: false, message: 'Task not found' });
        }

        const feedbackEntry = task.feedback.id(req.params.feedbackId);
        if (!feedbackEntry) {
            return res.status(404).json({ success: false, message: 'Feedback entry not found' });
        }

        feedbackEntry.deleteOne();
        await task.save();

        res.json({ success: true, message: 'Feedback deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
