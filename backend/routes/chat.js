const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { protect, authorize } = require('../middleware/auth');
const GlobalMessage = require('../models/GlobalMessage');
const User = require('../models/User');
const { sendPushNotification } = require('../utils/pushHelper');

const getLinkedAccountIds = async (userId) => {
    const user = await User.findById(userId).select('email');
    if (!user?.email) return [new mongoose.Types.ObjectId(userId)];
    const linkedUsers = await User.find({ email: user.email }).select('_id');
    return linkedUsers.map(u => u._id);
};

const getLinkedAccountIdsFromEmail = async (email, fallbackId) => {
    if (!email) return [new mongoose.Types.ObjectId(fallbackId)];
    const linkedUsers = await User.find({ email }).select('_id');
    return linkedUsers.map(u => u._id);
};

// @route   GET /api/chat/messages/:otherUserId
// @desc    Get messages with a specific user
// @access  Private (Admin or the user themselves)
router.get('/messages/:otherUserId', protect, async (req, res) => {
    try {
        const myId = req.user.id;
        const otherId = req.params.otherUserId;
        const myAccountIds = await getLinkedAccountIds(myId);
        const otherAccountIds = await getLinkedAccountIds(otherId);

        // Ensure authorization: Admin can see any chat, Users can only see their own chats
        if (req.user.role !== 'admin' && myId !== otherId) {
            // Check if this user is trying to fetch someone else's chat with admin
            // This case should be handled by logic: User chats with admin, so recipient is admin
        }

        const messages = await GlobalMessage.find({
            course: null,
            task: null,
            discussionRoom: { $ne: true },
            $or: [
                { sender: { $in: myAccountIds }, recipient: { $in: otherAccountIds } },
                { sender: { $in: otherAccountIds }, recipient: { $in: myAccountIds } }
            ]
        })
        .populate('sender', 'name role photo')
        .populate('recipient', 'name role photo')
        .sort('createdAt');

        res.json({ success: true, data: messages });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   POST /api/chat/messages
// @desc    Send a message
// @access  Private
router.post('/messages', protect, async (req, res) => {
    try {
        const { recipientId, text } = req.body;
        const senderId = req.user.id;
        const senderAccountIds = await getLinkedAccountIds(senderId);
        const recipientAccountIds = await getLinkedAccountIds(recipientId);

        const message = await GlobalMessage.create({
            sender: senderId,
            recipient: recipientId,
            text
        });

        const populatedMessage = await GlobalMessage.findById(message._id)
            .populate('sender', 'name role photo')
            .populate('recipient', 'name role photo');

        // Emit via socket for real-time update
        const io = req.app.get('io');
        if (io) {
            const socketData = {
                ...populatedMessage.toObject(),
                senderId: senderId,
                recipientId: recipientId,
                senderName: populatedMessage.sender.name
            };
            recipientAccountIds.forEach(id => io.to(id.toString()).emit('new_global_message', socketData));
            senderAccountIds.forEach(id => io.to(id.toString()).emit('new_global_message', socketData));
        }

        // Trigger a Web Push Notification in the background
        sendPushNotification(recipientId, {
            title: `New message from ${populatedMessage.sender.name}`,
            body: text,
            icon: '/logo.png',
            url: `/chat`
        });

        res.status(201).json({ success: true, data: populatedMessage });


    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   POST /api/chat/bot-reply
// @desc    Save a bot reply so Admin can see it
// @access  Private
router.post('/bot-reply', protect, async (req, res) => {
    try {
        const { recipientId, text, options } = req.body; // recipientId is Admin
        const studentId = req.user.id;

        // Create message as if Admin sent it to Student
        const message = await GlobalMessage.create({
            sender: recipientId,
            recipient: studentId,
            text,
            isBot: true,
            options
        });

        const populatedMessage = await GlobalMessage.findById(message._id)
            .populate('sender', 'name role photo')
            .populate('recipient', 'name role photo');

        // Emit via socket to Admin only (Student already shows it optimistically)
        const io = req.app.get('io');
        if (io) {
            const socketData = {
                ...populatedMessage.toObject(),
                senderId: recipientId, // Admin is the sender in DB
                recipientId: studentId,
                senderName: 'Adeeb Chatbot',
                isBot: true,
                options,
                notifyAdmin: true // Flag to tell frontend to notify the admin
            };
            io.to(recipientId.toString()).emit('new_global_message', socketData);
        }

        // Trigger a Web Push Notification for the Admin
        sendPushNotification(recipientId, {
            title: `Bot is assisting ${populatedMessage.recipient.name}`,
            body: text,
            icon: '/logo.png',
            url: `/chat`
        });

        res.status(201).json({ success: true, data: populatedMessage });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/chat/conversations
// @desc    Get list of conversations (Admin only)
// @access  Private (Admin)
router.get('/conversations', protect, authorize('admin'), async (req, res) => {
    try {
        const adminAccountIds = await getLinkedAccountIds(req.user.id);
        const adminIdStrings = adminAccountIds.map(String);

        const messages = await GlobalMessage.find({
            course: null,
            task: null,
            discussionRoom: { $ne: true },
            $or: [
                { sender: { $in: adminAccountIds } },
                { recipient: { $in: adminAccountIds } }
            ]
        })
            .populate('sender', 'name role email photo phone rollNo')
            .populate('recipient', 'name role email photo phone rollNo')
            .sort('-createdAt')
            .limit(1000);

        const grouped = new Map();
        messages.forEach(message => {
            const senderIsAdmin = adminIdStrings.includes(String(message.sender?._id));
            const otherUser = senderIsAdmin ? message.recipient : message.sender;
            if (!otherUser?._id || adminIdStrings.includes(String(otherUser._id))) return;

            const key = (otherUser.email || String(otherUser._id)).toLowerCase();
            if (!grouped.has(key)) {
                grouped.set(key, {
                    _id: otherUser._id,
                    user: otherUser,
                    lastMessage: message.text,
                    lastMessageAt: message.createdAt,
                    unreadCount: 0
                });
            }

            if (!senderIsAdmin && adminIdStrings.includes(String(message.recipient?._id)) && !message.isRead) {
                grouped.get(key).unreadCount += 1;
            }
        });

        const conversations = Array.from(grouped.values()).sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));

        res.json({ success: true, data: conversations });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   PUT /api/chat/read/:senderId
// @desc    Mark messages as read
// @access  Private
router.put('/read/:senderId', protect, async (req, res) => {
    try {
        const recipientIds = await getLinkedAccountIds(req.user.id);
        const senderIds = await getLinkedAccountIds(req.params.senderId);

        await GlobalMessage.updateMany(
            {
                sender: { $in: senderIds },
                recipient: { $in: recipientIds },
                course: null,
                task: null,
                discussionRoom: { $ne: true },
                isRead: false
            },
            { $set: { isRead: true } }
        );

        res.json({ success: true, message: 'Messages marked as read' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/chat/unread
// @desc    Get total unread count for current user (admin chat only, not course chat)
// @access  Private
router.get('/unread', protect, async (req, res) => {
    try {
        const accountIds = await getLinkedAccountIds(req.user.id);
        // Only count messages where course is null (admin chat, not course-based chat)
        const count = await GlobalMessage.countDocuments({
            recipient: { $in: accountIds },
            isRead: false,
            course: null,
            task: null,
            discussionRoom: { $ne: true }
        });
        res.json({ success: true, count });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// =====================================================
// DISCUSSION ROOM ROUTES (common group chat for everyone)
// =====================================================

// @route   GET /api/chat/discussion/online-count
// @desc    Get currently online users count for discussion room
// @access  Private
router.get('/discussion/online-count', protect, async (req, res) => {
    try {
        const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
        const count = await User.countDocuments({
            lastSeen: { $gte: twoMinutesAgo }
        });

        res.json({ success: true, count });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/chat/discussion/unread
// @desc    Get unread discussion room message count for current linked account group
// @access  Private
router.get('/discussion/unread', protect, async (req, res) => {
    try {
        const accountIds = await getLinkedAccountIds(req.user.id);
        const accounts = await User.find({ _id: { $in: accountIds } }).select('discussionLastReadAt');
        const lastReadAt = accounts.reduce((latest, account) => {
            if (!account.discussionLastReadAt) return latest;
            const readAt = new Date(account.discussionLastReadAt);
            return !latest || readAt > latest ? readAt : latest;
        }, null);

        const query = {
            discussionRoom: true,
            course: null,
            task: null,
            sender: { $nin: accountIds }
        };

        if (lastReadAt) {
            query.createdAt = { $gt: lastReadAt };
        }

        const count = await GlobalMessage.countDocuments(query);
        res.json({ success: true, count });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   PUT /api/chat/discussion/read
// @desc    Mark discussion room as read for current linked account group
// @access  Private
router.put('/discussion/read', protect, async (req, res) => {
    try {
        const accountIds = await getLinkedAccountIds(req.user.id);
        const readAt = new Date();
        await User.updateMany(
            { _id: { $in: accountIds } },
            { $set: { discussionLastReadAt: readAt } }
        );

        const io = req.app.get('io');
        if (io) {
            accountIds.forEach(id => io.to(String(id)).emit('discussion_read', { count: 0, readAt }));
        }

        res.json({ success: true, count: 0, readAt });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/chat/discussion
// @desc    Get common discussion room messages
// @access  Private
router.get('/discussion', protect, async (req, res) => {
    try {
        const messages = await GlobalMessage.find({
            discussionRoom: true,
            course: null,
            task: null
        })
            .populate('sender', 'name role email photo rollNo lastSeen')
            .sort('createdAt')
            .limit(500);

        res.json({ success: true, data: messages });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   POST /api/chat/discussion
// @desc    Send message to common discussion room
// @access  Private
router.post('/discussion', protect, async (req, res) => {
    try {
        const text = (req.body.text || '').trim();
        if (!text) return res.status(400).json({ success: false, message: 'Message is required' });

        const message = await GlobalMessage.create({
            sender: req.user.id,
            recipient: null,
            text,
            discussionRoom: true
        });

        const populatedMessage = await GlobalMessage.findById(message._id)
            .populate('sender', 'name role email photo rollNo lastSeen');

        const io = req.app.get('io');
        if (io) {
            io.emit('discussion_message', populatedMessage);
            io.emit('discussion_unread_changed', {
                senderId: String(req.user.id),
                senderEmail: (req.user.email || '').toLowerCase()
            });
        }

        res.status(201).json({ success: true, data: populatedMessage });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   POST /api/chat/discussion/poll
// @desc    Teacher creates a poll in discussion room
// @access  Private (Teacher only)
router.post('/discussion/poll', protect, authorize('teacher'), async (req, res) => {
    try {
        const question = String(req.body.question || '').trim();
        const options = Array.isArray(req.body.options)
            ? req.body.options.map(option => String(option || '').trim()).filter(Boolean)
            : [];

        if (!question) return res.status(400).json({ success: false, message: 'Poll question is required' });
        if (options.length < 2) return res.status(400).json({ success: false, message: 'At least 2 poll options are required' });
        if (options.length > 6) return res.status(400).json({ success: false, message: 'Maximum 6 poll options allowed' });

        const message = await GlobalMessage.create({
            sender: req.user.id,
            recipient: null,
            text: `Poll: ${question}`,
            discussionRoom: true,
            poll: {
                question,
                options: options.map(text => ({ text, votes: [] })),
                createdBy: req.user.id
            }
        });

        const populatedMessage = await GlobalMessage.findById(message._id)
            .populate('sender', 'name role email photo rollNo lastSeen');

        const io = req.app.get('io');
        if (io) {
            io.emit('discussion_message', populatedMessage);
            io.emit('discussion_unread_changed', {
                senderId: String(req.user.id),
                senderEmail: (req.user.email || '').toLowerCase()
            });
        }

        res.status(201).json({ success: true, data: populatedMessage });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   PUT /api/chat/discussion/:messageId/poll-vote
// @desc    Vote on discussion room poll
// @access  Private
router.put('/discussion/:messageId/poll-vote', protect, async (req, res) => {
    try {
        const optionIndex = Number(req.body.optionIndex);
        const message = await GlobalMessage.findOne({
            _id: req.params.messageId,
            discussionRoom: true
        });

        if (!message?.poll?.options?.length) {
            return res.status(404).json({ success: false, message: 'Poll not found' });
        }

        if (!Number.isInteger(optionIndex) || optionIndex < 0 || optionIndex >= message.poll.options.length) {
            return res.status(400).json({ success: false, message: 'Invalid poll option' });
        }

        const userId = String(req.user.id);
        message.poll.options.forEach(option => {
            option.votes = (option.votes || []).filter(vote => String(vote) !== userId);
        });
        message.poll.options[optionIndex].votes.push(req.user.id);

        await message.save();

        const populatedMessage = await GlobalMessage.findById(message._id)
            .populate('sender', 'name role email photo rollNo lastSeen');

        const io = req.app.get('io');
        if (io) io.emit('discussion_poll_updated', populatedMessage);

        res.json({ success: true, data: populatedMessage });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   PUT /api/chat/discussion/:messageId/reaction
// @desc    Toggle emoji reaction on a discussion message
// @access  Private
router.put('/discussion/:messageId/reaction', protect, async (req, res) => {
    try {
        const emoji = String(req.body.emoji || '').trim();
        const allowedEmojis = ['👍', '❤️', '😂', '😮', '😢', '👏', '🔥'];
        if (!allowedEmojis.includes(emoji)) {
            return res.status(400).json({ success: false, message: 'Invalid reaction emoji' });
        }

        const message = await GlobalMessage.findOne({
            _id: req.params.messageId,
            discussionRoom: true
        });

        if (!message) {
            return res.status(404).json({ success: false, message: 'Message not found' });
        }

        const userId = String(req.user.id);
        const existingIndex = (message.reactions || []).findIndex(reaction =>
            String(reaction.user) === userId && reaction.emoji === emoji
        );

        if (existingIndex >= 0) {
            message.reactions.splice(existingIndex, 1);
        } else {
            message.reactions = (message.reactions || []).filter(reaction => String(reaction.user) !== userId);
            message.reactions.push({ emoji, user: req.user.id });
        }

        await message.save();

        const populatedMessage = await GlobalMessage.findById(message._id)
            .populate('sender', 'name role email photo rollNo lastSeen');

        const io = req.app.get('io');
        if (io) {
            io.emit('discussion_reaction_updated', populatedMessage);
        }

        res.json({ success: true, data: populatedMessage });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   DELETE /api/chat/discussion
// @desc    Clear complete discussion room chat
// @access  Private (Admin)
router.delete('/discussion', protect, authorize('admin'), async (req, res) => {
    try {
        const result = await GlobalMessage.deleteMany({ discussionRoom: true });
        const io = req.app.get('io');
        if (io) io.emit('discussion_cleared', { deletedCount: result.deletedCount });
        res.json({ success: true, deletedCount: result.deletedCount });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   DELETE /api/chat/discussion/:messageId
// @desc    Delete one discussion room message
// @access  Private (Admin)
router.delete('/discussion/:messageId', protect, authorize('admin'), async (req, res) => {
    try {
        const message = await GlobalMessage.findOneAndDelete({
            _id: req.params.messageId,
            discussionRoom: true
        });
        if (!message) return res.status(404).json({ success: false, message: 'Message not found' });

        const io = req.app.get('io');
        if (io) io.emit('discussion_message_deleted', { messageId: req.params.messageId });
        res.json({ success: true, deletedId: req.params.messageId });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
// @route   POST /api/chat/action/clear-messages/:userId
// @desc    Delete ALL messages with a user (Admin only)
// @access  Private (Admin)
router.post('/action/clear-messages/:userId', protect, authorize('admin'), async (req, res) => {
    try {
        const adminId = req.user.id;
        const otherUserId = req.params.userId;

        console.log(`[CHAT CLEAR] Admin ${adminId} requested to CLEAR MESSAGES ONLY with User ${otherUserId}`);

        // 1. Verify User exists before doing anything
        const targetUser = await User.findById(otherUserId);
        if (!targetUser) {
            console.log(`[CHAT CLEAR] Failed: Target user ${otherUserId} not found.`);
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        const adminAccountIds = await getLinkedAccountIds(adminId);
        const targetAccountIds = await getLinkedAccountIdsFromEmail(targetUser.email, otherUserId);

        // 2. STRICTLY only delete messages from GlobalMessage collection
        const result = await GlobalMessage.deleteMany({
            course: null,
            task: null,
            discussionRoom: { $ne: true },
            $or: [
                { sender: { $in: adminAccountIds }, recipient: { $in: targetAccountIds } },
                { sender: { $in: targetAccountIds }, recipient: { $in: adminAccountIds } }
            ]
        });

        // 3. SECURE CHECK: Verify user still exists
        const userCheck = await User.findById(otherUserId);
        if (userCheck) {
            console.log(`[CHAT CLEAR] SUCCESS: Removed ${result.deletedCount} messages. VERIFIED: User ${userCheck.name} still exists in database.`);
        } else {
            console.error(`[CHAT CLEAR] CRITICAL ERROR: User ${otherUserId} was deleted during chat cleanup! This shouldn't happen.`);
        }

        res.json({
            success: true,
            message: 'Chat history cleared successfully. User account was NOT affected.',
            messagesRemoved: result.deletedCount
        });
    } catch (error) {
        console.error('[CHAT CLEAR] Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// =====================================================
// COURSE-BASED CHAT ROUTES
// =====================================================

const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');
const PaidTask = require('../models/PaidTask');

// =====================================================
// JOB-BASED CHAT ROUTES
// =====================================================

router.get('/job/tasks', protect, authorize('admin', 'teacher', 'job'), async (req, res) => {
    try {
        const userId = req.user.id;
        const query = req.user.role === 'admin'
            ? { 'assignedTo.0': { $exists: true } }
            : req.user.role === 'teacher'
                ? { $or: [{ jobManagers: userId }, { jobManager: userId }, { jobManagers: { $size: 0 }, jobManager: null, createdBy: userId }], 'assignedTo.0': { $exists: true } }
                : { assignedTo: userId };

        const tasks = await PaidTask.find(query)
            .populate('createdBy', 'name photo role')
            .populate('jobManager', 'name photo role')
            .populate('jobManagers', 'name photo role')
            .populate('applicants.user', 'name email photo role')
            .populate('assignedTo', 'name email photo role')
            .select('title createdBy jobManager jobManagers applicants assignedTo submissions status')
            .sort('-updatedAt');

        const data = await Promise.all(tasks.map(async task => {
            const managers = task.jobManagers?.length ? task.jobManagers : (task.jobManager ? [task.jobManager] : (task.createdBy ? [task.createdBy] : []));
            const contacts = req.user.role === 'job'
                ? managers
                : (task.assignedTo || []).filter(Boolean);
            const contactsWithUnread = await Promise.all(contacts.map(async contact => {
                const unreadQuery = { task: task._id, sender: contact._id, recipient: userId, isRead: false };
                return {
                    _id: contact._id,
                    name: contact.name,
                    email: contact.email,
                    photo: contact.photo,
                    role: contact.role,
                    unreadCount: await GlobalMessage.countDocuments(unreadQuery)
                };
            }));
            const totalUnread = req.user.role === 'job'
                ? await GlobalMessage.countDocuments({ task: task._id, recipient: userId, isRead: false })
                : contactsWithUnread.reduce((n, c) => n + c.unreadCount, 0);
            const latestApplicationByUser = new Map();
            task.applicants.forEach(application => {
                const applicantId = String(application.user?._id || application.user);
                const existing = latestApplicationByUser.get(applicantId);
                if (!existing || (application.cycle || 1) >= (existing.cycle || 1)) {
                    latestApplicationByUser.set(applicantId, application);
                }
            });
            const assignedIds = new Set((task.assignedTo || []).map(assignedUser => String(assignedUser?._id || assignedUser)));
            const submittedIds = new Set((task.submissions || []).map(submission => String(submission.user?._id || submission.user)));
            const pendingApplicants = [...latestApplicationByUser.values()].filter(application =>
                application.status === 'applied' && !assignedIds.has(String(application.user?._id || application.user))
            ).length;
            return {
                _id: task._id,
                title: task.title,
                status: task.status,
                contacts: contactsWithUnread,
                totalUnread,
                pendingApplicants,
                assignedCount: assignedIds.size,
                submittedCount: submittedIds.size
            };
        }));
        res.json({
            success: true,
            data,
            totalUnread: data.reduce((n, t) => n + t.totalUnread, 0),
            totalApplicants: data.reduce((n, t) => n + (req.user.role === 'job' ? 0 : t.pendingApplicants), 0),
            totalAssigned: data.reduce((n, t) => n + (req.user.role === 'job' ? 1 : t.assignedCount), 0),
            totalSubmitted: data.reduce((n, t) => n + (req.user.role === 'job' ? 0 : t.submittedCount), 0)
        });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

const canAccessJobChat = async (task, user, otherUserId) => {
    const assignedIds = (task.assignedTo || []).map(String);
    if (user.role === 'admin') return assignedIds.includes(String(otherUserId));
    const managerIds = (task.jobManagers?.length ? task.jobManagers : [task.jobManager || task.createdBy]).filter(Boolean).map(String);
    if (user.role === 'teacher') return managerIds.includes(String(user.id)) && assignedIds.includes(String(otherUserId));
    return user.role === 'job' && assignedIds.includes(String(user.id)) && managerIds.includes(String(otherUserId));
};

router.get('/job/:taskId/messages/:userId', protect, authorize('admin', 'teacher', 'job'), async (req, res) => {
    try {
        const task = await PaidTask.findById(req.params.taskId);
        if (!task || !(await canAccessJobChat(task, req.user, req.params.userId))) return res.status(403).json({ success: false, message: 'Job chat access denied' });
        const messageQuery = req.user.role === 'job'
            ? { task: task._id, $or: [{ sender: req.user.id }, { recipient: req.user.id }] }
            : { task: task._id, $or: [{ sender: req.params.userId }, { recipient: req.params.userId }] };
        const messages = await GlobalMessage.find(messageQuery).populate('sender recipient', 'name photo role').sort('createdAt');
        res.json({ success: true, data: messages });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.post('/job/:taskId/send', protect, authorize('admin', 'teacher', 'job'), async (req, res) => {
    try {
        const { recipientId, text } = req.body;
        const task = await PaidTask.findById(req.params.taskId);
        if (!text?.trim() || !task || !(await canAccessJobChat(task, req.user, recipientId))) return res.status(403).json({ success: false, message: 'Job chat access denied' });
        const message = await GlobalMessage.create({ sender: req.user.id, recipient: recipientId, text: text.trim(), task: task._id });
        const populated = await GlobalMessage.findById(message._id).populate('sender recipient', 'name photo role');
        const io = req.app.get('io');
        if (io) {
            const payload = { ...populated.toObject(), senderId: req.user.id, recipientId, taskId: String(task._id) };
            io.to(String(recipientId)).emit('new_global_message', payload);
            io.to(String(req.user.id)).emit('new_global_message', payload);
        }
        res.status(201).json({ success: true, data: populated });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.put('/job/:taskId/read/:senderId', protect, async (req, res) => {
    try {
        await GlobalMessage.updateMany({ task: req.params.taskId, recipient: req.user.id, isRead: false }, { $set: { isRead: true } });
        res.json({ success: true });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.delete('/job/:taskId/messages/:userId', protect, authorize('admin'), async (req, res) => {
    try {
        const result = await GlobalMessage.deleteMany({ task: req.params.taskId, $or: [{ sender: req.params.userId }, { recipient: req.params.userId }] });
        res.json({ success: true, deletedCount: result.deletedCount });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// @route   GET /api/chat/course/:courseId/messages/:userId
// @desc    Get messages in a course between two users
// @access  Private
router.get('/course/:courseId/messages/:userId', protect, async (req, res) => {
    try {
        const courseId = req.params.courseId;
        const userId = req.params.userId;
        const myId = req.user.id;

        const messages = await GlobalMessage.find({
            course: courseId,
            $or: [
                { sender: myId, recipient: userId },
                { sender: userId, recipient: myId }
            ]
        }).sort('createdAt');

        res.json({ success: true, data: messages });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   POST /api/chat/course/:courseId/send
// @desc    Send a message in a course
// @access  Private
router.post('/course/:courseId/send', protect, async (req, res) => {
    try {
        const { recipientId, text } = req.body;
        const courseId = req.params.courseId;
        const senderId = req.user.id;

        const message = await GlobalMessage.create({
            sender: senderId,
            recipient: recipientId,
            text,
            course: courseId
        });

        const populatedMessage = await GlobalMessage.findById(message._id)
            .populate('sender', 'name role photo')
            .populate('recipient', 'name role photo');

        // Emit via socket for real-time update
        const io = req.app.get('io');
        if (io) {
            const socketData = {
                ...populatedMessage.toObject(),
                senderId: senderId,
                recipientId: recipientId,
                senderName: populatedMessage.sender.name,
                course: courseId,
                courseId: courseId
            };
            io.to(recipientId.toString()).emit('new_global_message', socketData);
            io.to(senderId.toString()).emit('new_global_message', socketData);
        }

        // Trigger a Web Push Notification in the background
        sendPushNotification(recipientId, {
            title: `New course message from ${populatedMessage.sender.name}`,
            body: text,
            icon: '/logo.png',
            url: `/chat`
        });

        res.status(201).json({ success: true, data: populatedMessage });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/chat/teacher/courses
// @desc    Get teacher's courses with enrolled students for chat
// @access  Private (Teacher)
router.get('/teacher/courses', protect, authorize('teacher'), async (req, res) => {
    try {
        const teacherId = req.user.id;

        // Get courses where this teacher is assigned
        const courses = await Course.find({
            teachers: teacherId
        }).select('title _id');

        // For each course, get enrolled students with unread message counts
        const coursesWithStudents = await Promise.all(courses.map(async (course) => {
            const enrollments = await Enrollment.find({
                course: course._id,
                status: { $in: ['pending', 'enrolled'] }
            }).populate('user', 'name email photo role');

            // Get unread counts per student for this course
            const studentsWithUnread = await Promise.all(enrollments.map(async (enrollment) => {
                if (!enrollment.user) return null;

                const unreadCount = await GlobalMessage.countDocuments({
                    sender: enrollment.user._id,
                    recipient: teacherId,
                    course: course._id,
                    isRead: false
                });

                return {
                    _id: enrollment.user._id,
                    name: enrollment.user.name,
                    email: enrollment.user.email,
                    photo: enrollment.user.photo,
                    role: enrollment.user.role,
                    unreadCount
                };
            }));

            const validStudents = studentsWithUnread.filter(s => s !== null);
            const totalUnread = validStudents.reduce((sum, s) => sum + s.unreadCount, 0);

            return {
                _id: course._id,
                title: course.title,
                students: validStudents,
                totalUnread
            };
        }));

        res.json({ success: true, data: coursesWithStudents });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/chat/student/courses
// @desc    Get student's enrolled courses with their teachers for chat
// @access  Private (Student/Intern)
router.get('/student/courses', protect, authorize('student', 'intern'), async (req, res) => {
    try {
        const studentId = req.user.id;

        // Get student's enrollments
        const enrollments = await Enrollment.find({
            user: studentId,
            status: { $in: ['pending', 'enrolled'] }
        }).populate({
            path: 'course',
            select: 'title teachers',
            populate: {
                path: 'teachers',
                select: 'name email photo'
            }
        });

        // Build list of courses with teachers and unread counts
        const coursesWithTeachers = await Promise.all(enrollments.map(async (enrollment) => {
            if (!enrollment.course) return null;

            const teachersWithUnread = await Promise.all((enrollment.course.teachers || []).map(async (teacher) => {
                const unreadCount = await GlobalMessage.countDocuments({
                    sender: teacher._id,
                    recipient: studentId,
                    course: enrollment.course._id,
                    isRead: false
                });

                return {
                    _id: teacher._id,
                    name: teacher.name,
                    email: teacher.email,
                    photo: teacher.photo,
                    unreadCount
                };
            }));

            const totalUnread = teachersWithUnread.reduce((sum, t) => sum + t.unreadCount, 0);

            return {
                _id: enrollment.course._id,
                title: enrollment.course.title,
                teachers: teachersWithUnread,
                totalUnread
            };
        }));

        res.json({ success: true, data: coursesWithTeachers.filter(c => c !== null) });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/chat/search
// @desc    Search users by email (Admin/Teacher only)
// @access  Private (Admin/Teacher)
router.get('/search', protect, authorize('admin', 'teacher'), async (req, res) => {
    try {
        const { email, courseId } = req.query;

        if (!email) {
            return res.status(400).json({ success: false, message: 'Email is required' });
        }

        let query = {
            email: { $regex: email, $options: 'i' }
        };

        // If teacher, only search within their courses' students
        if (req.user.role === 'teacher' && courseId) {
            const enrollments = await Enrollment.find({
                course: courseId,
                status: { $in: ['pending', 'enrolled'] }
            }).select('user');

            const studentIds = enrollments.map(e => e.user);
            query._id = { $in: studentIds };
        }

        const users = await User.find(query)
            .select('name email photo role')
            .limit(10);

        res.json({ success: true, data: users });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   PUT /api/chat/course/:courseId/read/:senderId
// @desc    Mark course messages as read
// @access  Private
router.put('/course/:courseId/read/:senderId', protect, async (req, res) => {
    try {
        const recipientId = req.user.id;
        const senderId = req.params.senderId;
        const courseId = req.params.courseId;

        await GlobalMessage.updateMany(
            { sender: senderId, recipient: recipientId, course: courseId, isRead: false },
            { $set: { isRead: true } }
        );

        res.json({ success: true, message: 'Messages marked as read' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   POST /api/chat/course/:courseId/clear/:userId
// @desc    Delete ALL messages in a course with a user
// @access  Private (Teacher or Admin)
router.post('/course/:courseId/clear/:userId', protect, async (req, res) => {
    try {
        const { courseId, userId } = req.params;
        const myId = req.user.id;

        // Verify authorization: User must be a teacher or admin
        if (req.user.role !== 'admin' && req.user.role !== 'teacher') {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        const result = await GlobalMessage.deleteMany({
            course: courseId,
            $or: [
                { sender: myId, recipient: userId },
                { sender: userId, recipient: myId }
            ]
        });

        res.json({ 
            success: true, 
            message: 'Course chat history cleared successfully',
            deletedCount: result.deletedCount 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
