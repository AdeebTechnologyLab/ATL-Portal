import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import {
    BookOpen,
    Users,
    ClipboardList,
    CheckCircle,
    Clock,
    ArrowRight,
    Plus,
    MoreHorizontal,
    FileText,
    TrendingUp,
    Calendar,
    Video,
    X,
    ExternalLink,
    StopCircle,
    Award,
    Timer,
    MessageSquare,
    GraduationCap
} from 'lucide-react';
import StatCard from '../../components/ui/StatCard';
import Badge from '../../components/ui/Badge';
import Loader, { ButtonLoader } from '../../components/ui/Loader';
import { BarChart } from '../../components/charts/Charts';
import { courseAPI, enrollmentAPI, assignmentAPI, dailyTaskAPI, liveClassAPI, certificateAPI } from '../../services/api';
import { getCourseIcon, getCourseStyle } from '../../utils/courseIcons';
import { formatDate } from '../../utils/dateFormatter';
import BirthdayWish from '../../components/dashboard/BirthdayWish';
import { useTranslation } from 'react-i18next';
import { requestNotificationPermission, showGradingNotification } from '../../utils/desktopNotifications';

const TeacherDashboard = () => {
    const { t } = useTranslation();
    const { user } = useSelector((state) => state.auth);
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [myCourses, setMyCourses] = useState([]);
    const [totalStudents, setTotalStudents] = useState(0);
    const [stats, setStats] = useState([]);
    const [myCertificate, setMyCertificate] = useState(null);

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
    const [liveCountdowns, setLiveCountdowns] = useState({}); // { [id]: secondsLeft }
    const cleanupIntervalRef = useRef(null);

    const socketRef = useRef(null);
    const getSocketURL = () => {
    const rawUrl = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1' ? 'https://lms-adeeb-technology-lab.onrender.com/api' : 'http://localhost:5000/api');
    return rawUrl === '/api' ? 'https://lms-adeeb-technology-lab.onrender.com' : rawUrl.replace(/\/api\/?$/, '');
};
    const SOCKET_URL = getSocketURL();

    useEffect(() => {
        if (user?.id || user?._id) {
            fetchDashboardData();
            fetchActiveLiveClasses();
            fetchMyCertificate();

            // Request notification permission on dashboard load
            requestNotificationPermission();

            // Setup real-time updates
            socketRef.current = io(SOCKET_URL, { withCredentials: true });
            const myId = user?.id || user?._id;
            if (myId) {
                socketRef.current.emit('join_chat', String(myId));
            }

            socketRef.current.on('new_submission', (data) => {
                console.log('📥 New submission received:', data);
                // Show notification for new submissions
                showGradingNotification(
                    data.type || 'assignment',
                    data.studentName ? `${data.studentName} submitted: ${data.itemName || 'submission'}` : data.itemName || 'New submission',
                    null,
                    () => navigate('/grading')
                );
                fetchDashboardData();
            });

            socketRef.current.on('new_global_message', (data) => {
                console.log('💬 New message received:', data);
                fetchDashboardData();
            });

            socketRef.current.on('live_class_started', () => fetchActiveLiveClasses());
            socketRef.current.on('live_class_ended', () => fetchActiveLiveClasses());

            return () => {
                if (socketRef.current) socketRef.current.disconnect();
            };
        }
    }, [user]);

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
                // Remove expired ones from UI (backend cleanup happens via polling)
                if (expired.length > 0) {
                    liveClassAPI.cleanupExpired().catch(() => { });
                    return updated.filter(lc => !expired.includes(lc._id));
                }
                return updated;
            });
        };

        const interval = setInterval(tick, 1000);
        tick(); // run immediately
        return () => clearInterval(interval);
    }, []);

    const fetchMyCertificate = async () => {
        try {
            const res = await certificateAPI.getMy();
            const certs = res.data.certificates || [];
            // Teacher certificate: one with no course (null or undefined)
            // Also check by rollNo starting with 't' as a safety fallback
            const teacherCert = certs.find(c => !c.course || c.course === null);
            console.log('Teacher dashboard - My certs:', certs.length, 'Teacher cert:', teacherCert);
            setMyCertificate(teacherCert || null);
        } catch (e) {
            console.error('Could not fetch teacher certificate:', e);
        }
    };

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

    const fetchDashboardData = async () => {
        setIsLoading(true);
        try {
            // Use optimized teacher dashboard API
            const res = await courseAPI.getTeacherDashboard();
            const coursesWithData = res.data.data || [];

            console.log('Dashboard - Teacher courses found:', coursesWithData.length);

            // Calculate total stats
            const totalStudentsCount = coursesWithData.reduce((sum, c) => sum + (c.internCount || 0), 0);
            const totalPendingAssignments = coursesWithData.reduce((sum, c) => sum + (c.pendingAssignments || 0), 0);
            const totalUnreadMessages = coursesWithData.reduce((sum, c) => sum + (c.unreadMessages || 0), 0);
            const activeStudentsCount = coursesWithData
                .filter(c => c.targetAudience === 'students')
                .reduce((sum, c) => sum + (c.activeStudents || 0), 0);

            const activeInternsCount = coursesWithData
                .filter(c => c.targetAudience === 'interns')
                .reduce((sum, c) => sum + (c.activeStudents || 0), 0);

            setMyCourses(coursesWithData);
            setTotalStudents(totalStudentsCount);

            // Build stats
            setStats([
                {
                    title: t('teacherDashboard.activeCourses'),
                    value: coursesWithData.length.toString(),
                    icon: BookOpen,
                    iconBg: 'bg-primary/10',
                    iconColor: 'text-primary',
                },
                {
                    title: t('teacherDashboard.activeStudents'),
                    value: activeStudentsCount.toString(),
                    icon: Users,
                    iconBg: 'bg-blue-100',
                    iconColor: 'text-blue-600',
                    onClick: () => navigate('/teacher/quick-attendance', { state: { initialCategory: 'students' } })
                },
                {
                    title: t('teacherDashboard.activeInterns'),
                    value: activeInternsCount.toString(),
                    icon: GraduationCap,
                    iconBg: 'bg-purple-100',
                    iconColor: 'text-purple-600',
                    onClick: () => navigate('/teacher/quick-attendance', { state: { initialCategory: 'interns' } })
                },
                {
                    title: 'Pending Reviews',
                    value: totalPendingReviews.toString(),
                    icon: ClipboardList,
                    iconBg: 'bg-amber-100',
                    iconColor: 'text-amber-600',
                },
            ]);

        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const submissionsChartData = {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [
            {
                label: 'Submissions',
                data: [0, 0, 0, 0, 0, 0, 0],
                backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#ff8e01',
                borderRadius: 6,
                barThickness: 24,
            },
        ],
    };

    if (isLoading) {
        return (
            <Loader message="Loading dashboard..." />
        );
    }

    return (
        <>
            <div className="space-y-6">
                {/* Welcome Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-r from-primary-darkest to-primary-dark rounded-3xl p-6 md:p-8 text-white relative overflow-hidden group shadow-2xl shadow-primary/20"
                >
                    <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -mr-48 -mt-48 blur-3xl group-hover:scale-110 transition-transform duration-700"></div>
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 relative z-10">
                        <div className="flex items-center gap-5">
                            <div className="w-16 h-16 md:w-20 md:h-20 bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/20 flex items-center justify-center shrink-0">
                                <img src="/logo.png" alt="Logo" className="w-full h-full object-contain brightness-0 invert" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em] bg-white px-2 py-0.5 rounded-md shadow-sm">Official</span>
                                    <h2 className="text-2xl md:text-3xl font-bold">Welcome, {user?.name || 'Teacher'}!</h2>
                                </div>
                                <p className="text-white/70 text-sm md:text-base font-medium">
                                    You have <span className="text-white font-black underline decoration-primary underline-offset-4">{myCourses.length} active courses</span> under your management.
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-2 sm:gap-3 flex-wrap">
                            <button
                                onClick={() => {
                                    setLiveClassForm({ title: '', link: '', description: '', visibility: 'all', autoEndMinutes: '' });
                                    setLiveClassModalType('google');
                                    setShowLiveClassModal(true);
                                }}
                                className="px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-all duration-300 flex items-center gap-2 shadow-lg shadow-red-500/20"
                            >
                                <Video className="w-4 h-4" />
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
                                <Users className="w-4 h-4" />
                                {t('teacherDashboard.startAdeebMeet')}
                            </button>
                            <button
                                onClick={() => navigate('/teacher/attendance')}
                                className="px-5 py-2.5 bg-white hover:bg-white/90 text-primary-dark rounded-xl font-medium transition-all duration-300"
                            >
                                Mark Attendance
                            </button>
                        </div>
                    </div>
                </motion.div>

                <BirthdayWish />

                {/* Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                    {stats.map((stat, index) => (
                        <motion.div
                            key={stat.title}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <StatCard {...stat} />
                        </motion.div>
                    ))}
                </div>

                {/* Main Content */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* My Courses */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="lg:col-span-2 bg-white rounded-2xl p-6 border border-primary/20 shadow-sm overflow-visible"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">My Courses</h3>
                                <p className="text-sm text-gray-500">Select a course to manage assignments and daily work</p>
                            </div>
                        </div>

                        {myCourses.length === 0 ? (
                            <div className="text-center py-12">
                                <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                <p className="text-gray-500">No courses assigned yet</p>
                                <p className="text-sm text-gray-400 mt-1">Contact admin to get courses assigned to you</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 overflow-visible pt-2 pr-2">
                                {myCourses.map((course, index) => (
                                    <motion.div
                                        key={course.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.4 + index * 0.1 }}
                                        className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer border border-primary/10 hover:border-primary/30 relative"
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
                                        <div className="flex items-start justify-between mb-3">
                                            {(() => {
                                                const CourseIcon = getCourseIcon(course.category, course.title);
                                                const courseStyle = getCourseStyle(course.category, course.title);
                                                return (
                                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br ${courseStyle.gradient}`}>
                                                        <CourseIcon className="w-6 h-6 text-white" />
                                                    </div>
                                                );
                                            })()}
                                            <Badge variant={course.status === 'active' ? 'success' : 'secondary'}>
                                                {course.status}
                                            </Badge>
                                        </div>
                                        <h4 className="font-semibold text-gray-900 mb-2">{course.title}</h4>
                                        <div className="flex items-center gap-4 text-sm text-gray-500 mb-2">
                                            <span className="flex items-center gap-1">
                                                <Users className="w-4 h-4" /> {course.internCount || course.students} students
                                            </span>
                                            {course.startDate && (
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="w-4 h-4" /> {formatDate(course.startDate)}
                                                </span>
                                            )}
                                        </div>

                                        {/* Assignment & Message Stats */}
                                        <div className="bg-gradient-to-r from-primary/5/80 to-blue-50/80 rounded-lg p-2 mb-3 border border-primary/10/50">
                                            <div className="flex items-center justify-between text-xs">
                                                <div className="flex flex-col gap-1">
                                                    {course.pendingAssignments > 0 && (
                                                        <span className="flex items-center gap-1 text-amber-600 font-bold">
                                                            <FileText className="w-3.5 h-3.5" />
                                                            {course.pendingAssignments} tasks pending
                                                        </span>
                                                    )}
                                                    {course.unreadMessages > 0 && (
                                                        <span className="flex items-center gap-1 text-blue-600 font-bold">
                                                            <MessageSquare className="w-3.5 h-3.5" />
                                                            {course.unreadMessages} new messages
                                                        </span>
                                                    )}
                                                    {(!course.pendingAssignments && !course.unreadMessages) && (
                                                        <span className="flex items-center gap-1 text-primary font-medium">
                                                            <CheckCircle className="w-3.5 h-3.5" />
                                                            Up to date
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => navigate('/teacher/attendance')}
                                            className="flex items-center gap-1 text-sm font-medium text-primary hover:text-primary"
                                        >
                                            Manage Course <ArrowRight className="w-4 h-4" />
                                        </button>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </motion.div>

                    {/* Submissions Chart */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="bg-white rounded-2xl p-6 border border-primary/20 shadow-sm"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">Weekly Activity</h3>
                                <p className="text-sm text-gray-500">Student submissions</p>
                            </div>
                        </div>
                        <BarChart data={submissionsChartData} height={200} />
                    </motion.div>
                </div>

                {/* Quick Actions */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="bg-white rounded-2xl p-6 border border-primary/20 shadow-sm"
                >
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <button
                            onClick={() => navigate('/teacher/attendance')}
                            className="flex items-center gap-4 p-4 bg-primary/5 rounded-xl hover:bg-primary/10 transition-colors"
                        >
                            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                                <ClipboardList className="w-6 h-6 text-primary" />
                            </div>
                            <div className="text-left">
                                <p className="font-semibold text-gray-900">Mark Attendance</p>
                                <p className="text-sm text-gray-500">Take today's attendance</p>
                            </div>
                        </button>
                        <button
                            onClick={() => navigate('/teacher/profile')}
                            className="flex items-center gap-4 p-4 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors"
                        >
                            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                                <Users className="w-6 h-6 text-blue-600" />
                            </div>
                            <div className="text-left">
                                <p className="font-semibold text-gray-900">My Profile</p>
                                <p className="text-sm text-gray-500">View and edit profile</p>
                            </div>
                        </button>
                        <button
                            className="flex items-center gap-4 p-4 bg-purple-50 rounded-xl hover:bg-primary/10 transition-colors"
                        >
                            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                                <TrendingUp className="w-6 h-6 text-primary" />
                            </div>
                            <div className="text-left">
                                <p className="font-semibold text-gray-900">View Reports</p>
                                <p className="text-sm text-gray-500">Check attendance reports</p>
                            </div>
                        </button>
                    </div>
                </motion.div>

                {/* My Certificate */}
                {myCertificate && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.55 }}
                        className="bg-gradient-to-r from-primary-darkest to-primary-dark rounded-2xl p-6 border border-primary text-white"
                    >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center shrink-0">
                                    <Award className="w-7 h-7 text-amber-400" />
                                </div>
                                <div>
                                    <p className="text-xs text-white/60 uppercase tracking-widest font-bold mb-0.5">Your Certificate</p>
                                    <h3 className="text-lg font-bold text-white">{myCertificate.skills || 'Teaching Certificate'}</h3>
                                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                                        {myCertificate.rollNo && (
                                            <span className="text-xs bg-white/10 text-amber-300 px-2 py-0.5 rounded-full font-mono font-bold">
                                                Roll No# {myCertificate.rollNo}
                                            </span>
                                        )}
                                        {myCertificate.duration && (
                                            <span className="text-xs text-white/60">{myCertificate.duration}</span>
                                        )}
                                        {myCertificate.passoutDate && (
                                            <span className="text-xs text-white/60">
                                                Issued: {formatDate(myCertificate.passoutDate)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            {myCertificate.certificateLink && (
                                <a
                                    href={myCertificate.certificateLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-primary-darkest font-bold rounded-xl transition-all shrink-0 self-start sm:self-auto"
                                >
                                    <ExternalLink className="w-4 h-4" />
                                    Open Certificate
                                </a>
                            )}
                        </div>
                    </motion.div>
                )}

                {/* Active Live Classes */}
                {activeLiveClasses.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-2xl p-6 border border-gray-100"
                    >
                        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <Video className="w-5 h-5 text-red-500" />
                            Your Active Live Classes
                        </h3>
                        <div className="space-y-3">
                            {activeLiveClasses.map((lc) => {
                                const hasTimer = !!lc.autoEndMinutes;
                                const secondsLeft = lc._secondsLeft ?? (hasTimer
                                    ? Math.max(0, Math.round((new Date(lc.startTime).getTime() + lc.autoEndMinutes * 60 * 1000 - Date.now()) / 1000))
                                    : null);
                                const mins = hasTimer ? Math.floor(secondsLeft / 60) : null;
                                const secs = hasTimer ? secondsLeft % 60 : null;
                                const isExpiringSoon = hasTimer && secondsLeft <= 60;
                                return (
                                    <div
                                        key={lc._id}
                                        className={`flex items-center justify-between p-4 rounded-xl border ${isExpiringSoon
                                            ? 'bg-primary/5 border-orange-300 animate-pulse'
                                            : 'bg-red-50 border-red-200'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                                            <div>
                                                <p className="font-semibold text-gray-900">{lc.title}</p>
                                                <div className="flex items-center gap-3 flex-wrap">
                                                    <p className="text-sm text-gray-500">
                                                        Visible to: {lc.visibility === 'all' ? 'All Students & Interns' : lc.visibility === 'student' ? 'Students Only' : 'Interns Only'}
                                                    </p>
                                                    {hasTimer && secondsLeft !== null && (
                                                        <span className={`flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${isExpiringSoon
                                                            ? 'bg-orange-200 text-orange-700'
                                                            : 'bg-red-100 text-red-600'
                                                            }`}>
                                                            <Timer className="w-3 h-3" />
                                                            {`${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`} left
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            {lc.link?.includes('/live-meet/') ? (
                                                <button
                                                    onClick={() => window.open(`/live-meet/${lc.link.split('/').pop()}`, '_blank')}
                                                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary transition-colors flex items-center gap-2"
                                                >
                                                    <Video className="w-4 h-4" />
                                                    Open Meet
                                                </button>
                                            ) : (
                                                <a
                                                    href={lc.link}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary transition-colors flex items-center gap-2"
                                                >
                                                    <ExternalLink className="w-4 h-4" />
                                                    Open
                                                </a>
                                            )}
                                            <button
                                                onClick={() => handleEndLiveClass(lc._id)}
                                                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2"
                                            >
                                                <StopCircle className="w-4 h-4" />
                                                End Class
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </div>

            {/* Live Class Creation Modal */}
            {showLiveClassModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden"
                    >
                        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100 shrink-0">
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

                        <form onSubmit={handleCreateLiveClass} className="flex flex-col flex-1 overflow-hidden">
                            {/* Scrollable fields */}
                            <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
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
                                                className={`px-3 py-2 rounded-xl text-sm font-semibold transition-all border ${liveClassForm.autoEndMinutes === String(min)
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
                            </div>

                            {/* Sticky bottom buttons */}
                            <div className="flex gap-3 px-6 py-4 border-t border-gray-100 shrink-0">
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
            )}

        </>
    );
};

export default TeacherDashboard;




