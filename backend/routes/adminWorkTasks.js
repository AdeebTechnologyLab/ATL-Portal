const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const AdminWorkTask = require('../models/AdminWorkTask');
const User = require('../models/User');

router.use(protect);

const isAdmin = (user) => user.role === 'admin';
const isTeacher = (user) => user.role === 'teacher';
const isListOwner = (list, user) => String(list.createdBy) === String(user._id);
const canManageList = (list, user) => isAdmin(user) || isListOwner(list, user);

const canAccessList = (list, user) => isAdmin(user)
    || isListOwner(list, user)
    || (list.sharedWith || []).some(member => {
        const memberId = String(member._id || member);
        return memberId === String(user._id);
    });

const deduplicateSharedWith = (sharedWith) => {
    const seen = new Map();
    (sharedWith || []).forEach(member => {
        const rollNo = member.rollNo || String(member._id || member);
        if (!seen.has(rollNo)) {
            seen.set(rollNo, member);
        }
    });
    return Array.from(seen.values());
};

const presentList = (list, user) => {
    const data = list.toObject ? list.toObject() : list;
    const admin = isAdmin(user);
    const owner = isListOwner(list, user);
    return {
        ...data,
        sharedWith: deduplicateSharedWith(data.sharedWith),
        isOwner: owner,
        items: (data.items || []).map(item => ({
            ...item,
            // Edit/delete permissions: list ka har member (admin, owner, ya shared teacher)
            // list ke andar kisi bhi task ko edit/delete kar sakta hai — apna,
            // doosre teacher ka, ya admin ka. List access hi permission hai.
            canDelete: true,
            canEdit: true
        }))
    };
};

const getList = (id) => AdminWorkTask.findById(id)
    .populate('sharedWith', 'name rollNo role photo')
    .populate('createdBy', 'name email rollNo role photo')
    .populate('items.createdBy', 'name rollNo photo');

