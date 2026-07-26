const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const RegistrationPage = require('../models/RegistrationPage');

// Default data for each form type
const defaultData = {
    student: {
        formType: 'student',
        announcement: {
            heading: 'Announcements',
            text: 'Empowering Pakistan through digital learning and professional training.'
        },
        statusInfo: {
            label: 'Status',
            value: 'Open',
            valueColor: 'green',
            dateLabel: 'Last Date',
            dateValue: 'Always Open'
        },
        typeBadge: { text: 'Type: On-Site / Remote', color: 'primary' },
        sections: [
            {
                title: 'What We Offer',
                type: 'list',
                items: ['Practical Learning', 'Daily Expert Classes', 'Real Market Skills', 'Recognized Certificates']
            },
            {
                title: 'Courses Offered',
                type: 'grid',
                items: ['Web Development (React, JS)', 'Graphic Designing (PS, AI)', 'App Development (Flutter)', 'Digital Marketing & SEO', 'Computer Basics & Office', 'Freelancing & E-Commerce']
            },
            {
                title: 'Program Benefits',
                type: 'list',
                items: ['Learn with Professionals', 'Hands-On Project Work', 'Career & Portfolio Support', 'Online Resources Access']
            }
        ]
    },
    intern: {
        formType: 'intern',
        announcement: {
            heading: 'Announcement',
            text: 'Launch your tech career with hands-on experience!'
        },
        statusInfo: {
            label: 'Status',
            value: 'Open',
            valueColor: 'green',
            dateLabel: 'Last Date',
            dateValue: '06/06/2026'
        },
        typeBadge: { text: 'Type: On-Site / Remote', color: 'blue' },
        sections: [
            {
                title: 'Internship Requirements',
                type: 'list',
                items: ['Personal Laptop', 'Home Wi-Fi']
            },
            {
                title: 'Internship Fields Include',
                type: 'grid',
                items: ['Office Work (IT)', 'Social Media Marketing', 'Graphic Designing', 'Video Editing', 'Web, App & Software Development', 'Team Management']
            },
            {
                title: 'Internship Benefits',
                type: 'list',
                items: ['Work on real projects', 'Learn industry skills', 'Internship Certificate', 'Online & On-Site Available']
            }
        ]
    },
    job: {
        formType: 'job',
        announcement: {
            heading: 'Job Application Form',
            text: 'Applications are currently open!'
        },
        statusInfo: {
            label: 'Status',
            value: 'Open',
            valueColor: 'green',
            dateLabel: 'Last Date To Apply',
            dateValue: 'Always Open'
        },
        typeBadge: { text: 'Type: On-Site / Remote', color: 'fuchsia' },
        sections: [
            {
                title: 'Why Join Our Team?',
                type: 'list',
                items: ['Teach in Professional Environment', 'Get Paid for Each Course', 'Build Career with Adeeb Tech Lab', 'Teach Online or On-Site']
            },
            {
                title: 'Teaching Fields Available',
                type: 'grid',
                items: ['Web Development', 'Artificial Intelligence', 'Digital Marketing', 'Graphic Design', 'IELTS & Communication', 'Taxation & E-Commerce']
            }
        ]
    },
    teacher: {
        formType: 'teacher',
        announcement: {
            heading: 'Job Application Form',
            text: 'Hiring is closed Now!'
        },
        statusInfo: {
            label: 'Status',
            value: 'Closed',
            valueColor: 'red',
            dateLabel: 'Last Date To Apply',
            dateValue: '22/04/2026'
        },
        typeBadge: { text: 'Type: On-Site / Remote', color: 'primary' },
        sections: [
            {
                title: 'Why Join Our Team?',
                type: 'list',
                items: ['Teach in Professional Environment', 'Get Paid for Each Course', 'Build Career with Adeeb Tech Lab', 'Teach Online or On-Site']
            },
            {
                title: 'Teaching Fields Available',
                type: 'grid',
                items: ['Web Development', 'Artificial Intelligence', 'Digital Marketing', 'Graphic Design', 'IELTS & Communication', 'Taxation & E-Commerce']
            }
        ]
    }
};

// @route   GET /api/registration-pages
// @desc    Get all registration pages content
// @access   Public
router.get('/', async (req, res) => {
    try {
        let pages = await RegistrationPage.find();

        // If no pages exist, seed with defaults
        if (pages.length === 0) {
            pages = await RegistrationPage.insertMany(Object.values(defaultData));
        }

        // Convert to map: { student: {...}, intern: {...}, ... }
        const pagesMap = {};
        pages.forEach(p => { pagesMap[p.formType] = p; });

        res.json({ success: true, data: pagesMap });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/registration-pages/:formType
// @desc    Get single registration page content
// @access   Public
router.get('/:formType', async (req, res) => {
    try {
        const { formType } = req.params;

        let page = await RegistrationPage.findOne({ formType });

        // If not found, create from defaults
        if (!page) {
            page = await RegistrationPage.create(defaultData[formType] || defaultData.student);
        }

        res.json({ success: true, data: page });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   PUT /api/registration-pages/:formType
// @desc    Update registration page content
// @access   Private (Admin only)
router.put('/:formType', protect, authorize('admin'), async (req, res) => {
    try {
        const { formType } = req.params;
        const updateData = req.body;

        const page = await RegistrationPage.findOneAndUpdate(
            { formType },
            { ...updateData, updatedBy: req.user.id },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );

        res.json({ success: true, data: page });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   PUT /api/registration-pages
// @desc    Update all registration pages at once
// @access   Private (Admin only)
router.put('/', protect, authorize('admin'), async (req, res) => {
    try {
        const { pages } = req.body;

        const operations = Object.entries(pages).map(([formType, data]) => ({
            updateOne: {
                filter: { formType },
                update: { ...data, updatedBy: req.user.id },
                upsert: true
            }
        }));

        await RegistrationPage.bulkWrite(operations);

        res.json({ success: true, message: 'All pages updated successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
