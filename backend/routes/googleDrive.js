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

const getLinkedUserIds = async (userId) => {
    const user = await User.findById(userId).select('email');
    if (!user?.email) return [userId];
    const linkedUsers = await User.find({ email: user.email }).select('_id');
    return linkedUsers.map(linkedUser => linkedUser._id);
};

const getSharedDriveConnection = async (userId, includeToken = false) => {
    const linkedUserIds = await getLinkedUserIds(userId);
    let query = GoogleDriveConnection.findOne({ user: { $in: linkedUserIds } }).sort({ connectedAt: -1 });
    if (includeToken) query = query.select('+encryptedRefreshToken');
    return query;
};

router.get('/status', protect, async (req, res) => {
    const connection = await getSharedDriveConnection(req.user.id);
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
            const linkedUserIds = await getLinkedUserIds(user._id);
            await GoogleDriveConnection.deleteMany({ user: { $in: linkedUserIds } });
            throw new Error('Google Drive file permission was not allowed. Please connect again and enable Drive file access.');
        }

        const existing = await getSharedDriveConnection(user._id, true);
        const refreshToken = tokens.refresh_token ||
            (existing?.encryptedRefreshToken ? decryptToken(existing.encryptedRefreshToken) : '');
        if (!refreshToken) throw new Error('Google did not return a refresh token. Please reconnect and allow access.');

        const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
        const googleUser = await oauth2.userinfo.get();

        const linkedUserIds = await getLinkedUserIds(user._id);
        await GoogleDriveConnection.deleteMany({ user: { $in: linkedUserIds, $ne: user._id } });
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

        const connection = await getSharedDriveConnection(req.user.id, true);
        if (!connection) {
            return res.status(409).json({ success: false, message: 'Connect Google Drive first' });
        }

        const oauth2Client = getOAuthClient();
        oauth2Client.setCredentials({
            refresh_token: decryptToken(connection.encryptedRefreshToken)
        });

        let driveUpload;
        const assignmentId = req.body.assignmentId;
        const uploadId = req.body.uploadId;
        const reportProgress = ({ progress, stage }) => {
            if (!uploadId) return;
            req.app.get('io')?.to(req.user.id.toString()).emit('drive_upload_progress', {
                uploadId,
                progress,
                stage
            });
        };

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
                teacherEmails: assignment.course?.teachers?.map(teacher => teacher.email) || [],
                onProgress: reportProgress
            });
        } else {
            const userName = req.user.name || 'User';
            const timestamp = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');
            driveUpload = await uploadAssignmentFiles({
                auth: oauth2Client,
                files: req.files,
                courseTitle: 'Chat Files',
                assignmentTitle: `${userName}-${timestamp}`,
                teacherEmails: [],
                onProgress: reportProgress
            });
        }

        reportProgress({ progress: 100, stage: 'Uploaded' });

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
            const linkedUserIds = await getLinkedUserIds(req.user.id);
            await GoogleDriveConnection.deleteMany({ user: { $in: linkedUserIds } });
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

// Remove an accidentally uploaded file from the connected user's Drive.
router.delete('/files/:fileId', protect, async (req, res) => {
    try {
        const connection = await getSharedDriveConnection(req.user.id, true);
        if (!connection) {
            return res.status(409).json({ success: false, message: 'Connect Google Drive first' });
        }

        const oauth2Client = getOAuthClient();
        oauth2Client.setCredentials({
            refresh_token: decryptToken(connection.encryptedRefreshToken)
        });

        const drive = google.drive({ version: 'v3', auth: oauth2Client });
        await drive.files.delete({ fileId: req.params.fileId });
        res.json({ success: true, message: 'File deleted from Google Drive' });
    } catch (error) {
        console.error('Google Drive delete error:', error);
        const status = error.response?.status === 404 ? 404 : 500;
        res.status(status).json({
            success: false,
            message: status === 404 ? 'File was already deleted or could not be found' : 'Could not delete the file from Google Drive'
        });
    }
});

// List the current contents of a previously submitted Drive folder so the
// student can review, remove, or add files before resubmitting.
router.get('/folders/:folderId/files', protect, async (req, res) => {
    try {
        const connection = await getSharedDriveConnection(req.user.id, true);
        if (!connection) {
            return res.status(409).json({ success: false, message: 'Connect Google Drive first' });
        }

        const oauth2Client = getOAuthClient();
        oauth2Client.setCredentials({
            refresh_token: decryptToken(connection.encryptedRefreshToken)
        });
        const drive = google.drive({ version: 'v3', auth: oauth2Client });
        const folderId = req.params.folderId;
        const [folderResponse, filesResponse] = await Promise.all([
            drive.files.get({ fileId: folderId, fields: 'id,name,webViewLink' }),
            drive.files.list({
                q: `'${String(folderId).replace(/'/g, "\\'")}' in parents and trashed=false`,
                fields: 'files(id,name,mimeType,size,webViewLink,thumbnailLink,modifiedTime)',
                orderBy: 'name'
            })
        ]);

        res.json({
            success: true,
            folder: {
                ...folderResponse.data,
                files: (filesResponse.data.files || []).map(file => ({
                    ...file,
                    size: Number(file.size || 0)
                }))
            }
        });
    } catch (error) {
        console.error('Google Drive folder listing error:', error);
        res.status(error.response?.status === 404 ? 404 : 500).json({
            success: false,
            message: 'Could not load files from this Google Drive folder'
        });
    }
});

router.delete('/disconnect', protect, async (req, res) => {
    const linkedUserIds = await getLinkedUserIds(req.user.id);
    await GoogleDriveConnection.deleteMany({ user: { $in: linkedUserIds } });
    res.json({ success: true, message: 'Google Drive disconnected from all profiles linked to this email' });
});

module.exports = router;
