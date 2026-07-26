const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const User = require('./models/User');
const Certificate = require('./models/Certificate');

async function debug() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const certs = await Certificate.find().populate('user', 'name rollNo').populate('course', 'title');
        console.log(`Total Certificates in DB: ${certs.length}`);

        const rollNoCerts = {};
        certs.forEach(c => {
            if (c.user && c.user.rollNo) {
                const rn = c.user.rollNo;
                if (!rollNoCerts[rn]) rollNoCerts[rn] = [];
                rollNoCerts[rn].push({
                    userName: c.user.name,
                    course: c.course ? c.course.title : 'N/A',
                    link: !!c.certificateLink
                });
            }
        });

        for (const rn in rollNoCerts) {
            if (rollNoCerts[rn].length >= 2) {
                console.log(`\nRollNo: ${rn}`);
                rollNoCerts[rn].forEach((info, i) => {
                    console.log(`  ${i + 1}. User: ${info.userName}, Course: ${info.course}, Link: ${info.link}`);
                });
            }
        }

        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

debug();
