const express = require('express');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const { google } = require('googleapis');
const { protect } = require('../middleware/auth');
const User = require('../models/User');
const Assignment = require('../models/Assignment');
const GoogleDriveConnection = require('../models/GoogleDriveConnection');
const {
    encryptToken,
    decryptToken,
    getOAuthClient,
    uploadAssignmentFiles
} = require('../utils/googleDrive');

const router = express.Router();
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 100 * 1024 * 1024 }
});

const isConfigured = () => Boolean(
    process.env.GOOGLE_DRIVE_CLIENT_ID &&
    process.env.GOOGLE_DRIVE_CLIENT_SECRET &&
    process.env.GOOGLE_DRIVE_REDIRECT_URI
);

const DRIVE_FILE_SCOPE = 'https://www.googleapis.com/auth/drive.file';

router.get('/status', protect, async (req, res) => {
    const connection = await GoogleDriveConnection.findOne({ user: req.user.id });
    res.json({
        success: true,
        configured: isConfigured(),
        connected: Boolean(connection),
        googleEmail: connection?.googleEmail || ''
    });
});

router.get('/auth-url', protect, async (req, res) => {
    try {
        const oauth2Client = getOAuthClient();
        const state = jwt.sign(
            { userId: req.user.id },
            process.env.JWT_SECRET,
            { expiresIn: '10m' }
        );

        // Use the configured redirect URI from env to match Google Cloud Console
        oauth2Client.redirectUri = process.env.GOOGLE_DRIVE_REDIRECT_URI;

        const url = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            prompt: 'consent',
            scope: [
                'openid',
                'email',
                DRIVE_FILE_SCOPE
            ],
            include_granted_scopes: true,
            state
        });
        res.json({ success: true, url });
    } catch (error) {
        res.status(503).json({ success: false, message: error.message });
    }
});

router.get('/callback', async (req, res) => {
    const clientUrl = (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, '');
    try {
        const payload = jwt.verify(req.query.state, process.env.JWT_SECRET);
        const user = await User.findById(payload.userId);
        if (!user) throw new Error('User not found');

        const oauth2Client = getOAuthClient();

        // Use the configured redirect URI from env to match Google Cloud Console
        oauth2Client.redirectUri = process.env.GOOGLE_DRIVE_REDIRECT_URI;

        const { tokens } = await oauth2Client.getToken(req.query.code);
        oauth2Client.setCredentials(tokens);

        const grantedScopes = String(tokens.scope || '').split(/\s+/).filter(Boolean);
        if (!grantedScopes.includes(DRIVE_FILE_SCOPE)) {
            await GoogleDriveConnection.deleteOne({ user: user._id });
            throw new Error('Google Drive file permission was not allowed. Please connect again and enable Drive file access.');
        }

        const existing = await GoogleDriveConnection.findOne({ user: user._id })
            .select('+encryptedRefreshToken');
        const refreshToken = tokens.refresh_token ||
            (existing?.encryptedRefreshToken ? decryptToken(existing.encryptedRefreshToken) : '');
        if (!refreshToken) throw new Error('Google did not return a refresh token. Please reconnect and allow access.');

        const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
        const googleUser = await oauth2.userinfo.get();

        await GoogleDriveConnection.findOneAndUpdate(
            { user: user._id },
            {
                encryptedRefreshToken: encryptToken(refreshToken),
                googleEmail: googleUser.data.email || '',
                connectedAt: new Date()
            },
            { upsert: true, new: true, runValidators: true }
        );

        res.redirect(`${clientUrl}/${user.role}/assignments?googleDrive=connected`);
    } catch (error) {
        res.redirect(`${clientUrl}/student/assignments?googleDrive=error&message=${encodeURIComponent(error.message)}`);
    }
});

router.post('/upload', protect, upload.array('files', 10), async (req, res) => {
    try {
        if (!req.files?.length) {
            return res.status(400).json({ success: false, message: 'Please select at least one file' });
        }

        const connection = await GoogleDriveConnection.findOne({ user: req.user.id })
            .select('+encryptedRefreshToken');
        if (!connection) {
            return res.status(409).json({ success: false, message: 'Connect Google Drive first' });
        }

        const oauth2Client = getOAuthClient();
        oauth2Client.setCredentials({
            refresh_token: decryptToken(connection.encryptedRefreshToken)
        });

        let driveUpload;
        const assignmentId = req.body.assignmentId;

        if (assignmentId) {
            const assignment = await Assignment.findById(assignmentId)
                .populate({
                    path: 'course',
                    select: 'title teachers',
                    populate: { path: 'teachers', select: 'email' }
                });
            if (!assignment) {
                return res.status(404).json({ success: false, message: 'Assignment not found' });
            }
            driveUpload = await uploadAssignmentFiles({
                auth: oauth2Client,
                files: req.files,
                courseTitle: assignment.course?.title || 'Course',
                assignmentTitle: assignment.title,
                teacherEmails: assignment.course?.teachers?.map(teacher => teacher.email) || []
            });
        } else {
            const userName = req.user.name || 'User';
            const timestamp = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');
            driveUpload = await uploadAssignmentFiles({
                auth: oauth2Client,
                files: req.files,
                courseTitle: 'Chat Files',
                assignmentTitle: `${userName}-${timestamp}`,
                teacherEmails: []
            });
        }

        res.status(201).json({
            success: true,
            file: {
                id: driveUpload.folder.id,
                name: driveUpload.folder.name,
                mimeType: 'application/vnd.google-apps.folder',
                size: driveUpload.files.reduce((total, file) => total + Number(file.size || 0), 0),
                webViewLink: driveUpload.folder.webViewLink,
                thumbnailLink: '',
                files: driveUpload.files.map(file => ({
                    id: file.id,
                    name: file.name,
                    mimeType: file.mimeType,
                    size: Number(file.size || 0),
                    webViewLink: file.webViewLink,
                    thumbnailLink: file.thumbnailLink || ''
                }))
            }
        });
    } catch (error) {
        console.error('Google Drive upload error:', error);
        const googleError = error.response?.data?.error;
        const googleErrorCode = typeof googleError === 'string' ? googleError : googleError?.status;
        const errorMessage = error.response?.data?.error_description || googleError?.message || error.message || 'Google Drive upload failed';
        const hasInvalidClient =
            googleErrorCode === 'invalid_client' ||
            /invalid_client|unauthorized client|client authentication failed/i.test(errorMessage);
        const needsReauthorization =
            error.response?.status === 403 &&
            /insufficient authentication scopes|insufficient permission|insufficient.*scope/i.test(errorMessage);

        if (needsReauthorization || hasInvalidClient) {
            await GoogleDriveConnection.deleteOne({ user: req.user.id });
        }

        res.status(needsReauthorization ? 403 : hasInvalidClient ? 503 : 500).json({
            success: false,
            code: needsReauthorization
                ? 'GOOGLE_DRIVE_REAUTH_REQUIRED'
                : hasInvalidClient
                    ? 'GOOGLE_DRIVE_CONFIG_INVALID'
                    : 'GOOGLE_DRIVE_UPLOAD_FAILED',
            message: needsReauthorization
                ? 'Drive file permission is missing. Reconnect Google Drive and allow file access.'
                : hasInvalidClient
                    ? 'Google Drive client credentials are invalid. Ask the administrator to update the Google OAuth Client ID and secret.'
                : errorMessage
        });
    }
});

router.delete('/disconnect', protect, async (req, res) => {
    await GoogleDriveConnection.deleteOne({ user: req.user.id });
    res.json({ success: true, message: 'Google Drive disconnected' });
});

module.exports = router;
