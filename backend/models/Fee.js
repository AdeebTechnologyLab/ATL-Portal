const mongoose = require('mongoose');

const installmentSchema = new mongoose.Schema({
    amount: {
        type: Number,
        required: true
    },
    dueDate: {
        type: Date,
        required: true
    },
    slipId: {
        type: String,
        default: ''
    },
    paidAt: Date,
    receiptUrl: String, // Cloudinary URL
    status: {
        type: String,
        enum: ['pending', 'submitted', 'paid', 'verified', 'rejected', 'overdue'],
        default: 'pending'
    },
    verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    verifiedAt: Date
});

const feeSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    },
    totalFee: {
        type: Number,
        required: true
    },
    paidAmount: {
        type: Number,
        default: 0
    },
    installments: [installmentSchema],
    status: {
        type: String,
        enum: ['pending', 'partial', 'paid', 'verified'],
        default: 'pending'
    },
    rollNoAssigned: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Update status based on payments
feeSchema.methods.updateStatus = function () {
    const verifiedInstallments = this.installments.filter(i => i.status === 'verified');
    this.paidAmount = verifiedInstallments.reduce((sum, i) => sum + i.amount, 0);

    if (this.paidAmount === 0) {
        this.status = 'pending';
    } else if (this.paidAmount < this.totalFee) {
        this.status = 'partial';
    } else if (this.paidAmount >= this.totalFee) {
        this.status = 'verified';
    }
};

module.exports = mongoose.model('Fee', feeSchema);
