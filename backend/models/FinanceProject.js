const mongoose = require('mongoose');

const developerSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    designation: { type: String, trim: true, default: '' },
    percentage: { type: Number, min: 0, default: 0 },
    totalPayable: { type: Number, required: true, min: 0, default: 0 },
    paidAmount: { type: Number, min: 0, default: 0 }
}, { _id: true });

const companySchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    designation: { type: String, trim: true, default: '' },
    percentage: { type: Number, min: 0, default: 0 },
    totalPayable: { type: Number, required: true, min: 0, default: 0 },
    paidAmount: { type: Number, min: 0, default: 0 }
}, { _id: true });

const financeProjectSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    clientName: { type: String, required: true, trim: true },
    clientPhone: { type: String, trim: true, default: '' },
    clientTotal: { type: Number, required: true, min: 0 },
    clientReceived: { type: Number, min: 0, default: 0 },
    developers: { type: [developerSchema], default: [] },
    companies: { type: [companySchema], default: [] },
    status: { type: String, enum: ['processing', 'completed'], default: 'processing' },
    startDate: { type: Date, default: Date.now },
    completionDate: { type: Date, default: null },
    description: { type: String, trim: true, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

module.exports = mongoose.model('FinanceProject', financeProjectSchema);
