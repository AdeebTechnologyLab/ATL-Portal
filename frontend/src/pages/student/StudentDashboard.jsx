import { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import {
    BookOpen,
    Clock,
    CheckCircle,
    CreditCard,
    Calendar,
    ArrowRight,
    FileText,
    Bell,
    Trash2,
    Video,
    ExternalLink,
    MessageSquare,
    TrendingUp
} from 'lucide-react';
import BirthdayWish from '../../components/dashboard/BirthdayWish';
import WorkspaceRestrictedBanner from '../../components/dashboard/WorkspaceRestrictedBanner';
import StatCard from '../../components/ui/StatCard';
import Badge from '../../components/ui/Badge';
import { enrollmentAPI, feeAPI, assignmentAPI, liveClassAPI, chatAPI } from '../../services/api';
import Modal from '../../components/ui/Modal'; // Assuming Modal component exists
import { getCourseIcon, getCourseColor, getCourseStyle } from '../../utils/courseIcons';
import { formatDate } from '../../utils/dateFormatter';
import { calculateOutstandingFees } from '../../utils/feeHelpers';
import { useTranslation } from 'react-i18next';
import { requestNotificationPermission, showAssignmentNotification, showGradingNotification, showAttendanceNotification } from '../../utils/desktopNotifications';

const getSocketURL = () => {
    const rawUrl = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1' ? 'https://lms-adeeb-technology-lab.onrender.com/api' : 'http://localhost:5000/api');
    return rawUrl === '/api' ? 'https://lms-adeeb-technology-lab.onrender.com' : rawUrl.replace(/\/api\/?$/, '');
};

const SOCKET_URL = getSocketURL();


const StudentDashboard = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { role, user } = useSelector((state) => state.auth);
    const [isLoading, setIsLoading] = useState(true);
    const [enrolledCourses, setEnrolledCourses] = useState([]);
    const [pendingFees, setPendingFees] = useState(0);
    const [stats, setStats] = useState([]);
    const [pendingAssignments, setPendingAssignments] = useState([]);
    const [withdrawModal, setWithdrawModal] = useState({ open: false, enrollmentId: null, courseTitle: '' });
    const [activeLiveClasses, setActiveLiveClasses] = useState([]);
    const socketRef = useRef(null);

    useEffect(() => {
        fetchDashboardData();
        fetchActiveLiveClasses();

        // Request notification permission on dashboard load
        requestNotificationPermission();

        // Socket connection
        socketRef.current = io(SOCKET_URL, { withCredentials: true });

        const myId = user?.id || user?._id;
        if (myId) {
            socketRef.current.emit('join_chat', myId);
        }

        socketRef.current.on('live_class_started', () => {
            fetchActiveLiveClasses();
        });

        socketRef.current.on('live_class_ended', () => {
            fetchActiveLiveClasses();
        });

        socketRef.current.on('new_assignment', (data) => {
            console.log('🆕 New assignment received:', data);
            // Show desktop notification for new assignment
            showAssignmentNotification(
                data.courseName || 'Course',
                data.assignmentTitle || data.title || 'New assignment',
                () => navigate('/assignments')
            );
            fetchDashboardData();
        });

        socketRef.current.on('new_browser_notification', (data) => {
            console.log('🔔 New notification received:', data);
            // Show desktop notification for grading results
            if (data.type === 'assignment_graded' || data.type === 'test_graded' || data.type === 'dailyTask_graded') {
                showGradingNotification(
                    data.type.replace('_graded', ''),
                    data.itemName || data.title || 'Result',
                    data.marks,
                    () => navigate(data.url || '/assignments')
                );
            }
            fetchDashboardData();
        });

        socketRef.current.on('new_global_message', (data) => {
            console.log('💬 New message received:', data);
            fetchDashboardData(); // Refetch to update unread counts
        });

        socketRef.current.on('fee_updated', () => {
            fetchDashboardData();
        });

        socketRef.current.on('new_test_submission', (data) => {
            console.log('📝 Test submitted:', data);
            // Show notification when test is auto-graded
            showGradingNotification(
                'test',
                data.testName || data.title || 'Test Result',
                data.marks,
                () => navigate('/tests')
            );
            fetchDashboardData();
        });

        socketRef.current.on('attendance_updated', (data) => {
            console.log('✅ Attendance updated:', data);
            // Show notification when attendance is marked
            if (data.courseName && data.status) {
                showAttendanceNotification(
                    data.courseName,
                    data.status.toUpperCase(),
                    () => navigate('/attendance')
                );
            }
            fetchDashboardData();
        });

        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        };
    }, []);

    const notifyLiveClass = (liveClass) => {
        if (!('Notification' in window)) return;
        
        const notifiedClasses = JSON.parse(localStorage.getItem('notifiedLiveClasses') || '[]');
        if (notifiedClasses.includes(liveClass._id)) return;

        const showNotification = () => {
            const notification = new Notification(`Live Class: ${liveClass.title}`, {
                body: liveClass.description || `Class by ${liveClass.createdBy?.name || 'Teacher'}. Click to join now!`,
                icon: '/favicon.ico'
            });
            notification.onclick = () => {
                window.focus();
                if (liveClass.link?.includes('/live-meet/')) {
                    window.open(`/live-meet/${liveClass.link.split('/').pop()}`, '_blank');
                } else {
                    window.open(liveClass.link, '_blank');
                }
                notification.close();
            };
            
            notifiedClasses.push(liveClass._id);
            // Keep array size manageable
            if (notifiedClasses.length > 50) notifiedClasses.shift();
            localStorage.setItem('notifiedLiveClasses', JSON.stringify(notifiedClasses));
        };

        if (Notification.permission === 'granted') {
            showNotification();
        } else if (Notification.permission !== 'denied') {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    showNotification();
                }
            });
        }
    };

    const fetchActiveLiveClasses = async () => {
        try {
            const res = await liveClassAPI.getActive();
            const classes = res.data.data || [];
            setActiveLiveClasses(classes);
            
            // Trigger desktop notification for new classes
            classes.forEach(c => notifyLiveClass(c));
        } catch (error) {
            console.error('Error fetching live classes:', error);
        }
    };

    const handleWithdrawClick = (e, course) => {
        e.stopPropagation(); // Prevent navigation
        setWithdrawModal({ open: true, enrollmentId: course.enrollmentId, courseTitle: course.title });
    };

    const confirmWithdraw = async () => {
        try {
            await enrollmentAPI.withdraw(withdrawModal.enrollmentId);
            setWithdrawModal({ open: false, enrollmentId: null, courseTitle: '' });
            fetchDashboardData(); // Refresh list
        } catch (error) {
            console.error('Withdrawal failed:', error);
            alert(error.response?.data?.message || 'Failed to withdraw from course');
        }
    };

    const fetchDashboardData = async () => {
        setIsLoading(true);
        try {
            // Fetch enrollments
            const enrollmentRes = await enrollmentAPI.getMy();
            const enrollments = enrollmentRes.data.data || [];

            // Fetch chat unread counts
            let chatData = [];
            try {
                const chatRes = await chatAPI.getStudentCourses();
                chatData = chatRes.data.data || [];
            } catch (e) {
                console.error('Chat unread fetch failed', e);
            }

            const courses = enrollments.map(e => {
                const courseId = e.course?._id || e._id;
                const unread = chatData.find(c => String(c._id) === String(courseId))?.totalUnread || 0;

                return {
                    id: courseId,
                    enrollmentId: e._id,
                    title: e.course?.title || 'Unknown Course',
                    category: e.course?.category || '',
                    teacher: e.course?.teachers?.[0]?.name || 'TBA',
                    bookLink: e.course?.bookLink || '',
                    progress: e.progress || 0,
                    nextClass: e.course?.schedule || 'Check schedule',
                    isActive: e.isActive,
                    isPaused: e.isPaused,
                    status: e.status,
                    unreadMessages: unread,
                    isCompleted: e.status === 'completed',
                    isFirstMonthVerified: e.installments?.[0]?.status === 'verified'
                };
            });
            setEnrolledCourses(courses);

            // Fetch fees (pending until paid and admin-verified)
            let totalPendingAmount = 0;
            try {
                const feeRes = await feeAPI.getMy();
                const { totalAmount } = calculateOutstandingFees(feeRes.data.data || []);
                totalPendingAmount = totalAmount;
            } catch (e) {
                // Fees API might not exist for this user
            }
            setPendingFees(totalPendingAmount);

            // Fetch assignments
            let activeAssignments = [];
            try {
                const assignRes = await assignmentAPI.getMy();
                const allAssignments = assignRes.data.assignments || [];

                // Filter: Assigned to user, not submitted yet, and deadline is in the future
                // AND only show assignments for courses where at least the first month is verified
                activeAssignments = allAssignments.filter(a => {
                    const courseId = a.course?._id || a.course;
                    const courseEnroll = courses.find(c => c.id === courseId);

                    // Allow if course is active OR completed (sometimes final assignments are post-completion)
                    // But generally, restrict to verified first month
                    const isFirstMonthVerified = courseEnroll?.isFirstMonthVerified;

                    const mySub = a.submissions?.find(s => (s.user?._id || s.user) === (user?._id || user?.id));
                    const isSubmitted = !!mySub;
                    const isRejected = mySub?.status === 'rejected';

                    // Check deadline
                    // const isDeadlinePassed = new Date(a.dueDate) < new Date();

                    // Requirement: "pending assignments from all registered cources"
                    // So we want: Not Submitted OR Rejected.
                    // We typically typically exclude deadline passed if it's strictly "pending actionable", 
                    // but if they can still submit late, we include it.
                    // Let's stick to "Not Submitted or Rejected"

                    if (!isFirstMonthVerified) return false;

                    return (!isSubmitted) || isRejected;
                });
            } catch (e) {
                console.error('Error fetching assignments:', e);
            }
            // Sort by due date (soonest first)
            setPendingAssignments(activeAssignments.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate)));

            // Build stats
            setStats([
                {
                    title: t('dashboard.enrolledCourses'),
                    value: courses.filter(c => !c.isCompleted).length.toString(),
                    icon: BookOpen,
                    iconBg: 'bg-primary/5',
                    iconColor: 'text-primary',
                    onClick: () => navigate(`/${role}/courses`, { state: { activeTab: 'enrolled' } }),
                },
                {
                    title: role === 'intern' ? t('dashboard.pendingTasksUpper') : t('dashboard.pendingAssignments'),
                    value: activeAssignments.length.toString(),
                    icon: Clock,
                    iconBg: 'bg-primary/5',
                    iconColor: 'text-primary',
                    onClick: () => navigate(`/${role}/assignments`)
                },
                {
                    title: t('dashboard.certificates'),
                    value: courses.filter(c => c.isCompleted).length.toString(),
                    icon: CheckCircle,
                    iconBg: 'bg-primary/5',
                    iconColor: 'text-primary',
                    onClick: () => navigate(`/${role}/courses`, { state: { activeTab: 'completed' } })
                },
                {
                    title: t('dashboard.totalPending'),
                    value: totalPendingAmount > 0 ? `Rs ${totalPendingAmount.toLocaleString()}` : t('dashboard.allClear'),
                    valueClassName: totalPendingAmount > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400',
                    icon: CreditCard,
                    iconBg: totalPendingAmount > 0 ? 'bg-red-100 dark:bg-red-900/20' : 'bg-primary/5',
                    iconColor: totalPendingAmount > 0 ? 'text-red-600 dark:text-red-400' : 'text-primary',
                    onClick: () => navigate(`/${role}/fees`)
                },
            ]);

        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'high': return 'border-l-red-500';
            case 'medium': return 'border-l-amber-500';
            case 'low': return 'border-l-green-500';
            default: return 'border-l-gray-300';
        }
    };

    const getTypeIcon = (type) => {
        switch (type) {
            case 'assignment': return FileText;
            case 'fee': return CreditCard;
            case 'quiz': return CheckCircle;
            default: return Clock;
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
                <img src="/loading.gif" alt="Loading" className="w-20 h-20 object-contain" />
                <span className="text-gray-600 dark:text-gray-400 font-medium">Loading dashboard...</span>
            </div>
        );
    }

    return (
        <>
            <motion.div className="space-y-4 sm:space-y-5">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-r from-[var(--bg-sidebar)] to-[var(--bg-sidebar-light)] rounded-2xl p-4 sm:p-5 text-white shadow-lg"
                >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <h2 className="text-xl sm:text-2xl font-black mb-1 uppercase italic tracking-tighter">{t('dashboard.welcomeBack', { name: user?.name?.split(' ')[0] || (role === 'intern' ? 'Intern' : 'Student') })}</h2>
                            <p className="text-white/60 font-bold text-xs uppercase tracking-widest">
                                {t('dashboard.activeEnrollments', { count: enrolledCourses.filter(c => c.isActive).length })} • {t('dashboard.pendingTasksLower', { count: pendingAssignments.length })}
                            </p>
                        </div>
                        <div className="grid grid-cols-2 sm:flex gap-2">
                            <button
                                onClick={() => navigate(`/${role}/attendance`)}
                                className="px-3.5 sm:px-5 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl font-black text-[9px] sm:text-[10px] uppercase tracking-widest transition-all duration-300 border border-white/20"
                            >
                                Attendance
                            </button>
                            <button
                                onClick={() => navigate(`/${role}/courses`)}
                                className="px-3.5 sm:px-5 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl font-black text-[9px] sm:text-[10px] uppercase tracking-widest transition-all duration-300 shadow-lg shadow-orange-900/20"
                            >
                                {role === 'intern' ? t('dashboard.browseSkills') : t('dashboard.browseCourses')}
                            </button>
                        </div>
                    </div>
                </motion.div>

                <BirthdayWish />

                {/* Discussion Room Widget */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    onClick={() => navigate(`/${role}/discussion-room`)}
                    className="group relative overflow-hidden rounded-2xl border border-primary/20 bg-white dark:bg-gray-900 p-3.5 sm:p-4 shadow-sm hover:shadow-md transition-all cursor-pointer"
                >
                    <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-primary/10 to-transparent pointer-events-none" />
                    <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 group-hover:bg-primary transition-colors">
                                <MessageSquare className="w-5 h-5 text-primary group-hover:text-white transition-colors" />
                            </div>
                            <div>
                                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-primary">
                                    Community Chat
                                </p>
                                <h3 className="text-base sm:text-lg font-black text-gray-900 dark:text-white uppercase italic tracking-tight">
                                    Discussion Room
                                </h3>
                                <p className="hidden sm:block text-xs text-gray-500 dark:text-gray-400 mt-0.5 max-w-2xl">
                                    Students aur interns yahan group discussion, help aur updates share kar sakte hain.
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-[10px] font-black uppercase tracking-widest shadow-sm group-hover:-translate-y-0.5 transition-all"
                        >
                            Open Room
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                </motion.div>

                {/* Live Class Banner - Big and Prominent */}
                <AnimatePresence>
                    {activeLiveClasses.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: -20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -20, scale: 0.95 }}
                            className="relative overflow-hidden"
                        >
                            {activeLiveClasses.map((liveClass) => (
                                <div
                                    key={liveClass._id}
                                    className="bg-gradient-to-r from-red-600 via-red-500 to-primary rounded-2xl p-4 sm:p-5 text-white shadow-lg shadow-red-200/60 border-2 border-red-400"
                                >
                                    {/* Animated Background Pulses */}
                                    <div className="absolute top-0 left-0 w-full h-full overflow-hidden rounded-2xl">
                                        <div className="absolute top-1/2 left-1/4 w-64 h-64 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
                                        <div className="absolute top-1/2 right-1/4 w-48 h-48 bg-yellow-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                                    </div>

                                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div className="flex items-start gap-4">
                                            {/* Animated Live Indicator */}
                                            <div className="flex-shrink-0">
                                                <div className="relative">
                                                    <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                                                        <Video className="w-6 h-6 sm:w-7 sm:h-7" />
                                                    </div>
                                                    <div className="absolute -top-2 -right-2 flex items-center gap-1 bg-white text-red-600 px-2 py-1 rounded-full text-xs font-black uppercase">
                                                        <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                                                        LIVE
                                                    </div>
                                                </div>
                                            </div>

                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-xs font-bold uppercase tracking-widest text-white/80">{t('dashboard.liveClassInProgress')}</span>
                                                </div>
                                                <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight">
                                                    {liveClass.title}
                                                </h2>
                                                {liveClass.description && (
                                                    <p className="text-white/80 mt-1 text-sm md:text-base">{liveClass.description}</p>
                                                )}
                                                <p className="text-white/70 text-sm mt-2">
                                                    {t('dashboard.liveClassBy', { name: liveClass.createdBy?.name || 'Teacher' })}
                                                </p>
                                            </div>
                                        </div>

                                        {liveClass.link?.includes('/live-meet/') ? (
                                            <button
                                                onClick={() => window.open(`/live-meet/${liveClass.link.split('/').pop()}`, '_blank')}
                                                className="flex-shrink-0 px-5 py-3 bg-white text-primary rounded-xl font-black uppercase tracking-widest text-xs hover:bg-gray-100 transition-all shadow-md flex items-center justify-center gap-2 group"
                                            >
                                                <Video className="w-5 h-5 md:w-6 md:h-6 group-hover:scale-110 transition-transform" />
                                                {t('dashboard.joinMeet')}
                                            </button>
                                        ) : (
                                            <a
                                                href={liveClass.link}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex-shrink-0 px-5 py-3 bg-white text-red-600 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-gray-100 transition-all shadow-md flex items-center justify-center gap-2 group"
                                            >
                                                <ExternalLink className="w-5 h-5 md:w-6 md:h-6 group-hover:rotate-12 transition-transform" />
                                                {t('dashboard.joinNow')}
                                            </a>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Paused Warning */}
                {enrolledCourses.some(c => c.isPaused) && (
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="bg-amber-50 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/30 px-4 py-3 rounded-xl flex items-start gap-3"
                    >
                        <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Bell className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                            <p className="text-sm font-black text-amber-800 dark:text-amber-200 uppercase tracking-wide">{t('dashboard.accountPaused')}</p>
                            <p className="text-xs text-amber-700 font-medium mt-1 leading-relaxed">
                                {t('dashboard.accountPausedDesc')}
                            </p>
                        </div>
                    </motion.div>
                )}

                <WorkspaceRestrictedBanner
                    role={role}
                    pendingFees={pendingFees}
                    lockedCourses={enrolledCourses.filter(
                        (c) => !c.isActive && c.status !== 'completed' && !c.isPaused
                    )}
                />

                {/* Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
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

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    {/* Pending Assignments List */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 }}
                        className="lg:col-span-1 space-y-3"
                    >
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-gray-900 uppercase italic">{role === 'intern' ? t('dashboard.pendingTasksUpper') : t('dashboard.pendingAssignments')}</h3>
                            <Badge variant="warning">{pendingAssignments.length}</Badge>
                        </div>

                        <div className="bg-white dark:bg-gray-900 rounded-2xl p-3 sm:p-4 border border-gray-100 dark:border-gray-800 shadow-sm space-y-3 max-h-[460px] overflow-y-auto">
                            {pendingAssignments.length === 0 ? (
                                <div className="text-center py-10 opacity-50">
                                    <CheckCircle className="w-10 h-10 text-primary mx-auto mb-2" />
                                    <p className="text-xs font-black uppercase">{t('dashboard.allCaughtUp')}</p>
                                </div>
                            ) : (
                                pendingAssignments.map((assignment, index) => (
                                    <div key={assignment._id} className="p-3.5 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 group hover:border-primary/30 hover:bg-white dark:hover:bg-gray-800 hover:shadow-md transition-all">
                                        <div className="flex items-start justify-between mb-2.5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center border border-orange-200">
                                                    <FileText className="w-5 h-5 text-primary" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <h4 className="font-black text-gray-900 text-sm group-hover:text-primary transition-colors uppercase italic leading-tight mb-0.5">{assignment.title}</h4>
                                                    <p className="text-[9px] text-primary font-black uppercase tracking-widest">{assignment.course?.title || 'Assignment'}</p>
                                                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-0.5 dark:text-gray-500">
                                                        {t('dashboard.due', { date: formatDate(assignment.dueDate) })}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => navigate(`/${role}/assignments`)}
                                            className="w-full py-2.5 bg-[var(--bg-sidebar)] hover:bg-[var(--bg-sidebar-light)] dark:bg-primary dark:hover:bg-[#e67e00] text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-slate-200 dark:shadow-orange-950/20 active:scale-95"
                                        >
                                            {t('dashboard.submitNow')}
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </motion.div>

                    {/* Enrolled Courses Grid */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 }}
                        className="lg:col-span-2"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 uppercase italic">{t('dashboard.myCourses')}</h3>
                            </div>
                        </div>

                        {enrolledCourses.length === 0 ? (
                            <div className="bg-white rounded-2xl p-12 border border-gray-100 text-center">
                                <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                <p className="text-gray-500 mb-4 font-bold uppercase tracking-widest text-xs">{t('dashboard.noActiveEnrollments')}</p>
                                <button
                                    onClick={() => navigate(`/${role}/courses`)}
                                    className="px-6 py-2.5 bg-primary hover:bg-primary text-white rounded-xl font-medium"
                                >
                                    {role === 'intern' ? t('dashboard.browseSkills') : t('dashboard.browseCourses')}
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {enrolledCourses.map((course, index) => (
                                    <motion.div
                                        key={course.id}
                                        whileHover={{ y: -4 }}
                                        className="bg-white p-4 rounded-2xl border border-gray-100 flex gap-4 hover:shadow-md transition-all cursor-pointer group relative"
                                        onClick={() => {
                                            if (!course.isFirstMonthVerified) {
                                                navigate(`/${role}/fees`);
                                            } else {
                                                navigate(`/${role}/assignments`, { state: { courseId: course.id, tab: course.unreadMessages > 0 ? 'chat' : 'assignments' } });
                                            }
                                        }}
                                    >
                                        {course.unreadMessages > 0 && (
                                            <div className="absolute -top-2 -right-2 w-7 h-7 bg-blue-500 text-white rounded-full flex items-center justify-center shadow-lg border-2 border-white animate-bounce z-20">
                                                <MessageSquare className="w-3 h-3" />
                                            </div>
                                        )}
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors shadow-sm ${(() => {
                                            const style = getCourseStyle(course.category || '', course.title);
                                            return `${style.bg}`;
                                        })()}`}>
                                            {(() => {
                                                const style = getCourseStyle(course.category || '', course.title);
                                                const Icon = style.icon;
                                                return <Icon className={`w-6 h-6 ${style.text}`} />;
                                            })()}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="min-w-0">
                                                    <h4 className="font-bold text-gray-900 truncate group-hover:text-primary transition-colors">{course.title}</h4>
                                                    <p className="text-xs text-gray-400 mt-1 truncate">{course.teacher}</p>
                                                </div>

                                                <div className="flex flex-col items-end ml-4 space-y-1">
                                                    <div>
                                                        {course.isCompleted ? (
                                                            <Badge variant="success">{t('dashboard.completed')}</Badge>
                                                        ) : course.isPaused ? (
                                                            <Badge variant="warning">{t('dashboard.paused')}</Badge>
                                                        ) : !course.isFirstMonthVerified ? (
                                                            <Badge variant="warning">{t('dashboard.verificationPending')}</Badge>
                                                        ) : !course.isActive ? (
                                                            <Badge variant="danger">{t('dashboard.restricted')}</Badge>
                                                        ) : (
                                                            <Badge variant="success">{t('dashboard.active')}</Badge>
                                                        )}
                                                    </div>
                                                    <Badge variant="info">{course.progress}%</Badge>
                                                </div>
                                            </div>

                                            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden mb-3">
                                                <div
                                                    className="h-full bg-gradient-to-r from-primary to-orange-400 rounded-full shadow-sm"
                                                    style={{ width: `${course.progress}%` }}
                                                />
                                            </div>

                                            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-gray-400">
                                                <span className="flex items-center gap-1 truncate">
                                                    <Calendar className="w-3 h-3" />
                                                    <span className="truncate">{course.nextClass === 'Check schedule' ? t('dashboard.checkSchedule') : course.nextClass}</span>
                                                </span>

                                                <div className="flex items-center gap-2">
                                                    {!course.isFirstMonthVerified && (
                                                        <button
                                                            onClick={(e) => handleWithdrawClick(e, course)}
                                                            className="flex items-center gap-1 text-red-500 hover:text-red-600 hover:bg-red-50 px-2 py-1 rounded transition-colors z-10"
                                                        >
                                                            <Trash2 className="w-3 h-3" />
                                                            {role === 'intern' ? 'Remove my Skill' : 'Remove My Course'}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                </div>
            </motion.div>

            {/* Withdrawal Confirmation Modal */}
            <Modal
                isOpen={withdrawModal.open}
                onClose={() => setWithdrawModal({ ...withdrawModal, open: false })}
                title={role === 'intern' ? 'Remove Skill Application' : 'Remove Course Application'}
                size="sm"
            >
                <div className="space-y-4">
                    <div className="bg-red-50 p-4 rounded-xl flex items-start gap-3">
                        <Trash2 className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 mt-0.5">
                            <h4 className="font-bold text-red-700 text-sm">{t('dashboard.areYouSure')}</h4>
                            <p className="text-xs text-red-600 mt-1">
                                You are about to remove <strong>{withdrawModal.courseTitle}</strong>. 
                                This will remove the {role === 'intern' ? 'skill' : 'course'} and any pending fee records permanently.
                            </p>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            onClick={() => setWithdrawModal({ ...withdrawModal, open: false })}
                            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={confirmWithdraw}
                            className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-700 active:scale-95 transition-all shadow-sm"
                        >
                            Confirm Remove
                        </button>
                    </div>
                </div>
            </Modal>
        </>
    );
};

export default StudentDashboard;




