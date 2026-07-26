const webpush = require('web-push');
const User = require('../models/User');

// Configure web-push
const configureWebPush = () => {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;

    if (!publicKey || !privateKey) {
        console.warn('VAPID keys are not set. Push notifications will not work.');
        return false;
    }

    webpush.setVapidDetails(
        'mailto:adeebtechnologylab@gmail.com',
        publicKey,
        privateKey
    );
    return true;
};

/**
 * Send a push notification to a specific user
 * @param {string} userId - ID of the user to notify
 * @param {Object} payload - { title, body, icon, url }
 */
const sendPushNotification = async (userId, payload) => {
    try {
        if (!configureWebPush()) return;

        const user = await User.findById(userId);
        if (!user || !user.pushSubscriptions || user.pushSubscriptions.length === 0) {
            return;
        }

        const notificationPayload = JSON.stringify({
            title: payload.title || 'LMS Notification',
            body: payload.body || 'You have a new update',
            icon: payload.icon || '/logo.png',
            url: payload.url || '/',
            tag: payload.tag || undefined
        });

        // Send to all subscriptions for this user
        const results = await Promise.allSettled(
            user.pushSubscriptions.map(sub => 
                webpush.sendNotification(sub, notificationPayload)
            )
        );

        // Clean up invalid/expired subscriptions
        let needsUpdate = false;
        const validSubscriptions = user.pushSubscriptions.filter((sub, index) => {
            const result = results[index];
            if (result.status === 'rejected' && (result.reason.statusCode === 410 || result.reason.statusCode === 404)) {
                needsUpdate = true;
                return false;
            }
            return true;
        });

        if (needsUpdate) {
            user.pushSubscriptions = validSubscriptions;
            await user.save();
        }

    } catch (error) {
        console.error('Error sending push notification:', error);
    }
};

/**
 * Send notification to all users with a specific role
 * @param {string} role - 'student', 'teacher', 'intern', etc.
 * @param {Object} payload - { title, body, icon, url }
 */
const sendToRole = async (role, payload) => {
    try {
        const users = await User.find({ role, isVerified: true });
        await Promise.all(users.map(user => sendPushNotification(user._id, payload)));
    } catch (error) {
        console.error(`Error sending to role ${role}:`, error);
    }
};

/**
 * Send notification to ALL users
 */
const sendToAll = async (payload) => {
    try {
        const users = await User.find({ isVerified: true });
        await Promise.all(users.map(user => sendPushNotification(user._id, payload)));
    } catch (error) {
        console.error('Error sending to all users:', error);
    }
};

module.exports = {
    sendPushNotification,
    sendToRole,
    sendToAll
};
