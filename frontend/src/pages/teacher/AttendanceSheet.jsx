import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useSelector } from 'react-redux';
import { io } from 'socket.io-client';
import {
    BookOpen, Users, Calendar, ArrowRight, ChevronLeft,
    FileText, ClipboardList, CheckCircle, Clock, User, Search, Filter, MessageCircle, UserCheck, Zap, MapPin, ExternalLink
} from 'lucide-react';
import Badge from '../../components/ui/Badge';
import Loader from '../../components/ui/Loader';
import { courseAPI, enrollmentAPI, chatAPI, assignmentAPI, testAPI } from '../../services/api';

const getSocketURL = () => {
    const rawUrl = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1' ? 'https://lms-adeeb-technology-lab.onrender.com/api' : 'http://localhost:5000/api');
    return rawUrl === '/api' ? 'https://lms-adeeb-technology-lab.onrender.com' : rawUrl.replace(/\/api\/?$/, '');
};

const SOCKET_URL = getSocketURL();
import { getCourseIcon, getCourseStyle } from '../../utils/courseIcons';

// Tab Components
import AttendanceTab from './components/AttendanceTab';
import DailyTasksTab from './components/DailyTasksTab';
import AssignmentsTab from './components/AssignmentsTab';
import TeacherChatTab from './components/TeacherChatTab';
import StudentsTab from './components/StudentsTab';
// import StudentWorkView from './components/StudentWorkView';

import TestsTab from './components/TestsTab';

