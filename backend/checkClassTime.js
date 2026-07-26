const mongoose = require('mongoose');
const User = require('./models/User');

mongoose.connect('mongodb://127.0.0.1:27017/lms-adeeb').then(async () => {
    const users = await User.find({ classTime: { $exists: true, $ne: null } }).select('name email classTime');
    console.log(users);
    process.exit(0);
});
