const mongoose = require('mongoose');
const Fee = require('./models/Fee');
const User = require('./models/User');
const Course = require('./models/Course');
const uri = 'mongodb+srv://adeeblms:adeeblms121@lms.bmeqdnx.mongodb.net/';

mongoose.connect(uri).then(async () => {
    try {
        // Find fees with submitted installments
        const fees = await Fee.find({
            installments: { $elemMatch: { status: 'submitted' } }
        });

        console.log(`Found ${fees.length} submitted fees via DB Query`);

        for (const f of fees) {
            console.log(`\nReviewing Fee: ${f._id}`);
            console.log(`User ID: ${f.user}`);
            console.log(`Course ID: ${f.course}`);

            // Check references
            const user = await User.findById(f.user);
            const course = await Course.findById(f.course);

            console.log(`- User Exists? ${!!user} ${user ? '(' + user.email + ')' : ''}`);
            console.log(`- Course Exists? ${!!course} ${course ? '(' + course.title + ')' : ''}`);

            const subInsts = f.installments.filter(i => i.status === 'submitted');
            console.log(`- Submitted Installments: ${subInsts.length}`);
            subInsts.forEach(i => {
                console.log(`  > Amount: ${i.amount}, Receipt: ${i.receiptUrl}`);
            });
        }

    } catch (e) { console.error(e); }
    process.exit();
}).catch(err => { console.error(err); process.exit(1); });
