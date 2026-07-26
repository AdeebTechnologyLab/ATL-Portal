const webpush = require('web-push');
const User = require('../models/User');

// Configure web-push only if keys are present
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
        'mailto:info.AdeebTchLab@gmail.com',
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
    );
}

/**
 * Send a web push notification to a user's subscribed devices
 * @param {string} userId - ID of the recipient user
 * @param {object} payload - Data to send (title, body, url, etc.)
 */
const sendPushNotification = async (userId, payload) => {
    try {
        if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
            console.warn('⚠️ Push notifications disabled: VAPID keys missing in environment');
            return;
        }

        const user = await User.findById(userId);
        if (!user || !user.pushSubscriptions || user.pushSubscriptions.length === 0) {
            // User has no active push subscriptions
            return;
        }

        const payloadString = JSON.stringify(payload);
        const expiredSubscriptions = [];

        // Send to all registered devices for this user
        const pushPromises = user.pushSubscriptions.map(async (subscription, index) => {
            try {
                await webpush.sendNotification(subscription, payloadString);
            } catch (error) {
                // If subscription has expired or is invalid (e.g. 410 Gone or 404 Not Found)
                if (error.statusCode === 410 || error.statusCode === 404) {
                    console.log(`🗑️ Removing expired push subscription for user ${user.email}`);
                    expiredSubscriptions.push(subscription.endpoint);
                } else {
                    console.error(`❌ Push notification error for ${user.email}:`, error);
                }
            }
        });

        await Promise.allSettled(pushPromises);

        // Clean up expired subscriptions from the database
        if (expiredSubscriptions.length > 0) {
            await User.findByIdAndUpdate(userId, {
                $pull: { pushSubscriptions: { endpoint: { $in: expiredSubscriptions } } }
            });
        }
    } catch (err) {
        console.error('Error in sendPushNotification helper:', err);
    }
};

/**
 * Send notification to all users with a specific role
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
