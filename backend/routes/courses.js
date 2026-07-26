const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const Assignment = require('../models/Assignment');
const Attendance = require('../models/Attendance');
const GlobalMessage = require('../models/GlobalMessage');
const Fee = require('../models/Fee');
const DailyTask = require('../models/DailyTask');
const Test = require('../models/Test');
const Certificate = require('../models/Certificate');
const LiveClass = require('../models/LiveClass');
const User = require('../models/User');
const { uploadCourse } = require('../config/cloudinary');

// @route   GET /api/courses/teacher/dashboard
// @desc    Get all teacher's courses with stats in ONE query (optimized)
// @access  Private (Teacher only)
router.get('/teacher/dashboard', protect, authorize('teacher', 'admin'), async (req, res) => {
    try {
        const teacherId = req.user._id.toString();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // 1. Get all courses where this teacher is assigned AND not paused
        const mongoose = require('mongoose');
        const allCourses = await Course.find({
            teachers: teacherId,
            pausedTeachers: { $nin: [new mongoose.Types.ObjectId(teacherId)] }
        })
            .select('title category targetAudience location city isActive startDate durationMonths bookLink')
            .lean();

        if (allCourses.length === 0) {
            return res.json({ success: true, data: [] });
        }

        const courseIds = allCourses.map(c => c._id);

        // 2. Get all enrollments for these courses in ONE query
        const enrollments = await Enrollment.find({ course: { $in: courseIds } })
            .select('course user isActive status isPaused')
            .populate('user', 'name email rollNo photo role attendType guardianPhone lastSeen classTime')
            .lean();

        // 3. Get all assignments for these courses in ONE query
        const assignments = await Assignment.find({ course: { $in: courseIds } })
            .select('course submissions.marks')
            .lean();

        // 4. Get today's attendance for all courses in ONE query
        const todayAttendance = await Attendance.find({
            course: { $in: courseIds },
            date: { $gte: today, $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) }
        }).select('course records.status').lean();

        // Build lookup maps for O(1) access
        const enrollmentMap = {};
        const assignmentMap = {};
        const attendanceMap = {};
        const unreadMessageMap = {};

        courseIds.forEach(id => {
            const idStr = id.toString();
            enrollmentMap[idStr] = [];
            assignmentMap[idStr] = { pending: 0 };
            attendanceMap[idStr] = { present: 0, absent: 0 };
            unreadMessageMap[idStr] = 0;
        });

        // Populate enrollment counts
        enrollments.forEach(e => {
            const courseId = (e.course?._id || e.course).toString();
            if (enrollmentMap[courseId]) {
                enrollmentMap[courseId].push(e);
            }
        });

        // Populate assignment pending counts
        assignments.forEach(a => {
            const courseId = (a.course?._id || a.course).toString();
            if (assignmentMap[courseId]) {
                (a.submissions || []).forEach(s => {
                    const isUngraded = s.marks === undefined || s.marks === null || (typeof s.marks !== 'number');
                    if (isUngraded) {
                        assignmentMap[courseId].pending++;
                    }
                });
            }
        });

        // Populate attendance counts
        todayAttendance.forEach(att => {
            const courseId = (att.course?._id || att.course).toString();
            if (attendanceMap[courseId]) {
                (att.records || []).forEach(r => {
                    if (r.status === 'present') attendanceMap[courseId].present++;
                    else if (r.status === 'absent') attendanceMap[courseId].absent++;
                });
            }
        });

        // Populate unread message counts
        const unreadMessages = await GlobalMessage.aggregate([
            {
                $match: {
                    recipient: new mongoose.Types.ObjectId(teacherId),
                    course: { $in: courseIds },
                    isRead: false
                }
            },
            {
                $group: {
                    _id: "$course",
                    count: { $sum: 1 }
                }
            }
        ]);

        unreadMessages.forEach(um => {
            const courseId = um._id.toString();
            if (unreadMessageMap[courseId] !== undefined) {
                unreadMessageMap[courseId] = um.count;
            }
        });


        // 5. Build final response
        const coursesWithData = allCourses.map(course => {
            const courseId = course._id.toString();
            const courseEnrollments = enrollmentMap[courseId] || [];
            const totalStudents = courseEnrollments.length;
            const activeStudents = courseEnrollments.filter(e => e.isActive && e.status !== 'completed' && !e.isPaused).length;

            return {
                id: course._id,
                _id: course._id,
                name: course.title,
                title: course.title, // Add this for consistency with frontend filters
                category: course.category,
                targetAudience: course.targetAudience || 'students',
                location: course.location,
                city: course.city,
                status: course.isActive !== false ? 'active' : 'inactive',
                startDate: course.startDate,
                durationMonths: course.durationMonths,
                bookLink: course.bookLink || '',
                internCount: totalStudents,
                activeStudents,
                pendingAssignments: assignmentMap[courseId]?.pending || 0,
                presentCount: attendanceMap[courseId]?.present || 0,
                absentCount: attendanceMap[courseId]?.absent || 0,
                unreadMessages: unreadMessageMap[courseId] || 0,
                enrollments: courseEnrollments
            };
        });

        res.json({ success: true, data: coursesWithData });
    } catch (error) {
        console.error('Teacher dashboard error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/courses
// @desc    Get all courses (with filters)
// @access  Public
router.get('/', async (req, res) => {
    try {
        const { targetAudience, location, city, isActive, search } = req.query;

        let query = {};

        // [USER REQUEST]: Filter by city/location and role for logged-in students/interns
        // Check for token manually to avoid mandatory 'protect' behavior
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            try {
                const token = req.headers.authorization.split(' ')[1];
                const jwt = require('jsonwebtoken');
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                const User = require('../models/User');
                const user = await User.findById(decoded.id);

                if (user && (user.role === 'student' || user.role === 'intern')) {
                    // Enforce location filter if user has one
                    if (user.location) {
                        query.location = user.location;
                    }
                    // Enforce target audience based on role
                    query.targetAudience = user.role === 'student' ? 'students' : 'interns';
                }
            } catch (err) {
                // Ignore auth error for public route
            }
        }

        // Apply remaining filters if not already set by role-based logic
        if (targetAudience && !query.targetAudience) query.targetAudience = targetAudience;
        if (location && !query.location) query.location = location;
        if (city) query.city = city;

        if (isActive !== undefined) query.isActive = isActive === 'true';
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        const courses = await Course.find(query)
            .populate('teachers', 'name email specialization photo')
            .populate('jober', 'name email')
            .sort('-createdAt');

        res.json({ success: true, count: courses.length, data: courses });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/courses/:id
// @desc    Get single course
// @access  Public
router.get('/:id', async (req, res) => {
    try {
        const course = await Course.findById(req.params.id)
            .populate('teachers', 'name email specialization photo')
            .populate('jober', 'name email');

        if (!course) {
            return res.status(404).json({ success: false, message: 'Course not found' });
        }

        res.json({ success: true, course });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   POST /api/courses
// @desc    Create new course
// @access  Private (Admin only)
router.post('/', protect, authorize('admin'), uploadCourse.single('image'), async (req, res) => {
    try {
        const bodyData = { ...req.body };

        if (req.file) {
            bodyData.image = req.file.path;
        }

        if (bodyData.durationMonths) {
            bodyData.durationMonths = Number(bodyData.durationMonths);
        }

        // Handle teachers array from FormData properly
        if (bodyData.teachers) {
            let teachersArray = Array.isArray(bodyData.teachers) ? bodyData.teachers : [bodyData.teachers];
            bodyData.teachers = teachersArray.map(t => t.toString().replace(/[\[\]\'\"\s]/g, '').split(',')).flat().filter(Boolean);
        } else {
            bodyData.teachers = [];
        }
        if (bodyData.teachers.length) {
            const validTeacherCount = await User.countDocuments({
                _id: { $in: bodyData.teachers },
                role: 'teacher',
                isVerified: true,
                isActive: { $ne: false }
            });
            if (validTeacherCount !== bodyData.teachers.length) {
                return res.status(400).json({ success: false, message: 'Please select active teachers only' });
            }
        }

        const course = await Course.create(bodyData);
        res.status(201).json({ success: true, course });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   PUT /api/courses/:id
// @desc    Update course
// @access  Private (Admin only)
router.put('/:id', protect, authorize('admin'), uploadCourse.single('image'), async (req, res) => {
    try {
        const bodyData = { ...req.body };

        if (req.file) {
            bodyData.image = req.file.path;
        } else if (bodyData.existingImage) {
            bodyData.image = bodyData.existingImage;
        }
        delete bodyData.existingImage;

        if (bodyData.durationMonths) {
            bodyData.durationMonths = Number(bodyData.durationMonths);
        }

        // Handle teachers array from FormData properly
        if (bodyData.teachers) {
            let teachersArray = Array.isArray(bodyData.teachers) ? bodyData.teachers : [bodyData.teachers];
            bodyData.teachers = teachersArray.map(t => t.toString().replace(/[\[\]\'\"\s]/g, '').split(',')).flat().filter(Boolean);
        } else {
            bodyData.teachers = [];
        }
        if (bodyData.teachers.length) {
            const validTeacherCount = await User.countDocuments({
                _id: { $in: bodyData.teachers },
                role: 'teacher',
                isVerified: true,
                isActive: { $ne: false }
            });
            if (validTeacherCount !== bodyData.teachers.length) {
                return res.status(400).json({ success: false, message: 'Please select active teachers only' });
            }
        }

        const course = await Course.findByIdAndUpdate(req.params.id, bodyData, {
            new: true,
            runValidators: true
        });

        if (!course) {
            return res.status(404).json({ success: false, message: 'Course not found' });
        }

        res.json({ success: true, course });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   DELETE /api/courses/:id
// @desc    Delete course
// @access  Private (Admin only)
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);

        if (!course) {
            return res.status(404).json({ success: false, message: 'Course not found' });
        }

        const courseId = req.params.id;

        // Cascade delete all related data
        await Promise.all([
            Enrollment.deleteMany({ course: courseId }),
            Assignment.deleteMany({ course: courseId }),
            Attendance.deleteMany({ course: courseId }),
            Fee.deleteMany({ course: courseId }),
            DailyTask.deleteMany({ course: courseId }),
            Test.deleteMany({ course: courseId }),
            Certificate.deleteMany({ course: courseId }),
            LiveClass.deleteMany({ course: courseId }),
            GlobalMessage.deleteMany({ course: courseId }),
        ]);

        await course.deleteOne();
        res.json({ success: true, message: 'Course and all related data deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/courses/:id/students
// @desc    Get enrolled students for a course
// @access  Private (Admin, Teacher)
router.get('/:id/students', protect, authorize('admin', 'teacher'), async (req, res) => {
    try {
        const enrollments = await Enrollment.find({ course: req.params.id, status: 'enrolled' })
            .populate('user', 'name email phone photo rollNo role');

        const students = enrollments.map(e => e.user);
        res.json({ success: true, count: students.length, students });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   PUT /api/courses/:courseId/pause-teacher/:teacherId
// @desc    Admin pauses a teacher from a specific course
// @access  Private (Admin)
router.put('/:courseId/pause-teacher/:teacherId', protect, authorize('admin'), async (req, res) => {
    try {
        const course = await Course.findById(req.params.courseId);
        if (!course) return res.status(404).json({ success: false, message: 'Course not found' });

        const teacherId = req.params.teacherId;
        // Ensure teacher is actually assigned to this course
        const isAssigned = course.teachers.some(t => t.toString() === teacherId);
        if (!isAssigned) return res.status(400).json({ success: false, message: 'Teacher is not assigned to this course' });

        // Add to pausedTeachers if not already there
        const alreadyPaused = course.pausedTeachers.some(t => t.toString() === teacherId);
        if (!alreadyPaused) {
            course.pausedTeachers.push(teacherId);
            await course.save();
        }

        res.json({ success: true, message: 'Teacher paused from this course', course });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   PUT /api/courses/:courseId/resume-teacher/:teacherId
// @desc    Admin resumes a teacher for a specific course
// @access  Private (Admin)
router.put('/:courseId/resume-teacher/:teacherId', protect, authorize('admin'), async (req, res) => {
    try {
        const course = await Course.findById(req.params.courseId);
        if (!course) return res.status(404).json({ success: false, message: 'Course not found' });

        const teacherId = req.params.teacherId;
        course.pausedTeachers = course.pausedTeachers.filter(t => t.toString() !== teacherId);
        await course.save();

        res.json({ success: true, message: 'Teacher resumed for this course', course });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   POST /api/courses/:id/view
// @desc    Increment course view count
// @access  Public
router.post('/:id/view', async (req, res) => {
    try {
        const course = await Course.findByIdAndUpdate(
            req.params.id,
            { $inc: { views: 1 } },
            { new: true }
        );
        if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
        res.json({ success: true, views: course.views });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   POST /api/courses/:id/like
// @desc    Toggle course like
// @access  Private
router.post('/:id/like', protect, async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);
        if (!course) return res.status(404).json({ success: false, message: 'Course not found' });

        const userId = req.user._id;
        const alreadyLiked = course.likedBy.includes(userId);

        if (alreadyLiked) {
            // Unlike
            course.likedBy = course.likedBy.filter(id => id.toString() !== userId.toString());
            course.likes = Math.max(0, course.likes - 1);
        } else {
            // Like
            course.likedBy.push(userId);
            course.likes += 1;
        }

        await course.save();
        res.json({ success: true, likes: course.likes, isLiked: !alreadyLiked });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
