import { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { io } from 'socket.io-client';
import { getSocketURL } from '../../config/apiBaseUrl';

const SOCKET_URL = getSocketURL();

const playClassReminderRing = () => {
    try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;

        const audioContext = new AudioContextClass();
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        const startedAt = audioContext.currentTime;
        const endsAt = startedAt + 3;

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, startedAt);
        gain.gain.setValueAtTime(0.0001, startedAt);

        for (let offset = 0; offset < 3; offset += 0.5) {
            gain.gain.setValueAtTime(0.22, startedAt + offset);
            gain.gain.setValueAtTime(0.0001, Math.min(startedAt + offset + 0.3, endsAt));
        }

        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        oscillator.start(startedAt);
        oscillator.stop(endsAt);
        oscillator.onended = () => audioContext.close().catch(() => {});
    } catch (error) {
        console.warn('Class reminder sound could not be played:', error);
    }
};
import {
    Menu,
    Bell,
    ChevronDown,
    Sun,
    Moon,
    RefreshCw,
    User,
    Settings,
    LifeBuoy,
    LogOut,
    ClipboardList, 
    AlertCircle, 
    CreditCard, 
    FileText, 
    Award, 
    Calendar, 
    Zap, 
    GraduationCap, 
    X, 
    Megaphone,
    Lock,
    Eye,
    EyeOff
} from 'lucide-react';
import { useDispatch } from 'react-redux';
import { logout, updateUser } from '../../features/auth/authSlice';
import Sidebar from './Sidebar';
import NotificationPopup from '../shared/NotificationPopup';
import ChatWidget from '../shared/ChatWidget';
import { userNotificationAPI, assignmentAPI, courseAPI, authAPI, attendanceAPI } from '../../services/api';
import useAutoLogout from '../../hooks/useAutoLogout';
import { useTheme } from '../../context/ThemeContext';
import Loader, { FullScreenLoader, ButtonLoader } from '../ui/Loader';
import ProfileAvatar from '../ui/ProfileAvatar';
import { useTranslation } from 'react-i18next';

