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
        const fees = await Fee.find({}).populate('user', 'name photo').populate('course', 'title').lean();

        let totalRevenue = 0;
        let recentSubmissions = [];

        const hasDateFilter = Object.keys(dateFilter).length > 0;

        fees.forEach(fee => {
            fee.installments.forEach(inst => {
                // ── Revenue: count verified installments within date range ──
                if (inst.status === 'verified') {
                    const accountingDate = inst.dueDate ? new Date(inst.dueDate) : null;
                    if (!hasDateFilter) {
                        totalRevenue += inst.amount;
                    } else if (accountingDate && accountingDate >= dateFilter.$gte && accountingDate <= dateFilter.$lte) {
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
                    const accountingDate = inst.dueDate ? new Date(inst.dueDate) : null;
                    const entryDate = inst.dueDate;
                    // Apply date filter for verified entries too if set
                    if (!hasDateFilter || (accountingDate && accountingDate >= dateFilter.$gte && accountingDate <= dateFilter.$lte)) {
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
            User.find({ role: { $in: ['student', 'intern'] } }).select('_id').lean(),
            Enrollment.find().populate('user', '_id').select('user status').lean()
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
        const allFees = await Fee.find().select('installments').lean();
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

// @route   GET /api/stats/leaderboard
// @desc    Get top 10 users by game score (one entry per email)
// @access  Private
router.get('/leaderboard', protect, async (req, res) => {
    try {
        const users = await User.find({ gameScore: { $gt: 0 } })
            .select('name email photo gameScore')
            .sort({ gameScore: -1 })
            .lean();

        const seen = new Map();
        for (const u of users) {
            const email = u.email?.toLowerCase();
            if (!email) continue;
            if (!seen.has(email)) {
                seen.set(email, {
                    _id: u._id,
                    name: u.name,
                    photo: u.photo,
                    gameScore: u.gameScore
                });
            }
        }

        const leaders = Array.from(seen.values()).slice(0, 10);
        res.json({ success: true, data: leaders });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   PUT /api/stats/game-score
// @desc    Save high score to ALL accounts with same email
// @access  Private
router.put('/game-score', protect, async (req, res) => {
    try {
        const { score } = req.body;
        if (typeof score !== 'number' || score < 0) {
            return res.status(400).json({ success: false, message: 'Invalid score' });
        }

        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        const currentBest = user.gameScore || 0;
        if (score > currentBest) {
            await User.updateMany(
                { email: user.email.toLowerCase(), gameScore: { $lt: score } },
                { $set: { gameScore: score } }
            );
        }

        res.json({ success: true, gameScore: Math.max(score, currentBest) });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
