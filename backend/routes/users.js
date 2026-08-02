const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const User = require('../models/User');
const Fee = require('../models/Fee');
const Enrollment = require('../models/Enrollment');
const PaidTask = require('../models/PaidTask');
const Course = require('../models/Course');
const { uploadPhoto } = require('../config/cloudinary');
const moment = require('moment-timezone');
const { sendPushNotification } = require('../utils/pushHelper');

const getLinkedAccountQuery = (user) => {
    const rollNo = user.rollNo?.toString().trim();
    if (rollNo) return { rollNo };
    return { email: user.email?.toString().trim().toLowerCase() };
};

// @route   GET /api/users/birthdays
// @desc    Get users with birthdays in the current window (3 days)
// @access  Private
router.get('/birthdays', protect, async (req, res) => {
    try {
        const users = await User.aggregate([
            {
                $match: {
                    dob: { $exists: true, $ne: null },
                    isVerified: true
                }
            },
            {
                $lookup: {
                    from: 'enrollments',
                    localField: '_id',
                    foreignField: 'user',
                    as: 'enrollmentData'
                }
            },
            {
                $match: {
                    $or: [
                        { role: 'teacher' },
                        { role: 'admin' },
                        { role: 'job' },
                        {
                            role: { $in: ['student', 'intern'] },
                            enrollmentData: {
                                $elemMatch: { status: { $in: ['enrolled', 'pending'] } }
                            }
                        }
                    ]
                }
            },
            {
                $project: {
                    name: 1,
                    email: 1,
                    photo: 1,
                    dob: 1,
                    role: 1,
                    birthdayWishes: 1,
                    rollNo: 1
                }
            }
        ]);
        
        const birthdayPeople = users.filter(user => {
            const dob = moment.utc(user.dob);
            const birthMonth = dob.month();
            const birthDay = dob.date();
            
            const today = moment().tz('Asia/Karachi').startOf('day');
            
            // Check three years (prev, current, next) to handle year-end crossovers correctly
            const yearsToCheck = [today.year() - 1, today.year(), today.year() + 1];
            
            return yearsToCheck.some(year => {
                const birthDate = moment().tz('Asia/Karachi').year(year).month(birthMonth).date(birthDay).startOf('day');
                const startWindow = moment(birthDate).subtract(1, 'days').startOf('day');
                const endWindow = moment(birthDate).add(1, 'days').endOf('day');
                return today.isBetween(startWindow, endWindow, null, '[]');
            });
        });

        // Group by email to avoid duplicates for users with multiple roles
        const uniquePeopleMap = new Map();

        for (const person of birthdayPeople) {
            if (!uniquePeopleMap.has(person.email)) {
                // First time seeing this email
                const personObj = { ...person }; // Aggregation returns plain objects
                personObj.roles = [person.role]; // Store roles in an array
                uniquePeopleMap.set(person.email, personObj);
            } else {
                // Already seen this email, add the role if not already there
                const existing = uniquePeopleMap.get(person.email);
                if (!existing.roles.includes(person.role)) {
                    existing.roles.push(person.role);
                }
            }
        }
        
        res.json({ success: true, data: Array.from(uniquePeopleMap.values()) });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   POST /api/users/:id/wish
// @desc    Send birthday wish to a user (syncs across same email)
// @access  Private
router.post('/:id/wish', protect, async (req, res) => {
    try {
        const targetUser = await User.findById(req.params.id);
        if (!targetUser) return res.status(404).json({ success: false, message: 'User not found' });
        
        const currentYear = moment().year();
        const userEmail = targetUser.email;
        
        // Find all users with this email to sync the wish
        const usersToUpdate = await User.find({ email: userEmail });
        
        for (const user of usersToUpdate) {
            // Check if already wished this year for this specific account
            const alreadyWished = user.birthdayWishes && user.birthdayWishes.some(
                w => w.from && w.from.toString() === req.user.id && w.year === currentYear
            );
            
            if (!alreadyWished) {
                if (!user.birthdayWishes) user.birthdayWishes = [];
                user.birthdayWishes.push({
                    from: req.user.id,
                    year: currentYear
                });
                await user.save();
            }
        }
        
        // Send push notification to the recipient (only once)
        sendPushNotification(targetUser._id.toString(), {
            title: 'Birthday Wish! 🎂',
            body: `${req.user.name} wished you a Happy Birthday!`,
            icon: '/logo.png',
            url: '/'
        });

        res.json({ success: true, message: 'Wish sent successfully!' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/users
// @desc    Get all users (admin only)
// @access  Private/Admin
router.get('/', protect, authorize('admin'), async (req, res) => {
    try {
        const users = await User.find().select('+password');
        res.json({ success: true, data: users });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/users/pending-counts
// @desc    Get count of unverified users grouped by role (admin only)
// @access  Private/Admin
router.get('/pending-counts', protect, authorize('admin'), async (req, res) => {
    try {
        const counts = await User.aggregate([
            { $match: { isVerified: false, role: { $ne: 'admin' } } },
            { $group: { _id: '$role', count: { $sum: 1 } } }
        ]);

        // Transform into a simpler object: { student: 5, teacher: 2, ... }
        const result = counts.reduce((acc, curr) => {
            acc[curr._id] = curr.count;
            return acc;
        }, {});

        // Sidebar fee badge mirrors the "Submitted for Review" list exactly.
        const feeCounts = await Fee.aggregate([
            { $unwind: '$installments' },
            { $match: { 'installments.status': 'submitted' } },
            { $count: 'count' }
        ]);

        // Add to result (default to 0 if no results)
        result.fees = feeCounts.length > 0 ? feeCounts[0].count : 0;

        const awaitingFeeCounts = await Fee.aggregate([
            { $unwind: '$installments' },
            { $match: { 'installments.status': 'pending' } },
            { $count: 'count' }
        ]);
        result.feesAwaiting = awaitingFeeCounts.length > 0 ? awaitingFeeCounts[0].count : 0;

        // Count Registered (New) for each role
        // Registered (New) = totalEnrollments === 0 && registeredOld === false
        
        // 1. Get all enrolled user IDs
        const enrolledUserIds = await Enrollment.distinct('user');

        // 2. Function to count Registered (New)
        const countRegisteredNew = async (role) => {
            if (role === 'teacher') {
                const Course = require('../models/Course');
                const teachersWithCourses = await Course.distinct('teachers');
                return await User.countDocuments({
                    role: 'teacher',
                    registeredOld: { $ne: true },
                    _id: { $nin: teachersWithCourses }
                });
            }
            return await User.countDocuments({
                role: role,
                registeredOld: { $ne: true }, // Not marked as old
                _id: { $nin: enrolledUserIds } // No enrollments
            });
        };

        result.studentRegisteredNew = await countRegisteredNew('student');
        result.teacherRegisteredNew = await countRegisteredNew('teacher');
        result.internRegisteredNew = await countRegisteredNew('intern');

        // Count active teachers (teachers with active enrollments or assigned jobs)
        const activeTeacherAgg = await User.aggregate([
            { $match: { role: 'teacher', isActive: { $ne: false } } },
            {
                $lookup: {
                    from: 'courses',
                    let: { teacherId: '$_id' },
                    pipeline: [
                        { $match: { $expr: { $in: ['$$teacherId', '$teachers'] } } },
                        { $project: { _id: 1 } }
                    ],
                    as: 'assignedCourses'
                }
            },
            {
                $match: { 'assignedCourses.0': { $exists: true } }
            },
            { $count: 'count' }
        ]);
        result.teacherActive = activeTeacherAgg.length > 0 ? activeTeacherAgg[0].count : 0;

        // Count total applicants across all paid tasks (new/unassigned applicants)
        const allTasks = await PaidTask.find({}, { applicants: 1, assignedTo: 1 });
        let totalNewApplicants = 0;
        allTasks.forEach(task => {
            const assignedIds = (task.assignedTo || []).map(id => String(id));
            const unassigned = (task.applicants || []).filter(
                a => !assignedIds.includes(String(a.user))
            );
            totalNewApplicants += unassigned.length;
        });
        result.newApplicants = totalNewApplicants;

        res.json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/users/role/:role
// @desc    Get users by role (admin only)
// @access  Private/Admin
router.get('/role/:role', protect, authorize('admin'), async (req, res) => {
    try {
        // Use aggregation to get users with their enrollment stats
        const role = req.params.role;
        const isTeacher = role === 'teacher';

        const users = await User.aggregate([
            // 1. Match users by role
            { $match: { role: role } },

            // 2. Lookup based on role
            isTeacher ? {
                $lookup: {
                    from: 'courses',
                    localField: '_id',
                    foreignField: 'teachers',
                    as: 'courseData'
                }
            } : {
                $lookup: {
                    from: 'enrollments',
                    localField: '_id',
                    foreignField: 'user',
                    as: 'enrollmentData'
                }
            },

            // 2b. If teacher, also lookup certificates
            ...(isTeacher ? [{
                $lookup: {
                    from: 'certificates',
                    localField: '_id',
                    foreignField: 'user',
                    as: 'certificateData'
                }
            }, {
                $lookup: {
                    from: 'paidtasks',
                    localField: '_id',
                    foreignField: 'jobManagers',
                    as: 'paidTaskData'
                }
            }] : []),

            // 3. Add fields for stats
            {
                $addFields: {
                    totalEnrollments: { $size: isTeacher ? '$courseData' : '$enrollmentData' },
                    certificateCount: isTeacher ? { $size: '$certificateData' } : 0,
                    completedEnrollments: isTeacher ? {
                        $size: {
                            $filter: {
                                input: '$courseData',
                                as: 'c',
                                cond: { $eq: ['$$c.isActive', false] }
                            }
                        }
                    } : {
                        $size: {
                            $filter: {
                                input: '$enrollmentData',
                                as: 'e',
                                cond: { $eq: ['$$e.status', 'completed'] }
                            }
                        }
                    },
                    activeEnrollments: isTeacher ? {
                        $size: {
                            $filter: {
                                input: '$courseData',
                                as: 'c',
                                cond: {
                                    $and: [
                                        { $eq: ['$$c.isActive', true] },
                                        { $not: { $in: ['$_id', { $ifNull: ['$$c.pausedTeachers', []] }] } }
                                    ]
                                }
                            }
                        }
                    } : {
                        $size: {
                            $filter: {
                                input: '$enrollmentData',
                                as: 'e',
                                cond: { $in: ['$$e.status', ['enrolled', 'pending']] }
                            }
                        }
                    },
                    pausedEnrollments: isTeacher ? {
                        $size: {
                            $filter: {
                                input: '$courseData',
                                as: 'c',
                                cond: { $in: ['$_id', { $ifNull: ['$$c.pausedTeachers', []] }] }
                            }
                        }
                    } : {
                        $size: {
                            $filter: {
                                input: '$enrollmentData',
                                as: 'e',
                                cond: { $eq: ['$$e.isPaused', true] }
                            }
                        }
                    },
                    assignedJobCount: isTeacher ? {
                        $size: {
                            $filter: {
                                input: '$paidTaskData',
                                as: 'task',
                                cond: { $in: ['$$task.status', ['open', 'assigned', 'submitted']] }
                            }
                        }
                    } : 0
                }
            },

            // 4. Project necessary fields
            {
                $project: {
                    enrollmentData: 0,
                    certificateData: 0,
                    paidTaskData: 0,
                    // Keep courseData for teachers to show titles
                    ...(isTeacher ? {} : { courseData: 0 })
                }
            }
        ]);

        // Populate course titles separate if needed, or just return users
        // Since we need to show which courses they are in, we might want to populate.
        // But for now, let's just return the user data + stats.
        // To keep compatibility with existing code, we ensure the structure matches what Mongoose .find() returns
        // Aggregation returns plain objects, not Mongoose documents.

        // We also need to populate 'verifiedBy' manually or via another lookup if strictly needed,
        // but likely the frontend just checks 'isVerified'.

        res.json({ success: true, data: users });
    } catch (error) {
        console.error('Error fetching users by role:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   PUT /api/users/change-password-by-email
// @desc    Change user password by email (admin only)
// @access  Private/Admin
// Keep this static route above /:id so Express does not treat its name as a user id.
router.put('/change-password-by-email', protect, authorize('admin'), async (req, res) => {
    try {
        const { email, newPassword } = req.body;
        if (!email || !newPassword) {
            return res.status(400).json({ success: false, message: 'Please provide email and new password' });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const requestedUser = await User.findOne({ email: normalizedEmail });
        if (!requestedUser) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // The same person can have a different legacy email on another role, so
        // include accounts linked through the shared global roll number.
        const users = await User.find(getLinkedAccountQuery(requestedUser)).select('+password');
        for (const user of users) {
            user.password = newPassword;
            await user.save();
        }

        res.json({ success: true, message: `Password updated successfully for ${users.length} linked account(s)` });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/users/:id
// @desc    Get single user
// @access  Private/Admin
router.get('/:id', protect, authorize('admin'), async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('+password');
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        res.json({ success: true, data: user });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   PUT /api/users/:id
// @desc    Update user (admin only)
// @access  Private/Admin
router.put('/:id', protect, authorize('admin'), uploadPhoto.single('photo'), async (req, res) => {
    try {
        const updateData = { ...req.body };

        // If photo uploaded, update path
        if (req.file) {
            updateData.photo = req.file.path;
        }

        // Get the current user to find their email
        const currentUser = await User.findById(req.params.id);
        if (!currentUser) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (typeof updateData.email === 'string') {
            updateData.email = updateData.email.trim().toLowerCase();
        }

        const linkedAccounts = await User.find(getLinkedAccountQuery(currentUser)).select('_id');
        const linkedAccountIds = linkedAccounts.map(account => account._id);

        if (updateData.email && updateData.email !== currentUser.email) {
            const conflictingAccount = await User.findOne({
                email: updateData.email,
                _id: { $nin: linkedAccountIds }
            }).select('_id');

            if (conflictingAccount) {
                return res.status(409).json({
                    success: false,
                    message: 'This email belongs to a different roll number.'
                });
            }
        }

        // Shared identity fields must stay identical across every portal/role.
        const syncFields = [
            'name', 'email', 'phone', 'cnic', 'dob', 'age', 'gender', 
            'address', 'city', 'country', 'fatherName', 'photo', 'rollNo'
        ];

        const syncData = {};
        syncFields.forEach(field => {
            if (updateData[field] !== undefined) {
                syncData[field] = updateData[field];
            }
        });

        // If password is being updated, include it in syncData
        if (updateData.password) {
            syncData.password = updateData.password;
        }

        // Update current user
        const user = await User.findByIdAndUpdate(req.params.id, updateData, {
            new: true,
            runValidators: true
        }).select('-password');

        // Use the old identity values so an email/roll-number change still reaches
        // every linked role before applying the new shared values.
        let linkedUpdatedCount = 1;
        if (Object.keys(syncData).length > 0) {
            const syncResult = await User.updateMany(
                { _id: { $in: linkedAccountIds, $ne: req.params.id } },
                { $set: syncData }
            );
            linkedUpdatedCount += syncResult.modifiedCount;
        }

        res.json({
            success: true,
            data: user,
            linkedUpdatedCount,
            message: `Updated ${linkedUpdatedCount} linked portal account(s)`
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   DELETE /api/users/:id
// @desc    Delete user (admin only)
// @access  Private/Admin
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
    try {
        console.log(`[USER DELETE] Admin ${req.user.id} is attempting to PERMANENTLY DELETE user: ${req.params.id}`);
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) {
            console.log(`[USER DELETE] Failed: User ${req.params.id} not found.`);
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        console.log(`[USER DELETE] Success: User ${user.name} (${user.email}) has been DELETED.`);
        res.json({ success: true, message: 'User deleted' });
    } catch (error) {
        console.error('[USER DELETE] Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   PUT /api/users/:id/verify
// @desc    Verify a user (admin only)
// @access  Private/Admin
router.put('/:id/verify', protect, authorize('admin'), async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(
            req.params.id,
            {
                isVerified: true,
                verifiedAt: new Date(),
                verifiedBy: req.user._id
            },
            { new: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        res.json({ success: true, data: user, message: 'User verified successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   PUT /api/users/:id/unverify
// @desc    Unverify a user (admin only)
// @access  Private/Admin
router.put('/:id/unverify', protect, authorize('admin'), async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(
            req.params.id,
            {
                isVerified: false,
                verifiedAt: null,
                verifiedBy: null
            },
            { new: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        res.json({ success: true, data: user, message: 'User verification revoked' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   PUT /api/users/:id/active-status
// @desc    Activate/deactivate a teacher and stop their current assignments
// @access  Private/Admin
router.put('/:id/active-status', protect, authorize('admin'), async (req, res) => {
    try {
        const teacher = await User.findOne({ _id: req.params.id, role: 'teacher' });
        if (!teacher) {
            return res.status(404).json({ success: false, message: 'Teacher not found' });
        }

        const isActive = req.body.isActive === true;
        teacher.isActive = isActive;
        await teacher.save();

        let stoppedCourses = 0;
        let stoppedPaidTasks = 0;
        if (!isActive) {
            const [courseResult, taskManagersResult, primaryManagerResult] = await Promise.all([
                Course.updateMany(
                    { teachers: teacher._id },
                    { $pull: { teachers: teacher._id, pausedTeachers: teacher._id } }
                ),
                PaidTask.updateMany(
                    { jobManagers: teacher._id },
                    { $pull: { jobManagers: teacher._id } }
                ),
                PaidTask.updateMany(
                    { jobManager: teacher._id },
                    { $set: { jobManager: null } }
                )
            ]);
            stoppedCourses = courseResult.modifiedCount || 0;
            stoppedPaidTasks = Math.max(
                taskManagersResult.modifiedCount || 0,
                primaryManagerResult.modifiedCount || 0
            );
        }

        res.json({
            success: true,
            data: teacher,
            stoppedCourses,
            stoppedPaidTasks,
            message: isActive
                ? 'Teacher activated successfully'
                : 'Teacher deactivated and removed from current assignments'
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/users/role/:role/verified
// @desc    Get only verified users by role (authenticated users only)
// @access  Private
router.get('/role/:role/verified', protect, async (req, res) => {
    try {
        const query = { role: req.params.role, isVerified: true };
        if (req.params.role === 'teacher') query.isActive = { $ne: false };
        const users = await User.find(query).select('-password');
        res.json({ success: true, data: users });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   PUT /api/users/:id/class-time
// @desc    Update user class time (admin/teacher only)
// @access  Private/Admin/Teacher
router.put('/:id/class-time', protect, authorize('admin', 'teacher'), async (req, res) => {
    try {
        const { classTime } = req.body;
        const user = await User.findByIdAndUpdate(
            req.params.id,
            { classTime: classTime || null },
            { new: true, runValidators: true }
        ).select('-password');
        
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        
        res.json({ success: true, data: user });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
