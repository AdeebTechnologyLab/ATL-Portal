const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: 4,
        select: false
    },
    passwordResetToken: String,
    passwordResetExpires: Date,
    phone: {
        type: String,
        trim: true
    },
    photo: {
        type: String, // Cloudinary URL
        default: null
    },
    feeScreenshot: {
        type: String, // Cloudinary URL or external link
        default: null
    },
    role: {
        type: String,
        enum: ['admin', 'teacher', 'student', 'intern', 'job'],
        default: 'student'
    },
    rollNo: {
        type: String,
        sparse: true // allows multiple null values
    },
    // Additional fields for job role
    skills: String,
    experience: String,
    portfolio: String,
    teachingExperience: String,
    experienceDetails: String,
    preferredCity: String,
    preferredMode: String,
    cvUrl: String,
    completedTasks: { type: Number, default: 0 },
    rating: { type: Number, default: 0 },
    totalEarnings: { type: Number, default: 0 },
    resumeUrl: String,
    requirements: String,
    reason: String,
    // Location preference
    location: {
        type: String,
        default: ''
    },
    // Common fields
    cnic: String,
    fatherName: String, // Added for all user types
    // Student/Intern specific fields
    dob: Date,
    age: String,
    gender: String,
    education: String,
    guardianName: String,
    guardianRelation: String,
    guardianPhone: String,
    guardianOccupation: String,
    address: String,
    city: String,
    country: { type: String, default: 'Pakistan' },
    attendType: String, // Physical/Online
    classTime: String, // E.g., '11:00 AM to 01:00 PM'
    heardAbout: String,
    // Intern academic fields
    degree: String,
    university: String,
    department: String,
    semester: String,
    rollNumber: String,
    cgpa: String,
    majorSubjects: String,
    internshipDurationMonths: {
        type: Number,
        enum: [3, 6, 12]
    },
    // Teacher specific
    specialization: String,
    qualification: String,
    // Verification status (true by default, admin can revoke)
    isVerified: {
        type: Boolean,
        default: true
    },
    // Operational availability for teachers. Inactive teachers remain in
    // records, but cannot be assigned to courses or paid tasks.
    isActive: {
        type: Boolean,
        default: true
    },
    // Admin can mark a registered-but-not-enrolled student as "old registered"
    registeredOld: {
        type: Boolean,
        default: false
    },
    verifiedAt: Date,
    verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    pushSubscriptions: [{
        endpoint: String,
        expirationTime: Date,
        keys: {
            p256dh: String,
            auth: String
        }
    }],
    birthdayWishes: [{
        from: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        year: Number,
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    lastSeen: {
        type: Date,
        default: null
    },
    discussionLastReadAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

// Compound unique index for email and role
userSchema.index({ email: 1, role: 1 }, { unique: true });

// Hash password before saving - DISABLED AS PER USER REQUEST
// userSchema.pre('save', async function (next) {
//     if (!this.isModified('password')) {
//         next();
//     }
//     const salt = await bcrypt.genSalt(10);
//     this.password = await bcrypt.hash(this.password, salt);
// });

// Match password
userSchema.methods.matchPassword = async function (enteredPassword) {
    // Plain text comparison
    return enteredPassword === this.password;
    // return await bcrypt.compare(enteredPassword, this.password);
};

// Generate JWT token
userSchema.methods.getPasswordFingerprint = function () {
    if (!this.password) {
        throw new Error('Password must be selected before creating an authentication token');
    }

    return crypto
        .createHmac('sha256', process.env.JWT_SECRET)
        .update(String(this.password))
        .digest('hex');
};

userSchema.methods.getSignedJwtToken = function (expiresIn = '2h', rememberMe = false) {
    const payload = {
        id: this._id,
        passwordFingerprint: this.getPasswordFingerprint(),
        rememberMe: Boolean(rememberMe)
    };

    const options = rememberMe ? {} : { expiresIn };
    return jwt.sign(payload, process.env.JWT_SECRET, options);
};

module.exports = mongoose.model('User', userSchema);
