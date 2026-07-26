const mongoose = require('mongoose');
const Fee = require('./models/Fee');
const uri = 'mongodb+srv://adeeblms:adeeblms121@lms.bmeqdnx.mongodb.net/';

mongoose.connect(uri).then(async () => {
    try {
        // ID from user logs in Step 2067
        const id = '6975ba539840c5ce993f05a0';
        console.log(`Checking Fee: ${id}`);
        const fee = await Fee.findById(id);
        if (!fee) {
            console.log('Fee not found');
        } else {
            console.log(JSON.stringify(fee.installments, null, 2));
        }
    } catch (e) { console.error(e); }
    process.exit();
}).catch(err => { console.error(err); process.exit(1); });
