const mongoose = require('mongoose');

const workItemSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, default: '', maxlength: 3000 },
    status: {
        type: String,
        enum: ['pending', 'in_progress', 'completed'],
        default: 'pending'
    },
    completedAt: { type: Date, default: null }
}, { timestamps: true });

const adminWorkTaskSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, default: '', maxlength: 3000 },
    receivedFrom: { type: String, trim: true, default: '', maxlength: 150 },
    assignedTo: { type: String, trim: true, default: '', maxlength: 150 },
    receivedDate: { type: Date, default: Date.now },
    dueDate: { type: Date, default: null },
    items: { type: [workItemSchema], default: [] },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
    },
    status: {
        type: String,
        enum: ['pending', 'in_progress', 'completed', 'cancelled'],
        default: 'pending'
    },
    completedAt: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

adminWorkTaskSchema.index({ status: 1, dueDate: 1 });
adminWorkTaskSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AdminWorkTask', adminWorkTaskSchema);
