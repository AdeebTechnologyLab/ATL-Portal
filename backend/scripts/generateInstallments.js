/**
 * Auto-Generate Monthly Installments Script
 * 
 * This script runs periodically to:
 * 1. Generate new monthly installments for students who:
 *    - Have verified first installment
 *    - Don't have a certificate for that course
 *    - Haven't had a new installment generated for the current month
 * 2. Uses the course fee price for each new installment
 * 3. Sets due date to 7 days from generation
 */

const mongoose = require('mongoose');
const Fee = require('../models/Fee');
const Course = require('../models/Course');
const Certificate = require('../models/Certificate');
const Enrollment = require('../models/Enrollment');
const moment = require('moment-timezone');
const { sendPushNotification } = require('../utils/pushHelper');

/**
 * Generate installments for all eligible enrollments
 */
const generateInstallments = async (io) => {
    console.log('🔄 Starting installment generation check...');

    try {
        // Get all Fee records that have at least one verified installment
        const fees = await Fee.find({})
            .populate('course', 'fee title')
            .populate('user', 'name email');

        let generatedCount = 0;

        for (const fee of fees) {
            try {
                // Skip if no course data
                if (!fee.course) {
                    console.log(`⚠️ Skipping fee ${fee._id} - no course data`);
                    continue;
                }

                // Check if enrollment is paused
                const enrollment = await Enrollment.findOne({
                    user: fee.user._id || fee.user,
                    course: fee.course._id || fee.course
                });

                if (enrollment && enrollment.isPaused) {
                    console.log(`⏸️ Enrollment for ${fee.user?.name || fee.user} in ${fee.course?.title} is paused - skipping installment generation`);
                    continue;
                }

                // Check if user has a certificate for this course
                const hasCertificate = await Certificate.findOne({
                    user: fee.user._id || fee.user,
                    course: fee.course._id || fee.course
                });

                if (hasCertificate) {
                    console.log(`✅ User ${fee.user?.name || fee.user} has certificate for ${fee.course?.title} - skipping`);
                    continue;
                }

                // Check if first installment is verified
                const firstInstallment = fee.installments[0];
                if (!firstInstallment || firstInstallment.status !== 'verified') {
                    // First installment not verified yet, skip
                    continue;
                }

                // Get the last installment
                const lastInstallment = fee.installments[fee.installments.length - 1];
                if (!lastInstallment) continue;

                // SAFETY CHECK: If the last installment is still pending or submitted,
                // DO NOT generate another one. The student hasn't paid the current one yet
                // (pending) or has uploaded proof that admin hasn't verified yet (submitted).
                if (lastInstallment.status === 'pending' || lastInstallment.status === 'submitted') {
                    continue;
                }

                // Calculate if we need to generate a new installment
                // New installment should be generated when:
                // - 30 days have passed since the last installment's due date
                const lastDueDate = moment.tz(lastInstallment.dueDate, 'Asia/Karachi');
                const now = moment().tz('Asia/Karachi');
                const daysSinceLastDue = now.diff(lastDueDate, 'days');

                // Generate new installment if 25 days have passed since last due date (5 days before next due date)
                if (daysSinceLastDue >= 25) {
                    // Parse course fee (handle string like "5000" or "Coming Soon")
                    let courseFee = 0;
                    if (fee.course.fee) {
                        const parsedFee = parseInt(fee.course.fee.toString().replace(/[^0-9]/g, ''));
                        if (!isNaN(parsedFee) && parsedFee > 0) {
                            courseFee = parsedFee;
                        }
                    }

                    // If can't parse fee, use first installment amount
                    if (courseFee === 0 && firstInstallment.amount > 0) {
                        courseFee = firstInstallment.amount;
                    }

                    if (courseFee === 0) {
                        console.log(`⚠️ Could not determine fee amount for ${fee.course?.title} - skipping new installment`);
                        continue;
                    }

                    // Calculate new due date (Exactly 1 month after the last due date)
                    // This ensures consistency even if the system was down for a few days
                    const newDueDate = lastDueDate.clone().add(1, 'month').toDate();

                    // Create new installment
                    const newInstallmentNumber = fee.installments.length + 1;

                    fee.installments.push({
                        amount: courseFee,
                        dueDate: newDueDate,
                        status: 'pending',
                        slipId: ''
                    });

                    await fee.save();
                    generatedCount++;

                    console.log(`✨ Generated installment #${newInstallmentNumber} for ${fee.user?.name || fee.user} - ${fee.course?.title} (PKR ${courseFee})`);
                    
                    // Notifications
                    const studentId = fee.user._id ? fee.user._id.toString() : fee.user.toString();
                    const notifPayload = {
                        title: 'Monthly Fee Challan Generated',
                        body: `Your monthly fee challan for "${fee.course?.title}" has been generated (PKR ${courseFee}). Please review your fee plan.`,
                        icon: '/logo.png',
                        url: '/student/fees'
                    };

                    // Socket notification (real-time in-app)
                    if (io) {
                        try {
                            io.to(studentId).emit('new_browser_notification', {
                                title: notifPayload.title,
                                message: notifPayload.body,
                                url: notifPayload.url
                            });
                        } catch (e) {
                            console.error('Error emitting fee notification:', e);
                        }
                    }

                    // Web push notification (works even when tab closed)
                    sendPushNotification(studentId, notifPayload);
                }
            } catch (err) {
                console.error(`Error processing fee ${fee._id}:`, err.message);
            }
        }

        console.log(`✅ Installment generation complete. Generated ${generatedCount} new installments.`);
        return generatedCount;
    } catch (error) {
        console.error('❌ Error in generateInstallments:', error);
        throw error;
    }
};

