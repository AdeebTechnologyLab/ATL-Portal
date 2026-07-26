const mongoose = require('mongoose');
const Fee = require('./models/Fee');

const uri = 'mongodb+srv://adeeblms:adeeblms121@lms.bmeqdnx.mongodb.net/';

mongoose.connect(uri).then(async () => {
    console.log('Connected to DB');
    try {
        const fees = await Fee.find({});
        console.log(`Total Fees in DB: ${fees.length}`);

        console.log('\n--- DETAILED INSTALLMENT DUMP ---');
        fees.forEach(f => {
            console.log(`\nFee: ${f._id} (User: ${f.user})`);
            if (!f.installments || f.installments.length === 0) {
                console.log('  [NO INSTALLMENTS]');
            } else {
                f.installments.forEach((i, idx) => {
                    console.log(`  [${idx}] Status: '${i.status}' | Amount: ${i.amount} | Receipt: ${i.receiptUrl ? 'YES' : 'NO'} | Slip: ${i.slipId || 'N/A'}`);
                });
            }
        });
        console.log('\n-----------------------------------');

        let submittedCount = 0;
        let pendingCount = 0;
        let verifiedCount = 0;

        fees.forEach(f => {
            const subs = f.installments.filter(i => i.status === 'submitted');
            const pends = f.installments.filter(i => i.status === 'pending');
            const vers = f.installments.filter(i => i.status === 'verified');

            // The original logging for submitted installments is removed as per the instruction's implied change.
            // If it was meant to be kept, the instruction would have specified where to insert the new block.
            // Given the instruction replaces a section, this part is implicitly removed.

            submittedCount += subs.length;
            pendingCount += pends.length;
            verifiedCount += vers.length;
        });

        console.log('\n--- SUMMARY ---');
        console.log(`Total Submitted (Under Review): ${submittedCount}`);
        console.log(`Total Pending (Not Paid): ${pendingCount}`);
        console.log(`Total Verified (Paid): ${verifiedCount}`);

    } catch (e) {
        console.error(e);
    }
    process.exit();
}).catch(err => {
    console.error('Connection error:', err);
    process.exit(1);
});
