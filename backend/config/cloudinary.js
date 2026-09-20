const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Extract Cloudinary public_id from a full URL
// e.g. "https://res.cloudinary.com/adeeb-tech-lab/image/upload/v123/lms/photos/abc123.jpg"
// returns "lms/photos/abc123"
const extractPublicId = (url) => {
    if (!url || typeof url !== 'string') return null;
    try {
        const matches = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.\w+)?$/);
        return matches ? matches[1] : null;
    } catch {
        return null;
    }
};

// Delete an image from Cloudinary by URL (safe to call even if URL is invalid)
const deleteCloudinaryImage = async (url) => {
    const publicId = extractPublicId(url);
    if (!publicId) return;
    try {
        await cloudinary.uploader.destroy(publicId);
    } catch (err) {
        console.error('Failed to delete old Cloudinary image:', err.message);
    }
};

// Storage for profile photos
// Uses fixed public_id (user_<id>) for logged-in users so the URL stays the same on updates.
// For registration (no req.user), generates a random public_id.
const photoStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
        const opts = {
            folder: 'lms/photos',
            allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif', 'bmp', 'tiff'],
            transformation: [{ width: 400, height: 400, crop: 'fill' }]
        };
        if (req.user && req.user.id) {
            opts.public_id = `user_${req.user.id}`;
            opts.overwrite = true;
        }
        return opts;
    }
});

// Storage for fee receipts
const receiptStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'lms/receipts',
        allowed_formats: ['jpg', 'jpeg', 'png', 'pdf', 'webp', 'heic', 'heif', 'bmp', 'tiff']
    }
});

// Storage for assignment submissions
const submissionStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'lms/submissions',
        allowed_formats: ['jpg', 'jpeg', 'png', 'pdf', 'zip', 'doc', 'docx']
    }
});

// Multer upload configurations
const uploadPhoto = multer({ storage: photoStorage });
const uploadReceipt = multer({ storage: receiptStorage });
const uploadSubmission = multer({ storage: submissionStorage });

// Chat files are independent from Google Drive so every authenticated user can
// share images, documents, audio, video and archives in any conversation.
const chatStorage = new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => ({
        folder: 'lms/chat',
        resource_type: 'auto',
        public_id: `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 80)}`
    })
});
const uploadChatFiles = multer({ storage: chatStorage });

// Storage for course images
const courseStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'lms/courses',
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif', 'bmp', 'tiff']
    }
});
const uploadCourse = multer({ storage: courseStorage });

// Unified storage for registration (handles both photo and receipt)
const registrationStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
        if (file.fieldname === 'photo') {
            return {
                folder: 'lms/photos',
                allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif', 'bmp', 'tiff'],
                transformation: [{ width: 400, height: 400, crop: 'fill' }]
            };
        } else if (file.fieldname === 'feeScreenshot') {
            return {
                folder: 'lms/receipts',
                allowed_formats: ['jpg', 'jpeg', 'png', 'pdf', 'webp', 'heic', 'heif', 'bmp', 'tiff']
            };
        }
        return {
            folder: 'lms/others',
            allowed_formats: ['jpg', 'jpeg', 'png', 'pdf', 'webp']
        };
    }
});

const uploadRegistration = multer({ storage: registrationStorage });

module.exports = {
    cloudinary,
    uploadPhoto,
    uploadReceipt,
    uploadSubmission,
    uploadChatFiles,
    uploadCourse,
    uploadRegistration,
    extractPublicId,
    deleteCloudinaryImage
};
