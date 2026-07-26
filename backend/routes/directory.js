const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const User = require('../models/User');
const Enrollment = require('../models/Enrollment');
const Certificate = require('../models/Certificate');

// @route   GET /api/directory
// @desc    Get all students/interns or teachers with enrollment data for admin directory
// @access  Private (Admin only)
router.get('/', protect, authorize('admin'), async (req, res) => {
    try {
        const { filter, type } = req.query; // filter: all, active, certified, not-registered. type: teachers or undefined

        // Get users based on type - default to all roles if type is not specified
        const roleFilter = type === 'teachers' ? ['teacher'] : ['student', 'intern', 'teacher'];

        // [MODIFIED]: If filter is pending, fetch unverified users. Otherwise, only verified.
        const isVerifiedFilter = filter === 'pending' ? false : true;

        const users = await User.find({
            role: { $in: roleFilter },
            isVerified: isVerifiedFilter
        }).select('name email phone cnic rollNo role photo createdAt lastSeen').lean();

        // Get all enrollments
        const enrollments = await Enrollment.find()
            .populate('course', 'title')
            .lean();

        // Get all certificates
        const certificates = await Certificate.find().lean();

        // Group enrollments by user
        const enrollmentsByUser = {};
        enrollments.forEach(e => {
            const uId = e.user?.toString();
            if (!enrollmentsByUser[uId]) enrollmentsByUser[uId] = [];
            enrollmentsByUser[uId].push(e);
        });

        // Group certificates by user
        const certsByUser = {};
        certificates.forEach(c => {
            const uId = c.user?.toString();
            if (!certsByUser[uId]) certsByUser[uId] = [];
            certsByUser[uId].push(c);
        });

        // Build user list with enrollment data
        let userList = users.map(user => {
            const userId = user._id.toString();
            const userEnrollments = enrollmentsByUser[userId] || [];
            const userCerts = certsByUser[userId] || [];

            // Get unique courses
            const courses = userEnrollments
                .filter(e => e.course?.title)
                .map(e => e.course.title);
            const uniqueCourses = [...new Set(courses)];

            // Check if user has any active enrollment
            const hasActiveEnrollment = userEnrollments.some(e =>
                e.status === 'enrolled' || e.status === 'pending'
            );

            // Check if user is certified
            const isCertified = userCerts.length > 0;

            // Determine roles from enrollments
            const roles = new Set([user.role]);
            userEnrollments.forEach(e => {
                if (e.course?.targetAudience === 'interns') roles.add('intern');
                else if (e.course?.targetAudience === 'students') roles.add('student');
            });

            return {
                _id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone || '-',
                cnic: user.cnic || '-',
                rollNo: user.rollNo || '-',
                photo: user.photo,
                role: user.role,
                roles: Array.from(roles),
                courses: uniqueCourses,
                coursesCount: uniqueCourses.length,
                hasActiveEnrollment,
                isCertified,
                certificatesCount: userCerts.length,
                enrollmentsCount: userEnrollments.length,
                createdAt: user.createdAt,
                lastSeen: user.lastSeen
            };
        });

        // Apply filter
        if (filter === 'active') {
            userList = userList.filter(u => u.hasActiveEnrollment);
        } else if (filter === 'certified') {
            userList = userList.filter(u => u.isCertified);
        } else if (filter === 'not-registered') {
            userList = userList.filter(u => u.coursesCount === 0);
        }

        // Sort by roll number
        userList.sort((a, b) => {
            const rollA = a.rollNo?.toString() || '';
            const rollB = b.rollNo?.toString() || '';
            // Try numeric sort first
            const numA = parseInt(rollA.replace(/\D/g, '')) || 0;
            const numB = parseInt(rollB.replace(/\D/g, '')) || 0;
            if (numA !== numB) return numA - numB;
            return rollA.localeCompare(rollB);
        });

        res.json({
            success: true,
            count: userList.length,
            data: userList
        });

    } catch (error) {
        console.error('Directory error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
