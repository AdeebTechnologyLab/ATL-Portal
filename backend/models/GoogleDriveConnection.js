const mongoose = require('mongoose');

const googleDriveConnectionSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true,
        index: true
    },
    encryptedRefreshToken: {
        type: String,
        required: true,
        select: false
    },
    googleEmail: String,
    connectedAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

module.exports = mongoose.model('GoogleDriveConnection', googleDriveConnectionSchema);
