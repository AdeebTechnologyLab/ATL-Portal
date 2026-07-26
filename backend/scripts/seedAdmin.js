const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => {
        console.error('❌ MongoDB connection error:', err);
        process.exit(1);
    });

// User Schema (simplified for seeding)
const userSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    password: String,
    role: String,
    location: String,
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

async function seedAdmin() {
    try {
        // Check if admin already exists
        const existingAdmin = await User.findOne({ email: 'admin@lms.com' });
        if (existingAdmin) {
            console.log('⚠️  Admin user already exists!');
            console.log('   Email: admin@lms.com');
            process.exit(0);
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('123456', salt);

        // Create admin user
        const admin = await User.create({
            name: 'Admin',
            email: 'admin@lms.com',
            password: hashedPassword,
            role: 'admin',
            location: 'islamabad',
            isActive: true
        });

        console.log('✅ Admin user created successfully!');
        console.log('   Email: admin@lms.com');
        console.log('   Password: 123456');
        console.log('   Role: admin');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating admin:', error);
        process.exit(1);
    }
}

seedAdmin();
