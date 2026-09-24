const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    role: {
        type: String,
        default: 'student'
    },
    name: String,
    photo: String,
    joinedAt: {
        type: Date,
        default: Date.now
    },
    // questionIndex -> selected option (race-safe answers store)
    answers: {
        type: Map,
        of: Number,
        default: {}
    },
    score: {
        type: Number,
        default: 0
    },
    finished: {
        type: Boolean,
        default: false
    },
    finishedAt: Date,
    // Finish hone par correct answers reveal hote hain
    reveal: [{
        questionIndex: Number,
        correct: Boolean,
        selected: Number,
        correctOption: Number
    }]
}, { _id: false });

const quizGameSchema = new mongoose.Schema({
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    },
    test: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Test',
        required: true
    },
    testTitle: String,
    // Test ke questions se randomly picked 10 (questions are embedded subdocs)
    questions: [{
        question: String,
        options: [String],
        correctOption: Number
    }],
    status: {
        type: String,
        enum: ['waiting', 'active', 'ended'],
        default: 'waiting'
    },
    players: [playerSchema],
    winner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    // Tie handle karne ke liye
    isTie: {
        type: Boolean,
        default: false
    },
    startedAt: Date,
    endedAt: Date,
    // Stale waiting rooms auto-clean karne ke liye
    createdAt: {
        type: Date,
        default: Date.now,
        expires: '2h'
    }
});

// Ek user ek waqt mein sirf ek waiting/active game mein
quizGameSchema.index({ 'players.user': 1, status: 1 });

module.exports = mongoose.model('QuizGame', quizGameSchema);
