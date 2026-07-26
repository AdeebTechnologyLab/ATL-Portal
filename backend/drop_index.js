const mongoose = require('mongoose');
require('dotenv').config();

const dropIndex = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const collection = mongoose.connection.collection('users');

        // Try to drop the index if it exists
        try {
            await collection.dropIndex('rollNo_1');
            console.log('Successfully dropped unique index on rollNo');
        } catch (e) {
            if (e.codeName === 'IndexNotFound' || e.message.includes('index not found')) {
                console.log('Index rollNo_1 not found, it might have already been dropped or named differently.');
            } else {
                throw e;
            }
        }

        // List remaining indexes for verification
        const indexes = await collection.indexes();
        console.log('Remaining indexes:', JSON.stringify(indexes, null, 2));

        await mongoose.disconnect();
    } catch (error) {
        console.error('Failed to drop index:', error);
        process.exit(1);
    }
};

dropIndex();
