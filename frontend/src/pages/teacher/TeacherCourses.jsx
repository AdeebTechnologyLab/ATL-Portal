import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useSelector } from 'react-redux';
import { io } from 'socket.io-client';

import {
    BookOpen, Users, Calendar, ArrowRight, ChevronLeft,
    FileText, ClipboardList, CheckCircle, Clock, User, Award, X, Search,
    Video, ExternalLink, StopCircle, Timer, MessageSquare, GraduationCap
} from 'lucide-react';
import Badge from '../../components/ui/Badge';
import { courseAPI, liveClassAPI } from '../../services/api';
import StatCard from '../../components/ui/StatCard';
import { getCourseIcon, getCourseStyle } from '../../utils/courseIcons';
import BirthdayWish from '../../components/dashboard/BirthdayWish';
import Loader, { ButtonLoader } from '../../components/ui/Loader';
import { useTranslation } from 'react-i18next';



const TeacherCourses = ({ isDashboard = false, initialSearchMode = 'courses' }) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { user } = useSelector((state) => state.auth);
    const [isLoading, setIsLoading] = useState(true);
    const [myCourses, setMyCourses] = useState([]);
    const [filteredCourses, setFilteredCourses] = useState([]); // Filtered list
    // const [courseStudents, setCourseStudents] = useState([]); // Unused now
    const [summaryStats, setSummaryStats] = useState({
        totalCourses: 0,
        activeStudents: 0,
        activeInterns: 0,
        pendingAssignments: 0,
        todayPresent: 0,
        todayAbsent: 0
    });

    // Filter States
    const [searchMode, setSearchMode] = useState(initialSearchMode); // courses | students
    const [searchQuery, setSearchQuery] = useState('');
    const [studentSearchQuery, setStudentSearchQuery] = useState('');
    const [allStudents, setAllStudents] = useState([]); 
    const [filteredStudents, setFilteredStudents] = useState([]);
    const [selectedCities, setSelectedCities] = useState([]);
    const [selectedTypes, setSelectedTypes] = useState([]);

    // Live Class States
    const [showLiveClassModal, setShowLiveClassModal] = useState(false);
    const [liveClassModalType, setLiveClassModalType] = useState('google'); // 'google' | 'adeeb'
    const [liveClassForm, setLiveClassForm] = useState({
        title: '',
        link: '',
        description: '',
        visibility: 'all',
        autoEndMinutes: ''
    });
    const [activeLiveClasses, setActiveLiveClasses] = useState([]);
    const [isCreatingLiveClass, setIsCreatingLiveClass] = useState(false);

    const socketRef = useRef(null);
    const getSocketURL = () => {
    const rawUrl = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1' ? 'https://lms-adeeb-technology-lab.onrender.com/api' : 'http://localhost:5000/api');
    return rawUrl === '/api' ? 'https://lms-adeeb-technology-lab.onrender.com' : rawUrl.replace(/\/api\/?$/, '');
};
    const SOCKET_URL = getSocketURL();

    useEffect(() => {
        fetchMyCourses();
        fetchActiveLiveClasses();

        // Setup real-time updates
        socketRef.current = io(SOCKET_URL, { withCredentials: true });

        const myId = user?.id || user?._id;
        if (myId) {
            socketRef.current.emit('join_chat', String(myId));
        }

        socketRef.current.on('new_submission', (data) => {
            console.log('📥 New submission received:', data);
            fetchMyCourses();
        });

        socketRef.current.on('new_global_message', (data) => {
            console.log('💬 New message received:', data);
            fetchMyCourses();
        });

        socketRef.current.on('live_class_started', () => fetchActiveLiveClasses());
        socketRef.current.on('live_class_ended', () => fetchActiveLiveClasses());

        return () => {
            if (socketRef.current) socketRef.current.disconnect();
        };
    }, []);

    // Start countdown ticks for active live classes that have a timer
    useEffect(() => {
        const tick = () => {
            setActiveLiveClasses(prev => {
                const now = Date.now();
                const expired = [];
                const updated = prev.map(lc => {
                    if (!lc.autoEndMinutes) return lc;
                    const expiresAt = new Date(lc.startTime).getTime() + lc.autoEndMinutes * 60 * 1000;
                    const secondsLeft = Math.max(0, Math.round((expiresAt - now) / 1000));
                    if (secondsLeft === 0) expired.push(lc._id);
                    return { ...lc, _secondsLeft: secondsLeft };
                });
                if (expired.length > 0) {
                    liveClassAPI.cleanupExpired().catch(() => {});
                    return updated.filter(lc => !expired.includes(lc._id));
                }
                return updated;
            });
        };

        const interval = setInterval(tick, 1000);
        tick(); 
        return () => clearInterval(interval);
    }, []);

    const fetchActiveLiveClasses = async () => {
        try {
            const res = await liveClassAPI.getAll();
            setActiveLiveClasses((res.data.data || []).filter(lc => lc.isActive));
        } catch (error) {
            console.error('Error fetching live classes:', error);
        }
    };

    const handleCreateLiveClass = async (e) => {
        e.preventDefault();
        if (!liveClassForm.title) return;
        if (liveClassModalType === 'google' && !liveClassForm.link) return;

        setIsCreatingLiveClass(true);
        try {
            const finalLink = liveClassModalType === 'adeeb'
                ? `/live-meet/${Math.random().toString(36).substring(2, 10).toUpperCase()}`
                : liveClassForm.link;

            await liveClassAPI.create({
                ...liveClassForm,
                link: finalLink,
                autoEndMinutes: liveClassForm.autoEndMinutes ? parseInt(liveClassForm.autoEndMinutes) : null
            });
            setShowLiveClassModal(false);
            setLiveClassForm({ title: '', link: '', description: '', visibility: 'all', autoEndMinutes: '' });
            fetchActiveLiveClasses();
        } catch (error) {
            console.error('Error creating live class:', error);
            alert('Failed to create live class');
        } finally {
            setIsCreatingLiveClass(false);
        }
    };

    const handleEndLiveClass = async (id) => {
        if (!window.confirm('Are you sure you want to end this live class?')) return;
        try {
            await liveClassAPI.end(id);
            fetchActiveLiveClasses();
        } catch (error) {
            console.error('Error ending live class:', error);
        }
    };

    // Build all-students list when courses are loaded
    useEffect(() => {
        if (myCourses.length === 0) return;
        const seen = new Set();
        const students = [];
        myCourses.forEach(course => {
            (course.enrollments || []).forEach(e => {
                if (!e.isActive || e.status === 'completed' || e.isPaused) return;
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
            setFilteredStudents(allStudents);
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

    // Effect to apply filters whenever courses or filter states change
    useEffect(() => {
        let result = myCourses;

        // 1. Search Filter (Title or Name)
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

        setFilteredCourses(result);
    }, [myCourses, searchQuery, selectedCities, selectedTypes]);

    const fetchMyCourses = async () => {
        setIsLoading(true);
        try {
            // Use optimized single-query endpoint
            const res = await courseAPI.getTeacherDashboard();
            const coursesWithData = res.data.data || [];

            console.log('[TeacherDashboard] Loaded', coursesWithData.length, 'courses via optimized API');

            // setMyCourses(coursesWithData); // REMOVED redundant call

            // Calculate overall summary
            const uniqueStudentIds = new Set();
            
            // If in Dashboard mode, filter to only show courses with pending tasks (grading or unread messages)
            const displayCourses = isDashboard 
                ? coursesWithData.filter(c => (c.pendingAssignments || 0) > 0 || (c.unreadMessages || 0) > 0)
                : coursesWithData;

            // Stats should always reflect ALL courses for accuracy
            coursesWithData.forEach(c => {
                (c.enrollments || []).forEach(e => {
                    const uid = e.user?._id || e.student?._id || e.user || e.student;
                    if (uid) uniqueStudentIds.add(String(uid));
                });
            });

            const totalActiveStudents = coursesWithData
                .filter(c => c.targetAudience === 'students')
                .reduce((acc, c) => acc + (c.activeStudents || 0), 0);
            
            const totalActiveInterns = coursesWithData
                .filter(c => c.targetAudience === 'interns')
                .reduce((acc, c) => acc + (c.activeStudents || 0), 0);

            const totalPending = coursesWithData.reduce((acc, c) => acc + (c.pendingAssignments || 0), 0);
            const totalUnreadMessages = coursesWithData.reduce((acc, c) => acc + (c.unreadMessages || 0), 0);
            const todayPresent = coursesWithData.reduce((acc, c) => acc + (c.presentCount || 0), 0);
            const todayAbsent = coursesWithData.reduce((acc, c) => acc + (c.absentCount || 0), 0);

            setSummaryStats({
                totalCourses: coursesWithData.length,
                activeStudents: totalActiveStudents,
                activeInterns: totalActiveInterns,
                pendingAssignments: totalPending + totalUnreadMessages,
                todayPresent,
                todayAbsent,
            });

            // Set the final list of courses
            setMyCourses(displayCourses);
        } catch (error) {
            console.error('Error fetching courses:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectCourse = (course) => {
        // Navigate to the Attendance/Course Detail page
        let targetTab = undefined;
        if (isDashboard) {
            if (course.unreadMessages > 0) {
                targetTab = 'chat';
            } else if (course.pendingAssignments > 0) {
                targetTab = 'assignments';
            }
        }
        navigate(`/teacher/course/${course.id || course._id}`, { state: { tab: targetTab } });
    };

    const handleSelectStudentWork = (student) => {
        const course = student.course;
        navigate(`/teacher/course/${course.id || course._id}`, {
            state: {
                tab: 'assignments',
                studentId: student.id || student._id
            }
        });
    };

    if (isLoading) {
        return (
            <Loader message="Loading Dashboard..." />
        );
    }

    return (
        <>
            <div className="space-y-6">
                {isDashboard && <BirthdayWish />}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            {isDashboard
                                ? t('teacherDashboard.pendingTasksDashboard')
                                : searchMode === 'students'
                                    ? 'Students'
                                    : t('teacherDashboard.courses')}
                        </h1>
                        <p className="text-gray-500">
                            {isDashboard 
                                ? t('teacherDashboard.showingCoursesGrading') 
                                : searchMode === 'students'
                                    ? 'Active students from your assigned courses'
                                    : 'Overview of all your assigned courses'}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => {
                                setLiveClassForm({ title: '', link: '', description: '', visibility: 'all', autoEndMinutes: '' });
                                setLiveClassModalType('google');
                                setShowLiveClassModal(true);
                            }}
                            className="px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-all duration-300 flex items-center gap-2 shadow-lg shadow-red-200"
                        >
                            <Video className="w-5 h-5" />
                            {t('teacherDashboard.googleMeetLink')}
                        </button>
                        <button
                            onClick={() => {
                                setLiveClassForm({ title: '', link: '', description: '', visibility: 'all', autoEndMinutes: '' });
                                setLiveClassModalType('adeeb');
                                setShowLiveClassModal(true);
                            }}
                            className="px-5 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl font-medium transition-all duration-300 flex items-center gap-2 shadow-lg shadow-primary/20"
                        >
                            <Users className="w-5 h-5" />
                            {t('teacherDashboard.startAdeebMeet')}
                        </button>
                    </div>
                </div>

                {/* Active Live Classes Banner */}
                {activeLiveClasses.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-gradient-to-r from-red-500 to-primary rounded-2xl p-4 text-white"
                    >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                                <span className="font-bold text-sm sm:text-base line-clamp-1">🔴 Live Class Active: {activeLiveClasses[0]?.title}</span>
                                {(() => {
                                    const lc = activeLiveClasses[0];
                                    if (!lc?.autoEndMinutes) return null;
                                    const sl = lc._secondsLeft;
                                    if (sl == null) return null;
                                    const mins = Math.floor(sl / 60);
                                    const secs = sl % 60;
                                    return (
                                        <span className="flex items-center gap-1 bg-white/20 px-2 py-1 rounded-lg text-[10px] sm:text-sm font-bold ml-2 whitespace-nowrap">
                                            <Timer className="w-3 h-3 sm:w-4 h-4" />
                                            {`${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`} left
                                        </span>
                                    );
                                })()}
                            </div>
                            <div className="flex gap-2">
                                {activeLiveClasses[0]?.link?.includes('/live-meet/') ? (
                                    <button
                                        onClick={() => window.open(`/live-meet/${activeLiveClasses[0].link.split('/').pop()}`, '_blank')}
                                        className="flex-1 sm:flex-none px-4 py-2 bg-white text-primary rounded-lg font-bold text-xs hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Video className="w-4 h-4" />
                                        Open Meet
                                    </button>
                                ) : (
                                    <a
                                        href={activeLiveClasses[0]?.link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex-1 sm:flex-none px-4 py-2 bg-white text-red-600 rounded-lg font-bold text-xs hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                        Open
                                    </a>
                                )}
                                <button
                                    onClick={() => handleEndLiveClass(activeLiveClasses[0]?._id)}
                                    className="flex-1 sm:flex-none px-4 py-2 bg-red-700 text-white rounded-lg font-bold text-xs hover:bg-red-800 transition-colors flex items-center justify-center gap-2"
                                >
                                    <StopCircle className="w-4 h-4" />
                                    End
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Summary Stats */}
                {isDashboard && (
                    <div className="grid grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 gap-3 sm:gap-4">
                        <StatCard
                            title={t('teacherDashboard.activeCourses')}
                            value={summaryStats.totalCourses}
                            icon={BookOpen}
                            iconBg="bg-blue-50"
                            iconColor="text-blue-600"
                            onClick={() => navigate('/teacher/courses')}
                        />
                        <StatCard
                            title={t('teacherDashboard.activeStudents')}
                            value={summaryStats.activeStudents}
                            icon={Users}
                            iconBg="bg-blue-50"
                            iconColor="text-blue-600"
                            onClick={() => navigate('/teacher/quick-attendance', { state: { initialCategory: 'students' } })}
                        />
                        <StatCard
                            title={t('teacherDashboard.activeInterns')}
                            value={summaryStats.activeInterns}
                            icon={GraduationCap}
                            iconBg="bg-purple-50"
                            iconColor="text-purple-600"
                            onClick={() => navigate('/teacher/quick-attendance', { state: { initialCategory: 'interns' } })}
                        />
                        <StatCard
                            title={t('teacherDashboard.pendingGradings')}
                            value={summaryStats.pendingAssignments}
                            icon={FileText}
                            iconBg="bg-amber-50"
                            iconColor="text-amber-600"
                        />
                        <StatCard
                            title={t('teacherDashboard.todaysPresent')}
                            value={summaryStats.todayPresent}
                            icon={User}
                            iconBg="bg-primary/5"
                            iconColor="text-primary"
                            onClick={() => navigate('/teacher/quick-attendance', { state: { initialFilter: 'present' } })}
                        />
                        <StatCard
                            title={t('teacherDashboard.todaysAbsent')}
                            value={summaryStats.todayAbsent}
                            icon={X}
                            iconBg="bg-red-50"
                            iconColor="text-red-600"
                            onClick={() => navigate('/teacher/quick-attendance', { state: { initialFilter: 'absent' } })}
                        />
                    </div>
                )}



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
                                className="w-full pl-12 pr-4 py-3.5 !bg-gray-50/50 dark:!bg-white/5 border border-transparent focus:border-primary focus:!bg-white dark:focus:!bg-white/10 rounded-2xl transition-all outline-none text-sm font-medium dark:text-white"
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
                    <div className="bg-white rounded-3xl p-4 sm:p-6 border border-gray-100 shadow-sm">
                        <div className="relative flex items-center bg-gray-50/50 dark:!bg-white/5 rounded-2xl px-4 py-3.5 border border-transparent focus-within:border-primary focus-within:bg-white dark:focus-within:bg-white/10 transition-all">
                            <Search className="w-5 h-5 text-gray-400 mr-3" />
                            <input
                                type="text"
                                placeholder="Search student by name, roll no, or email..."
                                value={studentSearchQuery}
                                onChange={(e) => setStudentSearchQuery(e.target.value)}
                                className="bg-transparent border-none outline-none w-full text-gray-700 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/30 font-medium"
                                autoFocus
                            />
                            {studentSearchQuery && (
                                <button
                                    onClick={() => { setStudentSearchQuery(''); setFilteredStudents([]); }}
                                    className="ml-2 text-gray-400 hover:text-gray-600 font-bold text-xs"
                                >✕</button>
                            )}
                        </div>
                    </div>
                )}

                {/* Course List / Student Search Results */}
                {searchMode === 'students' ? (
                    <div className="space-y-3">
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest px-1">
                            {studentSearchQuery.trim()
                                ? `${filteredStudents.length} result${filteredStudents.length !== 1 ? 's' : ''} found`
                                : `${filteredStudents.length} active student${filteredStudents.length !== 1 ? 's' : ''}`}
                        </p>
                        
                        {filteredStudents.length === 0 ? (
                            <div className="bg-white rounded-3xl p-12 border border-gray-100 text-center shadow-sm">
                                <Search className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                                <p className="text-gray-500 font-medium">
                                    {studentSearchQuery.trim()
                                        ? `No students found matching "${studentSearchQuery}"`
                                        : 'No active students found'}
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-3">
                                {filteredStudents.map((student, idx) => (
                                    <motion.div
                                        key={student.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        onClick={() => handleSelectStudentWork(student)}
                                        className="bg-white rounded-3xl p-5 border border-gray-100 hover:shadow-lg hover:border-primary transition-all cursor-pointer group flex items-center gap-4 shadow-sm"
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
                                            <span className="text-xs">{student.role === 'intern' ? 'OPEN PROJECT' : 'OPEN ASSIGNMENT'}</span>
                                            <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </div>
                ) : filteredCourses.length === 0 ? (
                    <div className="bg-white rounded-2xl p-12 border border-gray-100 text-center">
                        <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500">No courses match your filters</p>
                        {(searchQuery || selectedCities.length > 0 || selectedTypes.length > 0) && (
                            <button
                                onClick={() => { setSearchQuery(''); setSelectedCities([]); setSelectedTypes([]); }}
                                className="mt-2 text-primary hover:text-primary font-medium text-sm"
                            >
                                Clear all filters
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-3 pr-3">
                        {filteredCourses.map((course, index) => {
                            const CourseIcon = getCourseIcon(course.category, course.title || course.name);
                            const courseStyle = getCourseStyle(course.category, course.title || course.name);

                            return (
                                <motion.div
                                    key={course.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    onClick={() => handleSelectCourse(course)}
                                    className="bg-white rounded-3xl p-6 border border-primary/20 cursor-pointer hover:shadow-xl hover:border-primary/50 transition-all group relative"
                                >
                                    {/* Combined Pending Badge */}
                                    {(course.pendingAssignments > 0 || course.unreadMessages > 0) && (
                                        <div className="absolute -top-2 -right-2 flex flex-col gap-1 items-end z-20">
                                            {course.pendingAssignments > 0 && (
                                                <div className="w-7 h-7 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                                                    {course.pendingAssignments > 99 ? '99+' : course.pendingAssignments}
                                                </div>
                                            )}
                                            {course.unreadMessages > 0 && (
                                                <div className="w-7 h-7 bg-blue-500 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                                                    <MessageSquare className="w-3 h-3" />
                                                </div>
                                            )}
                                        </div>
                                    )}


                                    <div className="relative z-10">
                                        <div className="flex items-start justify-between mb-6">
                                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-br ${courseStyle.gradient} shadow-lg shadow-primary/10`}>
                                                <CourseIcon className="w-7 h-7 text-white" />
                                            </div>
                                            <div className="flex flex-col items-end gap-2">
                                                {/* Status badge removed */}
                                                <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${course.targetAudience === 'interns'
                                                    ? 'bg-purple-100 text-purple-700'
                                                    : 'bg-blue-100 text-blue-700'
                                                }`}>
                                                    {course.targetAudience === 'interns' ? 'Internship' : 'Student'}
                                                </span>
                                            </div>
                                        </div>

                                        <h3 className="text-xl font-black text-gray-900 mb-2 uppercase tracking-tight group-hover:text-primary transition-colors line-clamp-1">{course.title || course.name}</h3>

                                        <div className="grid grid-cols-2 gap-4 mb-6">
                                            <div className="space-y-3">
                                                <div className="flex items-center gap-2 text-sm text-gray-500 font-bold">
                                                    <Users className="w-4 h-4 text-gray-400" />
                                                    <span>{course.internCount} Total</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-sm text-primary font-bold">
                                                    <CheckCircle className="w-4 h-4" />
                                                    <span>{course.activeStudents} Active</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-sm text-amber-600 font-bold">
                                                    <FileText className="w-4 h-4" />
                                                    <span>{course.pendingAssignments} Pending Tasks</span>
                                                </div>
                                                {course.unreadMessages > 0 && (
                                                    <div className="flex items-center gap-2 text-sm text-blue-600 font-bold">
                                                        <MessageSquare className="w-4 h-4" />
                                                        <span>{course.unreadMessages} New Messages</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="bg-gray-50 rounded-2xl p-3 border border-gray-100">
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 border-b border-gray-200 pb-1">Today's Attendance</p>
                                                <div className="flex items-center justify-between">
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-bold text-gray-500">Present</span>
                                                        <span className="text-sm font-black text-present-fixed">{course.presentCount || 0}</span>
                                                    </div>
                                                    <div className="w-px h-6 bg-gray-100"></div>
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-bold text-gray-500">Absent</span>
                                                        <span className="text-sm font-black text-absent-fixed">{course.absentCount || 0}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                                            <div className="flex items-center gap-2 text-xs text-gray-400 font-medium">
                                                <Calendar className="w-3.5 h-3.5" />
                                                {course.city || course.location}
                                            </div>
                                            <div className="flex items-center text-primary font-black text-xs uppercase tracking-widest group-hover:translate-x-1 transition-transform">
                                                <span>Manage Portal</span>
                                                <ArrowRight className="w-4 h-4 ml-2" />
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Live Class Modal */}
            {
                showLiveClassModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-white rounded-2xl p-6 w-full max-w-xl"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                    {liveClassModalType === 'google' ? <Video className="w-6 h-6 text-red-500" /> : <Users className="w-6 h-6 text-primary" />}
                                    {liveClassModalType === 'google' ? 'Google Meet Link' : 'Start Adeeb Meet'}
                                </h3>
                                <button
                                    onClick={() => setShowLiveClassModal(false)}
                                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleCreateLiveClass} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Class Title *
                                    </label>
                                    <input
                                        type="text"
                                        value={liveClassForm.title}
                                        onChange={(e) => setLiveClassForm({ ...liveClassForm, title: e.target.value })}
                                        placeholder="e.g., Web Development Live Session"
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                                        required
                                    />
                                </div>

                                {liveClassModalType === 'google' && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Google Meet Link *
                                        </label>
                                        <input
                                            type="url"
                                            value={liveClassForm.link}
                                            onChange={(e) => setLiveClassForm({ ...liveClassForm, link: e.target.value })}
                                            placeholder="e.g., https://meet.google.com/abc-defg-hij"
                                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                                            required
                                        />
                                    </div>
                                )}



                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Description (Optional)
                                    </label>
                                    <textarea
                                        value={liveClassForm.description}
                                        onChange={(e) => setLiveClassForm({ ...liveClassForm, description: e.target.value })}
                                        placeholder="Brief description about the class..."
                                        rows={2}
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                                    />
                                </div>

                                {/* Auto-end timer */}
                                <div className="bg-primary/5 border border-primary/10 rounded-xl p-4">
                                    <label className="flex items-center gap-2 text-sm font-semibold text-orange-700 mb-3">
                                        <Timer className="w-4 h-4" />
                                        Auto-End Timer (Optional)
                                    </label>
                                    <div className="flex gap-2 flex-wrap mb-2">
                                        {[30, 60, 90, 120].map(min => (
                                            <button
                                                key={min}
                                                type="button"
                                                onClick={() => setLiveClassForm(f => ({ ...f, autoEndMinutes: f.autoEndMinutes === String(min) ? '' : String(min) }))}
                                                className={`px-3 py-2 rounded-xl text-sm font-semibold transition-all border ${
                                                    liveClassForm.autoEndMinutes === String(min)
                                                        ? 'bg-primary text-white border-primary shadow-sm'
                                                        : 'bg-white text-gray-700 border-gray-200 hover:border-orange-300'
                                                }`}
                                            >
                                                {min} min
                                            </button>
                                        ))}
                                        <input
                                            type="number"
                                            min="1"
                                            max="480"
                                            value={liveClassForm.autoEndMinutes}
                                            onChange={(e) => setLiveClassForm({ ...liveClassForm, autoEndMinutes: e.target.value })}
                                            placeholder="Custom mins"
                                            className="flex-1 min-w-[90px] px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 focus:border-transparent text-sm bg-white"
                                        />
                                    </div>
                                    {liveClassForm.autoEndMinutes ? (
                                        <p className="text-xs text-primary flex items-center gap-1">
                                            <Timer className="w-3 h-3" />
                                            Class will auto-remove after <strong>{liveClassForm.autoEndMinutes} minute{liveClassForm.autoEndMinutes !== '1' ? 's' : ''}</strong>
                                        </p>
                                    ) : (
                                        <p className="text-xs text-gray-400">Leave empty to end the class manually</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Show to *
                                    </label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {[
                                            { value: 'all', label: 'All' },
                                            { value: 'student', label: 'Students' },
                                            { value: 'intern', label: 'Interns' }
                                        ].map((opt) => (
                                            <button
                                                key={opt.value}
                                                type="button"
                                                onClick={() => setLiveClassForm({ ...liveClassForm, visibility: opt.value })}
                                                className={`px-4 py-3 rounded-xl font-medium transition-all ${liveClassForm.visibility === opt.value
                                                    ? 'bg-primary text-white'
                                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                    }`}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowLiveClassModal(false)}
                                        className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isCreatingLiveClass}
                                        className="flex-1 px-4 py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {isCreatingLiveClass ? (
                                            <ButtonLoader />
                                        ) : liveClassModalType === 'google' ? (
                                            <Video className="w-5 h-5" />
                                        ) : (
                                            <Users className="w-5 h-5" />
                                        )}
                                        {isCreatingLiveClass 
                                            ? 'Starting...' 
                                            : liveClassModalType === 'google' 
                                                ? 'Google Meet Link' 
                                                : 'Start Adeeb Meet'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )
            }
        </>
    );
};

export default TeacherCourses;