/**
 * Update enrollment isActive status based on fee payments
 * Disable if latest installment is overdue (more than 7 days past due date)
 */
const updateEnrollmentStatus = async () => {
    console.log('🔄 Updating enrollment active status...');

    try {
        const fees = await Fee.find({}).populate('course');
        let updatedCount = 0;

        for (const fee of fees) {
            try {
                // Find the enrollment for this fee
                const enrollment = await Enrollment.findOne({
                    user: fee.user,
                    course: fee.course?._id || fee.course
                });

                if (!enrollment) continue;

                // Check if user has certificate
                const hasCertificate = await Certificate.findOne({
                    user: fee.user,
                    course: fee.course?._id || fee.course
                });

                if (hasCertificate) {
                    // User has certificate, mark enrollment as completed
                    if (enrollment.status !== 'completed') {
                        enrollment.status = 'completed';
                        enrollment.isActive = false;
                        await enrollment.save();
                        updatedCount++;
                    }
                    continue;
                }

                // Check first installment
                const firstInstallment = fee.installments[0];
                const isFirstVerified = firstInstallment && firstInstallment.status === 'verified';

                if (!isFirstVerified) {
                    // First not verified = not active
                    enrollment.isActive = false;
                    await enrollment.save();
                    continue;
                }

                // Check if any pending installment is overdue (more than 7 days past due)
                const now = moment().tz('Asia/Karachi');
                let hasOverdue = false;

                for (const inst of fee.installments) {
                    // Lock if ANY installment is not verified and past its due date.
                    // This includes 'pending', 'submitted', 'rejected' statuses.
                    // Student stays locked until admin verifies the payment.
                    if (inst.status !== 'verified') {
                        const dueDate = moment.tz(inst.dueDate, 'Asia/Karachi');
                        if (now.isAfter(dueDate)) {
                            hasOverdue = true;
                            // Update status to 'overdue' only if it's currently 'pending' or 'rejected'
                            if (inst.status === 'pending' || inst.status === 'rejected') {
                                inst.status = 'overdue';
                            }
                            break;
                        }
                    }
                }

                // Update enrollment status
                const newIsActive = isFirstVerified && !hasOverdue;

                if (enrollment.isActive !== newIsActive) {
                    enrollment.isActive = newIsActive;
                    await enrollment.save();
                    await fee.save(); // Save overdue status changes
                    updatedCount++;
                    console.log(`📝 Updated ${enrollment.user} for course ${fee.course?.title} - isActive: ${newIsActive}`);
                }
            } catch (err) {
                console.error(`Error updating enrollment for fee ${fee._id}:`, err.message);
            }
        }

        console.log(`✅ Enrollment status update complete. Updated ${updatedCount} enrollments.`);
        return updatedCount;
    } catch (error) {
        console.error('❌ Error in updateEnrollmentStatus:', error);
        throw error;
    }
};

/**
 * Main function to run both tasks
 */
const runInstallmentJob = async (io = null) => {
    await generateInstallments(io);
    await updateEnrollmentStatus();
};

module.exports = {
    generateInstallments,
    updateEnrollmentStatus,
    runInstallmentJob
};

// Run standalone if called directly
if (require.main === module) {
    require('dotenv').config();

    mongoose.connect(process.env.MONGO_URI)
        .then(async () => {
            console.log('Connected to MongoDB');
            await runInstallmentJob();
            process.exit(0);
        })
        .catch(err => {
            console.error('MongoDB connection error:', err);
            process.exit(1);
        });
}
