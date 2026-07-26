const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');

// Protect routes - verify JWT token
const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const authenticatedUser = await User.findById(decoded.id).select('+password');

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

            // Update lastSeen (debounced to 2 mins)
            const now = new Date();
            if (!req.user.lastSeen || (now - req.user.lastSeen) > 2 * 60 * 1000) {
                User.findByIdAndUpdate(req.user._id, { lastSeen: now }, { new: true })
                    .then(updatedUser => {
                        const io = req.app.get('io');
                        if (io) {
                            io.emit('user_status_update', {
                                userId: updatedUser._id.toString(),
                                lastSeen: updatedUser.lastSeen
                            });
                        }
                    })
                    .catch(err => console.error('Error updating lastSeen:', err));
            }

            console.log(`🔐 Auth OK: ${req.user.name} (${req.user.role}) - ${req.method} ${req.originalUrl}`);
            next();
        } catch (error) {
            console.log(`❌ Auth failed: Token verification error - ${error.message}`);
            return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
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
