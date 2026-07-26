const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const LiveClass = require('../models/LiveClass');
const Enrollment = require('../models/Enrollment');

// @route   POST /api/live-class
// @desc    Create a new live class
// @access  Private (Teacher, Admin)
router.post('/', protect, authorize('teacher', 'admin'), async (req, res) => {
    try {
        const { title, link, description, visibility, courseId, autoEndMinutes } = req.body;

        if (!title || !link) {
            return res.status(400).json({ success: false, message: 'Title and link are required' });
        }

        const liveClass = await LiveClass.create({
            title,
            link,
            description,
            visibility: visibility || 'all',
            course: courseId || null,
            createdBy: req.user.id,
            isActive: true,
            startTime: new Date(),
            autoEndMinutes: autoEndMinutes ? parseInt(autoEndMinutes) : null
        });

        // Emit socket event to notify students/interns
        const io = req.app.get('io');
        if (io) {
            io.emit('live_class_started', {
                id: liveClass._id,
                title: liveClass.title,
                visibility: liveClass.visibility
            });
        }

        res.status(201).json({ success: true, data: liveClass });
    } catch (error) {
        console.error('Error creating live class:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/live-class
// @desc    Get all live classes (for teacher/admin)
// @access  Private (Teacher, Admin)
router.get('/', protect, authorize('teacher', 'admin'), async (req, res) => {
    try {
        let liveClasses = await LiveClass.find({ createdBy: req.user.id })
            .populate('createdBy', 'name')
            .populate('course', 'title')
            .sort('-createdAt');

        const now = new Date();
        liveClasses = liveClasses.filter(lc => {
            if (!lc.isActive || !lc.autoEndMinutes) return true;
            const expiresAt = new Date(lc.startTime.getTime() + lc.autoEndMinutes * 60 * 1000);
            return now < expiresAt;
        });

        res.json({ success: true, data: liveClasses });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/live-class/active
// @desc    Get active live classes for students/interns
// @access  Private (Student, Intern)
router.get('/active', protect, async (req, res) => {
    try {
        const userId = req.user.id;
        const userRole = req.user.role;

        // Check if user has at least one active enrollment
        const activeEnrollment = await Enrollment.findOne({
            user: userId,
            status: { $in: ['enrolled', 'pending'] }
        });

        if (!activeEnrollment) {
            return res.json({ success: true, data: [] });
        }

        // Build visibility query based on user role
        let visibilityQuery = { isActive: true };
        
        if (userRole === 'student') {
            visibilityQuery.visibility = { $in: ['all', 'student'] };
        } else if (userRole === 'intern') {
            visibilityQuery.visibility = { $in: ['all', 'intern'] };
        } else {
            // For other roles, show all active classes
            visibilityQuery.visibility = 'all';
        }

        let liveClasses = await LiveClass.find(visibilityQuery)
            .populate('createdBy', 'name photo')
            .populate('course', 'title')
            .sort('-createdAt');

        const now = new Date();
        liveClasses = liveClasses.filter(lc => {
            if (!lc.isActive || !lc.autoEndMinutes) return true;
            const expiresAt = new Date(lc.startTime.getTime() + lc.autoEndMinutes * 60 * 1000);
            return now < expiresAt;
        });

        res.json({ success: true, data: liveClasses });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   PUT /api/live-class/:id
// @desc    Update live class
// @access  Private (Teacher, Admin)
router.put('/:id', protect, authorize('teacher', 'admin'), async (req, res) => {
    try {
        const { title, link, description, visibility, isActive } = req.body;

        const liveClass = await LiveClass.findById(req.params.id);
        if (!liveClass) {
            return res.status(404).json({ success: false, message: 'Live class not found' });
        }

        // Check ownership (admin can update any)
        if (req.user.role !== 'admin' && liveClass.createdBy.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        const updated = await LiveClass.findByIdAndUpdate(
            req.params.id,
            { 
                title, 
                link, 
                description, 
                visibility,
                isActive,
                ...(isActive === false ? { endTime: new Date() } : {})
            },
            { new: true }
        );

        // Notify if class ended
        if (isActive === false) {
            const io = req.app.get('io');
            if (io) {
                io.emit('live_class_ended', { id: liveClass._id, link: liveClass.link });
            }
        }

        res.json({ success: true, data: updated });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   DELETE /api/live-class/:id
// @desc    Delete/End live class
// @access  Private (Teacher, Admin)
router.delete('/:id', protect, authorize('teacher', 'admin'), async (req, res) => {
    try {
        const liveClass = await LiveClass.findById(req.params.id);
        if (!liveClass) {
            return res.status(404).json({ success: false, message: 'Live class not found' });
        }

        // Check ownership (admin can delete any)
        if (req.user.role !== 'admin' && liveClass.createdBy.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        await liveClass.deleteOne();

        // Notify clients
        const io = req.app.get('io');
        if (io) {
            io.emit('live_class_ended', { id: req.params.id, link: liveClass.link });
        }

        res.json({ success: true, message: 'Live class ended and removed' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   PUT /api/live-class/:id/end
// @desc    End a live class (set isActive to false)
// @access  Private (Teacher, Admin)
router.put('/:id/end', protect, authorize('teacher', 'admin'), async (req, res) => {
    try {
        const liveClass = await LiveClass.findById(req.params.id);
        if (!liveClass) {
            return res.status(404).json({ success: false, message: 'Live class not found' });
        }

        // Check ownership
        if (req.user.role !== 'admin' && liveClass.createdBy.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        liveClass.isActive = false;
        liveClass.endTime = new Date();
        await liveClass.save();

        // Notify clients
        const io = req.app.get('io');
        if (io) {
            io.emit('live_class_ended', { id: liveClass._id, link: liveClass.link });
        }

        res.json({ success: true, message: 'Live class ended', data: liveClass });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   DELETE /api/live-class/cleanup-expired
// @desc    Delete all expired auto-end live classes (called by frontend polling)
// @access  Private (Teacher, Admin)
router.delete('/cleanup-expired', protect, authorize('teacher', 'admin'), async (req, res) => {
    try {
        const now = new Date();
        // Find active classes that have an autoEndMinutes set
        const classesWithTimer = await LiveClass.find({
            isActive: true,
            autoEndMinutes: { $ne: null }
        });

        const toDelete = classesWithTimer.filter(lc => {
            const expiresAt = new Date(lc.startTime.getTime() + lc.autoEndMinutes * 60 * 1000);
            return now >= expiresAt;
        });

        const io = req.app.get('io');
        for (const lc of toDelete) {
            await lc.deleteOne();
            if (io) io.emit('live_class_ended', { id: lc._id.toString() });
        }

        res.json({ success: true, deleted: toDelete.length });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
