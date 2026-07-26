/**
 * ONE-TIME REPAIR SCRIPT
 * Re-activates enrollments that were wrongly deactivated by the auto-installment bug.
 */

require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

const run = async () => {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Load models after connect
    const Fee = require('./models/Fee');
    const Enrollment = require('./models/Enrollment');
    const Certificate = require('./models/Certificate');

    const fees = await Fee.find({}).lean(); // lean() = plain JS objects, avoids schema issues
    console.log(`📋 Found ${fees.length} fee records`);

    let repairedCount = 0;
    let skippedAlreadyOk = 0;
    let skippedNoFirstVerified = 0;
    let skippedGenuinelyOverdue = 0;
    let skippedHasCert = 0;

    for (const fee of fees) {
        try {
            const userId = fee.user;
            const courseId = fee.course;

            if (!userId || !courseId) continue;

            // Check if first installment is verified
            const installments = fee.installments || [];
            const firstInst = installments[0];
            if (!firstInst || firstInst.status !== 'verified') {
                skippedNoFirstVerified++;
                continue;
            }

            // Check if has certificate (completed student)
            const hasCert = await Certificate.findOne({ user: userId, course: courseId }).lean();
            if (hasCert) {
                skippedHasCert++;
                continue;
            }

            // Check if last installment is GENUINELY overdue (pending AND past due date)
            const lastInst = installments[installments.length - 1];
            const now = new Date();
            const isGenuinelyOverdue =
                lastInst &&
                lastInst.status === 'pending' &&
                new Date(lastInst.dueDate) < now;

            if (isGenuinelyOverdue) {
                skippedGenuinelyOverdue++;
                continue;
            }

            // Find enrollment
            const enrollment = await Enrollment.findOne({ user: userId, course: courseId });
            if (!enrollment) continue;

            if (enrollment.isActive && enrollment.status === 'enrolled') {
                skippedAlreadyOk++;
                continue;
            }

            // REPAIR IT
            enrollment.isActive = true;
            enrollment.status = 'enrolled';
            if (!enrollment.enrollmentDate) {
                enrollment.enrollmentDate = new Date();
            }
            await enrollment.save();
            repairedCount++;
            console.log(`✅ Repaired: user=${userId} course=${courseId}`);

        } catch (err) {
            console.error(`❌ Error for fee ${fee._id}:`, err.message);
        }
    }

    console.log('\n========= REPAIR SUMMARY =========');
    console.log(`✅ Repaired:               ${repairedCount}`);
    console.log(`⏭️  Already OK:             ${skippedAlreadyOk}`);
    console.log(`🎓 Has Certificate:        ${skippedHasCert}`);
    console.log(`❌ No first verification:  ${skippedNoFirstVerified}`);
    console.log(`⚠️  Genuinely overdue:      ${skippedGenuinelyOverdue}`);
    console.log('==================================\n');

    await mongoose.disconnect();
    console.log('✅ Done. Disconnected from MongoDB.');
};

run().catch(err => {
    console.error('❌ Fatal error:', err);
    process.exit(1);
});
