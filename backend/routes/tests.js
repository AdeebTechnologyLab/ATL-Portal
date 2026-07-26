const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Test = require('../models/Test');
const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');
const mongoose = require('mongoose');
const UserNotification = require('../models/UserNotification');
const { sendPushNotification } = require('../utils/pushHelper');

const normalizeAnswerText = (value) => String(value || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/^[a-d][).:\-\s]+/i, '')
    .replace(/^option\s+[a-d][).:\-\s]*/i, '')
    .trim();

const resolveOptionIndex = (value, options = []) => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;

    const raw = String(value ?? '').trim();
    if (!raw) return -1;

    if (/^-?\d+$/.test(raw)) return Number(raw);

    const letterMatch = raw.match(/^(?:option\s*)?([a-d])(?:[).:\-\s]|$)/i);
    if (letterMatch) return letterMatch[1].toUpperCase().charCodeAt(0) - 65;

    const normalizedRaw = normalizeAnswerText(raw);
    const textIndex = options.findIndex(option => normalizeAnswerText(option) === normalizedRaw);
    if (textIndex !== -1) return textIndex;

    return options.findIndex(option => {
        const normalizedOption = normalizeAnswerText(option);
        return normalizedOption && (normalizedOption.includes(normalizedRaw) || normalizedRaw.includes(normalizedOption));
    });
};

const sanitizeQuestions = (questions = []) => questions.map(q => {
    const rawOptions = (q.options || []).map(o => (typeof o === 'string' ? o.trim() : ''));
    const options = [];
    const originalToCleanIndex = new Map();

    rawOptions.forEach((option, index) => {
        if (option.length > 0) {
            originalToCleanIndex.set(index, options.length);
            options.push(option);
        }
    });

    const rawCorrectIndex = resolveOptionIndex(q.correctOption ?? q.correctAnswer ?? q.answer, rawOptions);
    let correctOption = originalToCleanIndex.has(rawCorrectIndex)
        ? originalToCleanIndex.get(rawCorrectIndex)
        : resolveOptionIndex(q.correctOption ?? q.correctAnswer ?? q.answer, options);

    if (!Number.isInteger(correctOption) || correctOption < 0 || correctOption >= options.length) {
        correctOption = 0;
    }

    return {
        ...q,
        question: (q.question || '').trim(),
        options,
        correctOption,
        // Every MCQ carries exactly one mark.
        marks: 1
    };
}).filter(q => q.question.length > 0 && q.options.length >= 2);

const calculateTotalMarks = (questions = []) => questions.length;

const normalizeSubmissionScore = (submission, totalQuestions) => {
    const previousTotal = Number(submission.totalPossibleScore) || totalQuestions;
    const previousScore = Number(submission.score) || 0;
    if (previousTotal > 0 && previousTotal !== totalQuestions) {
        submission.score = Math.round((previousScore / previousTotal) * totalQuestions);
    }
    submission.totalPossibleScore = totalQuestions;
    return previousTotal !== totalQuestions || previousScore !== Number(submission.score);
};

