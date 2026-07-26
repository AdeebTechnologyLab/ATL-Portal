const mongoose = require('mongoose');

const sharedReportSchema = new mongoose.Schema({
    token: { type: String, required: true, unique: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    fileName: { type: String, required: true },
    contentType: { type: String, default: 'application/pdf' },
    fileData: { type: Buffer, required: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } }
}, { timestamps: true });

module.exports = mongoose.model('SharedReport', sharedReportSchema);
