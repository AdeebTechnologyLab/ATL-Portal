const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const presenceUpdates = new Set();

// Protect routes - verify JWT token
const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const authenticatedUser = await User.findById(decoded.id).select('name email role rollNo isVerified password lastSeen');

            if (!authenticatedUser) {
                console.log(`❌ Auth failed: User not found for token`);
                return res.status(401).json({ success: false, message: 'User not found' });
            }

            if (!decoded.passwordFingerprint) {
                return res.status(401).json({ success: false, message: 'Session expired. Please login again.' });
            }

            const currentFingerprint = authenticatedUser.getPasswordFingerprint();
            const tokenFingerprint = String(decoded.passwordFingerprint);
            const fingerprintsMatch = currentFingerprint.length === tokenFingerprint.length
                && crypto.timingSafeEqual(Buffer.from(currentFingerprint), Buffer.from(tokenFingerprint));

            if (!fingerprintsMatch) {
                return res.status(401).json({ success: false, message: 'Password changed. Please login again.' });
            }

            if (authenticatedUser.role !== 'admin' && !authenticatedUser.isVerified) {
                return res.status(401).json({ success: false, message: 'Your account has been suspended by admin.' });
            }

            authenticatedUser.password = undefined;
            req.user = authenticatedUser;
            req.auth = decoded;

            // Coalesce simultaneous requests and update presence atomically.
            const now = new Date();
            const presenceKey = String(req.user._id);
            const cutoff = new Date(now - 2 * 60 * 1000);
            if ((!req.user.lastSeen || req.user.lastSeen < cutoff) && !presenceUpdates.has(presenceKey)) {
                presenceUpdates.add(presenceKey);
                Promise.resolve().then(() => User.findOneAndUpdate({
                    _id: req.user._id,
                    $or: [{ lastSeen: { $lt: cutoff } }, { lastSeen: null }],
                }, { $set: { lastSeen: now } }, { new: true }).select('_id lastSeen'))
                    .then(updatedUser => {
                        const io = req.app.get('io');
                        if (io && updatedUser) {
                            io.emit('user_status_update', {
                                userId: updatedUser._id.toString(),
                                lastSeen: updatedUser.lastSeen
                            });
                        }
                    })
                    .catch(err => console.error('Error updating lastSeen:', err.name))
                    .finally(() => presenceUpdates.delete(presenceKey));
            }

            if (process.env.NODE_ENV !== 'production') console.log(`🔐 Auth OK: ${req.user.name} (${req.user.role}) - ${req.method} ${req.originalUrl}`);
            next();
        } catch (error) {
            if (['JsonWebTokenError', 'TokenExpiredError', 'NotBeforeError'].includes(error.name)) {
                return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
            }
            if (/^(Mongo|Mongoose)/.test(error.name) || ['ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED'].includes(error.code)) {
                console.error('Authentication database lookup unavailable:', error.name);
                res.set('Retry-After', '3');
                return res.status(503).json({ success: false, code: 'DATABASE_UNAVAILABLE', message: 'The database is temporarily busy. Please try again shortly.' });
            }
            return next(error);
        }
    }

    if (!token) {
        console.log(`❌ Auth failed: No token provided for ${req.method} ${req.originalUrl}`);
        return res.status(401).json({ success: false, message: 'Not authorized, no token' });
    }
};

// Role-based access control
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            console.log(`🚫 Authorization denied - User role: '${req.user.role}', Required roles: [${roles.join(', ')}]`);
            return res.status(403).json({
                success: false,
                message: `Role '${req.user.role}' is not authorized to access this resource`
            });
        }
        next();
    };
};

module.exports = { protect, authorize };
