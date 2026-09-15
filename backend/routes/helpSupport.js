const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const HelpSupport = require('../models/HelpSupport');
const { FAQ_HIGHLIGHTS, FAQ_SECTIONS } = require('../data/helpSupportFaq');

router.use(protect);

// GET /api/help-support - public, anyone can read
router.get('/', async (req, res) => {
    try {
        let data = await HelpSupport.findOne().sort({ updatedAt: -1 });
        if (!data) {
            // Seed with default data on first fetch
            data = await HelpSupport.create({
                highlights: FAQ_HIGHLIGHTS,
                sections: FAQ_SECTIONS.map(s => ({
                    id: s.id,
                    title: s.title,
                    titleEn: s.titleEn,
                    items: s.items.map(i => ({
                        id: i.id,
                        q: i.q,
                        a: i.a,
                        links: i.links || []
                    }))
                })),
                updatedBy: null
            });
        }
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// PUT /api/help-support - admin only
router.put('/', authorize('admin'), async (req, res) => {
    try {
        const { highlights, sections } = req.body;
        let data = await HelpSupport.findOne().sort({ updatedAt: -1 });
        if (!data) {
            data = new HelpSupport({ highlights: [], sections: [] });
        }
        if (highlights !== undefined) data.highlights = highlights;
        if (sections !== undefined) data.sections = sections;
        data.updatedBy = req.user.id;
        await data.save();
        res.json({ success: true, data });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

module.exports = router;
