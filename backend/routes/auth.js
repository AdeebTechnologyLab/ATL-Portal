const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { sendEmail, sendEmailWithTimeout, isEmailConfigured, getEmailConfigIssue } = require('../utils/email');
const { getClientUrl } = require('../config/client');
const { protect, authorize } = require('../middleware/auth');
const { uploadPhoto, uploadRegistration, deleteCloudinaryImage, extractPublicId } = require('../config/cloudinary');
const User = require('../models/User');

const getLinkedAccountQuery = (user) => {
    const rollNo = user.rollNo?.toString().trim();
    if (rollNo) return { rollNo };
    return { email: user.email?.toString().trim().toLowerCase() };
};

// Keep the profile photo identical across every portal linked to the same person.
// Returns the best (most recently updated non-empty) photo for the linked group.
const syncLinkedPhoto = async (user) => {
    if (!user) return null;
    const linked = await User.find(getLinkedAccountQuery(user)).select('photo updatedAt');
    const candidates = linked.filter((account) => account.photo);
    candidates.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    const bestPhoto = candidates.length ? candidates[0].photo : null;
    if (bestPhoto && user.photo !== bestPhoto) {
        await User.updateMany(getLinkedAccountQuery(user), { $set: { photo: bestPhoto } });
        user.photo = bestPhoto;
    }
    return user.photo || bestPhoto || null;
};

// Shape returned to the client after any successful login (password or Google).
const buildAuthUserResponse = (user) => ({
    id: user._id,
    _id: user._id,
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
    preferences: user.preferences,
    createdAt: user.createdAt
});

// Verify a Google ID token or OAuth access token and return the basic profile.
const verifyGoogleProfile = async ({ credential, accessToken, googleClientId }) => {
    const { OAuth2Client } = require('google-auth-library');
    const client = new OAuth2Client(googleClientId);

    if (credential) {
        // ID token from Google Identity Services.
        const ticket = await client.verifyIdToken({ idToken: credential, audience: googleClientId });
        const payload = ticket.getPayload();
        return {
            email: payload?.email,
            emailVerified: payload?.email_verified !== false,
            picture: payload?.picture,
            name: payload?.name
        };
    }

    // Access token from the OAuth2 token client (custom Google button).
    const tokenInfo = await client.getTokenInfo(accessToken);
    if (String(tokenInfo?.aud) !== googleClientId) {
        throw new Error('Google token audience mismatch');
    }
    client.setCredentials({ access_token: accessToken });
    const { google } = require('googleapis');
    const oauth2 = google.oauth2({ version: 'v2', auth: client });
    const { data } = await oauth2.userinfo.get();
    return {
        email: data?.email,
        emailVerified: data?.verified_email !== false,
        picture: data?.picture,
        name: data?.name
    };
};

const pickUserByRolePriority = (users) => {
    const rolePriority = ['admin', 'teacher', 'student', 'intern', 'job'];
    return users.find(u => u.role === 'admin')
        || users.find(u => u.role === 'teacher')
        || users.find(u => u.role === 'student')
        || users.find(u => u.role === 'intern')
        || users.find(u => u.role === 'job')
        || users.find(u => rolePriority.includes(u.role))
        || users[0];
};

