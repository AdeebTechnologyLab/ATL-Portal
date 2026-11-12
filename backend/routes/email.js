const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { sendEmailWithTimeout, isEmailConfigured, getEmailConfigIssue } = require('../utils/email');
const { buildBrandedEmail } = require('../utils/emailTemplates');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// @route   POST /api/email/send
// @desc    Send a branded notification email to a user
// @access  Admin / Teacher
router.post('/send', protect, authorize('admin', 'teacher'), async (req, res) => {
    try {
        const { to, subject, heading, message, body } = req.body || {};
        const emailBody = typeof message === 'string' ? message : typeof body === 'string' ? body : '';

        if (typeof to !== 'string' || !EMAIL_REGEX.test(to.trim())) {
            return res.status(400).json({ success: false, message: 'A valid recipient email is required' });
        }
        if (typeof subject !== 'string' || !subject.trim()) {
            return res.status(400).json({ success: false, message: 'Email subject is required' });
        }
        if (!emailBody.trim()) {
            return res.status(400).json({ success: false, message: 'Email message is required' });
        }

        if (!isEmailConfigured()) {
            return res.status(503).json({
                success: false,
                message: getEmailConfigIssue() || 'Email is not configured on the server.',
            });
        }

        const { html, text } = buildBrandedEmail({
            heading: typeof heading === 'string' && heading.trim() ? heading.trim() : subject.trim(),
            message: emailBody,
        });

        const info = await sendEmailWithTimeout(
            {
                to: to.trim(),
                subject: subject.trim(),
                html,
                text,
            },
            15000
        );

        return res.json({
            success: true,
            message: `Email sent successfully to ${to.trim()}`,
            messageId: info?.messageId,
        });
    } catch (error) {
        console.error('Send branded email error:', error);
        return res.status(502).json({
            success: false,
            message: error.message || 'Email could not be sent. Please try again.',
        });
    }
});

module.exports = router;
