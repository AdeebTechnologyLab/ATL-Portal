const mongoose = require('mongoose');
const Fee = require('./models/Fee');
const uri = 'mongodb+srv://adeeblms:adeeblms121@lms.bmeqdnx.mongodb.net/';

mongoose.connect(uri).then(async () => {
    try {
        const fees = await Fee.find({});
        console.log(`\n=== FEE DATABASE DUMP (${fees.length} records) ===`);

        fees.forEach(f => {
            console.log(`FEE ${f._id} (User: ${f.user})`);
            if (f.installments.length === 0) console.log('  [No Installments]');
            f.installments.forEach((i, idx) => {
                console.log(`  [${idx}] ${i._id} | Status: ${i.status.toUpperCase()} | Amt: ${i.amount} | Receipt: ${!!i.receiptUrl}`);
            });
        });
        console.log('============================================\n');

    } catch (e) { console.error(e); }
    process.exit();
}).catch(err => { console.error(err); process.exit(1); });
