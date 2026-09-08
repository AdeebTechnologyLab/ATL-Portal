const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const AdminWorkTask = require('../models/AdminWorkTask');

router.use(protect, authorize('admin'));

router.get('/', async (req, res) => {
    try {
        const tasks = await AdminWorkTask.find()
            .populate('createdBy', 'name email')
            .populate('updatedBy', 'name email')
            .sort({ status: 1, dueDate: 1, createdAt: -1 });
        res.json({ success: true, data: tasks });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const task = await AdminWorkTask.create({ ...req.body, createdBy: req.user.id, updatedBy: req.user.id });
        res.status(201).json({ success: true, data: task });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});


router.post('/:id/items', async (req, res) => {
    try {
        if (!req.body.title?.trim()) return res.status(400).json({ success: false, message: 'Task title is required' });
        const list = await AdminWorkTask.findById(req.params.id);
        if (!list) return res.status(404).json({ success: false, message: 'List not found' });
        list.items.push({ title: req.body.title.trim(), description: req.body.description || '', status: 'pending' });
        list.updatedBy = req.user.id;
        list.markModified('items');
        await list.save();
        res.status(201).json({ success: true, data: list });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

router.put('/:id/items/:itemId', async (req, res) => {
    try {
        const setFields = {};
        if (req.body.title !== undefined) setFields['items.$.title'] = req.body.title;
        if (req.body.description !== undefined) setFields['items.$.description'] = req.body.description;
        if (req.body.status !== undefined) {
            setFields['items.$.status'] = req.body.status;
            setFields['items.$.completedAt'] = req.body.status === 'completed' ? new Date() : null;
        }
        setFields.updatedBy = req.user.id;

        const list = await AdminWorkTask.findOneAndUpdate(
            { _id: req.params.id, 'items._id': req.params.itemId },
            { $set: setFields },
            { new: true, runValidators: true }
        );
        if (!list) return res.status(404).json({ success: false, message: 'Task not found' });
        res.json({ success: true, data: list });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

router.delete('/:id/items/:itemId', async (req, res) => {
    try {
        const list = await AdminWorkTask.findById(req.params.id);
        if (!list) return res.status(404).json({ success: false, message: 'List not found' });
        const item = list.items.id(req.params.itemId);
        if (!item) return res.status(404).json({ success: false, message: 'Task not found' });
        item.deleteOne();
        list.updatedBy = req.user.id;
        list.markModified('items');
        await list.save();
        res.json({ success: true, data: list });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const allowed = ['title', 'description', 'receivedFrom', 'assignedTo', 'receivedDate', 'dueDate', 'priority', 'status'];
        const updates = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));
        updates.updatedBy = req.user.id;
        if (updates.status === 'completed') updates.completedAt = new Date();
        if (updates.status && updates.status !== 'completed') updates.completedAt = null;

        const task = await AdminWorkTask.findByIdAndUpdate(req.params.id, updates, {
            new: true,
            runValidators: true
        });
        if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
        res.json({ success: true, data: task });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const task = await AdminWorkTask.findByIdAndDelete(req.params.id);
        if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
        res.json({ success: true, message: 'Task deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
