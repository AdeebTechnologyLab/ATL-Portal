const express = require('express');
const router = express.Router();
const sanitizeHtml = require('sanitize-html');
const { protect, authorize } = require('../middleware/auth');
const { requireScreenAccess } = require('../middleware/screenAccess');
const Notification = require('../models/Notification');
const SystemSetting = require('../models/SystemSetting');
const { sendToAll, sendToRole } = require('../utils/pushHelper');

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const toAMPM = (time24) => {
    if (!time24) return time24;
    const [h, m] = time24.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
};

// Sanitization options for HTML content - expanded to support CSS styling
const sanitizeOptions = {
    allowedTags: ['p', 'br', 'strong', 'em', 'b', 'i', 'u', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'a', 'span', 'div', 'img', 'blockquote', 'code', 'pre', 'hr', 'table', 'thead', 'tbody', 'tr', 'th', 'td'],
    allowedAttributes: {
        'a': ['href', 'target', 'rel', 'style'],
        'span': ['style', 'class'],
        'div': ['style', 'class'],
        'p': ['style', 'class'],
        'h1': ['style', 'class'],
        'h2': ['style', 'class'],
        'h3': ['style', 'class'],
        'h4': ['style', 'class'],
        'h5': ['style', 'class'],
        'h6': ['style', 'class'],
        'img': ['src', 'alt', 'style', 'width', 'height'],
        'table': ['style', 'class'],
        'td': ['style', 'class'],
        'th': ['style', 'class'],
        'tr': ['style', 'class']
    },
    allowedStyles: {
        '*': {
            // Colors
            'color': [/.*/],
            'background-color': [/.*/],
            'background': [/.*/],
            // Text
            'font-size': [/.*/],
            'font-weight': [/.*/],
            'font-family': [/.*/],
            'text-align': [/^left$/, /^right$/, /^center$/, /^justify$/],
            'text-decoration': [/.*/],
            'line-height': [/.*/],
            // Spacing
            'padding': [/.*/],
            'padding-top': [/.*/],
            'padding-bottom': [/.*/],
            'padding-left': [/.*/],
            'padding-right': [/.*/],
            'margin': [/.*/],
            'margin-top': [/.*/],
            'margin-bottom': [/.*/],
            'margin-left': [/.*/],
            'margin-right': [/.*/],
            // Border
            'border': [/.*/],
            'border-radius': [/.*/],
            'border-color': [/.*/],
            'border-width': [/.*/],
            'border-style': [/.*/],
            // Display & Layout
            'display': [/.*/],
            'width': [/.*/],
            'max-width': [/.*/],
            'height': [/.*/],
            'max-height': [/.*/]
        }
    }
};

