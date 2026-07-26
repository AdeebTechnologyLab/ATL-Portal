const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { sendEmail, isEmailConfigured } = require('../utils/email');
const { getClientUrl } = require('../config/client');
const { protect } = require('../middleware/auth');
const { uploadPhoto, uploadRegistration } = require('../config/cloudinary');
const User = require('../models/User');

const getLinkedAccountQuery = (user) => {
    const rollNo = user.rollNo?.toString().trim();
    if (rollNo) return { rollNo };
    return { email: user.email?.toString().trim().toLowerCase() };
};

// @route   POST /api/auth/register
// @desc    Register new user
// @access  Public
router.post('/register', uploadRegistration.fields([
    { name: 'photo', maxCount: 1 },
    { name: 'feeScreenshot', maxCount: 1 }
]), async (req, res) => {
    try {
        const {
            name, email, password, phone, role, location,
            // Job fields
            skills, experience, portfolio,
            // Teacher fields
            specialization, department, cnic, qualification,
            // Student/Intern fields
            dob, age, gender, education, guardianName, guardianRelation, guardianPhone,
            guardianOccupation, address, city, country, attendType, heardAbout,
            fatherName, degree, university, semester, rollNumber, cgpa, majorSubjects,
            resumeUrl, requirements, reason,
            // Job fields
            teachingExperience, experienceDetails, preferredCity, preferredMode
        } = req.body;

        // CRITICAL: Use read preference 'primary' to avoid stale reads from replicas
        // This ensures we read from the same node we'll write to
        const existingUser = await User.findOne({ email, role: role || 'student' })
            .read('primary')
            .maxTimeMS(10000);

        if (existingUser) {
            return res.status(400).json({ success: false, message: `Account already exists for this email as a ${role || 'student'}` });
        }

        // Check if any user with this email already has a roll number
        let assignedRollNo = null;
        const otherUserWithSameEmail = await User.findOne({ email, rollNo: { $exists: true, $ne: null } })
            .read('primary')
            .maxTimeMS(10000);

        if (otherUserWithSameEmail) {
            assignedRollNo = otherUserWithSameEmail.rollNo;
            console.log(`Reusing roll number ${assignedRollNo} for email ${email}`);
        } else {
            // Generate new roll number for any user who doesn't have one yet
            const Counter = require('../models/Counter');
            assignedRollNo = await Counter.getNextRollNo();
            console.log(`Generated new global unique ID ${assignedRollNo} for email ${email}`);
        }


        // Create user
        const userData = {
            name,
            email,
            password,
            phone,
            role: role || 'student',
            location,
            isVerified: true, // Users are verified by default, admin can revoke
            rollNo: assignedRollNo
        };

        // Fields to synchronize across all roles for the same email
        const syncFields = [
            'name', 'phone', 'cnic', 'dob', 'age', 'gender', 
            'address', 'city', 'country', 'fatherName', 'photo', 'rollNo'
        ];

        const syncData = { password, rollNo: assignedRollNo }; // Password and Roll Number always synchronized during registration

        // Add photo if uploaded
        if (req.files && req.files['photo']) {
            userData.photo = req.files['photo'][0].path;
            syncData.photo = userData.photo;
        } else {
            // If no photo uploaded, check if any other account with this email has a photo
            const userWithPhoto = await User.findOne({ email, photo: { $exists: true, $ne: null, $ne: '' } });
            if (userWithPhoto) {
                userData.photo = userWithPhoto.photo;
                console.log(`Reusing existing photo for ${email}`);
            }
        }

        // Add other core fields for synchronization
        syncFields.forEach(field => {
            if (req.body[field] !== undefined) {
                syncData[field] = req.body[field];
            }
        });

        // Add fee screenshot if uploaded
        if (req.files && req.files['feeScreenshot']) {
            userData.feeScreenshot = req.files['feeScreenshot'][0].path;
        }

        // Add role-specific fields
        if (role === 'job') {
            userData.skills = skills;
            userData.experience = experience;
            userData.portfolio = portfolio;
            userData.cnic = cnic;
            userData.city = city;
            userData.qualification = qualification;
            userData.teachingExperience = teachingExperience;
            userData.experienceDetails = experienceDetails;
            userData.preferredCity = preferredCity;
            userData.preferredMode = preferredMode;
            userData.heardAbout = heardAbout;
            userData.fatherName = fatherName;
        }
        if (role === 'teacher') {
            userData.specialization = specialization;
            userData.department = department;
            userData.cnic = cnic;
            userData.qualification = qualification;
            userData.experience = experience;
            userData.dob = dob;
            userData.gender = gender;
            userData.address = address;
            userData.city = city;
            userData.country = country || 'Pakistan';
            userData.attendType = attendType;
            userData.fatherName = fatherName;
            userData.heardAbout = heardAbout;
        }
        if (role === 'student' || role === 'intern') {
            userData.cnic = cnic;
            userData.dob = dob;
            userData.age = age;
            userData.gender = gender;
            userData.education = education;
            userData.guardianName = guardianName;
            userData.guardianRelation = guardianRelation;
            userData.guardianPhone = guardianPhone;
            userData.guardianOccupation = guardianOccupation;
            userData.address = address;
            userData.city = city;
            userData.country = country || 'Pakistan';
            userData.attendType = attendType;
            userData.heardAbout = heardAbout;
            userData.fatherName = fatherName;
            userData.degree = degree;
            userData.university = university;
            userData.department = department; // Also used for interns
            userData.semester = semester;
            userData.rollNumber = rollNumber;
            userData.cgpa = cgpa;
            userData.majorSubjects = majorSubjects;
            if (skills) userData.skills = skills;
            userData.resumeUrl = resumeUrl;
            userData.requirements = requirements;
            userData.reason = reason;
            // Also support URL if sent as string (fallback)
            if (req.body.feeScreenshotUrl && !userData.feeScreenshot) {
                userData.feeScreenshot = req.body.feeScreenshotUrl;
            }
        }

        let user;
        try {
            user = await User.create(userData);

            // Synchronize shared fields across every role belonging to this person.
            // We do this AFTER creating the new user to ensure the new user is safe.
            // Note: password hashing is handled by User model middleware (if any) or pre-save hooks.
            // If User.js has a pre-save hook for password, .create() will trigger it.
            // UpdateMany will NOT trigger pre-save hooks, so we need to be careful if hashing is used.
            // Let's check User model for hashing.
            await User.updateMany(
                { $and: [getLinkedAccountQuery(user), { _id: { $ne: user._id } }] },
                { $set: syncData }
            );
        } catch (createError) {
            // Handle duplicate key error (E11000) - user was created by another request
            if (createError.code === 11000) {
                console.log(`⚠️ Duplicate key error for ${email} - user may already exist`);
                return res.status(400).json({
                    success: false,
                    message: `Account already exists for this email as a ${role || 'student'}. If you just registered, please try logging in.`
                });
            }
            throw createError; // Re-throw other errors
        }

        // For non-admins, return success message but no token
        if (user.role !== 'admin') {
            // Send Email Notification to Admin
            sendEmail({
                to: 'info.AdeebTchLab@gmail.com',
                subject: 'New User Registration Notification',
                text: `New user registered:\nName: ${user.name}\nEmail: ${user.email}\nRole: ${user.role}\nPhone: ${user.phone || 'N/A'}`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
                        <div style="background-color: #0d2818; padding: 20px; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0;">New Signup</h1>
                        </div>
                        <div style="padding: 20px; color: #333333;">
                            <p>A new user has registered on the <strong>AdeebTechLab LMS</strong>.</p>
                            <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
                                <p style="margin: 5px 0;"><strong>Name:</strong> ${user.name}</p>
                                <p style="margin: 5px 0;"><strong>Email:</strong> ${user.email}</p>
                                <p style="margin: 5px 0;"><strong>Role:</strong> <span style="text-transform: capitalize;">${user.role}</span></p>
                                <p style="margin: 5px 0;"><strong>Phone:</strong> ${user.phone || 'N/A'}</p>
                                <p style="margin: 5px 0;"><strong>Signup Date:</strong> ${new Date().toLocaleString()}</p>
                            </div>
                            <p>Please log in to the admin dashboard to view and verify this user.</p>
                            <a href="${getClientUrl(req)}/login" style="display: inline-block; padding: 12px 24px; background-color: #0d2818; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; margin-top: 10px;">Login to Admin Panel</a>
                        </div>
                        <div style="background-color: #f1f1f1; padding: 10px; text-align: center; font-size: 12px; color: #666666;">
                            This is an automated notification from AdeebTechLab LMS.
                        </div>
                    </div>
                `,
            })
                .then(() => console.log('✅ Admin notification email sent for new user:', user.email))
                .catch(emailError => console.error('❌ Error sending admin notification email:', emailError));

            return res.status(201).json({
                success: true,
                message: 'Registration successful! Your account is pending admin verification. You will be able to login once verified.',
                isPending: true
            });
        }

        // Generate token for admins (if created via this route)
        const token = user.getSignedJwtToken('2h', false);

        res.status(201).json({
            success: true,
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                photo: user.photo,
                rollNo: user.rollNo
            }
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   POST /api/auth/login
// @desc    Login user & get token
// @access  Public
router.post('/login', async (req, res) => {
    try {
        const { email, password, rememberMe } = req.body;

        // Validate
        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Please provide email and password' });
        }

        // Find all users with this email (using select +password to verify)
        // Use primary read to ensure we get the latest data
        const normalizedEmail = email.trim().toLowerCase();
        const users = await User.find({ email: normalizedEmail })
            .select('+password')
            .read('primary')
            .maxTimeMS(10000);

        if (!users || users.length === 0) {
            return res.status(401).json({
                success: false,
                field: 'email',
                message: 'The email address you entered is incorrect.'
            });
        }

        // Try to find all users where the password matches
        let matchedUsers = [];
        for (const u of users) {
            const isMatch = await u.matchPassword(password);
            if (isMatch) {
                matchedUsers.push(u);
            }
        }

        if (matchedUsers.length === 0) {
            return res.status(401).json({
                success: false,
                field: 'password',
                message: 'The password you entered is incorrect.'
            });
        }

        // Prioritize 'job' role if available, otherwise pick the first matching account
        let user = matchedUsers.find(u => u.role === 'job') || matchedUsers[0];

        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        // Check if account has been revoked by admin
        if (user.role !== 'admin' && !user.isVerified) {
            return res.status(403).json({
                success: false,
                message: 'Your account has been suspended by admin. Please contact support.',
                isRevoked: true
            });
        }

        // Update last seen
        user.lastSeen = new Date();
        await user.save({ validateBeforeSave: false });

        // Normal sessions expire after 2 hours. Remembered sessions remain
        // active until the password/account changes or the user logs out.
        const token = user.getSignedJwtToken('2h', Boolean(rememberMe));

        res.json({
            success: true,
            token,
            user: {
                id: user._id,
                _id: user._id, // Include both for compatibility
                name: user.name,
                email: user.email,
                role: user.role,
                photo: user.photo,
                rollNo: user.rollNo,
                phone: user.phone,
                location: user.location,
                // Job fields
                skills: user.skills,
                experience: user.experience,
                portfolio: user.portfolio,
                completedTasks: user.completedTasks,
                rating: user.rating,
                // Teacher fields
                specialization: user.specialization,
                department: user.department,
                qualification: user.qualification,
                // Student/Intern fields
                cnic: user.cnic,
                dob: user.dob,
                age: user.age,
                gender: user.gender,
                education: user.education,
                guardianName: user.guardianName,
                guardianRelation: user.guardianRelation,
                guardianPhone: user.guardianPhone,
                guardianOccupation: user.guardianOccupation,
                address: user.address,
                city: user.city,
                country: user.country,
                attendType: user.attendType,
                heardAbout: user.heardAbout,
                feeScreenshot: user.feeScreenshot,
                // Common fields
                isVerified: user.isVerified,
                createdAt: user.createdAt
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/auth/me
// @desc    Get current logged in user
// @access  Private
router.get('/me', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        res.json({ success: true, user });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/auth/available-roles
// @desc    Get all roles registered under the current user's email
// @access  Private
router.get('/available-roles', protect, async (req, res) => {
    try {
        // req.user has id. Let's find the email.
        const currentUser = await User.findById(req.user.id);
        if (!currentUser) return res.status(404).json({ success: false, message: 'User not found' });

        // Find all roles linked by email or the shared global roll number.
        const usersWithEmail = await User.find(getLinkedAccountQuery(currentUser)).select('role');
        const roles = usersWithEmail.map(u => u.role);

        res.json({ success: true, roles });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   POST /api/auth/switch-role
// @desc    Switch to a different registered role for the same email
// @access  Private
router.post('/switch-role', protect, async (req, res) => {
    try {
        const { targetRole } = req.body;
        if (!targetRole) return res.status(400).json({ success: false, message: 'Target role is required' });

        const currentUser = await User.findById(req.user.id);
        if (!currentUser) return res.status(404).json({ success: false, message: 'Current user not found' });

        // Find the user object for the requested role
        const targetUser = await User.findOne({
            $and: [getLinkedAccountQuery(currentUser), { role: targetRole }]
        }).select('+password');
        if (!targetUser) {
            return res.status(403).json({ success: false, message: `Access denied. You have not registered as a ${targetRole}.` });
        }

        // Check if account has been revoked by admin
        if (targetUser.role !== 'admin' && !targetUser.isVerified) {
            return res.status(403).json({
                success: false,
                message: 'Your account for this role has been suspended by admin.',
                isRevoked: true
            });
        }

        // Generate a new token for the target user (same session duration logic as login)
        const { rememberMe } = req.body;
        const keepRemembered = typeof rememberMe === 'boolean' ? rememberMe : Boolean(req.auth?.rememberMe);
        const token = targetUser.getSignedJwtToken('2h', keepRemembered);

        res.json({
            success: true,
            token,
            user: {
                id: targetUser._id,
                _id: targetUser._id,
                name: targetUser.name,
                email: targetUser.email,
                role: targetUser.role,
                photo: targetUser.photo,
                rollNo: targetUser.rollNo,
                phone: targetUser.phone,
                location: targetUser.location,
                isVerified: targetUser.isVerified,
                createdAt: targetUser.createdAt
            }
        });
    } catch (error) {
        console.error('Role switch error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});


// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
const SystemSetting = require('../models/SystemSetting'); // Import SystemSetting

// ... [existing imports]

// ... [lines 9-313]

router.put('/profile', protect, uploadPhoto.single('photo'), async (req, res) => {
    try {
        // Get current user doc to check data and email
        const currentUser = await User.findById(req.user.id);
        if (!currentUser) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const requestedEmail = typeof req.body.email === 'string'
            ? req.body.email.trim().toLowerCase()
            : '';

        // Check Global Bio Editing Permission based on user role
        if (req.user.role !== 'admin') { // Admin always allowed
            // Use role-specific setting key
            const settingKey = `allowBioEditing_${req.user.role}`;
            const bioSetting = await SystemSetting.findOne({ key: settingKey });
            const isBioEditingAllowed = bioSetting ? bioSetting.value : false; // Default to false if not set

            if (!isBioEditingAllowed && req.file) {
                return res.status(403).json({
                    success: false,
                    message: 'Profile image editing is currently disabled by the administrator.'
                });
            }

            if (
                !isBioEditingAllowed &&
                requestedEmail &&
                requestedEmail !== currentUser.email
            ) {
                return res.status(403).json({
                    success: false,
                    message: 'Email editing is currently disabled by the administrator.'
                });
            }

            // Check if user has no data - allow editing to fill initial data
            const hasNoData = !currentUser.phone && !currentUser.city && !currentUser.address;

            if (!isBioEditingAllowed && !hasNoData) {
                // Email and photo both follow the admin bio permission.
                if (!req.file && !requestedEmail) {
                    return res.status(403).json({
                        success: false,
                        message: 'Profile editing is currently disabled by the administrator.'
                    });
                }
                req.body = requestedEmail ? { email: requestedEmail } : {};
            }
        }

        const updates = { ...req.body };

        if (requestedEmail) {
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(requestedEmail)) {
                return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
            }
            updates.email = requestedEmail;
        } else {
            delete updates.email;
        }

        // Add new photo if uploaded
        if (req.file) {
            updates.photo = req.file.path;
        }

        const restrictedFields = ['role', 'isVerified', 'rollNo'];
        restrictedFields.forEach(field => delete updates[field]);

        // Remove password from updates
        delete updates.password;

        const linkedAccounts = await User.find(getLinkedAccountQuery(currentUser)).select('_id role');
        const linkedAccountIds = linkedAccounts.map(account => account._id);

        if (updates.email && updates.email !== currentUser.email) {
            const conflictingAccount = await User.findOne({
                email: updates.email,
                _id: { $nin: linkedAccountIds }
            }).select('_id');

            if (conflictingAccount) {
                return res.status(409).json({
                    success: false,
                    message: 'This email is already linked to another account.'
                });
            }
        }

        // Update current user
        const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true, runValidators: true });

        // Fields to synchronize across all roles for the same email
        const syncFields = [
            'name', 'phone', 'cnic', 'dob', 'age', 'gender', 
            'address', 'city', 'country', 'fatherName', 'photo'
        ];

        const syncData = {};
        syncFields.forEach(field => {
            if (updates[field] !== undefined) {
                syncData[field] = updates[field];
            }
        });

        if (updates.email && updates.email !== currentUser.email) {
            syncData.email = updates.email;
        }

        // Synchronize across all other roles with the same email
        if (Object.keys(syncData).length > 0) {
            await User.updateMany(
                { _id: { $in: linkedAccountIds, $ne: req.user.id } },
                { $set: syncData }
            );
            // Notify active socket sessions for all accounts with this email so open portals refresh
            try {
                const io = req.app.get('io');
                if (io) {
                    const usersToNotify = await User.find({ _id: { $in: linkedAccountIds } }).select('_id');
                    const payload = {
                        type: 'user_profile_updated',
                        userId: req.user.id,
                        updates: syncData
                    };
                    usersToNotify.forEach(u => {
                        try {
                            io.to(u._id.toString()).emit('user_updated', payload);
                        } catch (e) {
                            // ignore socket errors for offline users
                        }
                    });
                }
            } catch (emitErr) {
                console.error('Error emitting user_updated sockets:', emitErr);
            }
        }

        res.json({ success: true, user });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   PUT /api/auth/change-password
// @desc    Change user password
// @access  Private
router.put('/change-password', protect, async (req, res) => {
    try {
        const { newPassword } = req.body;
        if (!newPassword || newPassword.length < 4) {
            return res.status(400).json({ success: false, message: 'Password must be at least 4 characters' });
        }

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        user.password = newPassword;
        await user.save();

        // Roll number is the shared identity across Student/Teacher/Intern/Job portals.
        const syncResult = await User.updateMany(
            { $and: [getLinkedAccountQuery(user), { _id: { $ne: user._id } }] },
            { $set: { password: newPassword } }
        );

        res.json({
            success: true,
            message: `Password updated for ${syncResult.modifiedCount + 1} linked portal account(s)`
        });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ==================== FORGOT PASSWORD ====================

// @route   GET /api/auth/test-email
// @desc    Debug route to test email sending
// @access  Public (should optionally be protected in final prod)
router.get('/test-email', async (req, res) => {
    try {
        console.log('Testing Email Configuration...');

        if (!isEmailConfigured()) {
            return res.status(500).json({
                success: false,
                message: 'No email method configured. Set BREVO_API_KEY or EMAIL_USER+EMAIL_PASS in env.',
            });
        }

        const info = await sendEmail({
            to: process.env.EMAIL_USER || 'test@adeebtechnolab.com',
            subject: 'LMS Production Email Test',
            text: 'If you received this, email sending is working on Render!',
            html: '<p>If you received this, email sending is working on Render!</p>',
        });

        res.json({ success: true, message: 'Email sent successfully', info });
    } catch (error) {
        console.error('❌ Email Test Failed:', error);

        const errMsg = error.message || '';
        const errBody = error.response?.data ? JSON.stringify(error.response.data) : '';
        const isBrevoAuthError = error.response?.status === 401 || /key not found|unauthorized/i.test(errMsg);
        const isSenderError = /sender|from|verified|valid|not found/i.test(errMsg + errBody);
        const isGmailAuthError = error.code === 'EAUTH' || error.responseCode === 535 || /invalid login|authentication failed/i.test(errMsg);

        let hint = '';
        if (isBrevoAuthError) hint = 'Use xkeysib- API key (not xsmtpsib).';
        else if (isSenderError) hint = 'Verify sender email in Brevo and set EMAIL_FROM in Render env.';
        else if (isGmailAuthError) hint = 'Update EMAIL_PASS with a valid Gmail App Password.';

        res.status(500).json({
            success: false,
            message: 'Email test failed',
            error: error.message,
            hint,
        });
    }
});

// @route   POST /api/auth/forgot-password
// @desc    Request password reset via email
// @access  Public
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;

        const genericSuccess = {
            success: true,
            message: 'If an account exists with this email, you will receive a password reset link shortly.',
        };

        if (!email?.trim()) {
            return res.status(400).json({ success: false, message: 'Please provide your email address' });
        }

        const normalizedEmail = email.toLowerCase().trim();

        if (!isEmailConfigured()) {
            console.error('❌ No email method configured (set BREVO_API_KEY or EMAIL_USER+EMAIL_PASS)');
            return res.status(503).json({
                success: false,
                message: 'Email service is not configured on the server. Please contact admin.',
            });
        }

        const user = await User.findOne({ email: normalizedEmail }).sort({ updatedAt: -1 });

        if (!user) {
            return res.json(genericSuccess);
        }

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        user.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
        user.passwordResetExpires = Date.now() + 60 * 60 * 1000;
        await user.save({ validateBeforeSave: false });

        const resetUrl = `${getClientUrl(req)}/reset-password/${resetToken}`;
        const roleLabel = user.role.charAt(0).toUpperCase() + user.role.slice(1);

        const emailPayload = {
            to: user.email,
            subject: 'Reset your Adeeb Technology Lab password',
            text: `Hi ${user.name},\n\nReset your password: ${resetUrl}\n\nThis link expires in 1 hour.`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
                    <div style="background: linear-gradient(135deg, #ff8e01, #e67e00); padding: 24px; text-align: center;">
                        <h1 style="color: #fff; margin: 0; font-size: 22px;">Adeeb Technology Lab</h1>
                        <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 14px;">Password Reset</p>
                    </div>
                    <div style="padding: 24px; color: #333;">
                        <p>Hi <strong>${user.name}</strong>,</p>
                        <p>Reset the password for your <strong>${roleLabel}</strong> account:</p>
                        <p style="text-align: center; margin: 28px 0;">
                            <a href="${resetUrl}" style="display: inline-block; padding: 14px 28px; background: #ff8e01; color: #fff; text-decoration: none; border-radius: 8px; font-weight: bold;">Reset Password</a>
                        </p>
                        <p style="font-size: 13px; color: #666; word-break: break-all;">Or copy: <a href="${resetUrl}">${resetUrl}</a></p>
                        <p style="font-size: 13px; color: #888;">Expires in 1 hour. Check spam if you don't see this email.</p>
                    </div>
                </div>
            `,
        };

        // Reply immediately — waiting on email sending caused 30s+ timeouts (502) on Render/Vercel
        res.json(genericSuccess);

        sendEmail(emailPayload)
            .then(() => console.log(`🔑 Password reset email sent to ${user.email} (${user.role})`))
            .catch((err) => {
                const brevoBody = err.response?.data ? JSON.stringify(err.response.data) : '';
                console.error(`❌ Password reset email failed for ${user.email}:`, err.message, brevoBody);
                if (err.response?.status === 401 || /key not found|unauthorized/i.test(err.message)) {
                    console.error('🔴 Brevo fix: use xkeysib- API key in BREVO_API_KEY, not xsmtpsib SMTP key.');
                } else if (/sender|from|verified|valid|not found/i.test(err.message + brevoBody)) {
                    console.error('🔴 Brevo fix: verify sender email at Brevo > Settings > Senders, then set EMAIL_FROM in Render env.');
                } else if (err.code === 'EAUTH' || /invalid login|authentication failed/i.test(err.message)) {
                    console.error('🔴 Gmail SMTP fix: update EMAIL_PASS with a valid Gmail App Password.');
                }
            });
    } catch (error) {
        console.error('Forgot password error:', error);

        return res.status(500).json({
            success: false,
            message: 'Could not send reset email. Please try again or contact support.',
        });
    }
});

// @route   POST /api/auth/reset-password/:token
// @desc    Reset password using token
// @access  Public
router.post('/reset-password/:token', async (req, res) => {
    try {
        const { password } = req.body;

        if (!password || password.length < 4) {
            return res.status(400).json({ success: false, message: 'Password must be at least 4 characters' });
        }

        // Hash the token from URL
        const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

        // Find user with valid token
        const user = await User.findOne({
            passwordResetToken: hashedToken,
            passwordResetExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
        }

        // Update password for the current user instance
        user.password = password;
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save();

        // Synchronize through the person's global roll number (email is legacy fallback).
        const syncResult = await User.updateMany(
            { $and: [getLinkedAccountQuery(user), { _id: { $ne: user._id } }] },
            { $set: { password: password } }
        );

        res.json({
            success: true,
            message: `Password reset for ${syncResult.modifiedCount + 1} linked portal account(s). Please login with your new password.`
        });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;

