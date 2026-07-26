const mongoose = require('mongoose');

const globalMessageSchema = new mongoose.Schema({
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    text: {
        type: String,
        required: true
    },
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        default: null  // null = admin chat, set = course chat
    },
    task: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PaidTask',
        default: null
    },
    isRead: {
        type: Boolean,
        default: false
    },
    isBot: {
        type: Boolean,
        default: false
    },
    options: [
        {
            label: { type: String },
            value: { type: String }
        }
    ],
    discussionRoom: {
        type: Boolean,
        default: false
    },
    reactions: [
        {
            emoji: { type: String, required: true },
            user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
            createdAt: { type: Date, default: Date.now }
        }
    ],
    poll: {
        question: { type: String, default: '' },
        options: [
            {
                text: { type: String, required: true },
                votes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
            }
        ],
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
    }
}, {
    timestamps: true
});

// Index for efficient querying
globalMessageSchema.index({ sender: 1, recipient: 1, course: 1 });
globalMessageSchema.index({ task: 1, sender: 1, recipient: 1, isRead: 1 });
globalMessageSchema.index({ discussionRoom: 1, createdAt: -1 });

module.exports = mongoose.model('GlobalMessage', globalMessageSchema);