const AttendanceSheet = () => {
    const { id: routeCourseId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useSelector((state) => state.auth);
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [activeTab, setActiveTab] = useState('daily_tasks'); // assignments | daily_tasks | attendance
    const [isLoading, setIsLoading] = useState(true);
    const [myCourses, setMyCourses] = useState([]);
    const [courseStudents, setCourseStudents] = useState([]);
    const [filteredCourses, setFilteredCourses] = useState([]); // Filtered list

    // Filter States
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCities, setSelectedCities] = useState([]); // Array of strings
    const [selectedTypes, setSelectedTypes] = useState([]);   // Array of strings
    const [chatUnreadCount, setChatUnreadCount] = useState(0);

    // Student Search Mode
    const [searchMode, setSearchMode] = useState('courses'); // 'courses' | 'students'
    const [studentSearchQuery, setStudentSearchQuery] = useState('');
    const [allStudents, setAllStudents] = useState([]); // all students across teacher's courses
    const [filteredStudents, setFilteredStudents] = useState([]);
    // const [selectedStudent, setSelectedStudent] = useState(null);

    // Track last-opened timestamp per courseId so recently opened courses float to top
    const [recentCourses, setRecentCourses] = useState(() => {
        try {
            const saved = localStorage.getItem('teacher_recent_courses');
            return saved ? JSON.parse(saved) : {};
        } catch { return {}; }
    });
    // Load submission notifications from localStorage
    const [submissionNotifications, setSubmissionNotifications] = useState(() => {
        try {
            const saved = localStorage.getItem('teacher_submission_notifications');
            return saved ? JSON.parse(saved) : {};
        } catch {
            return {};
        }
    });
    const socketRef = useRef();
    const activeTabRef = useRef(activeTab);

    // Keep ref in sync with activeTab
    useEffect(() => {
        activeTabRef.current = activeTab;
        // When entering chat tab, refresh unread count after a short delay
        // to allow messages to be marked as read
        if (activeTab === 'chat') {
            // Don't immediately set to 0, let the chat component mark messages as read
            // and then refresh the count
        }
    }, [activeTab]);

    // Persist submission notifications to localStorage
    useEffect(() => {
        try {
            localStorage.setItem('teacher_submission_notifications', JSON.stringify(submissionNotifications));
        } catch (e) {
            console.error('Failed to save notifications:', e);
        }
    }, [submissionNotifications]);

    // Fetch chat unread count function
    const fetchChatUnreadCount = async () => {
        try {
            const res = await chatAPI.getTeacherCourses();
            const courses = res.data.data || [];
            const totalUnread = courses.reduce((sum, c) => sum + (c.totalUnread || 0), 0);
            setChatUnreadCount(totalUnread);
        } catch (error) {
            console.error('Error fetching unread count:', error);
        }
    };

    // Fetch unread count and setup socket
    useEffect(() => {
        fetchChatUnreadCount();

        socketRef.current = io(SOCKET_URL, { withCredentials: true });
        const myId = user?.id || user?._id;
        if (myId) {
            const roomId = String(myId);
            socketRef.current.emit('join_chat', roomId);
            console.log('🔌 Teacher joined socket room:', roomId);
        }

        socketRef.current.on('connect', () => {
            console.log('✅ Socket connected, ID:', socketRef.current.id);
            // Re-join room on reconnect
            const myId = user?.id || user?._id;
            if (myId) {
                socketRef.current.emit('join_chat', String(myId));
            }
        });

        socketRef.current.on('new_global_message', (data) => {
            if (data.course || data.courseId) {
                const senderId = String(data.senderId || data.sender?._id || data.sender);
                const myIdStr = String(user?.id || user?._id);
                if (senderId !== myIdStr && activeTabRef.current !== 'chat') {
                    setChatUnreadCount(prev => prev + 1);
                }
            }
        });

        // Listen for user status updates
        socketRef.current.on('user_status_update', (data) => {
            setCourseStudents(prev => prev.map(s => {
                if (s.id === data.userId || s.id === String(data.userId)) {
                    return { ...s, lastSeen: data.lastSeen };
                }
                return s;
            }));
        });

        // Listen for new assignment submissions
        socketRef.current.on('new_submission', (data) => {
            console.log('📥 Received new_submission event:', data);
            if (data.courseId) {
                const courseIdStr = String(data.courseId);
                setSubmissionNotifications(prev => ({
                    ...prev,
                    [courseIdStr]: (prev[courseIdStr] || 0) + 1
                }));
            }
        });

        // Force re-render every minute to update "Online" / "Xm ago" status
        const statusInterval = setInterval(() => {
            setCourseStudents(prev => [...prev]);
        }, 60000);

        return () => {
            if (socketRef.current) socketRef.current.disconnect();
            clearInterval(statusInterval);
        };
    }, [user]);

    useEffect(() => {
        fetchMyCourses();
    }, []);

    // Handle deep linking when courses are loaded
    useEffect(() => {
        if (routeCourseId && myCourses.length > 0) {
            const course = myCourses.find(c => c.id.toString() === routeCourseId.toString());
            if (course && (!selectedCourse || selectedCourse.id !== course.id)) {
                handleSelectCourse(course, true); // true to skip navigation
                // Check if a specific tab was requested via navigation state
                const requestedTab = location.state?.tab;
                if (requestedTab) {
                    setActiveTab(requestedTab);
                }
            }
        }
    }, [routeCourseId, myCourses, location.state]);

    // Effect to apply filters whenever courses or filter states change
    useEffect(() => {
        let result = myCourses;

        // 1. Search Filter (Title)
        if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
            result = result.filter(course =>
                (course.title || course.name || '').toLowerCase().includes(lowerQuery)
            );
        }

        // 2. City Filter
        if (selectedCities.length > 0) {
            result = result.filter(course =>
                selectedCities.includes(course.city || course.location)
            );
        }

        // 3. Type Filter
        if (selectedTypes.length > 0) {
            result = result.filter(course =>
                selectedTypes.includes(course.targetAudience)
            );
        }

        // 4. Sort: recently opened courses first
        result = [...result].sort((a, b) => {
            const tA = recentCourses[String(a.id || a._id)] || 0;
            const tB = recentCourses[String(b.id || b._id)] || 0;
            return tB - tA; // descending — most recent on top
        });

        setFilteredCourses(result);
    }, [myCourses, searchQuery, selectedCities, selectedTypes, recentCourses]);

    // Build all-students list when courses are loaded
    useEffect(() => {
        if (myCourses.length === 0) return;
        const seen = new Set();
        const students = [];
        myCourses.forEach(course => {
            (course.enrollments || []).forEach(e => {
                const uid = String(e.user?._id || e.user);
                if (!seen.has(uid) && e.user?.name) {
                    seen.add(uid);
                    students.push({
                        id: uid,
                        _id: uid,
                        name: e.user?.name || 'Student',
                        rollNo: e.user?.rollNo || '',
                        email: e.user?.email || '',
                        photo: e.user?.photo || '',
                        role: e.user?.role || 'student',
                        guardianPhone: e.user?.guardianPhone || '',
                        courseName: course.title || course.name,
                        course: course,
                    });
                }
            });
        });
        setAllStudents(students);
    }, [myCourses]);

    // Filter students when query changes
    useEffect(() => {
        if (!studentSearchQuery.trim()) {
            setFilteredStudents([]);
            return;
        }
        const q = studentSearchQuery.toLowerCase();
        setFilteredStudents(
            allStudents.filter(s =>
                s.name.toLowerCase().includes(q) ||
                (s.rollNo && s.rollNo.toLowerCase().includes(q)) ||
                (s.email && s.email.toLowerCase().includes(q))
            )
        );
    }, [studentSearchQuery, allStudents]);

    const fetchMyCourses = async () => {
        setIsLoading(true);
        try {
            // Fetch all courses
            const coursesRes = await courseAPI.getAll();
            const allCourses = coursesRes.data.data || [];

            // Filter courses where this teacher is assigned
            // Robust check: user object from login has 'id' not '_id'
            const teacherId = (user?.id || user?._id)?.toString();
            console.log('Logged in Teacher ID:', teacherId);

            const teacherCourses = allCourses.filter(c => {
                const isMatch = c.teachers?.some(t => {
                    const tId = (t._id || t)?.toString();
                    return tId === teacherId;
                });

                if (!isMatch) {
                    console.log(`Filtering out course: ${c.title}. Teachers IDs: ${c.teachers?.map(t => t._id || t).join(', ')}, Expected: ${teacherId}`);
                }
                return isMatch;
            });

            // Get enrollments to count students per course
            let enrollments = [];
            try {
                const enrollmentsRes = await enrollmentAPI.getAll();
                enrollments = enrollmentsRes.data.data || [];
            } catch (e) {
                console.error('Enrollment fetch failed:', e);
            }

            // Map courses with student counts and enrollment data
            const coursesWithData = teacherCourses.map(course => {
                const courseEnrollments = enrollments.filter(e => {
                    const eCourseId = (e.course?._id || e.course)?.toString();
                    return eCourseId === course._id.toString();
                });

                // FORCE FIX: Ensure 'Gen AI' is treated as Interns, but also respect DB targetAudience
                let audience = course.targetAudience || 'students';
                if (course.title && course.title.toLowerCase().includes('gen')) {
                    audience = 'interns';
                }

                return {
                    id: course._id,
                    _id: course._id, // Keep both for compatibility
                    name: course.title,
                    internCount: courseEnrollments.length,
                    startDate: course.startDate,
                    endDate: course.endDate,
                    status: course.isActive !== false ? 'active' : 'inactive',
                    location: course.location,
                    city: course.city,
                    duration: course.duration,
                    category: course.category,
                    targetAudience: audience,
                    enrollments: courseEnrollments,
                    bookLink: course.bookLink || '' // Add book link
                };
            });

            // Fetch assignment data for each course to get marks
            const coursesWithAssignmentData = await Promise.all(coursesWithData.map(async (courseData) => {
                try {
                    const assignmentsRes = await assignmentAPI.getByCourse(courseData.id);
                    const assignments = assignmentsRes.data.assignments || [];

                    // Calculate assignment stats
                    let totalSubmissions = 0;
                    let gradedSubmissions = 0;
                    let totalMarks = 0;
                    let totalPossibleMarks = 0;

                    assignments.forEach(a => {
                        const submissions = a.submissions || [];
                        totalSubmissions += submissions.length;
                        submissions.forEach(s => {
                            if (s.marks !== undefined && s.marks !== null) {
                                gradedSubmissions++;
                                totalMarks += s.marks;
                                totalPossibleMarks += (a.totalMarks || 100);
                            }
                        });
                    });

                    const avgPercentage = totalPossibleMarks > 0
                        ? Math.round((totalMarks / totalPossibleMarks) * 100)
                        : 0;

                    return {
                        ...courseData,
                        assignmentStats: {
                            totalAssignments: assignments.length,
                            totalSubmissions,
                            gradedSubmissions,
                            avgPercentage,
                            pendingGrading: totalSubmissions - gradedSubmissions
                        }
                    };
                } catch (e) {
                    return { ...courseData, assignmentStats: null };
                }
            }));

            console.log('Courses loaded:', coursesWithAssignmentData);
            setMyCourses(coursesWithAssignmentData);
        } catch (error) {
            console.error('Error fetching courses:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectCourse = (course, skipNavigation = false) => {
        // Filter out students who are inactive (unverified first payment or overdue installments)
        // ALSO filter out students who have completed the course (assigned certificate)
        // ALSO filter out students who are currently paused
        const activeEnrollments = course.enrollments.filter(e => e.isActive && e.status !== 'completed' && !e.isPaused);

        const studentsList = activeEnrollments.map((e, idx) => ({
            id: e.user?._id || e.user, // IMPORTANT: Repair script used 'user' field
            _id: e.user?._id || e.user,
            name: e.user?.name || 'Enrolled Student',
            rollNo: e.user?.rollNo || `STU-${String(idx + 1).padStart(3, '0')}`,
            email: e.user?.email || '',
            photo: e.user?.photo || '',
            role: e.user?.role || 'intern',
            guardianPhone: e.user?.guardianPhone || '',
            location: course.city || course.location || 'N/A',
            courseName: course.title || course.name,
            enrolledAt: e.enrolledAt,
            lastSeen: e.user?.lastSeen
        }));

        console.log('Selected course eligible students:', studentsList);
        setCourseStudents(studentsList);
        setSelectedCourse(course);

        // Clear submission notifications for this course (use string for consistent matching)
        const courseId = String(course.id || course._id);
        setSubmissionNotifications(prev => {
            const updated = { ...prev };
            delete updated[courseId];
            return updated;
        });

        // Record last-opened timestamp for this course so it floats to the top
        setRecentCourses(prev => {
            const updated = { ...prev, [courseId]: Date.now() };
            try { localStorage.setItem('teacher_recent_courses', JSON.stringify(updated)); } catch { }
            return updated;
        });

        // Update URL if not already there
        if (!skipNavigation) {
            navigate(`/teacher/course/${course.id}`);
        }

        // Default tab based on audience
        if (course.targetAudience === 'interns') {
            setActiveTab('daily_tasks');
        } else {
            setActiveTab('attendance');
        }
    };

    if (isLoading) {
        return (
            <Loader message="Loading courses..." />
        );
    }

    // Student Work View
    // Removed StudentWorkView logic as per user request to open course instead of viewing student work.


    if (!selectedCourse) {
        // Course Selection List
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Course Attendance</h1>
                        <p className="text-gray-500">Manage your students, assignments and daily tasks</p>
                    </div>
                    {/* Mode Toggle */}
                    <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-xl border border-gray-200">
                        <button
                            onClick={() => { setSearchMode('courses'); setStudentSearchQuery(''); setFilteredStudents([]); }}
                            className={`px-5 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 ${searchMode === 'courses'
                                    ? 'bg-white text-primary shadow-sm border border-primary/10'
                                    : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <BookOpen className="w-4 h-4" />
                            Courses
                        </button>
                        <button
                            onClick={() => { setSearchMode('students'); setSearchQuery(''); }}
                            className={`px-5 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 ${searchMode === 'students'
                                    ? 'bg-white text-primary shadow-sm border border-primary/10'
                                    : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <User className="w-4 h-4" />
                            Search Student
                        </button>
                    </div>
                </div>

                {/* Filters and Search */}
                {searchMode === 'courses' ? (
                    <div className="bg-white rounded-3xl p-4 sm:p-6 border border-gray-100 shadow-sm space-y-4">
                        {/* Search Bar */}
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search courses..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3.5 !bg-gray-50/50 dark:!bg-white/5 border border-transparent focus:border-primary focus:!bg-white dark:focus:!bg-white/10 rounded-2xl transition-all outline-none text-sm font-medium"
                                />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {/* City Filters */}
                            <div className="space-y-2">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Location</p>
                                <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-2xl">
                                    {['Bahawalpur', 'Islamabad'].map((city) => (
                                        <button
                                            key={city}
                                            onClick={() => {
                                                setSelectedCities(prev =>
                                                    prev.includes(city)
                                                        ? prev.filter(c => c !== city)
                                                        : [...prev, city]
                                                );
                                            }}
                                            className={`flex-1 px-3 py-2.5 rounded-xl font-bold text-xs transition-all ${selectedCities.includes(city)
                                                ? 'bg-white text-primary shadow-md border border-primary/10'
                                                : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
                                                }`}
                                        >
                                            {city}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Type Filters */}
                            <div className="space-y-2">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Category</p>
                                <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-2xl">
                                    {[
                                        { id: 'students', label: 'Student' },
                                        { id: 'interns', label: 'Intern' }
                                    ].map((type) => (
                                        <button
                                            key={type.id}
                                            onClick={() => {
                                                setSelectedTypes(prev =>
                                                    prev.includes(type.id)
                                                        ? prev.filter(t => t !== type.id)
                                                        : [...prev, type.id]
                                                );
                                            }}
                                            className={`flex-1 px-3 py-2.5 rounded-xl font-bold text-xs transition-all ${selectedTypes.includes(type.id)
                                                ? 'bg-white text-primary shadow-md border border-primary/10'
                                                : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
                                                }`}
                                        >
                                            {type.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* Student Search Panel */
                    <div className="bg-white rounded-2xl p-4 border border-gray-100">
                        <div className="flex items-center bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
                            <Search className="w-5 h-5 text-primary mr-3" />
                            <input
                                id="student-search-input"
                                type="text"
                                placeholder="Search student by name, roll no, or email..."
                                value={studentSearchQuery}
                                onChange={(e) => setStudentSearchQuery(e.target.value)}
                                className="!bg-transparent border-none outline-none w-full text-gray-700 dark:text-white/90 placeholder-gray-400 dark:placeholder:text-white/30 font-medium"
                                autoFocus
                            />
                            {studentSearchQuery && (
                                <button
                                    onClick={() => { setStudentSearchQuery(''); setFilteredStudents([]); }}
                                    className="ml-2 text-gray-400 hover:text-gray-600 font-bold text-xs"
                                >✕</button>
                            )}
                        </div>
                        <p className="text-xs text-gray-400 font-medium mt-2 ml-1">
                            {allStudents.length} students across {myCourses.length} course{myCourses.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                )}

                {/* Student Search Results */}
                {searchMode === 'students' && (
                    <div>
                        {!studentSearchQuery.trim() ? (
                            <div className="bg-white rounded-2xl p-12 border border-gray-100 text-center">
                                <User className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                                <p className="text-gray-500 font-medium">Type a student name to search</p>
                                <p className="text-sm text-gray-400 mt-1">You can also search by roll number or email</p>
                            </div>
                        ) : filteredStudents.length === 0 ? (
                            <div className="bg-white rounded-2xl p-12 border border-gray-100 text-center">
                                <Search className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                                <p className="text-gray-500 font-medium">No students found matching "{studentSearchQuery}"</p>
                                <p className="text-sm text-gray-400 mt-1">Try a different name or roll number</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest px-1">
                                    {filteredStudents.length} result{filteredStudents.length !== 1 ? 's' : ''} found
                                </p>
                                {filteredStudents.map((student, idx) => (
                                    <motion.div
                                        key={student.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        onClick={() => handleSelectCourse(student.course)}
                                        className="bg-white rounded-2xl p-5 border border-gray-100 hover:shadow-lg hover:border-primary transition-all cursor-pointer group flex items-center gap-4"
                                    >
                                        <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 border-2 border-gray-100">
                                            {student.photo ? (
                                                <img src={student.photo} alt={student.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white font-black text-lg">
                                                    {(student.name || 'S').charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className="font-bold text-gray-900 group-hover:text-primary transition-colors">{student.name}</p>
                                                {student.rollNo && (
                                                    <span className="text-[10px] font-black text-red-500 bg-red-50 px-2 py-0.5 rounded-lg border border-red-100">
                                                        {student.rollNo}
                                                    </span>
                                                )}
                                                <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${student.role === 'intern' 
                                                    ? 'bg-purple-100 text-purple-700' 
                                                    : 'bg-blue-100 text-blue-700'
                                                }`}>
                                                    {student.role || 'Student'}
                                                </span>
                                            </div>
                                            {student.email && (
                                                <p className="text-xs text-gray-400 font-medium mt-0.5">{student.email}</p>
                                            )}
                                            <p className="text-xs text-primary font-bold mt-1 flex items-center gap-1">
                                                <BookOpen className="w-3 h-3" />
                                                {student.courseName}
                                            </p>
                                        </div>
                                        <div className="flex items-center text-primary font-bold text-sm">
                                            <span className="text-xs">OPEN COURSE</span>
                                            <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {searchMode === 'courses' && filteredCourses.length === 0 ? (
                    <div className="bg-white rounded-2xl p-12 border border-gray-100 text-center">
                        <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500 font-medium">No courses match your filters</p>
                        {(searchQuery || selectedCities.length > 0 || selectedTypes.length > 0) ? (
                            <button
                                onClick={() => { setSearchQuery(''); setSelectedCities([]); setSelectedTypes([]); }}
                                className="mt-2 text-primary hover:text-primary font-medium text-sm"
                            >
                                Clear all filters
                            </button>
                        ) : (
                            <p className="text-sm text-gray-400 mt-1">Please contact Admin to assign courses to your account.</p>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredCourses.map((course, index) => {
                            const CourseIcon = getCourseIcon(course.category, course.title || course.name);
                            const courseStyle = getCourseStyle(course.category, course.title || course.name);
                            // Ensure courseId is a string for consistent matching with socket events
                            const courseId = String(course.id || course._id);
                            const notificationCount = submissionNotifications[courseId] || 0;

                            return (
                                <motion.div
                                    key={course.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    onClick={() => handleSelectCourse(course)}
                                    className="bg-white rounded-2xl p-6 border border-gray-100 cursor-pointer hover:shadow-lg hover:border-primary transition-all group relative"
                                >
                                    {/* Pending (ungraded) Submission Count Badge */}
                                    {course.assignmentStats?.pendingGrading > 0 && (
                                        <div className="absolute -top-2 -right-2 w-7 h-7 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-lg">
                                            {course.assignmentStats.pendingGrading > 99 ? '99+' : course.assignmentStats.pendingGrading}
                                        </div>
                                    )}
                                    <div className="flex items-start justify-between mb-4">
                                        <div className={`w-14 h-14 rounded-xl flex items-center justify-center bg-gradient-to-br ${courseStyle.gradient}`}>
                                            <CourseIcon className="w-7 h-7 text-white" />
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                            {/* Status badge removed as per user request */}
                                            <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${course.targetAudience === 'interns'
                                                ? 'bg-purple-100 text-purple-700'
                                                : 'bg-blue-100 text-blue-700'
                                                }`}>
                                                {course.targetAudience === 'interns' ? 'Internship' : 'Student'}
                                            </span>
                                        </div>
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-primary transition-colors uppercase">{course.title || course.name}</h3>
                                    <div className="flex items-center gap-4 text-sm text-gray-500 mb-3 font-medium">
                                        <span className="flex items-center gap-1.5">
                                            <Users className="w-4 h-4 text-gray-400" />
                                            {course.internCount} Registered
                                        </span>
                                        {(course.city || course.location) && (
                                            <span className="flex items-center gap-1.5 uppercase">
                                                <Calendar className="w-4 h-4 text-gray-400" />
                                                {course.city || course.location}
                                            </span>
                                        )}
                                    </div>

                                    {/* Assignment Stats */}
                                    {course.assignmentStats && course.assignmentStats.totalAssignments > 0 && (
                                        <div className="bg-gradient-to-r from-primary/5 to-blue-50 rounded-xl p-3 mb-4 border border-primary/10/50">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <FileText className="w-4 h-4 text-primary" />
                                                    <span className="text-xs font-bold text-gray-700">
                                                        {course.assignmentStats.totalAssignments} Assignment{course.assignmentStats.totalAssignments > 1 ? 's' : ''}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    {course.assignmentStats.gradedSubmissions > 0 && (
                                                        <div className="flex items-center gap-1">
                                                            <CheckCircle className="w-3.5 h-3.5 text-primary" />
                                                            <span className="text-xs font-bold text-primary">
                                                                Avg: {course.assignmentStats.avgPercentage}%
                                                            </span>
                                                        </div>
                                                    )}
                                                    {course.assignmentStats.pendingGrading > 0 && (
                                                        <div className="flex items-center gap-1">
                                                            <Clock className="w-3.5 h-3.5 text-amber-500" />
                                                            <span className="text-xs font-bold text-amber-600">
                                                                {course.assignmentStats.pendingGrading} to grade
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="mt-2 text-[10px] text-gray-500 font-medium">
                                                {course.assignmentStats.totalSubmissions} submission{course.assignmentStats.totalSubmissions !== 1 ? 's' : ''} • {course.assignmentStats.gradedSubmissions} graded
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex items-center text-primary font-bold text-sm">
                                        <span>OPEN DASHBOARD</span>
                                        <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="flex-1">
                        <button
                            onClick={() => {
                                setSelectedCourse(null);
                                navigate('/teacher/courses');
                            }}
                            className="flex items-center gap-2 text-primary hover:text-primary mb-2 font-bold text-[10px] md:text-[11px] tracking-wide uppercase"
                        >
                            <ChevronLeft className="w-3.5 h-3.5" />
                            BACK TO ALL COURSES
                        </button>
                        <h1 className="text-xl md:text-3xl font-black text-gray-900 uppercase tracking-tight leading-tight mb-1.5">{selectedCourse.title || selectedCourse.name || 'Course Dashboard'}</h1>
                        <div className="flex items-center gap-2 md:gap-3 flex-wrap">
                            <span className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] md:text-[10px] font-black uppercase tracking-widest border shadow-sm ${selectedCourse.targetAudience === 'interns'
                                ? 'bg-purple-100 text-purple-700 border-purple-200'
                                : 'bg-blue-100 text-blue-700 border-blue-200'
                                }`}>
                                {selectedCourse.targetAudience === 'interns' ? 'Internship' : 'Student'}
                            </span>
                            {(selectedCourse.city || selectedCourse.location) && (
                                <span className="flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-600 rounded-lg text-[9px] md:text-[10px] font-black uppercase tracking-widest border border-gray-200 shadow-sm">
                                    <MapPin className="w-2.5 h-2.5 text-primary" />
                                    {selectedCourse.city || selectedCourse.location}
                                </span>
                            )}
                            <span className="text-gray-400 text-[9px] md:text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                                <Users className="w-2.5 h-2.5" />
                                {courseStudents.length} Students Active
                            </span>
                        </div>
                    </div>
                </div>
                {/* Book Button */}
                {selectedCourse.bookLink && (
                    <button
                        onClick={() => window.open(selectedCourse.bookLink, '_blank')}
                        className="group relative flex items-center gap-2 px-4 md:px-6 py-2.5 rounded-xl md:rounded-2xl bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest text-[10px] md:text-xs hover:-translate-y-0.5 active:translate-y-0 transition-all shadow-lg hover:shadow-xl shadow-primary/20 w-fit md:ml-0 border border-primary/30"
                        title="Open Course Book"
                    >
                        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl md:rounded-2xl"></div>
                        <div className="bg-white/20 p-1 md:p-1.5 rounded-lg group-hover:-rotate-12 transition-transform duration-300 relative z-10">
                            <BookOpen className="w-3.5 h-3.5 md:w-4 md:h-4" />
                        </div>
                        <span className="relative z-10">Read Book</span>
                        <ExternalLink className="w-3 h-3 md:w-3.5 md:h-3.5 opacity-50 group-hover:opacity-100 transition-opacity relative z-10 ml-0.5 md:ml-1" />
                    </button>
                )}
            </div>

            {/* Course Content: Multi-Tab */}
            <div className="space-y-6">
                {/* Tab Navigation - Separate Row like Student Portal */}
                <div className="flex items-center gap-2 bg-white dark:bg-slate-900/40 rounded-2xl p-1.5 border border-gray-100 dark:border-slate-800 shadow-sm overflow-x-auto no-scrollbar">
                    {[
                        { id: 'daily_tasks', label: selectedCourse.targetAudience === 'interns' ? 'Meeting Logs' : 'Class Logs', icon: ClipboardList },
                        { id: 'assignments', label: (['intern', 'interns'].includes(String(selectedCourse.targetAudience || '').toLowerCase()) || courseStudents.some(student => student.role === 'intern')) ? 'Projects' : 'Assignments', icon: FileText },
                        { id: 'tests', label: 'Tests', icon: Zap },
                        { id: 'attendance', label: 'Attendance', icon: Clock },
                        { id: 'students', label: 'Students', icon: UserCheck },
                        { id: 'chat', label: 'Chat', icon: MessageCircle, showBadge: chatUnreadCount > 0 },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center justify-center gap-2 py-2.5 md:py-3.5 px-4 md:px-6 rounded-lg md:rounded-xl font-black text-[10px] md:text-[11px] uppercase tracking-wider transition-all whitespace-nowrap relative shrink-0 ${activeTab === tab.id
                                ? 'bg-primary text-white shadow-xl shadow-primary/30'
                                : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-primary'
                                }`}
                        >
                            <tab.icon className={`w-3.5 h-3.5 md:w-4 md:h-4 ${activeTab === tab.id ? 'text-white' : 'text-gray-400 group-hover:text-primary'}`} />
                            {tab.label}
                            {tab.showBadge && activeTab !== 'chat' && (
                                <span className="absolute -top-1 -right-1 w-4 h-4 md:w-5 md:h-5 bg-red-500 text-white text-[9px] md:text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse shadow-lg border-2 border-white dark:border-slate-900">
                                    {chatUnreadCount > 9 ? '9+' : chatUnreadCount}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-8 border border-primary/20 shadow-xl shadow-gray-200/50 min-h-[500px]">
                    {activeTab === 'daily_tasks' && (
                        <DailyTasksTab course={selectedCourse} students={courseStudents} />
                    )}
                    {activeTab === 'assignments' && (
                        <AssignmentsTab course={selectedCourse} students={courseStudents} />
                    )}
                    {activeTab === 'attendance' && (
                        <AttendanceTab course={selectedCourse} students={courseStudents} />
                    )}
                    {activeTab === 'students' && (
                        <StudentsTab course={selectedCourse} />
                    )}
                    {activeTab === 'chat' && (
                        <TeacherChatTab course={selectedCourse} students={courseStudents} onUnreadCountChange={fetchChatUnreadCount} />
                    )}
                    {activeTab === 'tests' && (
                        <TestsTab course={selectedCourse} students={courseStudents} />
                    )}
                </div>
            </div>
        </div>
    );
};

export default AttendanceSheet;



