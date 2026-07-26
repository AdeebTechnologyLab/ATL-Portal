/**
 * Desktop Notification Utility
 * Handles Notification API for desktop alerts
 */

/**
 * Request notification permission if not already granted
 */
export const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
        console.warn('This browser does not support desktop notifications');
        return false;
    }

    if (Notification.permission === 'granted') {
        return true;
    }

    if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
    }

    return false;
};

/**
 * Show desktop notification
 * @param {string} title - Notification title
 * @param {object} options - Notification options
 * @returns {Notification|null}
 */
export const showDesktopNotification = (title, options = {}) => {
    if (!('Notification' in window)) {
        console.warn('Desktop notifications not supported');
        return null;
    }

    if (Notification.permission !== 'granted') {
        console.warn('Notification permission not granted');
        return null;
    }

    const defaultOptions = {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'lms-notification',
        silent: false,
        requireInteraction: false,
        ...options
    };

    const notification = new Notification(title, defaultOptions);

    // Auto-close after 6 seconds
    if (!defaultOptions.requireInteraction) {
        setTimeout(() => notification.close(), 6000);
    }

    // Handle click
    if (options.onClick) {
        notification.onclick = () => {
            window.focus();
            options.onClick();
            notification.close();
        };
    }

    return notification;
};

/**
 * Show assignment notification
 * @param {string} courseName - Course name
 * @param {string} assignmentTitle - Assignment title
 * @param {function} onClickHandler - Callback when clicked
 */
export const showAssignmentNotification = (courseName, assignmentTitle, onClickHandler) => {
    showDesktopNotification(
        `New Assignment: ${courseName}`,
        {
            body: assignmentTitle || 'You have a new assignment',
            tag: 'assignment-notification',
            onClick: onClickHandler
        }
    );
};

/**
 * Show task notification (for interns)
 * @param {string} taskTitle - Task title
 * @param {function} onClickHandler - Callback when clicked
 */
export const showTaskNotification = (taskTitle, onClickHandler) => {
    showDesktopNotification(
        'New Task Assigned',
        {
            body: taskTitle || 'You have been assigned a new task',
            tag: 'task-notification',
            onClick: onClickHandler
        }
    );
};

/**
 * Show grading/result notification
 * @param {string} type - 'assignment', 'test', 'dailyTask'
 * @param {string} itemName - Name of assignment/test/task
 * @param {string} marks - Marks received
 * @param {function} onClickHandler - Callback when clicked
 */
export const showGradingNotification = (type, itemName, marks, onClickHandler) => {
    const typeLabel = {
        assignment: 'Assignment Graded',
        test: 'Test Submitted',
        dailyTask: 'Daily Task Graded',
        attendance: 'Attendance Marked'
    }[type] || 'Result Available';

    const body = marks ? `${itemName} - Marks: ${marks}` : itemName;

    showDesktopNotification(
        typeLabel,
        {
            body,
            tag: `${type}-notification`,
            onClick: onClickHandler
        }
    );
};

/**
 * Show attendance notification
 * @param {string} courseName - Course name
 * @param {string} status - 'PRESENT' or 'ABSENT'
 * @param {function} onClickHandler - Callback when clicked
 */
export const showAttendanceNotification = (courseName, status, onClickHandler) => {
    const body = `Attendance marked as ${status}`;
    showDesktopNotification(
        `Attendance: ${courseName}`,
        {
            body,
            tag: 'attendance-notification',
            onClick: onClickHandler
        }
    );
};

export default {
    requestNotificationPermission,
    showDesktopNotification,
    showAssignmentNotification,
    showTaskNotification,
    showGradingNotification,
    showAttendanceNotification
};