router.get('/', async (req, res) => {
    try {
        let query;
        if (isAdmin(req.user)) {
            query = {};
        } else {
            // Cross-portal sync: find lists shared with any user having same roll number
            const sameRollUsers = await User.find({ rollNo: req.user.rollNo }).select('_id');
            const userIds = sameRollUsers.map(u => u._id);
            query = { $or: [{ sharedWith: { $in: userIds } }, { createdBy: req.user._id }] };
        }
        const tasks = await AdminWorkTask.find(query)
            .populate('sharedWith', 'name rollNo role photo')
            .populate('createdBy', 'name email rollNo role photo')
            .populate('items.createdBy', 'name rollNo photo')
            .populate('updatedBy', 'name email')
            .sort({ status: 1, dueDate: 1, createdAt: -1 });
        res.json({ success: true, data: tasks.map(task => presentList(task, req.user)) });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.post('/', async (req, res) => {
    if (!isAdmin(req.user) && !isTeacher(req.user)) {
        return res.status(403).json({ success: false, message: 'Only admins and teachers can create lists.' });
    }
    try {
        if (!req.body.title?.trim()) return res.status(400).json({ success: false, message: 'List title is required.' });
        const sharedWith = [];
        if (isTeacher(req.user)) {
            const adminUser = await User.findOne({ role: 'admin' }).select('_id');
            if (adminUser) sharedWith.push(adminUser._id);
        }
        const task = await AdminWorkTask.create({
            title: req.body.title.trim(),
            description: req.body.description || '',
            sharedWith,
            createdBy: req.user.id,
            updatedBy: req.user.id
        });
        await task.populate('sharedWith', 'name rollNo role photo');
        await task.populate('createdBy', 'name email rollNo role photo');
        await task.populate('items.createdBy', 'name rollNo photo');
        res.status(201).json({ success: true, data: presentList(task, req.user) });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

router.post('/:id/share', async (req, res) => {
    try {
        const list = await getList(req.params.id);
        if (!list) return res.status(404).json({ success: false, message: 'List not found.' });
        if (!canAccessList(list, req.user)) return res.status(403).json({ success: false, message: 'You cannot access this list.' });
        const { userId } = req.body;
        if (!userId) return res.status(400).json({ success: false, message: 'User ID is required.' });
        const userToAdd = await User.findById(userId).select('name rollNo role');
        if (!userToAdd) return res.status(404).json({ success: false, message: 'User not found.' });

        // Cross-portal sync: find all users with the same roll number
        const sameRollUsers = await User.find({ rollNo: userToAdd.rollNo }).select('_id');
        const userIdsToAdd = sameRollUsers.map(u => u._id);

        // Add all users with same roll number (skip already shared)
        const alreadySharedIds = (list.sharedWith || []).map(m => String(m._id || m));
        const newIds = userIdsToAdd.filter(id => !alreadySharedIds.includes(String(id)));

        if (newIds.length === 0) return res.status(400).json({ success: false, message: 'User is already in this list.' });

        newIds.forEach(id => list.sharedWith.push(id));
        list.updatedBy = req.user.id;
        await list.save();
        await list.populate('sharedWith', 'name rollNo role photo');
        res.json({ success: true, data: presentList(list, req.user) });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

router.post('/:id/items', async (req, res) => {
    try {
        if (!req.body.title?.trim()) return res.status(400).json({ success: false, message: 'Task title is required.' });
        const list = await getList(req.params.id);
        if (!list) return res.status(404).json({ success: false, message: 'List not found.' });
        if (!canAccessList(list, req.user)) return res.status(403).json({ success: false, message: 'You cannot access this list.' });
        list.items.push({
            title: req.body.title.trim(), description: req.body.description || '', status: 'pending',
            createdBy: req.user._id, createdByRole: req.user.role, isAdminCreated: isAdmin(req.user)
        });
        list.updatedBy = req.user.id;
        list.markModified('items');
        await list.save();
        res.status(201).json({ success: true, data: presentList(list, req.user) });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

router.put('/:id/items/:itemId', async (req, res) => {
    try {
        const list = await getList(req.params.id);
        if (!list) return res.status(404).json({ success: false, message: 'List not found.' });
        if (!canAccessList(list, req.user)) return res.status(403).json({ success: false, message: 'You cannot access this list.' });
        const item = list.items.id(req.params.itemId);
        if (!item) return res.status(404).json({ success: false, message: 'Task not found.' });
        // List access hi permission hai: har member kisi bhi task ke details edit kar sakta hai
        if (req.body.title !== undefined) {
            const title = String(req.body.title).trim();
            if (!title) return res.status(400).json({ success: false, message: 'Task title cannot be empty.' });
            item.title = title;
        }
        if (req.body.description !== undefined) item.description = req.body.description;
        if (req.body.status !== undefined) {
            item.status = req.body.status;
            item.completedAt = req.body.status === 'completed' ? new Date() : null;
        }
        list.updatedBy = req.user.id;
        list.markModified('items');
        await list.save();
        res.json({ success: true, data: presentList(list, req.user) });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

router.delete('/:id/items/:itemId', async (req, res) => {
    try {
        const list = await getList(req.params.id);
        if (!list) return res.status(404).json({ success: false, message: 'List not found.' });
        if (!canAccessList(list, req.user)) return res.status(403).json({ success: false, message: 'You cannot access this list.' });
        const item = list.items.id(req.params.itemId);
        if (!item) return res.status(404).json({ success: false, message: 'Task not found.' });
        // List access hi permission hai: har member koi bhi task delete kar sakta hai
        item.deleteOne();
        list.updatedBy = req.user.id;
        list.markModified('items');
        await list.save();
        res.json({ success: true, data: presentList(list, req.user) });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const list = await AdminWorkTask.findById(req.params.id);
        if (!list) return res.status(404).json({ success: false, message: 'List not found.' });
        if (!canManageList(list, req.user)) return res.status(403).json({ success: false, message: 'You cannot update this list.' });
        const allowed = ['title', 'description', 'receivedFrom', 'assignedTo', 'receivedDate', 'dueDate', 'priority', 'status'];
        const updates = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));
        updates.updatedBy = req.user.id;
        if (updates.status === 'completed') updates.completedAt = new Date();
        if (updates.status && updates.status !== 'completed') updates.completedAt = null;
        const task = await AdminWorkTask.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true })
            .populate('sharedWith', 'name rollNo role photo')
            .populate('createdBy', 'name email rollNo role photo')
            .populate('items.createdBy', 'name rollNo photo');
        res.json({ success: true, data: presentList(task, req.user) });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

router.delete('/:id/share/:userId', async (req, res) => {
    try {
        const list = await getList(req.params.id);
        if (!list) return res.status(404).json({ success: false, message: 'List not found.' });
        if (!canManageList(list, req.user)) return res.status(403).json({ success: false, message: 'You cannot manage this list.' });

        const userIdToRemove = req.params.userId;
        const userToRemove = await User.findById(userIdToRemove).select('rollNo');
        if (!userToRemove) return res.status(404).json({ success: false, message: 'User not found.' });

        const sameRollUsers = await User.find({ rollNo: userToRemove.rollNo }).select('_id');
        const idsToRemove = sameRollUsers.map(u => String(u._id));

        const beforeCount = list.sharedWith.length;
        list.sharedWith = list.sharedWith.filter(member => {
            const memberId = String(member._id || member);
            return !idsToRemove.includes(memberId);
        });

        if (list.sharedWith.length === beforeCount) {
            return res.status(400).json({ success: false, message: 'User is not in this list.' });
        }

        list.updatedBy = req.user.id;
        await list.save();
        await list.populate('sharedWith', 'name rollNo role photo');
        res.json({ success: true, data: presentList(list, req.user) });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const list = await AdminWorkTask.findById(req.params.id);
        if (!list) return res.status(404).json({ success: false, message: 'List not found.' });
        if (!canManageList(list, req.user)) return res.status(403).json({ success: false, message: 'You cannot delete this list.' });
        await AdminWorkTask.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'List deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