const DashboardLayout = () => {
    const { t } = useTranslation();
    // Enable auto-logout
    useAutoLogout();

    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [showNotifications, setShowNotifications] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
    const [resetPasswordForm, setResetPasswordForm] = useState({ newPassword: '', confirmPassword: '' });
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isResettingPassword, setIsResettingPassword] = useState(false);
    const [resetPasswordError, setResetPasswordError] = useState('');
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const { user, role } = useSelector((state) => state.auth);
    const location = useLocation();
    const hideGlobalChatWidget = location.pathname.includes('/discussion-room');
    const navigate = useNavigate();
    const { isDark, toggleTheme } = useTheme();
    const [pendingTasks, setPendingTasks] = useState([]);
    const [isPageLoading, setIsPageLoading] = useState(false);
    const [isWeeklyOff, setIsWeeklyOff] = useState(false);
    const [weeklyOffDayName, setWeeklyOffDayName] = useState('');
    const dispatch = useDispatch();

    useEffect(() => {
        const checkWeeklyOffDay = async () => {
            try {
                const response = await attendanceAPI.getGlobalHolidays();
                const offDays = response.data.holidayDays || [];
                const pakistanDayName = new Intl.DateTimeFormat('en-US', {
                    timeZone: 'Asia/Karachi',
                    weekday: 'long'
                }).format(new Date());
                const dayIndex = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
                    .indexOf(pakistanDayName);

                setWeeklyOffDayName(pakistanDayName);
                setIsWeeklyOff(offDays.includes(dayIndex));
            } catch (error) {
                console.error('Could not check weekly off day:', error);
                setIsWeeklyOff(false);
            }
        };

        checkWeeklyOffDay();
        const interval = setInterval(checkWeeklyOffDay, 5 * 60 * 1000);
        const checkWhenVisible = () => {
            if (document.visibilityState === 'visible') checkWeeklyOffDay();
        };
        document.addEventListener('visibilitychange', checkWhenVisible);

        return () => {
            clearInterval(interval);
            document.removeEventListener('visibilitychange', checkWhenVisible);
        };
    }, []);

    // Fetch notifications and tasks
    useEffect(() => {
        fetchNotifications();
        fetchPendingTasks();
        
        // Initial fallback poll
        const interval = setInterval(() => {
            fetchNotifications();
            fetchPendingTasks();
        }, 60000); // Relaxed poll to 1 min since we have sockets

        if (!user) return () => clearInterval(interval);

        const socket = io(SOCKET_URL, {
            query: { userId: user.id || user._id }
        });
        socket.emit('join_chat', String(user.id || user._id));

        // Whenever a relevant socket event is received, refresh data
        const handleRefresh = () => {
            fetchNotifications();
            fetchPendingTasks();
            window.dispatchEvent(new CustomEvent('job-applications-updated'));
        };

        socket.on('new_browser_notification', handleRefresh);
        socket.on('new_assignment', handleRefresh);
        socket.on('new_submission', handleRefresh);
        socket.on('attendance_updated', handleRefresh);
        socket.on('class_time_reminder', playClassReminderRing);
        socket.on('new_daily_task', handleRefresh);
        socket.on('user_updated', (data) => {
            try {
                if (data && data.updates) {
                    dispatch(updateUser(data.updates));
                }
            } catch (e) {
                console.error('Error applying user_updated data:', e);
            }
        });

        return () => {
            clearInterval(interval);
            socket.disconnect();
        };
    }, [role, user]);



    const fetchPendingTasks = async () => {
        if (!user) return;
        try {
            const tasks = [];
            if (role === 'teacher') {
                const res = await courseAPI.getTeacherDashboard();
                const courses = res.data.data || [];
                for (const course of courses) {
                    if (course.pendingAssignments > 0) {
                        const assignRes = await assignmentAPI.getByCourse(course._id);
                        const assignments = assignRes.data.assignments || [];
                        assignments.forEach(a => {
                            const ungradedCount = (a.submissions || []).filter(s => s.marks === undefined || s.marks === null).length;
                            if (ungradedCount > 0) {
                                tasks.push({
                                    _id: `task-${a._id}`,
                                    title: `${course.title || course.name} - ${a.title}`,
                                    message: `${ungradedCount} submission(s) pending grading`,
                                    date: a.dueDate,
                                    type: 'task',
                                    path: `/teacher/course/${course._id}`,
                                    courseId: course._id,
                                    assignmentId: a._id
                                });
                            }
                        });
                    }
                }
            } else if (role === 'student' || role === 'intern') {
                const res = await assignmentAPI.getMy();
                const assignments = res.data.assignments || [];
                const myId = (user.id || user._id).toString();
                assignments.forEach(a => {
                    const mySub = a.submissions?.find(s => (s.user?._id || s.user || s.student?._id || s.student) === myId);
                    if (!mySub) {
                        tasks.push({
                            _id: `task-${a._id}`,
                            title: a.title,
                            message: `Pending submission`,
                            date: a.dueDate,
                            type: 'task',
                            path: `/${role}/assignments`,
                            courseId: a.course?._id || a.course,
                            assignmentId: a._id
                        });
                    }
                });
            }
            setPendingTasks(tasks);
        } catch (error) {
            console.error('Error fetching pending tasks:', error);
        }
    };

    const fetchNotifications = async () => {
        try {
            const [notifRes, countRes] = await Promise.all([
                userNotificationAPI.getAll(),
                userNotificationAPI.getUnreadCount()
            ]);
            setNotifications(notifRes.data.data || []);
            setUnreadCount(countRes.data.count || 0);
        } catch (error) {
            console.error('Error fetching notifications:', error);
        }
    };

    const handleNotificationClick = async (notification) => {
        try {
            // Mark as read
            if (!notification.isRead) {
                await userNotificationAPI.markAsRead(notification._id);
                await fetchNotifications();
            }

            setShowNotifications(false);

            // Navigate based on notification type
            if (notification.relatedTask || notification.type?.startsWith('task_')) {
                navigate(`/${role}/paid-tasks`);
            } else if (notification.type === 'assignment_assigned') {
                navigate(`/${role}/assignments`);
            } else if (notification.type === 'test_assigned') {
                navigate(`/${role}/tests`);
            } else if (notification.type === 'graded') {
                const message = (notification.message || '').toLowerCase();
                if (message.includes('work log') || message.includes('daily task')) {
                    navigate(`/${role}/daily-tasks`);
                } else if (message.includes('test')) {
                    navigate(`/${role}/tests`);
                } else {
                    navigate(`/${role}/assignments`);
                }
            }
        } catch (error) {
            console.error('Error handling notification:', error);
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await userNotificationAPI.markAllAsRead();
            await fetchNotifications();
        } catch (error) {
            console.error('Error marking all as read:', error);
        }
    };

    const handleResetPasswordSubmit = async (e) => {
        e.preventDefault();
        setResetPasswordError('');
        if (resetPasswordForm.newPassword.length < 4) {
            setResetPasswordError('Password must be at least 4 characters.');
            return;
        }
        if (resetPasswordForm.newPassword !== resetPasswordForm.confirmPassword) {
            setResetPasswordError('Passwords do not match.');
            return;
        }
        try {
            setIsResettingPassword(true);
            await authAPI.changePassword({ newPassword: resetPasswordForm.newPassword });
            setShowResetPasswordModal(false);
            setResetPasswordForm({ newPassword: '', confirmPassword: '' });
            setShowNewPassword(false);
            setShowConfirmPassword(false);
            alert('Password successfully updated!');
        } catch (err) {
            setResetPasswordError(err.response?.data?.message || 'Failed to update password');
        } finally {
            setIsResettingPassword(false);
        }
    };

    // Get current page title from path
    const getPageTitle = () => {
        const segments = location.pathname.split('/').filter(Boolean);
        const lastSegment = segments[segments.length - 1];

        if (!lastSegment) return 'Dashboard';

        // Check if last segment is a MongoDB ObjectId (24 hex characters)
        const isObjectId = /^[0-9a-fA-F]{24}$/.test(lastSegment);

        if (isObjectId) {
            // If it's a course ID, check the previous segment
            const prevSegment = segments[segments.length - 2];
            if (prevSegment === 'course') return 'Course Details';
            return 'Details';
        }

        return lastSegment.charAt(0).toUpperCase() + lastSegment.slice(1).replace(/-/g, ' ');
    };

    const getNotificationIcon = (notification) => {
        const title = (notification.title || '').toLowerCase();
        const message = (notification.message || '').toLowerCase();
        const type = notification.type;
        
        if (type === 'test_assigned' || title.includes('test')) {
            return <ClipboardList className="w-4 h-4 text-rose-500" />;
        }
        if (type === 'assignment_assigned' || title.includes('assignment')) {
            return <FileText className="w-4 h-4 text-blue-500" />;
        }
        if (type === 'graded' || title.includes('graded') || title.includes('marks')) {
            return <Award className="w-4 h-4 text-emerald-500" />;
        }
        if (title.includes('fee') || title.includes('payment')) {
            return <CreditCard className="w-4 h-4 text-primary" />;
        }
        if (title.includes('class') || title.includes('live')) {
            return <Calendar className="w-4 h-4 text-indigo-500" />;
        }
        
        return <Bell className="w-4 h-4 text-primary" />;
    };

    const formatNotificationTime = (date) => {
        const now = new Date();
        const notifDate = new Date(date);
        const diffMs = now - notifDate;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} min ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
        return notifDate.toLocaleDateString();
    };

    return (
        <div className={`h-screen flex overflow-hidden transition-colors duration-300 ${isDark ? 'bg-[#0f1117]' : 'bg-[var(--bg-main)]'}`}>
            {/* Sidebar - Fixed */}
            <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

            {/* Notification Popup */}
            <NotificationPopup />



            {/* Main Content - Scrollable */}
            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                {/* Header */}
                <header className={`border-b sticky top-0 z-40 transition-colors duration-300 ${isDark ? 'bg-[var(--bg-sidebar)] border-white/10' : 'bg-[var(--bg-card)] border-gray-100'}`}>
                    <div className="px-4 sm:px-6 py-3 sm:py-4 w-full min-w-0 flex flex-col lg:flex-row lg:items-center gap-3 sm:gap-4">
                        {/* Top row for mobile: Menu + Title + Actions */}
                        <div className="flex items-center justify-between w-full lg:w-auto gap-4">
                            {/* Left: menu + title */}
                            <div className="flex items-center gap-3 sm:gap-4 shrink-0 min-w-0">
                                <button
                                    type="button"
                                    onClick={() => setSidebarOpen(!sidebarOpen)}
                                    className={`p-2.5 rounded-xl transition-all lg:hidden shrink-0 bg-primary text-white shadow-md shadow-primary/20 active:scale-95`}
                                >
                                    <Menu className="w-5 h-5" />
                                </button>

                                <div className="min-w-0">
                                    <h1 className={`text-lg sm:text-2xl font-bold transition-colors duration-300 truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{getPageTitle()}</h1>
                                </div>
                            </div>

                            {/* Right: actions (Moved here for mobile top row) */}
                            <div className="flex lg:hidden items-center gap-2 sm:gap-3 shrink-0 relative z-10">
                                {/* Refresh Button */}
                                <button
                                    type="button"
                                    onClick={() => window.location.reload()}
                                    className="rounded-xl transition-all duration-200 bg-[var(--bg-sidebar-dark)] hover:bg-[var(--bg-sidebar)] text-white shadow-sm p-2.5"
                                    title={t('layout.refreshPage')}
                                >
                                    <RefreshCw className="w-5 h-5 shrink-0" />
                                </button>

                                {/* Dark / Light Mode Toggle */}
                                <button
                                    type="button"
                                    onClick={toggleTheme}
                                    className={`relative rounded-xl transition-all duration-300 shadow-sm flex items-center justify-center overflow-hidden p-2.5 ${isDark
                                        ? 'bg-primary'
                                        : 'bg-[var(--bg-sidebar)] text-white'
                                        }`}
                                >
                                    {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                                </button>

                                {/* Notifications */}
                                <div className="relative">
                                    <button
                                        onClick={() => setShowNotifications(!showNotifications)}
                                        className={`relative p-2.5 rounded-xl transition-all flex items-center ${isDark ? 'hover:bg-white/10 text-white/70' : 'hover:bg-gray-100 text-gray-600'}`}
                                    >
                                        <Bell className="w-5 h-5" />
                                        {notifications.length + pendingTasks.length > 0 && (
                                            <span className="absolute top-0 right-0 w-4 h-4 bg-primary text-white text-[8px] rounded-full flex items-center justify-center font-bold shadow-sm">
                                                {notifications.length + pendingTasks.length}
                                            </span>
                                        )}
                                    </button>

                                    {/* Mobile Notifications Dropdown */}
                                    {showNotifications && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className={`absolute right-[-60px] sm:right-0 mt-3 w-72 sm:w-80 rounded-2xl shadow-2xl border overflow-hidden z-[100] transition-colors duration-200 ${isDark ? 'bg-[var(--bg-sidebar)] border-white/10' : 'bg-white border-gray-100'}`}
                                        >
                                            <div className={`p-4 border-b ${isDark ? 'border-white/10' : 'border-gray-100'}`}>
                                                <div className="flex items-center justify-between">
                                                    <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Notifications</h3>
                                                    <span className="text-[10px] font-black bg-primary/10 text-primary px-2 py-1 rounded-lg uppercase">New</span>
                                                </div>
                                            </div>
                                            <div className="max-h-[350px] overflow-y-auto no-scrollbar">
                                                {pendingTasks.map((task, idx) => (
                                                    <div
                                                        key={`task-${idx}`}
                                                        onClick={() => {
                                                            navigate(task.path, { state: { tab: 'assignments', assignmentId: task.assignmentId, courseId: task.courseId } });
                                                            setShowNotifications(false);
                                                        }}
                                                        className={`p-4 border-b cursor-pointer ${isDark ? 'border-white/5 hover:bg-white/5 bg-primary/5' : 'border-gray-50 hover:bg-gray-50 bg-primary/[0.02]'}`}
                                                    >
                                                        <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{task.title}</p>
                                                        <p className="text-[10px] text-primary font-bold mt-1 uppercase">{new Date(task.date).toLocaleDateString()}</p>
                                                    </div>
                                                ))}
                                                {notifications.length === 0 && pendingTasks.length === 0 && (
                                                    <div className="p-8 text-center text-gray-500">
                                                        <Bell className="w-10 h-10 mx-auto mb-2 opacity-20" />
                                                        <p className="text-xs">No new notifications</p>
                                                    </div>
                                                )}
                                            </div>
                                        </motion.div>
                                    )}
                                </div>

                                {/* User Profile Mini */}
                                <div className="relative">
                                    <button
                                        onClick={() => setShowUserMenu(!showUserMenu)}
                                        className="shrink-0 p-0.5 rounded-xl transition-all"
                                    >
                                    <ProfileAvatar src={role === 'admin' ? "https://res.cloudinary.com/adeeb-tech-lab/image/upload/v1780787310/Company%20Logo/LMS_admin.jpg" : user?.photo} name={user?.name} size="sm" shape="rounded-xl" border="border border-white/20" fallbackColor="bg-gradient-to-br from-primary to-[#ffab40]" />
                                    </button>

                                    {/* Mobile User Dropdown */}
                                    {showUserMenu && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className={`absolute right-0 mt-3 w-56 rounded-2xl shadow-2xl border overflow-hidden z-[100] transition-colors duration-200 ${isDark ? 'bg-[var(--bg-sidebar)] border-white/10' : 'bg-white border-gray-100'}`}
                                        >
                                            <div className="p-4 border-b border-gray-100">
                                                <p className={`text-sm font-bold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{user?.name}</p>
                                                {user?.rollNo && <p className="text-[10px] font-black text-primary uppercase tracking-widest mt-0.5">Roll No# {user.rollNo}</p>}
                                            </div>
                                            <div className="p-2">
                                                <button
                                                    onClick={() => { navigate(`/${role}/profile`); setShowUserMenu(false); }}
                                                    className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-sm font-medium ${isDark ? 'text-white/70 hover:bg-white/5 hover:text-white' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
                                                >
                                                    <User className="w-4 h-4" /> {t('layout.profile')}
                                                </button>
                                                <button
                                                    onClick={() => { navigate(`/${role}/settings`); setShowUserMenu(false); }}
                                                    className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-sm font-medium ${isDark ? 'text-white/70 hover:bg-white/5 hover:text-white' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
                                                >
                                                    <Settings className="w-4 h-4" /> {t('layout.settings')}
                                                </button>
                                                <button
                                                    onClick={() => { navigate(`/${role}/help-support`); setShowUserMenu(false); }}
                                                    className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-sm font-medium ${isDark ? 'text-white/70 hover:bg-white/5 hover:text-white' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
                                                >
                                                    <LifeBuoy className="w-4 h-4" /> {t('layout.helpSupport')}
                                                </button>
                                                <button
                                                    onClick={() => { setShowResetPasswordModal(true); setShowUserMenu(false); }}
                                                    className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-sm font-medium ${isDark ? 'text-white/70 hover:bg-white/5 hover:text-white' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
                                                >
                                                    <Lock className="w-4 h-4" /> {t('layout.resetPassword')}
                                                </button>
                                                
                                                <div className={`my-1 border-t ${isDark ? 'border-white/10' : 'border-gray-100'}`} />
                                                
                                                <button
                                                    onClick={() => { handleLogout(); setShowUserMenu(false); }}
                                                    className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-sm font-medium transition-colors ${isDark ? 'text-red-400 hover:bg-red-500/10 hover:text-red-300' : 'text-red-600 hover:bg-red-50'}`}
                                                >
                                                    <LogOut className="w-4 h-4" /> {t('layout.signOut')}
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Right: actions (Desktop only) */}
                        <div className="hidden lg:flex lg:ml-auto items-center gap-1.5 sm:gap-3 shrink-0 relative z-10">
                            {/* Refresh Button */}
                            <button
                                type="button"
                                onClick={() => window.location.reload()}
                                className="rounded-full transition-all duration-200 bg-[var(--bg-sidebar)] hover:bg-[var(--bg-sidebar-dark)] text-white shadow-md hover:shadow-lg flex items-center justify-center p-2.5 sm:w-10 sm:h-10"
                                title={t('layout.refreshPage')}
                            >
                                <RefreshCw className="w-5 h-5 shrink-0" />
                            </button>

                            {/* Dark / Light Mode Toggle */}
                            <button
                                type="button"
                                onClick={toggleTheme}
                                title={isDark ? t('layout.switchToLight') : t('layout.switchToDark')}
                                className={`relative rounded-full transition-all duration-300 shadow-md hover:shadow-lg flex items-center justify-center overflow-hidden p-2.5 sm:w-10 sm:h-10 ${isDark
                                    ? 'bg-primary text-white'
                                    : 'bg-[var(--bg-sidebar)] text-white'
                                    }`}
                            >
                                <AnimatePresence mode="wait" initial={false}>
                                    {isDark ? (
                                        <motion.span
                                            key="sun"
                                            initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
                                            animate={{ rotate: 0, opacity: 1, scale: 1 }}
                                            exit={{ rotate: 90, opacity: 0, scale: 0.5 }}
                                            transition={{ duration: 0.25 }}
                                            className="flex items-center justify-center shrink-0"
                                        >
                                            <Sun className="w-5 h-5" />
                                        </motion.span>
                                    ) : (
                                        <motion.span
                                            key="moon"
                                            initial={{ rotate: 90, opacity: 0, scale: 0.5 }}
                                            animate={{ rotate: 0, opacity: 1, scale: 1 }}
                                            exit={{ rotate: -90, opacity: 0, scale: 0.5 }}
                                            transition={{ duration: 0.25 }}
                                            className="flex items-center justify-center shrink-0"
                                        >
                                            <Moon className="w-5 h-5" />
                                        </motion.span>
                                    )}
                                </AnimatePresence>
                            </button>

                            {/* Notifications */}
                            <div className="relative">
                                <button
                                    onClick={() => setShowNotifications(!showNotifications)}
                                    className={`relative p-2.5 rounded-full transition-all flex items-center justify-center sm:w-10 sm:h-10 ${isDark ? 'hover:bg-white/10 text-white/70' : 'hover:bg-gray-100 text-gray-600'}`}
                                >
                                    <Bell className="w-5 h-5" />
                                    {notifications.length + pendingTasks.length > 0 && (
                                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-white text-[10px] rounded-full flex items-center justify-center font-bold shadow-sm">
                                            {notifications.length + pendingTasks.length}
                                        </span>
                                    )}
                                </button>

                                {/* Notifications Dropdown */}
                                {showNotifications && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 10 }}
                                        className={`absolute right-0 mt-2 w-80 rounded-2xl shadow-xl border overflow-hidden z-[60] transition-colors duration-200 ${isDark ? 'bg-[var(--bg-sidebar)] border-white/10' : 'bg-white border-gray-100'}`}
                                    >
                                        <div className={`p-4 border-b ${isDark ? 'border-white/10' : 'border-gray-100'}`}>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20 overflow-hidden">
                                                        <img src="/logo.png" alt="Logo" className="w-5 h-5 object-contain" />
                                                    </div>
                                                    <div>
                                                        <h3 className={`text-sm font-black tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>Notifications</h3>
                                                        <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Adeeb Tech Lab</p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={handleMarkAllRead}
                                                    className="text-[10px] font-black uppercase tracking-widest text-primary hover:text-[#ffab40] px-2 py-1 rounded-lg hover:bg-primary/5 transition-all"
                                                >
                                                    Mark all read
                                                </button>
                                            </div>
                                        </div>
                                        <div className="max-h-80 overflow-y-auto">
                                            {/* Actionable Tasks */}
                                            {pendingTasks.map((task) => (
                                                <div
                                                    key={task._id}
                                                    onClick={() => {
                                                        navigate(task.path, { 
                                                            state: { 
                                                                tab: 'assignments', 
                                                                assignmentId: task.assignmentId,
                                                                courseId: task.courseId 
                                                            } 
                                                        });
                                                        setShowNotifications(false);
                                                    }}
                                                    className={`p-4 border-b cursor-pointer transition-colors ${isDark
                                                        ? 'border-white/5 hover:bg-primary/10 bg-primary/5'
                                                        : 'border-gray-50 hover:bg-primary/5 bg-primary/[0.02]'
                                                    }`}
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                                                            <ClipboardList className="w-4 h-4 text-primary" />
                                                        </div>
                                                        <div className="flex-1">
                                                            <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                                {task.title}
                                                            </p>
                                                            <p className={`text-xs mt-0.5 ${isDark ? 'text-white/50' : 'text-gray-600'}`}>
                                                                {task.message}
                                                            </p>
                                                            <p className={`text-[10px] mt-1 font-bold uppercase tracking-wider ${isDark ? 'text-primary/70' : 'text-primary'}`}>
                                                                {new Date(task.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}

                                            {notifications.length === 0 && pendingTasks.length === 0 ? (
                                                <div className={`p-8 text-center ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                                                    <Bell className="w-12 h-12 mx-auto mb-2 opacity-30" />
                                                    <p className="text-sm">No notifications</p>
                                                </div>
                                            ) : (
                                                notifications.map((notification) => (
                                                    <div
                                                        key={notification._id}
                                                        onClick={() => handleNotificationClick(notification)}
                                                        className={`p-4 border-b cursor-pointer transition-colors ${isDark
                                                                ? `border-white/5 hover:bg-white/5 ${!notification.isRead ? 'bg-primary/10' : ''}`
                                                                : `border-gray-50 hover:bg-gray-50 ${!notification.isRead ? 'bg-primary/5' : ''}`
                                                            }`}
                                                    >
                                                        <div className="flex items-start gap-3">
                                                            <div
                                                                className={`w-2 h-2 rounded-full mt-2 ${!notification.isRead ? 'bg-primary' : isDark ? 'bg-white/20' : 'bg-gray-300'}`}
                                                            />
                                                            <div className="flex-1">
                                                                <div className="flex items-center justify-between gap-2">
                                                                    <p className={`text-sm font-bold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                                        {notification.title}
                                                                    </p>
                                                                    <div className={`p-1.5 rounded-md ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}>
                                                                        {getNotificationIcon(notification)}
                                                                    </div>
                                                                </div>
                                                                <p className={`text-xs mt-1 ${isDark ? 'text-white/50' : 'text-gray-600'}`}>
                                                                    {notification.message}
                                                                </p>
                                                                <p className={`text-xs mt-1 ${isDark ? 'text-white/30' : 'text-gray-400'}`}>
                                                                    {formatNotificationTime(notification.createdAt)}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                        <div className={`p-3 ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                                            <button className={`w-full text-center text-sm font-medium ${isDark ? 'text-white/50 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}>
                                                View all notifications
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </div>

                            {/* User Menu */}
                            <div className="relative">
                                <button
                                    onClick={() => setShowUserMenu(!showUserMenu)}
                                    className={`flex items-center gap-3 p-1.5 rounded-xl transition-colors ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}
                                >
                                    <ProfileAvatar src={role === 'admin' ? "https://res.cloudinary.com/adeeb-tech-lab/image/upload/v1780787310/Company%20Logo/LMS_admin.jpg" : user?.photo} name={user?.name} size="sm" shape="rounded-xl" border="border border-white/20" fallbackColor="bg-gradient-to-br from-primary to-[#ffab40]" />
                                    <div className="hidden md:block text-left">
                                        <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                            {user?.name || 'User'}
                                        </p>
                                        <p className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                                            {user?.rollNo ? `Roll No# ${user.rollNo}` : ''}
                                        </p>
                                    </div>
                                    <ChevronDown className={`w-4 h-4 hidden md:block ${isDark ? 'text-white/30' : 'text-gray-400'}`} />
                                </button>

                                {/* User Dropdown */}
                                {showUserMenu && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className={`absolute right-0 mt-2 w-56 rounded-2xl shadow-xl border overflow-hidden z-[60] transition-colors duration-200 ${isDark ? 'bg-[var(--bg-sidebar)] border-white/10' : 'bg-white border-gray-100'}`}
                                    >
                                        <div className="p-2">
                                            <button 
                                                onClick={() => {
                                                    navigate(`/${role}/profile`);
                                                    setShowUserMenu(false);
                                                }}
                                                className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg ${isDark ? 'text-white/60 hover:bg-white/5 hover:text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                                            >
                                                <User className="w-4 h-4" />
                                                {t('layout.profile')}
                                            </button>
                                            <button 
                                                onClick={() => {
                                                    navigate(`/${role}/settings`);
                                                    setShowUserMenu(false);
                                                }}
                                                className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg ${isDark ? 'text-white/60 hover:bg-white/5 hover:text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                                            >
                                                <Settings className="w-4 h-4" />
                                                {t('layout.settings')}
                                            </button>
                                            <button 
                                                onClick={() => {
                                                    navigate(`/${role}/help-support`);
                                                    setShowUserMenu(false);
                                                }}
                                                className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg ${isDark ? 'text-white/60 hover:bg-white/5 hover:text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                                            >
                                                <LifeBuoy className="w-4 h-4" />
                                                {t('layout.helpSupport')}
                                            </button>
                                            <button 
                                                onClick={() => {
                                                    setShowResetPasswordModal(true);
                                                    setShowUserMenu(false);
                                                }}
                                                className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg ${isDark ? 'text-white/60 hover:bg-white/5 hover:text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                                            >
                                                <Lock className="w-4 h-4" />
                                                {t('layout.resetPassword')}
                                            </button>
                                            
                                            <div className={`my-1 border-t ${isDark ? 'border-white/10' : 'border-gray-100'}`} />
                                            
                                            <button 
                                                onClick={() => {
                                                    dispatch(logout());
                                                    navigate('/login');
                                                    setShowUserMenu(false);
                                                }}
                                                className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors ${isDark ? 'text-red-400 hover:bg-red-500/10 hover:text-red-300' : 'text-red-600 hover:bg-red-50'}`}
                                            >
                                                <LogOut className="w-4 h-4" />
                                                {t('layout.signOut')}
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </div>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className={`flex-1 min-h-0 transition-colors duration-300 ${
                    hideGlobalChatWidget
                        ? 'overflow-hidden p-0 flex flex-col'
                        : 'p-3 sm:p-5 md:p-6 overflow-y-auto overflow-x-hidden'
                } ${isDark ? 'bg-[#0f1117]' : 'bg-[var(--bg-main)]'}`}>
                    <AnimatePresence>
                        {isWeeklyOff && !hideGlobalChatWidget && (
                            <motion.div
                                initial={{ opacity: 0, y: -18, scale: 0.98 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -18, scale: 0.98 }}
                                className={`relative overflow-visible mb-5 rounded-3xl border p-4 sm:p-5 shadow-sm ${isDark ? 'bg-indigo-950/40 border-indigo-400/20' : 'bg-gradient-to-r from-indigo-50 via-violet-50 to-blue-50 border-indigo-100'}`}
                            >
                                <div className="absolute inset-0 overflow-hidden rounded-3xl opacity-30 pointer-events-none">
                                    <motion.div
                                        animate={{ x: ['-10%', '110%'] }}
                                        transition={{ duration: 14, repeat: Infinity, ease: 'linear' }}
                                        className="absolute top-3 w-24 h-24 rounded-full bg-indigo-300/30 blur-2xl"
                                    />
                                    {[12, 38, 67, 88].map((left, starIndex) => (
                                        <motion.span
                                            key={left}
                                            animate={{ opacity: [0.15, 0.9, 0.15], scale: [0.7, 1.25, 0.7] }}
                                            transition={{ duration: 2.2 + starIndex * 0.35, repeat: Infinity, delay: starIndex * 0.4 }}
                                            className="absolute text-indigo-400 text-xs"
                                            style={{ left: `${left}%`, top: starIndex % 2 === 0 ? '18%' : '68%' }}
                                        >✦</motion.span>
                                    ))}
                                </div>
                                <div className="relative flex items-center gap-4">
                                    <div className="relative w-24 h-20 shrink-0" aria-hidden="true">
                                        <motion.div
                                            animate={{ scale: [1, 1.06, 1], y: [0, 2, 0] }}
                                            transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
                                            className="absolute left-0 bottom-0 w-16 h-16 rounded-2xl bg-indigo-500/10 ring-1 ring-indigo-400/10 flex items-center justify-center text-4xl shadow-inner"
                                        >
                                            😴
                                            <motion.div
                                                animate={{ opacity: [0.25, 0.6, 0.25], scale: [0.85, 1.12, 0.85] }}
                                                transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
                                                className="absolute inset-1 rounded-2xl bg-indigo-400/10 blur-md -z-10"
                                            />
                                        </motion.div>

                                        {[
                                            { size: 'text-xs', delay: 0, x: [0, 7, 14], y: [0, -15, -31] },
                                            { size: 'text-base', delay: 0.65, x: [0, 9, 18], y: [0, -19, -39] },
                                            { size: 'text-xl', delay: 1.3, x: [0, 12, 24], y: [0, -23, -47] }
                                        ].map((sleep, sleepIndex) => (
                                            <motion.span
                                                key={sleepIndex}
                                                initial={{ opacity: 0 }}
                                                animate={{
                                                    opacity: [0, 0.95, 0.75, 0],
                                                    x: sleep.x,
                                                    y: sleep.y,
                                                    rotate: [-8, 4, 10],
                                                    scale: [0.65, 1, 1.12]
                                                }}
                                                transition={{
                                                    duration: 2.4,
                                                    repeat: Infinity,
                                                    delay: sleep.delay,
                                                    ease: 'easeOut',
                                                    times: [0, 0.25, 0.72, 1]
                                                }}
                                                className={`absolute left-14 top-8 ${sleep.size} font-black italic text-indigo-500 drop-shadow-sm`}
                                            >Z</motion.span>
                                        ))}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <Moon className="w-4 h-4 text-indigo-500" />
                                            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-500">Weekly Off Day</span>
                                        </div>
                                        <h2 className={`text-lg sm:text-xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>{weeklyOffDayName} Rest Mode</h2>
                                        <p className={`text-xs sm:text-sm mt-1 ${isDark ? 'text-indigo-200/70' : 'text-gray-500'}`}>Today is an official weekly off day. Relax, recharge, and come back refreshed.</p>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                    <motion.div
                        key={location.pathname}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.3 }}
                        className={hideGlobalChatWidget ? 'flex-1 min-h-0 overflow-hidden' : ''}
                    >
                        <Outlet />
                    </motion.div>
                </main>
            </div>

            {/* Click outside to close dropdowns */}
            {(showNotifications || showUserMenu) && (
                <div
                    className="fixed inset-0 z-20"
                    onClick={() => {
                        setShowNotifications(false);
                        setShowUserMenu(false);
                    }}
                />
            )}

            {/* Reset Password Modal */}
            <AnimatePresence>
                {showResetPasswordModal && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className={`w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border ${isDark ? 'bg-[var(--bg-sidebar)] border-white/10' : 'bg-white border-gray-100'}`}
                        >
                            <div className={`px-6 py-4 border-b flex items-center justify-between ${isDark ? 'border-white/10' : 'border-gray-100'}`}>
                                <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{t('layout.resetPassword')}</h2>
                                <button
                                    onClick={() => setShowResetPasswordModal(false)}
                                    className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-white/10 text-white/70' : 'hover:bg-gray-100 text-gray-500'}`}
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <form onSubmit={handleResetPasswordSubmit} className="p-6 space-y-4">
                                {resetPasswordError && (
                                    <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-sm font-medium flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4 shrink-0" />
                                        {resetPasswordError}
                                    </div>
                                )}
                                <div>
                                    <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-white/70' : 'text-gray-700'}`}>
                                        New Password
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showNewPassword ? 'text' : 'password'}
                                            value={resetPasswordForm.newPassword}
                                            onChange={(e) => setResetPasswordForm({ ...resetPasswordForm, newPassword: e.target.value })}
                                            className={`w-full pl-4 pr-12 py-2.5 rounded-xl border focus:ring-2 focus:ring-primary/20 outline-none transition-all ${
                                                isDark 
                                                ? 'bg-black/20 border-white/10 text-white focus:border-primary/50' 
                                                : 'bg-white border-gray-200 text-gray-900 focus:border-primary'
                                            }`}
                                            placeholder="Enter new password"
                                            required
                                            minLength={4}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowNewPassword((visible) => !visible)}
                                            aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
                                            title={showNewPassword ? 'Hide password' : 'Show password'}
                                            className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-colors ${isDark ? 'text-white/50 hover:text-white hover:bg-white/10' : 'text-gray-400 hover:text-primary hover:bg-gray-100'}`}
                                        >
                                            {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-white/70' : 'text-gray-700'}`}>
                                        Confirm Password
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showConfirmPassword ? 'text' : 'password'}
                                            value={resetPasswordForm.confirmPassword}
                                            onChange={(e) => setResetPasswordForm({ ...resetPasswordForm, confirmPassword: e.target.value })}
                                            className={`w-full pl-4 pr-12 py-2.5 rounded-xl border focus:ring-2 focus:ring-primary/20 outline-none transition-all ${
                                                isDark 
                                                ? 'bg-black/20 border-white/10 text-white focus:border-primary/50' 
                                                : 'bg-white border-gray-200 text-gray-900 focus:border-primary'
                                            }`}
                                            placeholder="Confirm new password"
                                            required
                                            minLength={4}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword((visible) => !visible)}
                                            aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                                            title={showConfirmPassword ? 'Hide password' : 'Show password'}
                                            className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-colors ${isDark ? 'text-white/50 hover:text-white hover:bg-white/10' : 'text-gray-400 hover:text-primary hover:bg-gray-100'}`}
                                        >
                                            {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                        </button>
                                    </div>
                                </div>
                                <div className="pt-4 flex justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowResetPasswordModal(false)}
                                        className={`px-5 py-2.5 rounded-xl font-medium transition-colors ${
                                            isDark ? 'hover:bg-white/10 text-white/70' : 'hover:bg-gray-100 text-gray-600'
                                        }`}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isResettingPassword}
                                        className="px-5 py-2.5 bg-primary text-white font-medium rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[120px]"
                                    >
                                        <ButtonLoader isLoading={isResettingPassword} className="w-4 h-4">
                                            {isResettingPassword ? 'Saving...' : 'Save Password'}
                                        </ButtonLoader>
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Global Chat Widget */}
            {!hideGlobalChatWidget && <ChatWidget />}
        </div>
    );
};

export default DashboardLayout;


