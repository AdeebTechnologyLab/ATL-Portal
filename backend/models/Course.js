const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Course title is required'],
        trim: true
    },
    description: {
        type: String,
        required: [true, 'Description is required']
    },
    image: {
        type: String,
        default: ''
    },
    fee: {
        type: String, // Changed to String to allow text (e.g., "Coming Soon")
        required: [true, 'Fee is required']
    },
    originalPrice: {
        type: String, // Changed to String
        default: ''
    },
    durationMonths: {
        type: Number,
        default: null,
        min: [1, 'Duration must be at least 1 month'],
        max: [10, 'Duration cannot exceed 10 months']
    },
    city: {
        type: String,
        enum: ['Bahawalpur', 'Islamabad'],
        required: [true, 'City is required']
    },
    teachers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    jober: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    targetAudience: {
        type: String,
        enum: ['students', 'interns'],
        required: true
    },
    location: {
        type: String,
        enum: ['islamabad', 'bahawalpur'],
        required: [true, 'Location is required']
    },
    maxStudents: {
        type: Number,
        default: 50
    },
    enrolledCount: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    },
    category: {
        type: String,
        default: 'General'
    },
    rating: {
        type: Number,
        default: 0
    },
    bookLink: {
        type: String,
        default: ''
    },
    // Teachers temporarily paused from this course by admin
    pausedTeachers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    // Holiday settings: array of day numbers (0=Sunday, 1=Monday... 5=Friday, 6=Saturday)
    holidayDays: {
        type: [Number],
        default: [],
        validate: {
            validator: function (arr) {
                return arr.every(d => d >= 0 && d <= 6);
            },
            message: 'Holiday days must be between 0 (Sunday) and 6 (Saturday)'
        }
    },
    views: {
        type: Number,
        default: 0
    },
    likes: {
        type: Number,
        default: 0
    },
    likedBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }]
}, {
    timestamps: true
});

module.exports = mongoose.model('Course', courseSchema);
