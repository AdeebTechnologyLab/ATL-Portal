const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const User = require('../models/User');
const SharedReport = require('../models/SharedReport');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 12 * 1024 * 1024 },
    fileFilter: (req, file, cb) => cb(null, file.mimetype === 'application/pdf')
});

router.post('/:role/:id/upload', protect, authorize('admin'), upload.single('report'), async (req, res) => {
    try {
        if (!['intern', 'student'].includes(req.params.role)) return res.status(400).json({ success: false, message: 'Invalid report role' });
        const reportUser = await User.findOne({ _id: req.params.id, role: req.params.role }).select('_id name');
        if (!reportUser) return res.status(404).json({ success: false, message: 'Student/Intern not found' });
        if (!req.file) return res.status(400).json({ success: false, message: 'PDF report is required' });

        const token = crypto.randomBytes(32).toString('hex');
        await SharedReport.create({
            token,
            user: reportUser._id,
            fileName: req.file.originalname,
            contentType: 'application/pdf',
            fileData: req.file.buffer,
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        });

        const downloadName = encodeURIComponent(req.file.originalname.endsWith('.pdf') ? req.file.originalname : `${req.file.originalname}.pdf`);
        res.json({ success: true, path: `/api/reports/shared/${token}/${downloadName}`, fileName: req.file.originalname, expiresIn: '30 days' });
    } catch (error) {
        console.error('Academic report upload error:', error);
        res.status(500).json({ success: false, message: 'Academic report upload failed' });
    }
});

router.get('/shared/:token/:fileName?', async (req, res) => {
    try {
        const report = await SharedReport.findOne({ token: req.params.token, expiresAt: { $gt: new Date() } });
        if (!report) return res.status(404).send('Report link is invalid or has expired.');
        const safeName = report.fileName.replace(/["\r\n]/g, '_');
        res.setHeader('Content-Type', report.contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
        res.setHeader('Content-Length', report.fileData.length);
        res.setHeader('Cache-Control', 'private, max-age=300');
        return res.end(report.fileData);
    } catch (error) {
        console.error('Academic report download error:', error);
        return res.status(500).send('Report download failed.');
    }
});

module.exports = router;
