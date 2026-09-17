const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const TeacherScreenAssignment = require('../models/TeacherScreenAssignment');
const User = require('../models/User');
const ASSIGNABLE_SCREENS = require('../config/assignableScreens');

router.use(protect);

// GET /api/teacher-screen-assignments - Get all assignments (admin)
router.get('/', authorize('admin'), async (req, res) => {
    try {
        const assignments = await TeacherScreenAssignment.find()
            .populate('teacher', 'name email rollNo photo role')
            .populate('assignedBy', 'name')
            .sort('-createdAt');
        res.json({ success: true, data: assignments });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// GET /api/teacher-screen-assignments/my - Get current teacher's assigned screens
router.get('/my', authorize('teacher'), async (req, res) => {
    try {
        const assignments = await TeacherScreenAssignment.find({ teacher: req.user._id });
        const screenIds = assignments.map(a => a.screenId);
        const screens = ASSIGNABLE_SCREENS.filter(s => screenIds.includes(s.id));
        res.json({ success: true, data: screens });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// GET /api/teacher-screen-assignments/screen/:screenId - Get teachers for a specific screen
router.get('/screen/:screenId', authorize('admin'), async (req, res) => {
    try {
        const assignments = await TeacherScreenAssignment.find({ screenId: req.params.screenId })
            .populate('teacher', 'name email rollNo photo')
            .populate('assignedBy', 'name')
            .sort('-createdAt');
        res.json({ success: true, data: assignments });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// POST /api/teacher-screen-assignments - Assign screen(s) to teacher(s)
router.post('/', authorize('admin'), async (req, res) => {
    try {
        const { screenId, teacherIds } = req.body;
        if (!screenId || !teacherIds || !Array.isArray(teacherIds) || teacherIds.length === 0) {
            return res.status(400).json({ success: false, message: 'screenId and teacherIds array are required.' });
        }
        const screen = ASSIGNABLE_SCREENS.find(s => s.id === screenId);
        if (!screen) {
            return res.status(400).json({ success: false, message: 'Invalid screen ID.' });
        }
        const created = [];
        for (const teacherId of teacherIds) {
            const exists = await TeacherScreenAssignment.findOne({ teacher: teacherId, screenId });
            if (!exists) {
                const assignment = await TeacherScreenAssignment.create({
                    teacher: teacherId,
                    screenId,
                    assignedBy: req.user._id
                });
                created.push(assignment);
            }
        }
        const allAssignments = await TeacherScreenAssignment.find({ screenId })
            .populate('teacher', 'name email rollNo photo')
            .populate('assignedBy', 'name');
        res.status(201).json({ success: true, data: allAssignments, created: created.length });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

// DELETE /api/teacher-screen-assignments - Remove assignment(s)
router.delete('/', authorize('admin'), async (req, res) => {
    try {
        const { screenId, teacherId } = req.body;
        if (!screenId || !teacherId) {
            return res.status(400).json({ success: false, message: 'screenId and teacherId are required.' });
        }
        await TeacherScreenAssignment.findOneAndDelete({ teacher: teacherId, screenId });
        const remaining = await TeacherScreenAssignment.find({ screenId })
            .populate('teacher', 'name email rollNo photo')
            .populate('assignedBy', 'name');
        res.json({ success: true, data: remaining });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// GET /api/teacher-screen-assignments/screens - Get all assignable screens
router.get('/screens', async (req, res) => {
    res.json({ success: true, data: ASSIGNABLE_SCREENS });
});

module.exports = router;
