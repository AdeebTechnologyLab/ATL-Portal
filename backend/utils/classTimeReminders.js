const User = require('../models/User');
const { sendPushNotification } = require('./pushNotifications');

const getPakistanTime = (date = new Date()) => {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Karachi',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    }).formatToParts(date);

    return {
        hour: Number(parts.find(part => part.type === 'hour')?.value),
        minute: Number(parts.find(part => part.type === 'minute')?.value)
    };
};

const parseClassStartTime = (classTime) => {
    if (!classTime || typeof classTime !== 'string') return null;

    // Supports values such as "Class 1 11AM", "3PM", and "11:00 AM to 01:00 PM".
    const match = classTime.toUpperCase().match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)\b/);
    if (!match) return null;

    let hour = Number(match[1]);
    const minute = Number(match[2] || 0);
    if (hour < 1 || hour > 12 || minute < 0 || minute > 59) return null;

    if (match[3] === 'AM') hour = hour === 12 ? 0 : hour;
    if (match[3] === 'PM') hour = hour === 12 ? 12 : hour + 12;

    return { hour, minute };
};

const getDashboardUrl = (role) => {
    if (role === 'teacher') return '/teacher/dashboard';
    if (role === 'intern') return '/intern/dashboard';
    return '/student/dashboard';
};

const sendClassTimeReminders = async (io, now = new Date()) => {
    const currentTime = getPakistanTime(now);
    const users = await User.find({
        role: { $in: ['student', 'intern', 'teacher'] },
        isVerified: true,
        classTime: { $exists: true, $nin: [null, ''] }
    }).select('_id name role classTime');

    const dueUsers = users.filter(user => {
        const assignedTime = parseClassStartTime(user.classTime);
        return assignedTime
            && assignedTime.hour === currentTime.hour
            && assignedTime.minute === currentTime.minute;
    });

    await Promise.all(dueUsers.map(async user => {
        const payload = {
            title: 'Class Time Reminder',
            body: `Your ${user.classTime} class is starting now. Please join on time.`,
            icon: '/logo.png',
            url: getDashboardUrl(user.role),
            tag: `class-time-${user._id}`
        };

        await sendPushNotification(user._id, payload);
        if (io) {
            io.to(user._id.toString()).emit('class_time_reminder', payload);
        }
    }));

    return { checked: users.length, sent: dueUsers.length };
};

module.exports = {
    getPakistanTime,
    parseClassStartTime,
    sendClassTimeReminders
};
