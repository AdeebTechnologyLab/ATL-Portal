const express = require('express');
const router = express.Router();
const PaymentMethod = require('../models/PaymentMethod');
const { protect, authorize } = require('../middleware/auth');

// Public: Get all active payment methods (for students)
router.get('/public', async (req, res) => {
    try {
        const methods = await PaymentMethod.find({ isActive: true }).sort({ order: 1, createdAt: 1 });
        res.json({ success: true, data: methods });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Admin: Get all payment methods (including inactive)
router.get('/', protect, authorize('admin'), async (req, res) => {
    try {
        const methods = await PaymentMethod.find().sort({ order: 1, createdAt: 1 });
        res.json({ success: true, data: methods });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Admin: Create payment method
router.post('/', protect, authorize('admin'), async (req, res) => {
    try {
        const { bankName, accountName, accountNumber, imageLink, color, isActive, order } = req.body;
        const method = await PaymentMethod.create({ bankName, accountName, accountNumber, imageLink, color, isActive, order });
        res.status(201).json({ success: true, data: method });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

// Admin: Update payment method
router.put('/:id', protect, authorize('admin'), async (req, res) => {
    try {
        const method = await PaymentMethod.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!method) return res.status(404).json({ success: false, message: 'Payment method not found' });
        res.json({ success: true, data: method });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

// Admin: Delete payment method
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
    try {
        const method = await PaymentMethod.findByIdAndDelete(req.params.id);
        if (!method) return res.status(404).json({ success: false, message: 'Payment method not found' });
        res.json({ success: true, message: 'Deleted successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
