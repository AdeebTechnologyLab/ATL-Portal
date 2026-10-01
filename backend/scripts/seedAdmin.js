const mongoose = require('mongoose');
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
// Passwords are stored in plain text to match User.matchPassword (bcrypt disabled in User.js)
const userSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    password: String,
    role: String,
    location: String,
    isActive: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

async function seedAdmin() {
    try {
        const email = 'admin@lms.com';
        const plainPassword = '123456';

        // Ensure admin exists with role=admin and plain-text password
        const existingAdmin = await User.findOne({ email, role: 'admin' });
        if (existingAdmin) {
            // If password was bcrypt-hashed by an old seed script, fix it to plain text
            if (existingAdmin.password && existingAdmin.password.startsWith('$2')) {
                existingAdmin.password = plainPassword;
                existingAdmin.isVerified = true;
                await existingAdmin.save();
                console.log('✅ Admin password reset to plain text (matches login matcher)');
            } else if (existingAdmin.password !== plainPassword) {
                existingAdmin.password = plainPassword;
                existingAdmin.isVerified = true;
                await existingAdmin.save();
                console.log('✅ Admin password updated');
            } else {
                console.log('⚠️  Admin user already exists!');
            }
            console.log('   Email:', email);
            console.log('   Password:', plainPassword);
            console.log('   Role: admin');
            process.exit(0);
        }

        // Create admin user (plain text password — User.matchPassword compares directly)
        await User.create({
            name: 'Admin',
            email,
            password: plainPassword,
            role: 'admin',
            location: 'islamabad',
            isActive: true,
            isVerified: true
        });

        console.log('✅ Admin user created successfully!');
        console.log('   Email:', email);
        console.log('   Password:', plainPassword);
        console.log('   Role: admin');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating admin:', error);
        process.exit(1);
    }
}

seedAdmin();
