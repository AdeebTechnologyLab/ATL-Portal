const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Certificate = require('../models/Certificate');
const CertificateRequest = require('../models/CertificateRequest');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const User = require('../models/User');
const Fee = require('../models/Fee');

// @route   GET /api/certificates/my
// @desc    Get logged-in user's certificates
// @access  Private
router.get('/my', protect, async (req, res) => {
    try {
        const certificates = await Certificate.find({ user: req.user.id })
            .populate('course', 'title description location')
            .sort('-issuedAt');

        res.json({ success: true, certificates });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/certificates/requests
// @desc    Get all pending certificate requests
// @access  Private (Admin)
router.get('/requests', protect, authorize('admin'), async (req, res) => {
    try {
        console.log('📋 [ROUTES] Fetching pending certificate requests for user:', req.user.name);
        const requests = await CertificateRequest.find({ status: 'pending' })
            .populate('user', 'name email rollNo photo role cnic')
            .populate('course', 'title description location')
            .populate('teacher', 'name email')
            .sort('-createdAt');

        // Filter out requests with null references
        const validRequests = requests.filter(r => r.user && r.course);

        console.log(`✅ [ROUTES] Found ${validRequests.length} certificate requests (${requests.length} total)`);
        res.json({ success: true, requests: validRequests });
    } catch (error) {
        console.error('❌ [ROUTES] Error fetching requests:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   POST /api/certificates/request
// @desc    Teacher requests certificate for a student
// @access  Private (Teacher)
router.post('/request', protect, authorize('teacher'), async (req, res) => {
    try {
        const { userId, courseId, skills, duration, notes } = req.body;

        // Check enrollment
        const enrollment = await Enrollment.findOne({ user: userId, course: courseId });
        if (!enrollment) {
            return res.status(404).json({ success: false, message: 'Student is not enrolled in this course' });
        }

        // Check if already issued
        const existingCert = await Certificate.findOne({ user: userId, course: courseId });
        if (existingCert) {
            return res.status(400).json({ success: false, message: 'Certificate already issued for this student' });
        }

        // Check if existing pending request
        const existingRequest = await CertificateRequest.findOne({ user: userId, course: courseId, status: 'pending' });
        if (existingRequest) {
            return res.status(400).json({ success: false, message: 'A pending request already exists for this student' });
        }

        const request = await CertificateRequest.create({
            user: userId,
            course: courseId,
            teacher: req.user.id,
            skills,
            duration,
            notes
        });

        res.status(201).json({ success: true, request });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   PUT /api/certificates/requests/:id/approve
// @desc    Approve request and issue certificate
// @access  Private (Admin)
router.put('/requests/:id/approve', protect, authorize('admin'), async (req, res) => {
    try {
        const { rollNo, skills, duration, passoutDate, certificateLink } = req.body;
        const request = await CertificateRequest.findById(req.params.id);

        if (!request) {
            return res.status(404).json({ success: false, message: 'Request not found' });
        }

        if (request.status !== 'pending') {
            return res.status(400).json({ success: false, message: 'Request is already processed' });
        }

        // Update user rollNo if provided and different
        const user = await User.findById(request.user);
        const normalizedRollNo = rollNo ? rollNo.toString().trim() : '';
        const existingRollNo = user.rollNo ? user.rollNo.toString().trim() : '';

        if (normalizedRollNo && existingRollNo !== normalizedRollNo) {
            user.rollNo = normalizedRollNo;
            await user.save();
        }

        // Create certificate
        const certificate = await Certificate.create({
            user: request.user,
            course: request.course,
            rollNo: rollNo || user.rollNo,
            skills: skills || request.skills,
            duration: duration || request.duration,
            passoutDate: passoutDate || request.passoutDate,
            certificateLink,
            issuedBy: req.user.id
        });

        // Update request status
        request.status = 'issued';
        await request.save();

        // Update enrollment status
        await Enrollment.findOneAndUpdate(
            { user: request.user, course: request.course },
            { status: 'completed', completedAt: new Date() }
        );

        res.json({ success: true, certificate });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   PUT /api/certificates/requests/:id/reject
// @desc    Reject certificate request
// @access  Private (Admin)
router.put('/requests/:id/reject', protect, authorize('admin'), async (req, res) => {
    try {
        const request = await CertificateRequest.findById(req.params.id);

        if (!request) {
            return res.status(404).json({ success: false, message: 'Request not found' });
        }

        request.status = 'rejected';
        await request.save();

        res.json({ success: true, message: 'Request rejected' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/certificates/courses
// @desc    Get courses with enrolled students for certificate management
// @access  Private (Admin)
router.get('/courses', protect, authorize('admin'), async (req, res) => {
    try {
        console.log('📚 [CERTIFICATES] Fetching courses for certificate management');
        const courses = await Course.find().sort('-createdAt');
        console.log(`📚 [CERTIFICATES] Found ${courses.length} courses`);

        const coursesWithStudents = await Promise.all(courses.map(async (course) => {
            // Get all enrollments for this course (removed status filter)
            const enrollments = await Enrollment.find({
                course: course._id
            }).populate('user', 'name email phone photo rollNo role cnic');

            console.log(`  └─ Course "${course.title}": ${enrollments.length} enrollments`);

            // Get existing certificates as a map for quick lookup
            const certificates = await Certificate.find({ course: course._id });
            const certMap = {};
            certificates.forEach(c => {
                certMap[c.user.toString()] = {
                    _id: c._id,
                    passoutDate: c.passoutDate,
                    skills: c.skills,
                    duration: c.duration,
                    rollNo: c.rollNo,
                    certificateLink: c.certificateLink,
                    issuedAt: c.issuedAt
                };
            });

            // Add certificate status and data to each student
            // Filter out enrollments with null users (deleted users)
            const students = enrollments
                .filter(e => e.user) // Only include enrollments with valid users
                .map(async (e) => {
                    // Count verified challans from Fee model
                    const fee = await Fee.findOne({ user: e.user._id, course: course._id });
                    let feeVerifiedChallans = fee
                        ? fee.installments.filter(i => i.status === 'verified').length
                        : 0;

                    // Also check Enrollment model as fallback (in case Fee is out of sync)
                    const enrollmentVerifiedChallans = e.installments
                        ? e.installments.filter(i => i.status === 'verified').length
                        : 0;

                    // Use the higher count from either model
                    const verifiedChallans = Math.max(feeVerifiedChallans, enrollmentVerifiedChallans);

                    console.log(`    👤 ${e.user.name}: Fee=${feeVerifiedChallans}, Enrollment=${enrollmentVerifiedChallans}, Final=${verifiedChallans}`);

                    return {
                        ...e.user.toObject(),
                        enrollmentStatus: e.status,
                        certificateIssued: !!certMap[e.user._id.toString()],
                        certificate: certMap[e.user._id.toString()] || null,
                        verifiedChallans
                    };
                });

            const resolvedStudents = await Promise.all(students);

            return {
                ...course.toObject(),
                students: resolvedStudents
            };
        }));

        const totalPlatformStudents = await User.countDocuments({ role: { $in: ['student', 'intern'] } });
        const totalPlatformTeachers = await User.countDocuments({ role: 'teacher' });

        console.log(`✅ [CERTIFICATES] Returning ${coursesWithStudents.length} courses with students`);
        res.json({
            success: true,
            courses: coursesWithStudents,
            totalPlatformStudents,
            totalPlatformTeachers
        });
    } catch (error) {
        console.error('❌ [CERTIFICATES] Error fetching courses:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   POST /api/certificates/issue
// @desc    Issue certificate to a student
// @access  Private (Admin)
router.post('/issue', protect, authorize('admin'), async (req, res) => {
    try {
        const { userId, courseId, skills, passoutDate, certificateLink, rollNo } = req.body;

        // Check if already issued
        const existing = await Certificate.findOne({ user: userId, course: courseId });
        if (existing) {
            return res.status(400).json({ success: false, message: 'Certificate already issued' });
        }

        // Get user and course details
        const user = await User.findById(userId);
        const course = await Course.findById(courseId);

        if (!user || !course) {
            return res.status(404).json({ success: false, message: 'User or course not found' });
        }

        // Handle roll number update/set
        const normalizedRollNo = rollNo ? rollNo.toString().trim() : '';
        const existingRollNo = user.rollNo ? user.rollNo.toString().trim() : '';
        const finalRollNo = normalizedRollNo || existingRollNo;

        if (!finalRollNo) {
            return res.status(400).json({ success: false, message: 'Please provide a roll number' });
        }

        if (normalizedRollNo && existingRollNo !== normalizedRollNo) {
            user.rollNo = normalizedRollNo;
            await user.save();
        }

        // Calculate duration - fallback to months if dates are invalid
        const startDate = new Date(course.startDate);
        const endDate = new Date(course.endDate);
        let duration = '';
        
        if (!isNaN(startDate) && !isNaN(endDate)) {
            duration = `${startDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;
        } else {
            // Fallback: Try to calculate months from first fee
            try {
                const feeRecord = await Fee.findOne({ user: userId, course: courseId });
                if (feeRecord && feeRecord.installments.length > 0) {
                    const start = new Date(feeRecord.installments[0].dueDate);
                    const end = new Date();
                    let months = (end.getFullYear() - start.getFullYear()) * 12;
                    months += end.getMonth() - start.getMonth();
                    months = Math.max(1, months);
                    duration = `${months} Month${months > 1 ? 's' : ''}`;
                } else {
                    duration = '3 Months'; // Default fallback
                }
            } catch (err) {
                duration = '3 Months';
            }
        }

        // Create certificate
        const certificate = await Certificate.create({
            user: userId,
            course: courseId,
            rollNo: finalRollNo,
            skills: skills || course.title,
            duration: duration,
            passoutDate,
            certificateLink,
            issuedBy: req.user.id
        });

        // Update enrollment status to completed
        await Enrollment.findOneAndUpdate(
            { user: userId, course: courseId },
            { status: 'completed', completedAt: new Date() }
        );

        res.status(201).json({ success: true, certificate });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   PUT /api/certificates/:id
// @desc    Update certificate details (passoutDate, skills, certificateLink)
// @access  Private (Admin)
router.put('/:id', protect, authorize('admin'), async (req, res) => {
    try {
        const { passoutDate, skills, certificateLink, rollNo, duration } = req.body;

        const certificate = await Certificate.findById(req.params.id);
        if (!certificate) {
            return res.status(404).json({ success: false, message: 'Certificate not found' });
        }

        // Update fields if provided
        if (passoutDate) certificate.passoutDate = passoutDate;
        if (skills) certificate.skills = skills;
        if (rollNo) certificate.rollNo = rollNo;
        if (duration) certificate.duration = duration;
        if (certificateLink !== undefined) certificate.certificateLink = certificateLink;

        await certificate.save();

        res.json({ success: true, certificate });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/certificates/verify/:rollNo
// @desc    Public verification by roll number
// @access  Public
router.get('/verify/:rollNo', async (req, res) => {
    try {
        let searchRollNo = req.params.rollNo.trim();
        if (searchRollNo.toUpperCase().startsWith('ATL-')) {
            searchRollNo = searchRollNo.substring(4);
        }

        // Certificate verification is only for learning/teaching portal users.
        // Job portal accounts may share a roll number, but must never be exposed here.
        const users = await User.find({
            rollNo: searchRollNo,
            role: { $in: ['student', 'intern', 'teacher'] }
        });

        if (!users || users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No record found for this roll number'
            });
        }

        const userIds = users.map(u => u._id);

        const certificates = await Certificate.find({ user: { $in: userIds } })
            .populate('user', 'name photo role rollNo')
            .populate('course', 'title location');

        const enrollments = await Enrollment.find({ user: { $in: userIds } })
            .populate('course', 'title location');

        const teacherIds = users
            .filter(user => user.role === 'teacher')
            .map(user => user._id);
        const assignedTeacherCourses = teacherIds.length > 0
            ? await Course.find({ teachers: { $in: teacherIds } })
                .select('title location teachers createdAt')
                .sort({ createdAt: 1 })
            : [];

        const result = [];

        for (const user of users) {
            const userCerts = certificates.filter(c => c.user && c.user._id.toString() === user._id.toString());
            const userEnrollments = enrollments.filter(e => e.user && e.user._id.toString() === user._id.toString());
            const userAssignedCourses = user.role === 'teacher'
                ? assignedTeacherCourses.filter(course =>
                    (course.teachers || []).some(teacherId => teacherId.toString() === user._id.toString())
                )
                : [];

            const position = user.role === 'teacher' ? 'Teacher' : user.role === 'intern' ? 'Intern' : 'Student';

            // Teachers always appear as one consolidated card containing every course.
            if (user.role === 'teacher') {
                const assignedCourseNames = userAssignedCourses
                    .map(course => course.title)
                    .filter(Boolean);

                if (userCerts.length > 0) {
                    const certifiedCourseNames = userCerts.flatMap(cert => {
                        if (cert.selectedCourses?.length > 0) return cert.selectedCourses;
                        if (cert.course?.title) return [cert.course.title];
                        if (cert.skills) return [cert.skills];
                        return [];
                    });
                    const allTeacherCourses = [...new Set([
                        ...assignedCourseNames,
                        ...certifiedCourseNames
                    ])];
                    const latestCertificate = [...userCerts].sort(
                        (a, b) => new Date(b.issuedAt || 0) - new Date(a.issuedAt || 0)
                    )[0];
                    const firstTeacherCourse = assignedCourseNames[0] || allTeacherCourses[0];

                    result.push({
                        rollNo: user.rollNo,
                        name: user.name,
                        photo: user.photo,
                        position,
                        course: firstTeacherCourse || 'Teaching Certificate',
                        selectedCourses: firstTeacherCourse ? [firstTeacherCourse] : [],
                        hasMoreCourses: allTeacherCourses.length > 1,
                        hiddenCourses: allTeacherCourses.slice(1),
                        skills: latestCertificate.skills,
                        duration: latestCertificate.duration,
                        passoutDate: latestCertificate.passoutDate,
                        certificateLink: latestCertificate.certificateLink,
                        location: userAssignedCourses.find(course => course.location)?.location || null,
                        issuedAt: latestCertificate.issuedAt,
                        statusLevel: 3
                    });
                } else if (userAssignedCourses.length > 0) {
                    const firstAssignedCourse = assignedCourseNames[0];
                    result.push({
                        rollNo: user.rollNo,
                        name: user.name,
                        photo: user.photo,
                        position,
                        course: firstAssignedCourse,
                        selectedCourses: firstAssignedCourse ? [firstAssignedCourse] : [],
                        hasMoreCourses: assignedCourseNames.length > 1,
                        hiddenCourses: assignedCourseNames.slice(1),
                        skills: '',
                        duration: '',
                        passoutDate: null,
                        certificateLink: null,
                        location: userAssignedCourses.find(course => course.location)?.location || null,
                        issuedAt: null,
                        statusLevel: 2
                    });
                } else {
                    result.push({
                        rollNo: user.rollNo,
                        name: user.name,
                        photo: user.photo,
                        position,
                        course: 'Not Assigned',
                        selectedCourses: [],
                        skills: '',
                        duration: '',
                        passoutDate: null,
                        certificateLink: null,
                        location: null,
                        issuedAt: null,
                        statusLevel: 1
                    });
                }

                continue;
            }

            if (userCerts.length > 0) {
                for (const cert of userCerts) {
                    if (!cert.user) continue;

                    let displayDuration = cert.duration;
                    if ((!cert.duration || cert.duration.includes('Invalid')) && user.role !== 'teacher') {
                        try {
                            const feeRecord = await Fee.findOne({ user: user._id, course: cert.course?._id });
                            if (feeRecord && feeRecord.installments.length > 0) {
                                const start = new Date(feeRecord.installments[0].dueDate);
                                const end = new Date(cert.issuedAt);
                                if (!isNaN(start) && !isNaN(end)) {
                                    let months = (end.getFullYear() - start.getFullYear()) * 12;
                                    months += end.getMonth() - start.getMonth();
                                    months = Math.max(1, months);
                                    displayDuration = `${months} Month${months > 1 ? 's' : ''}`;
                                }
                            }
                        } catch (err) {
                            console.error('Error calculating duration:', err);
                        }
                    }

                    result.push({
                        rollNo: user.rollNo,
                        name: user.name,
                        photo: user.photo,
                        position,
                        course: cert.course?.title || (cert.selectedCourses?.length > 0 ? cert.selectedCourses.join(', ') : (cert.skills || 'Teaching Certificate')),
                        selectedCourses: cert.selectedCourses || [],
                        skills: cert.skills,
                        duration: displayDuration,
                        passoutDate: cert.passoutDate,
                        certificateLink: cert.certificateLink,
                        location: cert.course?.location || null,
                        issuedAt: cert.issuedAt,
                        statusLevel: 3
                    });
                }
            } else if (userEnrollments.length > 0) {
                for (const enrollment of userEnrollments) {
                    result.push({
                        rollNo: user.rollNo,
                        name: user.name,
                        photo: user.photo,
                        position,
                        course: enrollment.course?.title || 'Course',
                        selectedCourses: [],
                        skills: '',
                        duration: '',
                        passoutDate: null,
                        certificateLink: null,
                        location: enrollment.course?.location || null,
                        issuedAt: null,
                        statusLevel: 2
                    });
                }
            } else {
                result.push({
                    rollNo: user.rollNo,
                    name: user.name,
                    photo: user.photo,
                    position,
                    course: 'Not Enrolled',
                    selectedCourses: [],
                    skills: '',
                    duration: '',
                    passoutDate: null,
                    certificateLink: null,
                    location: null,
                    issuedAt: null,
                    statusLevel: 1
                });
            }
        }

        if (result.length === 0) {
            return res.status(404).json({ success: false, message: 'No valid records found' });
        }

        res.json({ success: true, certificates: result });
    } catch (error) {
        console.error('Verify error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   DELETE /api/certificates/:id
// @desc    Delete certificate
// @access  Private (Admin)
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
    try {
        const certificate = await Certificate.findById(req.params.id);
        if (!certificate) {
            return res.status(404).json({ success: false, message: 'Certificate not found' });
        }

        // Revert enrollment status only if there's a course associated
        if (certificate.course) {
            await Enrollment.findOneAndUpdate(
                { user: certificate.user, course: certificate.course },
                { status: 'enrolled', completedAt: null }
            );
        }

        await certificate.deleteOne();

        res.json({ success: true, message: 'Certificate deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/certificates/teachers
// @desc    Get all teachers with their certificate status + assigned courses
// @access  Private (Admin)
router.get('/teachers', protect, authorize('admin'), async (req, res) => {
    try {
        const teachers = await User.find({ role: 'teacher' }).sort('name');

        // Get existing teacher certificates (those without a course)
        const teacherIds = teachers.map(t => t._id);
        const certificates = await Certificate.find({ user: { $in: teacherIds }, course: null });
        const certMap = {};
        certificates.forEach(c => {
            certMap[c.user.toString()] = {
                _id: c._id,
                rollNo: c.rollNo,
                skills: c.skills,
                duration: c.duration,
                passoutDate: c.passoutDate,
                certificateLink: c.certificateLink,
                selectedCourses: c.selectedCourses || [],
                issuedAt: c.issuedAt
            };
        });

        // Get all courses and find which ones each teacher is assigned to
        const teacherCoursesMap = {};
        teacherIds.forEach(tid => { teacherCoursesMap[tid.toString()] = []; });

        // Fetch courses with their teachers array
        const coursesWithTeachers = await Course.find({}, 'title _id teachers').lean();
        coursesWithTeachers.forEach(course => {
            (course.teachers || []).forEach(tid => {
                const key = tid.toString();
                if (teacherCoursesMap[key]) {
                    teacherCoursesMap[key].push({ _id: course._id, title: course.title });
                }
            });
        });

        const result = teachers.map(t => ({
            _id: t._id,
            id: t._id,
            name: t.name,
            email: t.email,
            photo: t.photo,
            rollNo: t.rollNo,
            specialization: t.specialization,
            qualification: t.qualification,
            isVerified: t.isVerified,
            certificateIssued: !!certMap[t._id.toString()],
            certificate: certMap[t._id.toString()] || null,
            assignedCourses: teacherCoursesMap[t._id.toString()] || []
        }));

        res.json({ success: true, teachers: result });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   POST /api/certificates/issue-teacher
// @desc    Issue a certificate to a teacher (not tied to a course)
// @access  Private (Admin)
router.post('/issue-teacher', protect, authorize('admin'), async (req, res) => {
    try {
        const { userId, skills, passoutDate, certificateLink, rollNo, duration, selectedCourses } = req.body;

        const user = await User.findById(userId);
        if (!user || user.role !== 'teacher') {
            return res.status(404).json({ success: false, message: 'Teacher not found' });
        }

        // Check if already issued (teacher cert = no course)
        const existing = await Certificate.findOne({ user: userId, course: null });
        if (existing) {
            return res.status(400).json({ success: false, message: 'Certificate already issued for this teacher' });
        }

        const normalizedRollNo = rollNo ? rollNo.toString().trim() : (user.rollNo || '');
        if (!normalizedRollNo) {
            return res.status(400).json({ success: false, message: 'Please provide a roll number / teacher ID' });
        }

        // Update teacher rollNo if changed
        if (normalizedRollNo && user.rollNo !== normalizedRollNo) {
            user.rollNo = normalizedRollNo;
            await user.save();
        }

        const certificate = await Certificate.create({
            user: userId,
            course: null,  // No course for teacher certificates
            rollNo: normalizedRollNo,
            skills: skills || 'Teaching',
            duration: duration || '',
            passoutDate,
            certificateLink,
            selectedCourses: Array.isArray(selectedCourses) ? selectedCourses : [],
            issuedBy: req.user.id
        });

        res.status(201).json({ success: true, certificate });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   POST /api/certificates/backfill-teacher-ids
// @desc    One-time backfill: assign t0001... IDs to existing teachers without IDs
// @access  Private (Admin)
router.post('/backfill-teacher-ids', protect, authorize('admin'), async (req, res) => {
    try {
        const Counter = require('../models/Counter');
        const teachers = await User.find({ role: 'teacher', $or: [{ rollNo: null }, { rollNo: { $exists: false } }, { rollNo: { $not: /^t\d+$/ } }] }).sort('createdAt');

        if (teachers.length === 0) {
            return res.json({ success: true, message: 'All teachers already have IDs', count: 0 });
        }

        // Find highest existing teacher ID to avoid conflicts
        const existingTeacherIds = await User.find({ role: 'teacher', rollNo: /^t\d+$/ }).select('rollNo');
        let maxNum = 0;
        existingTeacherIds.forEach(t => {
            const num = parseInt(t.rollNo.replace('t', ''), 10);
            if (!isNaN(num) && num > maxNum) maxNum = num;
        });

        // Set counter to at least maxNum
        await Counter.findOneAndUpdate(
            { name: 'teacherId' },
            { $set: { value: Math.max(maxNum, 0) } },
            { upsert: true }
        );

        let count = 0;
        for (const teacher of teachers) {
            const newId = await Counter.getNextRollNo();
            teacher.rollNo = newId;
            await teacher.save();
            count++;
        }

        res.json({ success: true, message: `Assigned IDs to ${count} teachers`, count });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