// @route   GET /api/notifications/active
// @desc    Get active notifications for the current time and user role
// @access  Private (All roles)
router.get('/active', protect, async (req, res) => {
    try {
        const now = new Date();
        const userRole = req.user.role;
        const userLocation = (req.user.location || '').toLowerCase();

        // Fetch DB notifications
        const dbNotifications = await Notification.find({
            isActive: true,
            $or: [
                { showLifetime: true },
                {
                    startDate: { $lte: now },
                    endDate: { $gte: now }
                }
            ],
            targetAudience: { $in: ['all', userRole] },
            targetLocation: { $in: ['all', 'both', userLocation] }
        }).sort('-createdAt');

        let notifications = dbNotifications;

        // Skip schedule notifications for job role
        if (userRole !== 'job') {
            const scheduleNotifications = [];

            // For teachers, show BOTH Student and Intern time tables
            // For students, show only Student time table
            // For interns, show only Intern time table
            const rolesToShow = (userRole === 'teacher')
                ? [{ key: 'student', label: 'Student', classTimeKey: 'student_class_slots', holidayKey: 'studentHolidayDays' },
                   { key: 'intern', label: 'Internship', classTimeKey: 'intern_class_slots', holidayKey: 'internHolidayDays' }]
                : [{ key: userRole, label: userRole === 'intern' ? 'Internship' : 'Student', classTimeKey: userRole === 'intern' ? 'intern_class_slots' : 'student_class_slots', holidayKey: userRole === 'intern' ? 'internHolidayDays' : 'studentHolidayDays' }];

            for (const roleConfig of rolesToShow) {
                let [classTimeSetting, offDaysSetting] = await Promise.all([
                    SystemSetting.findOne({ key: roleConfig.classTimeKey }),
                    SystemSetting.findOne({ key: roleConfig.holidayKey })
                ]);

                // Fallback to legacy keys if role-specific keys have no data
                if (!classTimeSetting) {
                    classTimeSetting = await SystemSetting.findOne({ key: 'class_time_slots' });
                }
                if (!offDaysSetting) {
                    offDaysSetting = await SystemSetting.findOne({ key: 'globalHolidayDays' });
                }

                const hasSlots = classTimeSetting && Array.isArray(classTimeSetting.value) && classTimeSetting.value.length > 0;
                const hasOffDays = offDaysSetting && Array.isArray(offDaysSetting.value);

                if (hasSlots || hasOffDays) {
                    let messageHtml = '';

                    // Class Time Slots section
                    if (hasSlots) {
                        const slotList = classTimeSetting.value.map((s, i) => {
                            const slot = typeof s === 'object' ? `${s.name} (${toAMPM(s.startTime)} - ${toAMPM(s.endTime)}) ${s.mode === 'online' ? 'Online' : 'On-Site'}` : s;
                            return `<li style="margin-bottom:4px;">${slot}</li>`;
                        }).join('');
                        messageHtml += `<p style="margin-bottom:8px;">Current <strong>Class Time Slots</strong>:</p><ul style="padding-left:18px;margin:0;">${slotList}</ul>`;
                    }

                    // Weekly Off Days section
                    if (hasOffDays) {
                        const offDayNames = offDaysSetting.value.map(d => DAY_NAMES[d]).filter(Boolean);
                        const dayBadges = DAY_NAMES.map((name, i) => {
                            const isOff = offDaysSetting.value.includes(i);
                            return `<span style="display:inline-block;padding:4px 10px;margin:3px;border-radius:8px;font-size:12px;font-weight:bold;${isOff ? 'background:#fed7aa;color:#c2410c;border:1px solid #fb923c;' : 'background:#e5e7eb;color:#6b7280;border:1px solid #d1d5db;'}">${name.substring(0, 3).toUpperCase()}</span>`;
                        }).join('');
                        messageHtml += `<p style="margin-top:12px;margin-bottom:8px;"><strong>Weekly Off Days</strong>:</p><div style="margin:10px 0;">${dayBadges}</div><p style="font-size:12px;color:#666;">Off days: <strong>${offDayNames.length > 0 ? offDayNames.join(', ') : 'None'}</strong></p>`;
                    }

                    messageHtml += `<p style="margin-top:8px;font-size:12px;color:#666;">Please check your schedule.</p>`;

                    scheduleNotifications.push({
                        _id: `schedule-combined-${roleConfig.key}`,
                        title: `📢 ${roleConfig.label} Time Table`,
                        message: messageHtml,
                        type: 'blue',
                        isHtml: true,
                        createdAt: new Date()
                    });
                }
            }

            notifications = [...scheduleNotifications, ...dbNotifications];
        }

        res.json({ success: true, data: notifications });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/notifications
// @desc    Get all notifications (Admin)
// @access  Private (Admin)
router.get('/', protect, requireScreenAccess('notification_management'), async (req, res) => {
    try {
        const notifications = await Notification.find().sort('-createdAt');
        res.json({ success: true, data: notifications });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   POST /api/notifications
// @desc    Create a notification (Admin)
// @access  Private (Admin)
router.post('/', protect, authorize('admin'), async (req, res) => {
    try {
        const { title, message, type, startDate, endDate, isHtml, showLifetime, isActive, targetAudience, targetLocation } = req.body;

        // Sanitize message if HTML is enabled
        const sanitizedMessage = message;

        const notificationData = {
            title,
            message: sanitizedMessage,
            type,
            isHtml: isHtml || false,
            showLifetime: showLifetime || false,
            isActive: isActive !== undefined ? isActive : true,
            targetAudience: targetAudience || ['all'],
            targetLocation: targetLocation || ['both'],
            createdBy: req.user.id
        };

        // Only add dates if not showing lifetime
        if (!showLifetime) {
            notificationData.startDate = startDate;
            notificationData.endDate = endDate;
        }

        const notification = await Notification.create(notificationData);

        // Send push notifications if active
        if (notification.isActive) {
            const payload = {
                title: 'New Announcement 📢',
                body: notification.title,
                icon: '/logo.png',
                url: '/'
            };

            if (targetAudience.includes('all')) {
                sendToAll(payload);
            } else {
                targetAudience.forEach(role => sendToRole(role, payload));
            }
        }

        res.status(201).json({ success: true, data: notification });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   PUT /api/notifications/:id
// @desc    Update a notification (Admin)
// @access  Private (Admin)
router.put('/:id', protect, authorize('admin'), async (req, res) => {
    try {
        let notification = await Notification.findById(req.params.id);

        if (!notification) {
            return res.status(404).json({ success: false, message: 'Notification not found' });
        }

        // No sanitization - allow admin to paste full code as requested
        if (req.body.isHtml && req.body.message) {
            // No action needed, keep as is
        }

        // If switching to lifetime, clear dates
        if (req.body.showLifetime) {
            req.body.startDate = undefined;
            req.body.endDate = undefined;
        }

        notification = await Notification.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        res.json({ success: true, data: notification });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   DELETE /api/notifications/:id
// @desc    Delete a notification (Admin)
// @access  Private (Admin)
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
    try {
        const notification = await Notification.findById(req.params.id);

        if (!notification) {
            return res.status(404).json({ success: false, message: 'Notification not found' });
        }

        await notification.deleteOne();

        res.json({ success: true, message: 'Notification removed' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
