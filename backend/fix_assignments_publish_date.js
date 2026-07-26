const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });
const Assignment = require('./models/Assignment');

const fixAssignments = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB Connected');

        // Find assignments without publishDate
        const assignments = await Assignment.find({ 
            $or: [
                { publishDate: { $exists: false } },
                { publishDate: null }
            ]
        });

        console.log(`Found ${assignments.length} assignments without publishDate.`);

        for (const assignment of assignments) {
            console.log(`Fixing assignment: ${assignment.title}`);
            assignment.publishDate = assignment.createdAt || new Date();
            await assignment.save();
        }

        console.log('Fix completed.');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
};

fixAssignments();
