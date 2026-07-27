const mongoose = require('mongoose');

const paymentMethodSchema = new mongoose.Schema({
    bankName: {
        type: String,
        required: [true, 'Bank name is required'],
        trim: true
    },
    accountName: {
        type: String,
        required: [true, 'Account name is required'],
        trim: true
    },
    accountNumber: {
        type: String,
        required: [true, 'Account number is required'],
        trim: true
    },
    imageLink: {
        type: String,
        default: ''
    },
    color: {
        type: String,
        default: '#10b981'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    order: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('PaymentMethod', paymentMethodSchema);
