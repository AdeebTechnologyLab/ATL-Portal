const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { uploadReceipt, cloudinary } = require('../config/cloudinary');
const Fee = require('../models/Fee');
const User = require('../models/User');
const Enrollment = require('../models/Enrollment');
const Counter = require('../models/Counter');
const { sendPushNotification } = require('../utils/pushHelper');

const markUserOldWhenNoEnrollmentsRemain = async (userId) => {
    const hasEnrollment = await Enrollment.exists({ user: userId });
    if (!hasEnrollment) {
        await User.findByIdAndUpdate(userId, { registeredOld: true });
    }
};


// @route   GET /api/fees/my
// @desc    Get current user's fees
// @access  Private
router.get('/my', protect, async (req, res) => {
    try {
        let fees = await Fee.find({ user: req.user.id })
            .populate('course', 'title fee duration city location targetAudience')
            .sort('-createdAt');

        // Auto-repair: If any fee has no installments, create default one
        let updated = false;
        for (let fee of fees) {
            if (!fee.installments || fee.installments.length === 0) {
                const amount = fee.totalFee > 0 ? fee.totalFee : (fee.course?.fee || 0);
                if (amount > 0) {
                    fee.installments = [{
                        amount: amount,
                        dueDate: new Date(), // Due today
                        status: 'pending'
                    }];
                    await fee.save();
                    updated = true;
                }
            }
        }

        // Refetch if we made changes to ensure consistency
        if (updated) {
            fees = await Fee.find({ user: req.user.id })
                .populate('course', 'title fee duration city location targetAudience')
                .sort('-createdAt');
        }

        res.json({ success: true, data: fees });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});



// @route   POST /api/fees/:id/pay
// @desc    Upload payment receipt for an installment
// @access  Private
router.post('/:id/pay', protect, uploadReceipt.single('receipt'), async (req, res) => {
    try {
        const { installmentId, slipId } = req.body;
        const fee = await Fee.findById(req.params.id);

        if (!fee) {
            return res.status(404).json({ success: false, message: 'Fee record not found' });
        }

        // Check if user owns this fee
        if (fee.user.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        // Find the installment
        const installment = fee.installments.id(installmentId);
        if (!installment) {
            return res.status(404).json({ success: false, message: 'Installment not found' });
        }

        if (installment.status !== 'pending' && installment.status !== 'rejected' && installment.status !== 'overdue') {
            return res.status(400).json({ success: false, message: 'Installment is not in a payable status' });
        }

        // Update using direct Mongoose document modification
        installment.slipId = slipId;
        if (req.file) {
            installment.receiptUrl = req.file.path;
        }
        installment.status = 'submitted';
        installment.paidAt = new Date();

        await fee.save();

        const io = req.app.get('io');
        if (io) {
            io.emit('fee_submitted');
        }

        console.log(`!!! SUCCESS !!! Payment saved. Fee ID: ${fee._id}`);

        res.json({ success: true, fee: fee });
    } catch (error) {
        console.error('Payment upload error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   PUT /api/fees/:feeId/installments/:installmentId/verify
// @desc    Verify a fee installment & assign roll number if first payment
// @access  Private (Admin)
router.put('/:feeId/installments/:installmentId/verify', protect, authorize('admin'), async (req, res) => {
    try {
        const fee = await Fee.findById(req.params.feeId);
        if (!fee) {
            return res.status(404).json({ success: false, message: 'Fee not found' });
        }

        // Find installment
        const installment = fee.installments.id(req.params.installmentId);
        if (!installment) {
            return res.status(404).json({ success: false, message: 'Installment not found' });
        }

        // Verify installment
        installment.status = 'verified';
        installment.verifiedBy = req.user.id;
        installment.verifiedAt = new Date();

        // NOTE: Receipt image is intentionally kept on Cloudinary
        // so admin can view the uploaded slip later from the dashboard.

        // Update fee status
        fee.updateStatus();

        // Assign roll number + activate enrollment on first-ever verification
        if (!fee.rollNoAssigned) {
            const user = await User.findById(fee.user);
            if (!user.rollNo) {
                const Counter = require('../models/Counter');
                user.rollNo = await Counter.getNextRollNo();
                await user.save();
                console.log(`Fallback: Assigned roll number ${user.rollNo} to user ${user.email} during fee verification`);
            }
            fee.rollNoAssigned = true;
        }

        // ALWAYS ensure enrollment is active when any installment is verified
        // This runs unconditionally so it works even if rollNoAssigned was already true
        // Also sync the embedded installments in enrollment so frontend checks work correctly
        const updatedEnrollment = await Enrollment.findOne({ user: fee.user, course: fee.course });
        if (updatedEnrollment) {
            // Find matching installment by index (installments are parallel arrays)
            const instIndex = fee.installments.findIndex(i => i._id.toString() === req.params.installmentId);
            if (instIndex >= 0 && updatedEnrollment.installments && updatedEnrollment.installments[instIndex]) {
                updatedEnrollment.installments[instIndex].status = 'verified';
            } else if (instIndex === 0) {
                // Ensure at least first installment is reflected
                if (updatedEnrollment.installments && updatedEnrollment.installments.length === 0) {
                    updatedEnrollment.installments = [{ installmentNumber: 1, amount: installment.amount, dueDate: installment.dueDate, status: 'verified' }];
                } else if (updatedEnrollment.installments) {
                    updatedEnrollment.installments[0] = { ...updatedEnrollment.installments[0]?.toObject?.() || {}, status: 'verified' };
                }
            }
            if (!updatedEnrollment.enrollmentDate) {
                updatedEnrollment.enrollmentDate = new Date();
                // Increment course enrolled count on first verification
                const Course = require('../models/Course');
                await Course.findByIdAndUpdate(fee.course, { $inc: { enrolledCount: 1 } });
            }
            updatedEnrollment.status = 'enrolled';
            
            // Mark the array as modified so Mongoose saves the updated verified status
            updatedEnrollment.markModified('installments');
            
            // Re-calculate the active status, but if this is verified, force it active 
            // so there is no 5-10 minute delay waiting for a cron job to sync statuses.
            updatedEnrollment.updateActiveStatus();
            
            // Force active instantly upon any admin verification (overrides any calculation quirks)
            updatedEnrollment.isActive = true;
            
            updatedEnrollment.feeStatus = fee.status === 'verified' ? 'verified' : 'partial';
            await updatedEnrollment.save();
        } else {
            await Enrollment.findOneAndUpdate(
                { user: fee.user, course: fee.course },
                {
                    status: 'enrolled',
                    isActive: true,
                    feeStatus: fee.status === 'verified' ? 'verified' : 'partial',
                    $setOnInsert: { enrollmentDate: new Date() }
                },
                { upsert: false }
            );
        }

        await fee.save();

        // Notify student that their fee was verified
        const studentId = fee.user.toString();
        const course = await require('../models/Course').findById(fee.course).select('title');
        const courseName = course?.title || 'your course';
        const instNumber = fee.installments.findIndex(i => i._id.toString() === req.params.installmentId) + 1;
        const notifPayload = {
            title: 'Fee Payment Verified ✅',
            body: `Installment #${instNumber} for "${courseName}" (PKR ${installment.amount.toLocaleString()}) has been verified.`,
            icon: '/logo.png',
            url: '/student/fees'
        };

        // Socket notification
        const io = req.app.get('io');
        if (io) {
            io.to(studentId).emit('new_browser_notification', {
                title: notifPayload.title,
                message: notifPayload.body,
                url: notifPayload.url
            });
            io.to(studentId).emit('fee_updated');
        }

        // Web push notification
        sendPushNotification(studentId, notifPayload);

        res.json({ success: true, fee, message: 'Payment verified successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   PUT /api/fees/:feeId/installments/:installmentId/reject
// @desc    Reject a payment proof (admin)
// @access  Private (Admin)
router.put('/:feeId/installments/:installmentId/reject', protect, authorize('admin'), async (req, res) => {
    try {
        const fee = await Fee.findById(req.params.feeId);
        if (!fee) return res.status(404).json({ success: false, message: 'Fee not found' });

        const installment = fee.installments.id(req.params.installmentId);
        if (!installment) return res.status(404).json({ success: false, message: 'Installment not found' });

        // Update status
        installment.status = 'rejected';

        // Note: We do NOT delete the image here immediately if we want to keep evidence,
        // OR we delete it to force clean re-upload. 
        // Given user focus on SPACE, deleting it is better, but student needs to see what was rejected?
        // Actually, if status is rejected, student MUST upload new one.
        // Let's delete it to be consistent with "Space Saving".
        if (installment.receiptUrl) {
            try {
                const matches = installment.receiptUrl.match(/\/upload\/(?:v\d+\/)?(.+?)\.[^.]+$/);
                if (matches && matches[1]) {
                    await cloudinary.uploader.destroy(matches[1]);
                }
            } catch (e) { console.error(e); }
        }

        // Reset receipt fields so student can upload fresh
        installment.receiptUrl = null;
        installment.slipId = null;

        await fee.save();

        // Sync with Enrollment model
        await Enrollment.findOneAndUpdate(
            { user: fee.user, course: fee.course, "installments.installmentNumber": installment.installmentNumber || 1 },
            {
                $set: {
                    "installments.$.status": "pending",
                    "installments.$.paymentProof": null,
                    "installments.$.paidDate": null
                }
            }
        );

        // Socket notification for real-time refresh
        const io = req.app.get('io');
        if (io) {
            io.to(fee.user.toString()).emit('fee_updated');
            io.to(fee.user.toString()).emit('new_browser_notification', {
                title: 'Payment Rejected ❌',
                message: `Your payment for "${fee.course?.title || 'Course'}" was rejected. Please re-upload.`,
                url: '/student/fees'
            });
        }

        res.json({ success: true, fee, message: 'Payment rejected. Student can now re-upload.' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   POST /api/fees/:id/installments
// @desc    Set up installment plan for a student (admin)
// @access  Private (Admin)
router.post('/:id/installments', protect, authorize('admin'), async (req, res) => {
    try {
        const { installments } = req.body; // Array of { amount, dueDate }
        const fee = await Fee.findById(req.params.id);

        if (!fee) {
            return res.status(404).json({ success: false, message: 'Fee not found' });
        }

        // Block installment creation if student is paused
        const pausedEnrollment = await Enrollment.findOne({ user: fee.user, course: fee.course, isPaused: true });
        if (pausedEnrollment) {
            return res.status(400).json({
                success: false,
                message: 'Student is currently paused. Resume the student before generating new installments.'
            });
        }

        // Create new installments array ensuring we don't reset verified/submitted ones
        const newInstallments = [];

        // First, check if we are trying to remove any paid installments (not allowed)
        const paidInstallmentsCount = fee.installments.filter(
            i => i.status === 'verified' || i.status === 'submitted'
        ).length;

        if (installments.length < paidInstallmentsCount) {
            return res.status(400).json({
                success: false,
                message: `Cannot remove installments that are already paid/submitted. You have ${paidInstallmentsCount} active payments.`
            });
        }

        // Map logic
        for (let i = 0; i < installments.length; i++) {
            const newInst = installments[i];
            const existing = fee.installments[i];

            if (existing && (existing.status === 'verified' || existing.status === 'submitted')) {
                // Preserve existing paid installment exactly as is
                newInstallments.push(existing);
            } else {
                // Ensure amount is a Number and dueDate exists to satisfy schema
                const parsedAmount = Number(newInst.amount) || 0;
                // Prefer provided dueDate, fall back to existing installment's dueDate, then to a reasonable default (i months from today)
                const parsedDueDate = newInst.dueDate ? new Date(newInst.dueDate) : (existing && existing.dueDate) ? existing.dueDate : new Date(new Date().setMonth(new Date().getMonth() + i));

                newInstallments.push({
                    amount: parsedAmount,
                    dueDate: parsedDueDate,
                    status: newInst.status === 'verified' ? 'verified' : 'pending',
                    verifiedBy: newInst.status === 'verified' ? req.user.id : undefined,
                    verifiedAt: newInst.status === 'verified' ? new Date() : undefined
                });
            }
        }

        fee.installments = newInstallments;
        await fee.save();

        // Sync with Enrollment model if it exists
        // If any installment is verified, ensure enrollment is marked as active+enrolled
        const hasVerifiedInstallment = newInstallments.some(i => i.status === 'verified');
        const enrollmentUpdate = {
            installments: newInstallments.map((inst, index) => ({
                installmentNumber: index + 1,
                amount: inst.amount,
                dueDate: inst.dueDate,
                status: inst.status === 'verified' ? 'verified' : 'pending',
                paymentProof: inst.receiptUrl
            }))
        };
        if (hasVerifiedInstallment) {
            enrollmentUpdate.isActive = true;
            enrollmentUpdate.status = 'enrolled';
        }
        await Enrollment.findOneAndUpdate(
            { user: fee.user, course: fee.course },
            enrollmentUpdate
        );

        // Notify user about fee challan generation
        if (req.app.get('io') && newInstallments.some(i => i.status === 'pending')) {
            const courseData = await require('../models/Course').findById(fee.course).select('title');
            const cTitle = courseData ? courseData.title : 'Course';
            req.app.get('io').to(fee.user.toString()).emit('new_browser_notification', {
                title: 'Fee Challan Generated',
                message: `A new fee challan has been generated for "${cTitle}". Please review your fee plan.`,
                url: '/student/dashboard'
            });
        }

        // Socket notification for real-time refresh
        const io = req.app.get('io');
        if (io) {
            io.to(fee.user.toString()).emit('fee_updated');
        }

        res.json({ success: true, fee });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/fees/pending
// @desc    Get fees with pending verification (admin)
// @access  Private (Admin)
router.get('/pending', protect, authorize('admin'), async (req, res) => {
    try {
        // Fetch all fees first
        const allFees = await Fee.find()
            .populate('user', 'name email rollNo photo phone guardianName guardianRelation guardianPhone guardianOccupation')
            .populate('course', 'title fee city location targetAudience')
            .sort('-updatedAt');

        // Return ALL fees and let frontend filter 'submitted' installments
        // This eliminates any server-side filtering or reference match issues
        const fees = allFees;

        console.log(`GET /pending: Returning ${fees.length} total fees for frontend filtering`);

        res.json({ success: true, data: fees });
    } catch (error) {
        console.error('GET /pending error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/fees/all
// @desc    Get all fees (admin)
// @access  Private (Admin)
router.get('/all', protect, authorize('admin'), async (req, res) => {
    try {
        const fees = await Fee.find()
            .populate('user', 'name email rollNo photo phone guardianName guardianRelation guardianPhone guardianOccupation')
            .populate('course', 'title fee city location targetAudience')
            .sort('-createdAt');

        res.json({ success: true, data: fees });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/fees/user/:userId
// @desc    Get all fees for a specific user (Admin)
// @access  Private (Admin)
router.get('/user/:userId', protect, authorize('admin'), async (req, res) => {
    try {
        const fees = await Fee.find({ user: req.params.userId })
            .populate('user', 'name email rollNo photo phone guardianName guardianRelation guardianPhone guardianOccupation')
            .populate('course', 'title fee city location targetAudience')
            .sort('-createdAt');

        res.json({ success: true, data: fees });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   DELETE /api/fees/:id/installments/:installmentId
// @desc    Delete a specific installment (admin)
// @access  Private (Admin)
router.delete('/:id/installments/:installmentId', protect, authorize('admin'), async (req, res) => {
    try {
        const fee = await Fee.findById(req.params.id);
        if (!fee) return res.status(404).json({ success: false, message: 'Fee not found' });

        // Filter out the installment
        const initialCount = fee.installments.length;
        fee.installments = fee.installments.filter(inst => inst._id.toString() !== req.params.installmentId);

        if (fee.installments.length === initialCount) {
            return res.status(404).json({ success: false, message: 'Installment not found' });
        }

        // Check if no installments remain AND student never had a verified payment.
        // In this case (e.g. student registered but never paid), delete the entire fee
        // record so the auto-repair in GET /api/fees/my cannot recreate a pending installment.
        const hadVerifiedPayment = fee.installments.some(inst => inst.status === 'verified');
        if (fee.installments.length === 0 && !hadVerifiedPayment) {
            console.log(`[FEE] No installments remain and student never paid. Deleting Fee ${fee._id} and enrollment.`);
            await Enrollment.findOneAndDelete({ user: fee.user, course: fee.course });
            await fee.deleteOne();
            await markUserOldWhenNoEnrollmentsRemain(fee.user);
            return res.json({
                success: true,
                message: 'Fee challan deleted. Student can re-register for the course.',
                fullyDeleted: true
            });
        }

        // Otherwise just save the updated installments list
        fee.updateStatus();
        await fee.save();

        // Sync remaining installments with Enrollment model
        await Enrollment.findOneAndUpdate(
            { user: fee.user, course: fee.course },
            {
                installments: fee.installments.map((inst, index) => ({
                    installmentNumber: index + 1,
                    amount: inst.amount,
                    dueDate: inst.dueDate,
                    status: inst.status === 'verified' ? 'verified' : 'pending',
                    paymentProof: inst.receiptUrl
                }))
            }
        );

        res.json({ success: true, message: 'Installment deleted successfully', fee });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/fees/check-status/:courseId
// @desc    Check if current user has overdue fee for a course
// @access  Private
router.get('/check-status/:courseId', protect, async (req, res) => {
    try {
        const fee = await Fee.findOne({ user: req.user.id, course: req.params.courseId });

        if (!fee || !fee.installments || fee.installments.length === 0) {
            return res.json({ success: true, hasOverdue: false, canSubmit: true });
        }

        const now = new Date();
        let hasOverdue = false;
        let overdueInstallment = null;

        for (const inst of fee.installments) {
            if (inst.status !== 'verified' && inst.status !== 'paid') {
                const dueDate = new Date(inst.dueDate);
                const daysPastDue = Math.floor((now - dueDate) / (1000 * 60 * 60 * 24));
                if (daysPastDue >= 0) {
                    hasOverdue = true;
                    overdueInstallment = {
                        installmentNumber: fee.installments.indexOf(inst) + 1,
                        amount: inst.amount,
                        dueDate: inst.dueDate,
                        daysPastDue: daysPastDue
                    };
                    break;
                }
            }
        }

        res.json({
            success: true,
            hasOverdue,
            canSubmit: !hasOverdue,
            overdueInstallment
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   DELETE /api/fees/:id
// @desc    Delete fee and cleanup associated Cloudinary images (admin)
// @access  Private (Admin)
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
    try {
        const fee = await Fee.findById(req.params.id);
        if (!fee) return res.status(404).json({ success: false, message: 'Fee not found' });

        if (fee.installments && fee.installments.length > 0) {
            console.log(`Deleting fee ${fee._id}. Checking ${fee.installments.length} installments for images...`);

            for (const inst of fee.installments) {
                if (inst.receiptUrl) {
                    try {
                        const matches = inst.receiptUrl.match(/\/upload\/(?:v\d+\/)?(.+?)\.[^.]+$/);
                        if (matches && matches[1]) {
                            const publicId = matches[1];
                            console.log(`Deleting Cloudinary Image: ${publicId}`);
                            await cloudinary.uploader.destroy(publicId);
                        }
                    } catch (imgError) {
                        console.error(`Failed to delete image for installment ${inst._id}:`, imgError);
                    }
                }
            }
        }

        // Delete associated enrollment
        console.log(`[FEE DELETE] Deleting associated enrollment for User ${fee.user} and Course ${fee.course}`);
        await Enrollment.findOneAndDelete({ user: fee.user, course: fee.course });

        await fee.deleteOne();
        await markUserOldWhenNoEnrollmentsRemain(fee.user);
        res.json({ success: true, message: 'Fee Record and Enrollment removed. User moved to Registered (Old) when no enrollments remain.' });
    } catch (error) {
        console.error('Delete fee error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
