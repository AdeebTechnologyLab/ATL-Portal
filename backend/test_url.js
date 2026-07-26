const mongoose = require('mongoose');
require('dotenv').config();
mongoose.connect(process.env.MONGODB_URI).then(async () => {
    const db = mongoose.connection.db;
    const items = await db.collection('fees').find({
        'installments.receiptUrl': { $exists: true, $nin: [null, ""] }
    }).toArray();
    console.log(`Found ${items.length} fees with receipts.`);
    if (items.length > 0) {
        items.slice(0, 5).forEach(i => console.log(JSON.stringify(i.installments.map(x => x.receiptUrl))));
    }
    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
