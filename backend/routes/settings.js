const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const SystemSetting = require('../models/SystemSetting');
const Notification = require('../models/Notification');

// Helper: create or update a schedule notification
const upsertScheduleNotification = async (title, message, type, color, userId) => {
    try {
        const existing = await Notification.findOne({ title, isActive: true });
        if (existing) {
            existing.message = message;
            existing.type = color;
            existing.updatedAt = new Date();
            await existing.save();
        } else {
            await Notification.create({
                title,
                message,
                type: color,
                isHtml: true,
                showLifetime: true,
                isActive: true,
                targetAudience: ['student', 'intern', 'teacher'],
                targetLocation: ['both'],
                createdBy: userId
            });
        }
    } catch (err) {
        console.error('Failed to upsert schedule notification:', err.message);
    }
};

// @route   GET /api/settings
// @desc    Get all settings (Admin only for full list, but public keys can be fetched individually)
// @access  Private
router.get('/', protect, async (req, res) => {
    try {
        const settings = await SystemSetting.find({});
        // Convert to object for easier frontend consumption: { key: value }
        const settingsMap = settings.reduce((acc, curr) => {
            acc[curr.key] = curr.value;
            return acc;
        }, {});
        res.json({ success: true, data: settingsMap });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   PUT /api/settings/:key
// @desc    Update a system setting
// @access  Private (Admin only)
router.put('/:key', protect, authorize('admin'), async (req, res) => {
    try {
        const { key } = req.params;
        const { value } = req.body;

        const setting = await SystemSetting.findOneAndUpdate(
            { key },
            {
                value,
                updatedBy: req.user.id
            },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );

        // Auto-create notification for class time slots update
        if (key === 'class_time_slots' && Array.isArray(value)) {
            const slotList = value.map((s, i) => `<li style="margin-bottom:4px;"><strong>Slot ${i + 1}:</strong> ${s}</li>`).join('');
            const message = `<p style="margin-bottom:8px;">Admin has updated the <strong>Class Time Slots</strong>:</p><ul style="padding-left:18px;margin:0;">${slotList}</ul><p style="margin-top:8px;font-size:12px;color:#666;">Please check your assigned slot.</p>`;
            await upsertScheduleNotification('📢 Class Time Slots Updated', message, 'Schedule Update', 'blue', req.user.id);
        }

        res.json({ success: true, data: setting });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
