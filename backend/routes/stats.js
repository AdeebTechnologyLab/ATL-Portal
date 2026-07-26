const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Fee = require('../models/Fee');
const Enrollment = require('../models/Enrollment');
const User = require('../models/User');

// @route   GET /api/stats/admin-dashboard
// @desc    Get dashboard stats for admin
// @access  Private (Admin)
router.get('/admin-dashboard', protect, authorize('admin'), async (req, res) => {
    try {
        const { startDate, endDate, month } = req.query;

        // Build Date Filter
        let dateFilter = {};
        if (startDate && endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999); // end of day so today's entries are included
            dateFilter = {
                $gte: new Date(startDate),
                $lte: end
            };
        } else if (month) {
            const [year, m] = month.split('-');
            const start = new Date(year, m - 1, 1);
            const end = new Date(year, m, 0, 23, 59, 59);
            dateFilter = { $gte: start, $lte: end };
        }

        // Fetch all fees (we filter per-installment in JS since installments is an embedded array)
        const fees = await Fee.find({}).populate('user', 'name photo').populate('course', 'title');

        let totalRevenue = 0;
        let recentSubmissions = [];

        const hasDateFilter = Object.keys(dateFilter).length > 0;

        fees.forEach(fee => {
            fee.installments.forEach(inst => {
                // ── Revenue: count verified installments within date range ──
                if (inst.status === 'verified') {
                    const verifiedDate = inst.verifiedAt ? new Date(inst.verifiedAt) : null;
                    if (!hasDateFilter) {
                        totalRevenue += inst.amount;
                    } else if (verifiedDate && verifiedDate >= dateFilter.$gte && verifiedDate <= dateFilter.$lte) {
                        totalRevenue += inst.amount;
                    }
                }

                // ── Recent Submissions: include submitted (pending) AND verified installments ──
                const isSubmitted = inst.status === 'submitted' || inst.status === 'pending';
                const isVerified = inst.status === 'verified';

                if (isSubmitted && inst.receiptUrl) {
                    // Awaiting admin verification - has uploaded slip
                    recentSubmissions.push({
                        id: inst._id,
                        feeId: fee._id,
                        student: fee.user?.name || 'Unknown',
                        photo: fee.user?.photo || null,
                        course: fee.course?.title || 'Unknown Course',
                        amount: inst.amount,
                        date: inst.paidAt || fee.createdAt,
                        status: 'pending',
                        receiptUrl: inst.receiptUrl || null
                    });
                } else if (isVerified) {
                    // Verified by admin - show even if receipt was deleted
                    const verifiedDate = inst.verifiedAt ? new Date(inst.verifiedAt) : null;
                    const entryDate = inst.paidAt || inst.verifiedAt || fee.createdAt;
                    // Apply date filter for verified entries too if set
                    if (!hasDateFilter || (verifiedDate && verifiedDate >= dateFilter.$gte && verifiedDate <= dateFilter.$lte)) {
                        recentSubmissions.push({
                            id: inst._id,
                            feeId: fee._id,
                            student: fee.user?.name || 'Unknown',
                            photo: fee.user?.photo || null,
                            course: fee.course?.title || 'Unknown Course',
                            amount: inst.amount,
                            date: entryDate,
                            status: 'verified',
                            receiptUrl: inst.receiptUrl || null
                        });
                    }
                }
            });
        });

        // 2. Student Statistics (including interns)
        const [allStudents, allEnrollments] = await Promise.all([
            User.find({ role: { $in: ['student', 'intern'] } }),
            Enrollment.find().populate('user')
        ]);

        const totalStudents = allStudents.length;

        // Registered: Has at least one enrollment that is NOT pending or withdrawn (assuming enrolled/active)
        // Group enrollments by user
        const userEnrollments = {};
        allEnrollments.forEach(e => {
            // Skip if no user populated
            if (!e.user || !e.user._id) return;
            const userId = e.user._id.toString();
            if (!userEnrollments[userId]) userEnrollments[userId] = [];
            userEnrollments[userId].push(e);
        });

        let registeredCount = 0;
        let passoutCount = 0;

        allStudents.forEach(student => {
            const studentId = student._id.toString();
            const enrollments = userEnrollments[studentId] || [];
            const activeEnrollments = enrollments.filter(e => e.status === 'enrolled' || e.status === 'pending');
            const completedEnrollments = enrollments.filter(e => e.status === 'completed');

            if (activeEnrollments.length > 0) {
                registeredCount++;
            } else if (completedEnrollments.length > 0) {
                passoutCount++;
            }
        });

        // 3. Fee Status Graph Data
        const allFees = await Fee.find();
        let verifiedCount = 0;
        let pendingCount = 0;
        let rejectedCount = 0;

        allFees.forEach(fee => {
            fee.installments.forEach(inst => {
                if (inst.status === 'verified') verifiedCount++;
                else if (inst.status === 'rejected') rejectedCount++;
                else if (['pending', 'submitted', 'overdue'].includes(inst.status)) pendingCount++;
            });
        });

        // 4. [NEW] Essential Management Stats
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

        const [
            pendingStudents,
            pendingInterns,
            pendingTeachers,
            activeUsers,
            recentUsers
        ] = await Promise.all([
            User.countDocuments({ role: 'student', isVerified: false }),
            User.countDocuments({ role: 'intern', isVerified: false }),
            User.countDocuments({ role: 'teacher', isVerified: false }),
            User.find({ lastSeen: { $gte: fiveMinutesAgo } }).select('name email role photo lastSeen').sort({ lastSeen: -1 }),
            User.find({ role: { $ne: 'admin' } })
                .sort({ createdAt: -1 })
                .limit(5)
                .select('name email role photo createdAt')
        ]);

        res.json({
            success: true,
            data: {
                totalRevenue,
                studentStats: {
                    total: totalStudents,
                    registered: registeredCount,
                    passout: passoutCount
                },
                recentSubmissions: recentSubmissions.sort((a, b) => new Date(b.date) - new Date(a.date)),
                feeStatus: {
                    verified: verifiedCount,
                    pending: pendingCount,
                    rejected: rejectedCount
                },
                managementPulse: {
                    pendingApprovals: {
                        students: pendingStudents,
                        interns: pendingInterns,
                        teachers: pendingTeachers,
                        total: pendingStudents + pendingInterns + pendingTeachers
                    },
                    activeNow: activeUsers.length,
                    activeUsers: activeUsers,
                    recentRegistrations: recentUsers
                }
            }
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
