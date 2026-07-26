require('dotenv').config();
const mongoose = require('mongoose');
const Enrollment = require('./models/Enrollment');
const Fee = require('./models/Fee');
const Certificate = require('./models/Certificate');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
    console.log('Connected to MongoDB');
    const fees = await Fee.find({}).lean();
    console.log('Total fee records:', fees.length);
    let fixed = 0;

    for (const fee of fees) {
        if (!fee.user || !fee.course) continue;
        const insts = fee.installments || [];
        const first = insts[0];
        if (!first || first.status !== 'verified') continue;

        const hasCert = await Certificate.findOne({ user: fee.user, course: fee.course }).lean();
        if (hasCert) continue;

        const last = insts[insts.length - 1];
        const now = new Date();
        // Only skip if genuinely overdue (pending AND past due date)
        if (last && last.status === 'pending' && new Date(last.dueDate) < now) continue;

        // Fix enrollment: ensure isActive=true AND status='enrolled'
        const result = await Enrollment.updateOne(
            {
                user: fee.user,
                course: fee.course,
                $or: [
                    { isActive: false },
                    { status: { $nin: ['enrolled', 'completed'] } }
                ]
            },
            { isActive: true, status: 'enrolled' }
        );

        if (result.modifiedCount > 0) {
            fixed++;
            console.log('Fixed user=' + fee.user + ' course=' + fee.course);
        }
    }

    console.log('\n=== DONE ===');
    console.log('Total fixed:', fixed);

    // Quick verification
    const activeEnrolled = await Enrollment.countDocuments({ isActive: true, status: 'enrolled' });
    const pendingTotal = await Enrollment.countDocuments({ status: 'pending' });
    console.log('Now active+enrolled:', activeEnrolled);
    console.log('Still pending status:', pendingTotal);

    await mongoose.disconnect();
    console.log('Disconnected.');
}).catch(err => {
    console.error('Fatal:', err);
    process.exit(1);
});
