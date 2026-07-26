const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

const checkDuplicates = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const duplicates = await User.aggregate([
            { $match: { rollNo: { $ne: null } } },
            { $group: { _id: "$rollNo", count: { $sum: 1 }, users: { $push: "$name" } } },
            { $match: { count: { $gt: 1 } } }
        ]);

        if (duplicates.length === 0) {
            console.log('No duplicate roll numbers found.');
        } else {
            console.log('Duplicate roll numbers found:');
            duplicates.forEach(d => {
                console.log(`Roll No: ${d._id}, Count: ${d.count}, Users: ${d.users.join(', ')}`);
            });
        }

        // Check unique index status
        const indexes = await User.collection.indexes();
        console.log('\nCurrent Indexes on User collection:');
        indexes.forEach(idx => {
            console.log(`Name: ${idx.name}, Key: ${JSON.stringify(idx.key)}, Unique: ${idx.unique}, Sparse: ${idx.sparse}`);
        });

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
};

checkDuplicates();
