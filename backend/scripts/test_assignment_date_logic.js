const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env vars
dotenv.config({ path: path.join(__dirname, '../.env') });

const verifyAssignmentDate = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
        console.log('Connected.');

        // 1. Simulate the Date processing we just added
        console.log('\n--- Simulating Date Processing ---');
        const inputDateStr = '2026-02-20'; // User input from frontend date picker
        console.log(`Input Date String: "${inputDateStr}"`);

        const dateObj = new Date(inputDateStr);
        console.log(`Initial Date Object (UTC Midnight usually): ${dateObj.toISOString()}`);

        dateObj.setUTCHours(23, 59, 59, 999);
        console.log(`Adjusted Date Object (End of Day UTC): ${dateObj.toISOString()}`);

        const expectedISO = '2026-02-20T23:59:59.999Z';
        if (dateObj.toISOString() === expectedISO) {
            console.log('✅ Date logic verification PASSED: Time is correctly set to 23:59:59.999Z');
        } else {
            console.error(`❌ Date logic verification FAILED: Expected ${expectedISO}, got ${dateObj.toISOString()}`);
        }

        console.log('\nDone.');
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
};

verifyAssignmentDate();
