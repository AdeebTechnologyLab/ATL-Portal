/**
 * ONE-TIME backfill: certificate passoutDate ke hisab se enrollment statuses sync.
 *
 * Kya karta hai:
 *  - Jis student/intern ki certificate issued hai lekin passoutDate abhi NAHI aya
 *    -> enrollment 'completed' se 'enrolled' (taake live classes/logs chalte rahein)
 *  - Jiska passoutDate aa chuka hai (ya khali hai = immediate release)
 *    -> enrollment 'completed'
 *
 * Run:  node scripts/syncEnrollmentStatuses.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

const { syncAllCertificateEnrollments } = require('../utils/enrollmentStatusSync');
const { updateEnrollmentStatus } = require('./generateInstallments');

const run = async () => {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!mongoUri) {
        console.error('❌ MONGODB_URI set nahi hai (.env check karo)');
        process.exit(1);
    }

    console.log('🔌 MongoDB se connect ho raha hoon...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected\n');

    const changes = await syncAllCertificateEnrollments();

    // isActive bhi dobara compute karo (fee/overdue ke hisab se) —
    // pehle wale galat logic ne passoutDate tak wale students ko lock kar diya tha
    console.log('\n🔄 Recomputing enrollment isActive from fee status...');
    await updateEnrollmentStatus();

    const completed = changes.filter(c => c.action === 'completed');
    const reopened = changes.filter(c => c.action === 'reopened');

    console.log(`\n📊 RESULT:`);
    console.log(`   ✅ ${completed.length} enrollments -> completed (passoutDate aa gaya tha)`);
    completed.forEach(c => console.log(`      - ${c.enrollmentId}`));
    console.log(`   🔓 ${reopened.length} enrollments -> enrolled (passoutDate abhi door hai)`);
    reopened.forEach(c => console.log(`      - ${c.enrollmentId}`));

    if (changes.length === 0) {
        console.log('   Sab enrollments already sahi hain — koi change nahi.');
    }

    await mongoose.disconnect();
    console.log('\n👋 Done.');
    process.exit(0);
};

run().catch(err => {
    console.error('❌ Backfill failed:', err);
    process.exit(1);
});
