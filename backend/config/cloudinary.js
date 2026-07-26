const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Storage for profile photos
const photoStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'lms/photos',
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif', 'bmp', 'tiff'],
        transformation: [{ width: 400, height: 400, crop: 'fill' }]
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
    uploadCourse,
    uploadRegistration
};
