const mongoose = require('mongoose');

const installmentSchema = new mongoose.Schema({
    installmentNumber: {
        type: Number,
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    dueDate: {
        type: Date,
        required: true
    },
    paidDate: Date,
    status: {
        type: String,
        enum: ['pending', 'verified', 'overdue'],
        default: 'pending'
    },
    verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    verifiedAt: Date,
    paymentProof: String // URL to payment screenshot
});

const enrollmentSchema = new mongoose.Schema({
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
    internshipDurationMonths: {
        type: Number,
        enum: [3, 6, 12]
    },
    status: {
        type: String,
        enum: ['pending', 'enrolled', 'completed', 'suspended'],
        default: 'pending'
    },
    enrollmentDate: {
        type: Date
    },
    feeStatus: {
        type: String,
        enum: ['pending', 'partial', 'verified', 'overdue'],
        default: 'pending'
    },
    installments: [installmentSchema],
    isActive: {
        type: Boolean,
        default: false // Becomes true after first installment verified
    },
    registrationDate: {
        type: Date,
        required: true
    },
    grade: String,
    percentage: Number,
    enrolledAt: {
        type: Date,
        default: Date.now
    },
    completedAt: Date,
    isPaused: {
        type: Boolean,
        default: false
    },
    pausedAt: {
        type: Date
    },
    pausedPeriods: [
        {
            from: { type: Date },
            to: { type: Date }  // null means still paused
        }
    ]
}, {
    timestamps: true
});

// Compound index to prevent duplicate enrollments
enrollmentSchema.index({ user: 1, course: 1 }, { unique: true });
// Additional indexes for faster lookups
enrollmentSchema.index({ course: 1 });
enrollmentSchema.index({ user: 1 });
enrollmentSchema.index({ status: 1 });

// Method to check if enrollment should be active
enrollmentSchema.methods.updateActiveStatus = function () {
    if (this.installments.length === 0) {
        // No installments created, check if single payment verified
        this.isActive = this.feeStatus === 'verified';
    } else {
        // Check if first installment is verified
        const firstInstallment = this.installments[0];
        const isFirstVerified = firstInstallment && firstInstallment.status === 'verified';

        // Lock if ANY installment is not verified and past its due date
        // This includes 'pending', 'submitted', 'rejected', or 'overdue'
        const now = new Date();
        const hasOverdue = this.installments.some(inst => 
            inst.status !== 'verified' && 
            now > new Date(inst.dueDate)
        );

        // Active if first verified and no installments are overdue/unverified past due date
        this.isActive = isFirstVerified && !hasOverdue;
    }

    return this.isActive;
};

module.exports = mongoose.model('Enrollment', enrollmentSchema);
