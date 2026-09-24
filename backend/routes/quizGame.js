const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const QuizGame = require('../models/QuizGame');
const Test = require('../models/Test');
const User = require('../models/User');
const { sendPushNotification } = require('../utils/pushHelper');

router.use(protect);

const GAME_QUESTION_COUNT = 10;
const WAITING_TIMEOUT_MS = 2 * 60 * 1000; // 2 min tak koi join na kare to room cancel

const pickRandomQuestions = (questions, count) => {
    const pool = [...(questions || [])];
    const picked = [];
    while (picked.length < count && pool.length > 0) {
        const index = Math.floor(Math.random() * pool.length);
        picked.push(pool.splice(index, 1)[0]);
    }
    return picked.map(q => ({
        question: q.question,
        options: q.options || [],
        correctOption: q.correctOption
    }));
};

// Safely emit socket event
const emitTo = (req, socketId, event, payload) => {
    try {
        req.app.get('io')?.to(String(socketId)).emit(event, payload);
    } catch { /* socket optional */ }
};

const emitToRoom = (req, roomId, event, payload) => {
    try {
        req.app.get('io')?.to(String(roomId)).emit(event, payload);
    } catch { /* socket optional */ }
};

const presentGame = (game, viewerUserId) => {
    const data = game.toObject ? game.toObject() : game;
    const viewer = String(viewerUserId || '');
    const isPlayer = (data.players || []).some(p => String(p.user?._id || p.user) === viewer);
    const safePlayers = (data.players || []).map(p => ({
        _id: p._id,
        user: p.user?._id || p.user,
        role: p.role,
        name: p.name,
        photo: p.photo,
        joinedAt: p.joinedAt,
        score: p.score,
        finished: p.finished,
        finishedAt: p.finishedAt,
        // Answers sirf apne dikhte hain (ya game end hone par)
        answers: isPlayer || data.status === 'ended' ? Object.fromEntries(p.answers || new Map()) : {},
        reveal: isPlayer || data.status === 'ended' ? (p.reveal || []) : []
    }));
    return {
        ...data,
        questions: data.questions?.map(q => ({
            question: q.question,
            options: q.options
            // correctOption client ko nahi bhejte jab tak game end na ho
        })) || [],
        correctOptions: data.status === 'ended' ? (data.questions || []).map(q => q.correctOption) : null,
        players: safePlayers,
        isPlayer
    };
};

