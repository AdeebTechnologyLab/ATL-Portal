const express = require('express');
const router = express.Router();
const sanitizeHtml = require('sanitize-html');
const { protect, authorize } = require('../middleware/auth');
const Notification = require('../models/Notification');
const { sendToAll, sendToRole } = require('../utils/pushHelper');

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
        const userRole = req.user.role; // Assumes user is attached by protect middleware
        const userLocation = (req.user.location || '').toLowerCase();

        const notifications = await Notification.find({
            isActive: true,
            $or: [
                { showLifetime: true },
                {
                    startDate: { $lte: now },
                    endDate: { $gte: now }
                }
            ],
            // Filter by target audience: either 'all' or explicitly includes user's role
            targetAudience: { $in: ['all', userRole] },
            targetLocation: { $in: ['all', 'both', userLocation] }
        }).sort('-createdAt');

        res.json({ success: true, data: notifications });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/notifications
// @desc    Get all notifications (Admin)
// @access  Private (Admin)
router.get('/', protect, authorize('admin'), async (req, res) => {
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
