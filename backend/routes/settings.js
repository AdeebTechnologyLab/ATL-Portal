const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const SystemSetting = require('../models/SystemSetting');

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

        res.json({ success: true, data: setting });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