// @route   GET /api/quiz-game/summary
// @desc    Courses with tests (subject select screen)
router.get('/summary', async (req, res) => {
    try {
        const tests = await Test.find({ isActive: true })
            .populate('course', 'title')
            .select('title course totalMarks questions')
            .sort('-createdAt')
            .lean();

        const courseMap = new Map();
        tests.forEach(test => {
            if (!test.course?._id) return;
            const courseId = String(test.course._id);
            if (!courseMap.has(courseId)) {
                courseMap.set(courseId, {
                    _id: courseId,
                    title: test.course.title,
                    testCount: 0
                });
            }
            courseMap.get(courseId).testCount += 1;
        });

        res.json({ success: true, data: Array.from(courseMap.values()) });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/quiz-game/tests/:courseId
// @desc    Test titles for a subject
router.get('/tests/:courseId', async (req, res) => {
    try {
        const tests = await Test.find({ course: req.params.courseId, isActive: true })
            .select('title totalMarks questions')
            .sort('-createdAt')
            .lean();
        res.json({
            success: true,
            data: tests.map(t => ({
                _id: t._id,
                title: t.title,
                totalMarks: t.totalMarks,
                questionCount: (t.questions || []).length
            })).filter(t => t.questionCount > 0)
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   POST /api/quiz-game/create
// @desc    Create a waiting room (player 1)
router.post('/create', async (req, res) => {
    try {
        const { testId } = req.body;
        if (!testId) return res.status(400).json({ success: false, message: 'Test is required' });

        // Pehle koi purana waiting/active game nahi hona chahiye
        const existing = await QuizGame.findOne({
            'players.user': req.user.id,
            status: { $in: ['waiting', 'active'] }
        });
        if (existing) {
            return res.json({ success: true, data: presentGame(existing, req.user.id), resumed: true });
        }

        const test = await Test.findById(testId).select('title course questions').lean();
        if (!test || !(test.questions || []).length) {
            return res.status(404).json({ success: false, message: 'Test not found or has no questions' });
        }

        const questions = pickRandomQuestions(test.questions, GAME_QUESTION_COUNT);
        const game = await QuizGame.create({
            course: test.course,
            test: test._id,
            testTitle: test.title,
            questions,
            status: 'waiting',
            players: [{
                user: req.user.id,
                role: req.user.role,
                name: req.user.name,
                photo: req.user.photo || ''
            }]
        });

        // Sab students/interns ko notification: challenge khara ho gaya hai
        try {
            const opponents = await User.find({
                role: { $in: ['student', 'intern'] },
                _id: { $ne: req.user.id }
            }).select('_id');
            const payload = {
                title: '🧠 Quiz Battle Challenge!',
                body: `${req.user.name} ne "${test.title}" ke liye challenge khara kiya hai — pehle join karo!`,
                icon: '/logo.png',
                url: `/${req.user.role === 'intern' ? 'intern' : 'student'}/quiz-game`,
                data: { gameId: String(game._id), type: 'quiz_challenge' }
            };
            opponents.forEach(opponent => {
                emitTo(req, opponent._id, 'quiz_challenge', {
                    gameId: String(game._id),
                    hostName: req.user.name,
                    testTitle: test.title
                });
                sendPushNotification(opponent._id.toString(), payload);
            });
        } catch (notifyError) {
            console.error('Quiz challenge notification error:', notifyError.message);
        }

        res.status(201).json({ success: true, data: presentGame(game, req.user.id) });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   POST /api/quiz-game/:id/join
// @desc    Player 2 joins -> game starts automatically
router.post('/:id/join', async (req, res) => {
    try {
        const game = await QuizGame.findById(req.params.id);
        if (!game) return res.status(404).json({ success: false, message: 'Game not found' });

        if (game.status === 'ended') {
            return res.status(400).json({ success: false, message: 'This game has already ended' });
        }

        if (game.players.some(p => String(p.user) === String(req.user.id))) {
            return res.json({ success: true, data: presentGame(game, req.user.id), resumed: true });
        }

        if (game.status !== 'waiting' || game.players.length >= 2) {
            return res.status(400).json({ success: false, message: 'This room is already full' });
        }

        game.players.push({
            user: req.user.id,
            role: req.user.role,
            name: req.user.name,
            photo: req.user.photo || ''
        });
        game.status = 'active';
        game.startedAt = new Date();
        await game.save();

        const room = `quiz-game:${game._id}`;
        emitToRoom(req, room, 'quiz_game_started', { gameId: String(game._id) });

        // Dono players ko socket room mein bhejo
        game.players.forEach(p => emitTo(req, p.user, 'quiz_game_joined', {
            gameId: String(game._id),
            room
        }));

        res.json({ success: true, data: presentGame(game, req.user.id) });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   POST /api/quiz-game/:id/answer
// @desc    Submit answer for current question (race-safe)
router.post('/:id/answer', async (req, res) => {
    try {
        const { questionIndex, selectedOption } = req.body;
        const game = await QuizGame.findById(req.params.id);
        if (!game) return res.status(404).json({ success: false, message: 'Game not found' });
        if (game.status !== 'active') return res.status(400).json({ success: false, message: 'Game is not active' });

        const player = game.players.find(p => String(p.user) === String(req.user.id));
        if (!player) return res.status(403).json({ success: false, message: 'You are not in this game' });

        const idx = Number(questionIndex);
        if (!Number.isInteger(idx) || idx < 0 || idx >= game.questions.length) {
            return res.status(400).json({ success: false, message: 'Invalid question' });
        }
        if (player.answers.has(String(idx))) {
            return res.json({ success: true, data: presentGame(game, req.user.id) });
        }

        player.answers.set(String(idx), Number(selectedOption));
        const allAnswered = game.players.length > 0 && game.players.every(p => p.answers.has(String(idx)));
        await game.save();

        const room = `quiz-game:${game._id}`;
        // Dono ko pata chale ke dono ne answer kar diya -> dono auto-next
        if (allAnswered) {
            emitToRoom(req, room, 'quiz_game_next', { gameId: String(game._id), nextIndex: idx + 1 });
        } else {
            // Doosre player ko pata chale ke saamne wala answer kar chuka
            game.players.filter(p => String(p.user) !== String(req.user.id)).forEach(p =>
                emitTo(req, p.user, 'quiz_game_opponent_answered', {
                    gameId: String(game._id),
                    questionIndex: idx
                })
            );
        }

        res.json({ success: true, data: presentGame(game, req.user.id), allAnswered });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

const finishGame = async (req, res) => {
    try {
        const game = await QuizGame.findById(req.params.id);
        if (!game) return res.status(404).json({ success: false, message: 'Game not found' });
        if (game.status === 'ended') {
            return res.json({ success: true, data: presentGame(game, req.user.id) });
        }

        // Scores compute + reveal build
        let best = { score: -1, userId: null, count: 0 };
        const scores = game.players.map(p => {
            let score = 0;
            const reveal = game.questions.map((q, idx) => {
                const selected = p.answers.get(String(idx));
                const correct = selected !== undefined && selected === q.correctOption;
                if (correct) score += 1;
                return {
                    questionIndex: idx,
                    correct,
                    selected: selected ?? null,
                    correctOption: q.correctOption
                };
            });
            p.score = score;
            p.reveal = reveal;
            p.finished = true;
            p.finishedAt = p.finishedAt || new Date();
            return p;
        });

        scores.forEach(p => {
            if (p.score > best.score) best = { score: p.score, userId: p.user, count: 1 };
            else if (p.score === best.score) best.count += 1;
        });

        game.isTie = best.count > 1;
        game.winner = game.isTie ? null : best.userId;
        game.status = 'ended';
        game.endedAt = new Date();
        await game.save();

        const room = `quiz-game:${game._id}`;
        emitToRoom(req, room, 'quiz_game_ended', { gameId: String(game._id) });

        res.json({ success: true, data: presentGame(game, req.user.id) });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @route   POST /api/quiz-game/:id/finish
router.post('/:id/finish', finishGame);

// @route   GET /api/quiz-game/:id
// @desc    Poll game state (fallback if socket misses)
router.get('/:id', async (req, res) => {
    try {
        const game = await QuizGame.findById(req.params.id);
        if (!game) return res.status(404).json({ success: false, message: 'Game not found' });
        res.json({ success: true, data: presentGame(game, req.user.id) });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/quiz-game/open
// @desc    Open waiting rooms (for notifications/browse)
router.get('/open', async (req, res) => {
    try {
        const since = new Date(Date.now() - WAITING_TIMEOUT_MS);
        const games = await QuizGame.find({
            status: 'waiting',
            createdAt: { $gte: since }
        })
            .populate('players.user', 'name photo role')
            .sort('-createdAt')
            .limit(20)
            .lean();

        res.json({
            success: true,
            data: games.map(g => ({
                _id: g._id,
                testTitle: g.testTitle,
                createdAt: g.createdAt,
                host: g.players?.[0] ? {
                    _id: g.players[0].user?._id || g.players[0].user,
                    name: g.players[0].user?.name || g.players[0].name,
                    photo: g.players[0].user?.photo || g.players[0].photo
                } : null
            })).filter(g => g.host && String(g.host._id) !== String(req.user.id))
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/quiz-game/my/history
router.get('/my/history', async (req, res) => {
    try {
        const games = await QuizGame.find({
            players: { $elemMatch: { user: req.user.id } },
            status: 'ended'
        })
            .sort('-endedAt')
            .limit(10)
            .lean();

        res.json({
            success: true,
            data: games.map(g => ({
                _id: g._id,
                testTitle: g.testTitle,
                isTie: g.isTie,
                winner: g.winner,
                endedAt: g.endedAt,
                myScore: (g.players || []).find(p => String(p.user) === String(req.user.id))?.score ?? 0,
                opponentScore: (g.players || []).find(p => String(p.user) !== String(req.user.id))?.score ?? 0
            }))
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
