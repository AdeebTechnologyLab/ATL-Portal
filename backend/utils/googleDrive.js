const crypto = require('crypto');
const { google } = require('googleapis');
const { Readable } = require('stream');

const getEncryptionKey = () => crypto
    .createHash('sha256')
    .update(String(process.env.GOOGLE_TOKEN_ENCRYPTION_KEY || process.env.JWT_SECRET))
    .digest();

const encryptToken = (value) => {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
    const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${iv.toString('base64')}.${tag.toString('base64')}.${encrypted.toString('base64')}`;
};

const decryptToken = (value) => {
    const [iv, tag, encrypted] = String(value).split('.').map(part => Buffer.from(part, 'base64'));
    const decipher = crypto.createDecipheriv('aes-256-gcm', getEncryptionKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
};

const getOAuthClient = () => {
    const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_DRIVE_REDIRECT_URI;
    if (!clientId || !clientSecret || !redirectUri) {
        throw new Error('Google Drive integration is not configured');
    }
    return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
};

const escapeDriveQuery = (value) => String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'");

const getOrCreateFolder = async (drive, name, parentId = null) => {
    const parentQuery = parentId ? `'${parentId}' in parents` : "'root' in parents";
    const response = await drive.files.list({
        q: `name='${escapeDriveQuery(name)}' and mimeType='application/vnd.google-apps.folder' and ${parentQuery} and trashed=false`,
        fields: 'files(id,name)',
        spaces: 'drive'
    });
    if (response.data.files?.[0]) return response.data.files[0].id;

    const created = await drive.files.create({
        requestBody: {
            name,
            mimeType: 'application/vnd.google-apps.folder',
            ...(parentId ? { parents: [parentId] } : {})
        },
        fields: 'id'
    });
    return created.data.id;
};

const uploadAssignmentFiles = async ({ auth, files, courseTitle, assignmentTitle, teacherEmails }) => {
    const drive = google.drive({ version: 'v3', auth });
    const rootFolder = await getOrCreateFolder(drive, 'Adeeb LMS');
    const courseFolder = await getOrCreateFolder(drive, courseTitle, rootFolder);
    const assignmentFolder = await getOrCreateFolder(drive, assignmentTitle, courseFolder);

    const uploadedFiles = [];
    for (const file of files) {
        const uploaded = await drive.files.create({
            requestBody: {
                name: file.originalname,
                parents: [assignmentFolder]
            },
            media: {
                mimeType: file.mimetype,
                body: Readable.from(file.buffer)
            },
            fields: 'id,name,mimeType,size,webViewLink,thumbnailLink'
        });
        uploadedFiles.push(uploaded.data);
    }

    for (const emailAddress of [...new Set(teacherEmails.filter(Boolean))]) {
        try {
            await drive.permissions.create({
                fileId: assignmentFolder,
                requestBody: { type: 'user', role: 'reader', emailAddress },
                sendNotificationEmail: false
            });
        } catch (error) {
            console.warn(`Could not share Drive file with ${emailAddress}:`, error.message);
        }
    }

    const folder = await drive.files.get({
        fileId: assignmentFolder,
        fields: 'id,name,webViewLink'
    });

    return { folder: folder.data, files: uploadedFiles };
};

module.exports = {
    encryptToken,
    decryptToken,
    getOAuthClient,
    uploadAssignmentFiles
};