// ---------- in-memory rate limiting (per-process; enough for a single instance) ----------
const rateBuckets = new Map();
const getClientIp = (req) => {
    const fwd = (req.headers['x-forwarded-for'] || '').split(',')[0].trim();
    return fwd || req.ip || req.socket?.remoteAddress || 'unknown';
};
const rateLimit = (key, limit, windowMs) => {
    const now = Date.now();
    let bucket = rateBuckets.get(key);
    if (!bucket || now >= bucket.resetAt) {
        bucket = { count: 0, resetAt: now + windowMs };
        rateBuckets.set(key, bucket);
        if (rateBuckets.size > 10000) {
            for (const [k, v] of rateBuckets) {
                if (now >= v.resetAt) rateBuckets.delete(k);
            }
        }
    }
    bucket.count += 1;
    return { allowed: bucket.count <= limit, resetAt: bucket.resetAt };
};
const sendRateLimitResponse = (res, resetAt) => {
    const retryAfter = Math.max(1, Math.ceil((resetAt - Date.now()) / 1000));
    res.set('Retry-After', String(retryAfter));
    return res.status(429).json({
        success: false,
        message: `Too many attempts. Please wait ${retryAfter} seconds and try again.`,
    });
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
                syncData.photo = userData.photo;
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
        const { email, password, rememberMe, preferredRole } = req.body;

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

        // Role priority: preferredRole (if valid & matched) > admin > teacher > student > intern > job
        // Admin must never lose to other roles when the same email/password works for multiple accounts.
        const rolePriority = ['admin', 'teacher', 'student', 'intern', 'job'];
        const requestedRole = typeof preferredRole === 'string' ? preferredRole.trim().toLowerCase() : '';
        const requestedMatch = requestedRole
            ? matchedUsers.find(u => u.role === requestedRole)
            : null;

        let user = requestedMatch
            || matchedUsers.find(u => u.role === 'admin')
            || matchedUsers.find(u => u.role === 'teacher')
            || matchedUsers.find(u => u.role === 'student')
            || matchedUsers.find(u => u.role === 'intern')
            || matchedUsers.find(u => u.role === 'job')
            || matchedUsers.find(u => rolePriority.includes(u.role))
            || matchedUsers[0];

        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        // Keep profile photo consistent across all linked portals
        await syncLinkedPhoto(user);

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
            user: buildAuthUserResponse(user)
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   POST /api/auth/google
// @desc    Login with a Google ID token or OAuth access token
// @access  Public
router.post('/google', async (req, res) => {
    try {
        const { credential, accessToken, rememberMe } = req.body;
        if (!credential && !accessToken) {
            return res.status(400).json({ success: false, message: 'Google credential is required' });
        }

        const googleClientId = process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_DRIVE_CLIENT_ID;
        if (!googleClientId) {
            return res.status(503).json({
                success: false,
                message: 'Google login is not configured. Please contact support.'
            });
        }

        let googleProfile;
        try {
            googleProfile = await verifyGoogleProfile({ credential, accessToken, googleClientId });
        } catch (error) {
            console.error('Google token verification failed:', error.message);
            return res.status(401).json({
                success: false,
                message: 'Google sign-in failed. Please try again.'
            });
        }

        const email = String(googleProfile?.email || '').trim().toLowerCase();
        if (!email || !googleProfile.emailVerified) {
            return res.status(401).json({
                success: false,
                message: 'This Google account email is not verified.'
            });
        }

        const users = await User.find({ email })
            .select('+password')
            .read('primary')
            .maxTimeMS(10000);

        if (!users || users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No account found with this Google email. Please register first.'
            });
        }

        // Same priority as password login: admin > teacher > student > intern > job
        const user = pickUserByRolePriority(users);

        if (user.role !== 'admin' && !user.isVerified) {
            return res.status(403).json({
                success: false,
                message: 'Your account has been suspended by admin. Please contact support.',
                isRevoked: true
            });
        }

        // Use the Google profile picture only when the account has none yet.
        if (!user.photo && googleProfile.picture) {
            user.photo = googleProfile.picture;
        }

        await syncLinkedPhoto(user);

        user.lastSeen = new Date();
        await user.save({ validateBeforeSave: false });

        const token = user.getSignedJwtToken('2h', Boolean(rememberMe));

        res.json({
            success: true,
            token,
            user: buildAuthUserResponse(user)
        });
    } catch (error) {
        console.error('Google login error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   POST /api/auth/google/register
// @desc    Sign up with Google using only the details Google provides
// @access  Public
router.post('/google/register', async (req, res) => {
    try {
        const { credential, accessToken, rememberMe, role } = req.body;
        if (!credential && !accessToken) {
            return res.status(400).json({ success: false, message: 'Google credential is required' });
        }

        const requestedRole = ['student', 'intern', 'job', 'teacher'].includes(String(role || '').toLowerCase())
            ? String(role).toLowerCase()
            : 'student';

        const googleClientId = process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_DRIVE_CLIENT_ID;
        if (!googleClientId) {
            return res.status(503).json({
                success: false,
                message: 'Google signup is not configured. Please contact support.'
            });
        }

        let googleProfile;
        try {
            googleProfile = await verifyGoogleProfile({ credential, accessToken, googleClientId });
        } catch (error) {
            console.error('Google token verification failed:', error.message);
            return res.status(401).json({
                success: false,
                message: 'Google signup failed. Please try again.'
            });
        }

        const email = String(googleProfile?.email || '').trim().toLowerCase();
        if (!email || !googleProfile.emailVerified) {
            return res.status(401).json({
                success: false,
                message: 'This Google account email is not verified.'
            });
        }

        // If this email is already registered, log the user in instead of
        // creating a duplicate account.
        const users = await User.find({ email })
            .select('+password')
            .read('primary')
            .maxTimeMS(10000);

        if (users && users.length > 0) {
            const user = pickUserByRolePriority(users);
            if (user.role !== 'admin' && !user.isVerified) {
                return res.status(403).json({
                    success: false,
                    message: 'Your account has been suspended by admin. Please contact support.',
                    isRevoked: true
                });
            }

            if (!user.photo && googleProfile.picture) {
                user.photo = googleProfile.picture;
            }

            await syncLinkedPhoto(user);

            user.lastSeen = new Date();
            await user.save({ validateBeforeSave: false });

            const token = user.getSignedJwtToken('2h', Boolean(rememberMe));

            return res.json({
                success: true,
                isNew: false,
                token,
                user: buildAuthUserResponse(user)
            });
        }

        const Counter = require('../models/Counter');
        const assignedRollNo = await Counter.getNextRollNo();
        const generatedPassword = crypto.randomBytes(32).toString('hex');

        const userData = {
            name: String(googleProfile.name || '').trim() || email.split('@')[0],
            email,
            password: generatedPassword,
            role: requestedRole,
            isVerified: true,
            rollNo: assignedRollNo
        };

        if (googleProfile.picture) {
            userData.photo = googleProfile.picture;
        }

        let user;
        try {
            user = await User.create(userData);
        } catch (createError) {
            if (createError.code === 11000) {
                const existingUsers = await User.find({ email })
                    .select('+password')
                    .read('primary')
                    .maxTimeMS(10000);
                if (existingUsers && existingUsers.length > 0) {
                    const existingUser = pickUserByRolePriority(existingUsers);
                    const token = existingUser.getSignedJwtToken('2h', Boolean(rememberMe));
                    return res.json({
                        success: true,
                        isNew: false,
                        token,
                        user: buildAuthUserResponse(existingUser)
                    });
                }
            }
            throw createError;
        }

        const token = user.getSignedJwtToken('2h', Boolean(rememberMe));

        res.status(201).json({
            success: true,
            isNew: true,
            token,
            user: buildAuthUserResponse(user)
        });
    } catch (error) {
        console.error('Google registration error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/auth/me
// @desc    Get current logged in user
// @access  Private
router.get('/me', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (user) await syncLinkedPhoto(user);
        res.json({ success: true, user });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Save account-level visual preferences across every role linked to this user.
router.put('/preferences/theme', protect, async (req, res) => {
    try {
        const allowedThemes = ['orange', 'gold', 'olive', 'navy', 'lavender', 'rose-pink', 'pakistan-green', 'custom'];
        const colorTheme = String(req.body.colorTheme || '').trim();
        if (!allowedThemes.includes(colorTheme)) {
            return res.status(400).json({ success: false, message: 'Invalid theme selection' });
        }

        const currentUser = await User.findById(req.user.id);
        if (!currentUser) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const preferenceUpdate = { 'preferences.colorTheme': colorTheme };
        if (colorTheme === 'custom') {
            const customTheme = req.body.customTheme || {};
            const isHex = value => /^#[0-9a-f]{6}$/i.test(String(value || ''));
            if (![customTheme.primary, customTheme.accent, customTheme.sidebar].every(isHex)) {
                return res.status(400).json({ success: false, message: 'Custom theme colors must be valid hex colors' });
            }
            preferenceUpdate['preferences.customTheme'] = {
                primary: customTheme.primary.toUpperCase(),
                accent: customTheme.accent.toUpperCase(),
                sidebar: customTheme.sidebar.toUpperCase()
            };
        }

        await User.updateMany(
            getLinkedAccountQuery(currentUser),
            { $set: preferenceUpdate }
        );

        res.json({ success: true, preferences: { colorTheme, ...(preferenceUpdate['preferences.customTheme'] ? { customTheme: preferenceUpdate['preferences.customTheme'] } : {}) } });
    } catch (error) {
        console.error('Theme preference update error:', error);
        res.status(500).json({ success: false, message: 'Could not save theme preference' });
    }
});

// Save the official notice popup preference across every role linked to this user.
router.put('/preferences/notifications', protect, async (req, res) => {
    try {
        const currentUser = await User.findById(req.user.id);
        if (!currentUser) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const update = {};
        if (typeof req.body.popupEnabled === 'boolean') {
            update['preferences.notificationPopup.enabled'] = req.body.popupEnabled;
            // Turning it back on clears any temporary snooze.
            if (req.body.popupEnabled) {
                update['preferences.notificationPopup.snoozeUntil'] = null;
            }
        }

        if (Object.prototype.hasOwnProperty.call(req.body, 'snoozeUntil')) {
            if (req.body.snoozeUntil === null) {
                update['preferences.notificationPopup.snoozeUntil'] = null;
            } else {
                const snoozeDate = new Date(req.body.snoozeUntil);
                if (Number.isNaN(snoozeDate.getTime())) {
                    return res.status(400).json({ success: false, message: 'Invalid snooze date' });
                }
                update['preferences.notificationPopup.snoozeUntil'] = snoozeDate;
            }
        }

        if (Object.keys(update).length === 0) {
            return res.status(400).json({ success: false, message: 'Nothing to update' });
        }

        await User.updateMany(getLinkedAccountQuery(currentUser), { $set: update });

        const preferences = {
            enabled: typeof req.body.popupEnabled === 'boolean'
                ? req.body.popupEnabled
                : currentUser.preferences?.notificationPopup?.enabled !== false,
            snoozeUntil: Object.prototype.hasOwnProperty.call(update, 'preferences.notificationPopup.snoozeUntil')
                ? update['preferences.notificationPopup.snoozeUntil']
                : (currentUser.preferences?.notificationPopup?.snoozeUntil || null)
        };

        res.json({ success: true, notificationPopup: preferences });
    } catch (error) {
        console.error('Notification preference update error:', error);
        res.status(500).json({ success: false, message: 'Could not save notification preference' });
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

        // Keep profile photo consistent across all linked portals
        await syncLinkedPhoto(targetUser);

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
                preferences: targetUser.preferences,
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

            // Check if user has no data - allow editing to fill initial data
            const hasNoData = !currentUser.phone && !currentUser.city && !currentUser.address;

            if (!isBioEditingAllowed && !hasNoData) {
                // Profile editing is locked, but the core account fields
                // (name, phone, email, photo) must always stay editable.
                const filteredBody = {};
                if (req.body.name !== undefined) filteredBody.name = req.body.name;
                if (req.body.phone !== undefined) filteredBody.phone = req.body.phone;
                if (requestedEmail) filteredBody.email = requestedEmail;
                req.body = filteredBody;
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
            // Delete the previous image only when it lives under a different
            // Cloudinary public_id. Fixed public_ids (user_<id>) are overwritten
            // in place, so deleting here would remove the freshly uploaded file.
            if (currentUser.photo && extractPublicId(currentUser.photo) !== extractPublicId(req.file.path)) {
                await deleteCloudinaryImage(currentUser.photo);
            }
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
// @desc    Change user password (requires the current password)
// @access  Private
router.put('/change-password', protect, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword) {
            return res.status(400).json({ success: false, message: 'Please enter your current password.' });
        }

        if (typeof newPassword !== 'string' || newPassword.length < 4) {
            return res.status(400).json({ success: false, message: 'New password must be at least 4 characters' });
        }
        if (newPassword.length > 128) {
            return res.status(400).json({ success: false, message: 'Password is too long (max 128 characters)' });
        }

        const user = await User.findById(req.user.id).select('+password');
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const isMatch = await user.matchPassword(currentPassword);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
        }

        user.password = newPassword;
        await user.save();

        // Roll number is the shared identity across Student/Teacher/Intern/Job portals.
        const syncResult = await User.updateMany(
            { $and: [getLinkedAccountQuery(user), { _id: { $ne: user._id } }] },
            { $set: { password: newPassword } }
        );

        // The JWT fingerprint is derived from the password, so changing it invalidates
        // all old tokens (including this session). Return a fresh token so the current
        // session continues seamlessly while other sessions are forced to re-login.
        const freshToken = user.getSignedJwtToken('2h', Boolean(req.auth?.rememberMe));

        res.json({
            success: true,
            message: `Password updated for ${syncResult.modifiedCount + 1} linked portal account(s)`,
            token: freshToken,
        });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ==================== FORGOT PASSWORD ====================

// @route   GET /api/auth/test-email
// @desc    Debug route to test email sending
// @access  Admin only
router.get('/test-email', protect, authorize('admin'), async (req, res) => {
    try {
        console.log('Testing Email Configuration...');

        if (!isEmailConfigured()) {
            return res.status(500).json({
                success: false,
                message: 'No email method configured. Set EMAIL_USER+EMAIL_PASS in env.',
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
        const isSenderError = /sender|from|verified|valid|not found/i.test(errMsg + errBody);
        const isGmailAuthError = error.code === 'EAUTH' || error.responseCode === 535 || /invalid login|authentication failed/i.test(errMsg);

        let hint = '';
        if (isSenderError) hint = 'Verify sender email configuration in env.';
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
        const { email } = req.body || {};

        const genericSuccess = {
            success: true,
            message: 'If an account exists with this email, you will receive a password reset OTP shortly.',
        };

        if (typeof email !== 'string' || !email.trim()) {
            return res.status(400).json({ success: false, message: 'Please provide your email address' });
        }

        // Rate limiting (per IP + per email) to prevent email bombing.
        const ipKey = `fp:ip:${getClientIp(req)}`;
        const ipHit = rateLimit(ipKey, 10, 15 * 60 * 1000);
        if (!ipHit.allowed) return sendRateLimitResponse(res, ipHit.resetAt);

        const normalizedEmail = email.toLowerCase().trim();
        const emailHit = rateLimit(`fp:mail:${normalizedEmail}`, 5, 15 * 60 * 1000);
        if (!emailHit.allowed) return sendRateLimitResponse(res, emailHit.resetAt);

        // In production, fail loudly when email creds are placeholders/missing
        // instead of showing a fake "check your inbox" success that never delivers.
        // In development, fall back to returning the reset link so the flow stays testable.
        const isProd = process.env.NODE_ENV === 'production';
        const configIssue = getEmailConfigIssue();
        if (configIssue && isProd) {
            console.error(`❌ Forgot-password blocked: ${configIssue}`);
            return res.status(503).json({
                success: false,
                message: `Password reset email is temporarily unavailable. ${configIssue}`,
            });
        }
        if (configIssue) {
            console.warn(
                `⚠️ Forgot-password email disabled in dev (${configIssue}). Reset link will be returned instead.`
            );
        }

        const user = await User.findOne({ email: normalizedEmail }).sort({ updatedAt: -1 });

        if (!user) {
            return res.json(genericSuccess);
        }

        // Generate a 6-digit OTP (valid 15 minutes) and store only its hash.
        const otp = crypto.randomInt(0, 1000000).toString().padStart(6, '0');
        user.passwordResetToken = crypto.createHash('sha256').update(otp).digest('hex');
        user.passwordResetExpires = Date.now() + 15 * 60 * 1000;
        await user.save({ validateBeforeSave: false });

        // Dev fallback: no SMTP configured, so hand the OTP back directly.
        if (configIssue) {
            console.log(`🔑 [DEV] Password reset OTP for ${user.email}: ${otp}`);
            return res.json({
                ...genericSuccess,
                message: 'Email is not configured in development. Use the OTP below to reset the password.',
                devOtp: otp,
            });
        }

        const socialLinkStyle =
            'display:inline-block;margin:3px 4px;padding:8px 12px;border-radius:8px;background:#f3f4f6;color:#374151;text-decoration:none;font-size:12px;font-weight:bold;';
        const emailPayload = {
            to: user.email,
            subject: 'Your Adeeb Technology Lab password reset code',
            text: `Hello ${user.name},\n\nWe received a request to reset your password for your Adeeb Technology Lab account.\n\nYour One-Time Password (OTP) is: ${otp}\n\nThis OTP code is valid for 15 minutes.\n\nIf you did not request a password reset, please ignore this email or contact our support team.\n\n© 2026 Adeeb Technology Lab. Great People work with Adeeb Technology Lab.`,
            html: `
                <div style="font-family: Arial, Helvetica, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #f5f6f8;">
                    <div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 16px; overflow: hidden;">
                        <div style="background: linear-gradient(135deg, #ff8e01, #e67e00); padding: 28px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 22px;">Adeeb Technology Lab</h1>
                            <p style="margin: 6px 0 0; color: rgba(255,255,255,0.9); font-size: 13px; letter-spacing: 1px; text-transform: uppercase;">Password Reset OTP</p>
                        </div>
                        <div style="padding: 28px; color: #333333;">
                            <p style="margin: 0 0 12px; font-size: 15px;">Hello <strong>${user.name}</strong>,</p>
                            <p style="margin: 0 0 18px; font-size: 14px; line-height: 1.6; color: #555555;">
                                We received a request to reset your password for your <strong>Adeeb Technology Lab</strong> account. Please use the following One-Time Password (OTP) to proceed:
                            </p>
                            <div style="text-align: center; margin: 26px 0;">
                                <div style="display: inline-block; padding: 16px 28px; background: #fff7ed; border: 2px dashed #ff8e01; border-radius: 12px; letter-spacing: 10px; font-size: 32px; font-weight: bold; color: #1f2937;">${otp}</div>
                            </div>
                            <p style="margin: 0 0 16px; font-size: 14px; color: #555555;">For your security, this OTP code is valid for <strong>15 minutes</strong>.</p>
                            <p style="margin: 0 0 24px; font-size: 14px; line-height: 1.6; color: #555555;">
                                If you did not request a password reset, please ignore this email or reach out to our support team to secure your account.
                            </p>
                            <div style="text-align: center; margin: 24px 0 4px;">
                                <a href="https://wa.me/923092333121" style="display: inline-block; padding: 12px 22px; background: #25d366; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px;">Contact Support on WhatsApp</a>
                            </div>
                        </div>
                        <div style="padding: 22px 28px 28px; text-align: center; border-top: 1px solid #eeeeee; background: #fafafa;">
                            <p style="margin: 0 0 10px; font-size: 11px; color: #888888; text-transform: uppercase; letter-spacing: 1.5px; font-weight: bold;">Follow us</p>
                            <div style="margin: 0 0 16px;">
                                <a href="https://adeeb-technology-lab-website.vercel.app/" style="${socialLinkStyle}">Website</a>
                                <a href="https://web.facebook.com/AdeebTechnologyLab" style="${socialLinkStyle}">Facebook</a>
                                <a href="https://www.instagram.com/adeebtechlab/" style="${socialLinkStyle}">Instagram</a>
                                <a href="https://www.linkedin.com/company/AdeebTechnologyLab/" style="${socialLinkStyle}">LinkedIn</a>
                                <a href="https://x.com/AdeebTechLab" style="${socialLinkStyle}">X (Twitter)</a>
                                <a href="https://www.youtube.com/AdeebTechnologyLab" style="${socialLinkStyle}">YouTube</a>
                                <a href="https://www.tiktok.com/@adeebtechnologylab" style="${socialLinkStyle}">TikTok</a>
                                <a href="https://www.threads.com/@adeebtechlab" style="${socialLinkStyle}">Threads</a>
                                <a href="https://github.com/AdeebTechLab" style="${socialLinkStyle}">GitHub</a>
                                <a href="https://www.snapchat.com/@salmanadeeb02" style="${socialLinkStyle}">Snapchat</a>
                                <a href="https://www.pinterest.com/adeebtechnologylab/" style="${socialLinkStyle}">Pinterest</a>
                                <a href="https://www.whatsapp.com/channel/0029VaCeeBg4inos1Eqtbc43" style="${socialLinkStyle}">WhatsApp Channel</a>
                                <a href="mailto:info.AdeebTechLab@gmail.com" style="${socialLinkStyle}">Email</a>
                            </div>
                            <p style="margin: 0; font-size: 12px; color: #999999;">© 2026 Adeeb Technology Lab. All rights reserved.</p>
                            <p style="margin: 6px 0 0; font-size: 12px; color: #999999;">Great People work with Adeeb Technology Lab</p>
                        </div>
                    </div>
                </div>
            `,
        };

        // Bound the SMTP wait (was causing 30s+ timeouts / 502) and report the real
        // outcome to the user instead of always claiming success.
        try {
            await sendEmailWithTimeout(emailPayload, 10000);
            console.log(`🔑 Password reset email sent to ${user.email} (${user.role})`);
            return res.json(genericSuccess);
        } catch (err) {
            if (err.code === 'ETIMEOUT_MAIL') {
                console.warn(`⏳ Reset send still in progress for ${user.email}; returned "check your inbox".`);
                return res.json(genericSuccess);
            }

            const errBody = err.response?.data ? JSON.stringify(err.response.data) : '';
            console.error(`❌ Password reset email failed for ${user.email}:`, err.message, errBody);
            if (/sender|from|verified|valid|not found/i.test(err.message + errBody)) {
                console.error('🔴 SMTP fix: verify EMAIL_USER/EMAIL_FROM and Gmail App Password settings.');
            } else if (err.code === 'EAUTH' || /invalid login|authentication failed/i.test(err.message)) {
                console.error('🔴 Gmail SMTP fix: update EMAIL_PASS with a valid Gmail App Password.');
            }

            // Dev fallback: SMTP failed, but keep the flow usable by returning the OTP.
            if (!isProd) {
                console.log(`🔑 [DEV] Email failed; password reset OTP for ${user.email}: ${otp}`);
                return res.json({
                    ...genericSuccess,
                    message: 'Email could not be sent in development. Use the OTP below to reset the password.',
                    devOtp: otp,
                });
            }

            return res.status(502).json({
                success: false,
                message: 'The reset email could not be sent. Please try again in a minute or contact the administrator.',
            });
        }
    } catch (error) {
        console.error('Forgot password error:', error);

        return res.status(500).json({
            success: false,
            message: 'Could not send reset email. Please try again or contact support.',
        });
    }
});

// @route   GET /api/auth/reset-password/:token
// @desc    Check whether a reset token is still valid (used by the frontend page)
// @access  Public
router.get('/reset-password/:token', async (req, res) => {
    const ipHit = rateLimit(`rp:check:ip:${getClientIp(req)}`, 30, 15 * 60 * 1000);
    if (!ipHit.allowed) return sendRateLimitResponse(res, ipHit.resetAt);

    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
    const user = await User.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: { $gt: Date.now() }
    }).select('_id');

    res.json({
        success: true,
        valid: Boolean(user),
        message: user
            ? 'Reset link is valid.'
            : 'This reset link is invalid or has expired. Please request a new one.',
    });
});

// @route   POST /api/auth/reset-password/:token
// @desc    Reset password using token
// @access  Public
router.post('/reset-password/:token', async (req, res) => {
    try {
        const ipHit = rateLimit(`rp:post:ip:${getClientIp(req)}`, 20, 15 * 60 * 1000);
        if (!ipHit.allowed) return sendRateLimitResponse(res, ipHit.resetAt);

        const { password } = req.body || {};

        if (typeof password !== 'string' || !password.trim()) {
            return res.status(400).json({ success: false, message: 'Please enter a new password' });
        }
        if (password.length < 4) {
            return res.status(400).json({ success: false, message: 'Password must be at least 4 characters' });
        }
        if (password.length > 128) {
            return res.status(400).json({ success: false, message: 'Password is too long (max 128 characters)' });
        }

        // Hash the token from URL
        const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

        // Find user with valid token
        const user = await User.findOne({
            passwordResetToken: hashedToken,
            passwordResetExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ success: false, message: 'Invalid or expired reset link. Please request a new one.' });
        }

        // Update password for the current user instance
        user.password = password;
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save();

        // Synchronize through the person's global roll number (email is legacy fallback)
        // and clear the reset token on sibling accounts too (stale tokens would
        // otherwise grant a second, unwanted password change).
        const syncResult = await User.updateMany(
            {
                $and: [getLinkedAccountQuery(user), { _id: { $ne: user._id } }]
            },
            {
                $set: { password },
                $unset: { passwordResetToken: '', passwordResetExpires: '' }
            }
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

// @route   POST /api/auth/reset-password-otp
// @desc    Reset password using email + 6-digit OTP
// @access  Public
router.post('/reset-password-otp', async (req, res) => {
    try {
        const ipHit = rateLimit(`rp:otp:ip:${getClientIp(req)}`, 20, 15 * 60 * 1000);
        if (!ipHit.allowed) return sendRateLimitResponse(res, ipHit.resetAt);

        const { email, otp, password } = req.body || {};

        if (typeof email !== 'string' || !email.trim() || typeof otp !== 'string' || !otp.trim()) {
            return res.status(400).json({ success: false, message: 'Email and OTP are required' });
        }
        if (typeof password !== 'string' || !password.trim()) {
            return res.status(400).json({ success: false, message: 'Please enter a new password' });
        }
        if (password.length < 4) {
            return res.status(400).json({ success: false, message: 'Password must be at least 4 characters' });
        }
        if (password.length > 128) {
            return res.status(400).json({ success: false, message: 'Password is too long (max 128 characters)' });
        }

        const normalizedEmail = email.toLowerCase().trim();
        const emailHit = rateLimit(`rp:otp:mail:${normalizedEmail}`, 10, 15 * 60 * 1000);
        if (!emailHit.allowed) return sendRateLimitResponse(res, emailHit.resetAt);

        const hashedOtp = crypto.createHash('sha256').update(otp.trim()).digest('hex');
        const user = await User.findOne({
            email: normalizedEmail,
            passwordResetToken: hashedOtp,
            passwordResetExpires: { $gt: Date.now() },
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired OTP. Please request a new code.',
            });
        }

        user.password = password;
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save();

        const syncResult = await User.updateMany(
            {
                $and: [getLinkedAccountQuery(user), { _id: { $ne: user._id } }],
            },
            {
                $set: { password },
                $unset: { passwordResetToken: '', passwordResetExpires: '' },
            }
        );

        return res.json({
            success: true,
            message: `Password reset for ${syncResult.modifiedCount + 1} linked portal account(s). Please login with your new password.`,
        });
    } catch (error) {
        console.error('Reset password OTP error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/auth/email-status
// @desc    Check email configuration status (Admin diagnostic)
// @access  Public (shows config status only, no secrets)
router.get('/email-status', async (req, res) => {
    const configured = isEmailConfigured();
    const method = configured ? 'gmail-smtp' : 'none';
    const hasEmailUser = !!process.env.EMAIL_USER;
    const hasEmailPass = !!process.env.EMAIL_PASS;
    const hasEmailFrom = !!process.env.EMAIL_FROM;
    const isPlaceholder = /your_gmail|your_16_char|app_password|example\.com|xxxx/i.test(
        (process.env.EMAIL_USER || '') + (process.env.EMAIL_PASS || '')
    );
    const clientUrl = getClientUrl(req);
    const configIssue = getEmailConfigIssue();

    res.json({
        success: true,
        emailConfigured: configured,
        method,
        details: {
            EMAIL_USER: hasEmailUser ? (isPlaceholder ? 'PLACEHOLDER (not real)' : 'SET') : 'NOT SET',
            EMAIL_PASS: hasEmailPass ? (isPlaceholder ? 'PLACEHOLDER (not real)' : 'SET') : 'NOT SET',
            EMAIL_FROM: hasEmailFrom ? 'SET' : 'NOT SET',
        },
        resetLinkDomain: clientUrl,
        issue: configIssue
            ? `❌ ${configIssue}`
            : '✅ Email appears configured. If emails still fail, check server logs for errors.'
    });
});

// @route   POST /api/auth/test-email
// @desc    Test email configuration by sending a test email (Admin diagnostic)
// @access  Admin only (otherwise it is an open SMTP spam relay)
router.post('/test-email', protect, authorize('admin'), async (req, res) => {
    const { to } = req.body;
    if (!to) {
        return res.status(400).json({ success: false, message: 'Please provide a "to" email address' });
    }
    
    try {
        const info = await sendEmail({
            to,
            subject: 'Test Email from ATL Portal',
            text: 'This is a test email to verify configuration.',
            html: '<p>This is a test email to verify configuration.</p>'
        });
        res.json({ success: true, message: 'Test email sent successfully', info });
    } catch (error) {
        const errBody = error.response?.data ? error.response.data : null;
        res.status(500).json({ 
            success: false, 
            message: 'Failed to send test email', 
            error: error.message,
            details: errBody 
        });
    }
});

module.exports = router;