// @route   GET /api/tests/course/:courseId
// @desc    Get all tests for a course
// @access  Private
router.get('/course/:courseId', protect, async (req, res) => {
    try {
        let query = Test.find({ course: req.params.courseId })
            .populate('createdBy', 'name')
            .sort('-createdAt');

        // Only populate submission details for teachers/admins
        if (req.user.role === 'teacher' || req.user.role === 'admin') {
            query = query.populate('submissions.user', 'name photo rollNo');
        }

        const tests = await query;
        const scoreCorrectionWrites = [];
        tests.forEach(test => {
            const computedTotal = calculateTotalMarks(test.questions);
            const storedTestTotal = Number(test.totalMarks);
            if (computedTotal > 0) test.totalMarks = computedTotal;
            const correctedFields = { totalMarks: computedTotal };
            let needsCorrection = storedTestTotal !== computedTotal;

            test.submissions.forEach((submission, submissionIndex) => {
                if (normalizeSubmissionScore(submission, computedTotal)) {
                    needsCorrection = true;
                    correctedFields[`submissions.${submissionIndex}.score`] = submission.score;
                    correctedFields[`submissions.${submissionIndex}.totalPossibleScore`] = computedTotal;
                }
            });

            if (needsCorrection) {
                scoreCorrectionWrites.push(
                    Test.updateOne({ _id: test._id }, { $set: correctedFields })
                );
            }
        });

        if (scoreCorrectionWrites.length > 0) {
            await Promise.all(scoreCorrectionWrites);
        }

        // If student, filter out answers from questions to prevent cheating
        if (req.user.role === 'student' || req.user.role === 'intern') {
            const userId = req.user.id.toString();

            const studentTests = tests.filter(test => {
                const isAssigned = test.assignTo === 'all' || test.assignedUsers?.some(id => id.toString() === userId);
                const isPublished = !test.scheduledAt || new Date(test.scheduledAt) <= new Date();
                return isAssigned && isPublished;
            });

            const sanitizedTests = studentTests.map(test => {
                const testObj = test.toObject();
                // Filter submissions to only show current user's
                testObj.submissions = testObj.submissions.filter(s => {
                    const subUserId = (s.user._id || s.user).toString();
                    return subUserId === userId;
                });

                // Remove correctOption from questions if user hasn't submitted yet
                if (testObj.submissions.length === 0) {
                    testObj.questions = testObj.questions.map(q => {
                        const { correctOption, ...rest } = q;
                        return rest;
                    });
                }
                return testObj;
            });
            return res.json({ success: true, tests: sanitizedTests });
        }

        res.json({ success: true, tests });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   POST /api/tests
// @desc    Create a new test
// @access  Private (Teacher, Admin)
router.post('/', protect, authorize('teacher', 'admin'), async (req, res) => {
    try {
        const { courseId, title, description, questions, duration, dueDate, scheduledAt, assignTo, assignedUsers } = req.body;

        const sanitizedQuestions = sanitizeQuestions(questions);
        const totalMarks = calculateTotalMarks(sanitizedQuestions);

        const test = await Test.create({
            course: courseId,
            title,
            description,
            questions: sanitizedQuestions,
            totalMarks,
            duration,
            dueDate: dueDate || null,
            scheduledAt: scheduledAt || null,
            assignTo: assignTo || 'all',
            assignedUsers: assignedUsers || [],
            createdBy: req.user.id
        });

        // Notify students
        const targetUsers = assignTo === 'all' 
            ? (await Enrollment.find({ course: courseId })).map(e => e.user)
            : assignedUsers;

        targetUsers.forEach(async (userId) => {
            const userIdStr = userId.toString();
            const notificationTitle = 'New Test Assigned 📝';
            const notificationMessage = `A new test "${title}" has been assigned to you.`;

            // Push Notification
            sendPushNotification(userIdStr, {
                title: notificationTitle,
                body: notificationMessage,
                icon: '/logo.png',
                image: '/logo.png',
                badge: '/logo.png',
                url: '/student/tests'
            });

            // Persistent Notification
            try {
                await UserNotification.create({
                    user: userIdStr,
                    title: notificationTitle,
                    message: notificationMessage,
                    type: 'test_assigned'
                });
            } catch (err) {
                console.error('Error creating test notification:', err);
            }
        });

        res.status(201).json({ success: true, test });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   POST /api/tests/:id/submit
// @desc    Submit test answers and auto-grade
// @access  Private (Student, Intern)
router.post('/:id/submit', protect, async (req, res) => {
    try {
        const { answers } = req.body;
        const test = await Test.findById(req.params.id);

        if (!test) {
            return res.status(404).json({ success: false, message: 'Test not found' });
        }

        // Check if already submitted
        const existingSubmission = test.submissions.find(
            s => s.user.toString() === req.user.id
        );

        if (existingSubmission) {
            return res.status(400).json({ success: false, message: 'Test already submitted' });
        }

        // Auto-grading logic
        let score = 0;
        let totalPossibleScore = 0;
        const processedAnswers = (answers || []).map(ans => {
            const question = test.questions.id(ans.questionId);
            const selectedOption = question ? resolveOptionIndex(ans.selectedOption, question.options) : -1;

            if (question) {
                const questionMarks = 1;
                totalPossibleScore += questionMarks;
                if (question.correctOption === selectedOption) {
                    score += questionMarks;
                }
            }
            return {
                ...ans,
                selectedOption
            };
        });

        const submission = {
            user: req.user.id,
            answers: processedAnswers,
            score,
            totalPossibleScore,
            submittedAt: new Date()
        };

        // Use updateOne to add the submission without triggering full document validation
        await Test.updateOne(
            { _id: test._id },
            { $push: { submissions: submission } }
        );

        // Notify teachers
        const io = req.app.get('io');
        if (io) {
            const course = await Course.findById(test.course).populate('teachers', '_id name');
            if (course && course.teachers) {
                for (const teacher of course.teachers) {
                    const teacherId = teacher._id.toString();
                    
                    // Socket event
                    io.to(teacherId).emit('new_test_submission', {
                        studentName: req.user.name,
                        testTitle: test.title,
                        score: score
                    });

                    // Push Notification
                    sendPushNotification(teacherId, {
                        title: 'Test Completed ✅',
                        body: `${req.user.name} completed the test "${test.title}". Score: ${score}/${totalPossibleScore}`,
                        icon: '/logo.png',
                        image: '/logo.png',
                        badge: '/logo.png',
                        url: '/teacher/dashboard'
                    });
                }
            }
        }

        res.json({
            success: true,
            message: 'Test submitted and graded successfully',
            score,
            totalMarks: totalPossibleScore,
            questions: test.questions // Now including correctOption
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   PUT /api/tests/:id
// @desc    Update a test
// @access  Private (Teacher, Admin)
router.put('/:id', protect, authorize('teacher', 'admin'), async (req, res) => {
    try {
        const { title, description, questions, duration, dueDate, scheduledAt, assignTo, assignedUsers } = req.body;

        const sanitizedQuestions = sanitizeQuestions(questions);
        const totalMarks = calculateTotalMarks(sanitizedQuestions);

        const updatedData = {
            title,
            description,
            questions: sanitizedQuestions,
            totalMarks,
            duration,
            dueDate: dueDate || null,
            scheduledAt: scheduledAt || null,
            assignTo: assignTo || 'all',
            assignedUsers: assignedUsers || []
        };

        const test = await Test.findByIdAndUpdate(req.params.id, updatedData, { new: true });

        if (!test) {
            return res.status(404).json({ success: false, message: 'Test not found' });
        }

        res.json({ success: true, test });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   DELETE /api/tests/:testId/submissions/:submissionId
// @desc    Delete a test submission
// @access  Private (Teacher, Admin)
router.delete('/:testId/submissions/:submissionId', protect, authorize('teacher', 'admin'), async (req, res) => {
    try {
        const test = await Test.findById(req.params.testId);
        if (!test) return res.status(404).json({ success: false, message: 'Test not found' });

        const initialLength = test.submissions.length;
        test.submissions = test.submissions.filter(
            sub => sub._id.toString() !== req.params.submissionId
        );

        if (test.submissions.length === initialLength) {
            return res.status(404).json({ success: false, message: 'Submission not found' });
        }

        await test.save();
        res.json({ success: true, message: 'Submission deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   DELETE /api/tests/:id
// @desc    Delete a test
// @access  Private (Teacher, Admin)
router.delete('/:id', protect, authorize('teacher', 'admin'), async (req, res) => {
    try {
        const test = await Test.findById(req.params.id);
        if (!test) return res.status(404).json({ success: false, message: 'Test not found' });

        await test.deleteOne();
        res.json({ success: true, message: 'Test deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
