import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell, Info, AlertCircle, CheckCircle, CreditCard, FileText, Award, Calendar, Zap, GraduationCap, Megaphone, Clock } from 'lucide-react';
import { notificationAPI, authAPI } from '../../services/api';
import { useDispatch } from 'react-redux';
import { updateUser } from '../../features/auth/authSlice';
import { useTheme } from '../../context/ThemeContext';

const NotificationPopup = () => {
    const [activeNotifications, setActiveNotifications] = useState([]);
    const [isVisible, setIsVisible] = useState(false);
    const { user, role } = useSelector((state) => state.auth);
    const location = useLocation();
    const { isDark } = useTheme();
    const dispatch = useDispatch();

    useEffect(() => {
        // Only show popup on Dashboard or Tasks pages
        const isDashboardOrTasks =
            location.pathname.endsWith('/dashboard') ||
            location.pathname.endsWith('/tasks');

        if (!isDashboardOrTasks || role === 'admin' || !user) return;

        const fetchActive = async () => {
            try {
                // Fetch latest user data from server to get updated classTime
                let latestUser = user;
                try {
                    const meRes = await authAPI.getMe();
                    if (meRes.data?.user) {
                        latestUser = meRes.data.user;
                        dispatch(updateUser(latestUser));
                    }
                } catch (e) {
                    console.error("Failed to fetch latest user data", e);
                }

                const response = await notificationAPI.getActive();
                const fetched = response.data.data || [];
                
                // Inject Class Time Notification using fresh data
                if (latestUser?.classTime) {
                    const isIntern = latestUser.role === 'intern';
                    const classTimeMsg = isIntern
                        ? `Your designated class time is <strong>${latestUser.classTime}</strong>. Please ensure you are punctual for all your sessions.`
                        : `Aap ki class ka waqt <strong>${latestUser.classTime}</strong> hai. Meharbani farma kar apni class mein waqt par pahunchein.`;
                    const classTimeTitle = isIntern ? 'Class Time Assigned' : 'Class Time Muqarrar Ho Gaya';
                    fetched.unshift({
                        _id: 'class-time-notice',
                        title: classTimeTitle,
                        message: classTimeMsg,
                        type: 'info',
                        isHtml: true,
                        createdAt: new Date().toISOString()
                    });
                }

                if (fetched.length > 0) {
                    setActiveNotifications(fetched);
                    setIsVisible(true);
                }
            } catch (error) {
                console.error('Error fetching active notifications:', error);
            }
        };

        fetchActive();
    }, [location.pathname, user?.classTime, role]);

    const handleDismiss = () => {
        setIsVisible(false);
    };



    if (!isVisible || activeNotifications.length === 0 || role === 'admin') return null;

    const getIcon = (notification) => {
        const title = (notification.title || '').toLowerCase();
        const message = (notification.message || '').toLowerCase();

        if (title.includes('fee') || title.includes('payment') || title.includes('installment') || message.includes('fee')) {
            return <CreditCard className="w-8 h-8 text-primary" />;
        }
        if (title.includes('assignment') || title.includes('task') || message.includes('assignment')) {
            return <FileText className="w-8 h-8 text-blue-500" />;
        }
        if (title.includes('result') || title.includes('marks') || title.includes('certificate') || title.includes('roll')) {
            return <Award className="w-8 h-8 text-amber-500" />;
        }
        if (title.includes('class') || title.includes('session') || title.includes('meeting') || title.includes('zoom') || title.includes('live')) {
            return <Calendar className="w-8 h-8 text-indigo-500" />;
        }
        if (title.includes('urgent') || title.includes('important') || title.includes('attention')) {
            return <Zap className="w-8 h-8 text-primary" />;
        }
        if (title.includes('holiday') || title.includes('closed') || title.includes('off')) {
            return <Megaphone className="w-8 h-8 text-rose-500" />;
        }

        switch (notification.type) {
            case 'warning': return <AlertCircle className="w-8 h-8 text-amber-500" />;
            case 'success': return <CheckCircle className="w-8 h-8 text-primary" />;
            case 'error': return <AlertCircle className="w-8 h-8 text-rose-500" />;
            default: return <Bell className="w-8 h-8 text-primary" />;
        }
    };

    const getColorClasses = (type) => {
        const themes = {
            red: {
                border: isDark ? 'border-rose-600/30' : 'border-rose-200',
                bg: isDark ? 'bg-rose-600/10' : 'bg-rose-50/80',
                iconBg: isDark ? 'bg-rose-600/20' : 'bg-rose-100',
                bar: 'bg-rose-600'
            },
            blue: {
                border: isDark ? 'border-blue-600/30' : 'border-blue-200',
                bg: isDark ? 'bg-blue-600/10' : 'bg-blue-50/80',
                iconBg: isDark ? 'bg-blue-600/20' : 'bg-blue-100',
                bar: 'bg-blue-600'
            },
            green: {
                border: isDark ? 'border-green-600/30' : 'border-green-200',
                bg: isDark ? 'bg-green-600/10' : 'bg-green-50/80',
                iconBg: isDark ? 'bg-green-600/20' : 'bg-green-100',
                bar: 'bg-green-600'
            },
            yellow: {
                border: isDark ? 'border-amber-500/30' : 'border-amber-200',
                bg: isDark ? 'bg-amber-500/10' : 'bg-amber-50/80',
                iconBg: isDark ? 'bg-amber-500/20' : 'bg-amber-100',
                bar: 'bg-amber-500'
            },
            orange: {
                border: isDark ? 'border-orange-600/30' : 'border-orange-200',
                bg: isDark ? 'bg-orange-600/10' : 'bg-orange-50/80',
                iconBg: isDark ? 'bg-orange-600/20' : 'bg-orange-100',
                bar: 'bg-orange-600'
            },
            pink: {
                border: isDark ? 'border-pink-600/30' : 'border-pink-200',
                bg: isDark ? 'bg-pink-600/10' : 'bg-pink-50/80',
                iconBg: isDark ? 'bg-pink-600/20' : 'bg-pink-100',
                bar: 'bg-pink-600'
            },
            purple: {
                border: isDark ? 'border-purple-600/30' : 'border-purple-200',
                bg: isDark ? 'bg-purple-600/10' : 'bg-purple-50/80',
                iconBg: isDark ? 'bg-purple-600/20' : 'bg-purple-100',
                bar: 'bg-purple-600'
            },
            black: {
                border: isDark ? 'border-slate-800/50' : 'border-slate-300',
                bg: isDark ? 'bg-slate-900/40' : 'bg-slate-100/80',
                iconBg: isDark ? 'bg-slate-800' : 'bg-slate-200',
                bar: 'bg-slate-900'
            },
            brown: {
                border: isDark ? 'border-amber-900/30' : 'border-amber-900/20',
                bg: isDark ? 'bg-amber-900/10' : 'bg-amber-100/80',
                iconBg: isDark ? 'bg-amber-900/20' : 'bg-amber-200',
                bar: 'bg-amber-900'
            },
            white: {
                border: isDark ? 'border-slate-200/20' : 'border-slate-200',
                bg: isDark ? 'bg-slate-200/5' : 'bg-slate-50/90',
                iconBg: isDark ? 'bg-slate-200/10' : 'bg-white border border-slate-100',
                bar: 'bg-slate-200'
            },
            gray: {
                border: isDark ? 'border-slate-500/30' : 'border-slate-300',
                bg: isDark ? 'bg-slate-500/10' : 'bg-slate-100/80',
                iconBg: isDark ? 'bg-slate-500/20' : 'bg-slate-200',
                bar: 'bg-slate-500'
            },
            magenta: {
                border: isDark ? 'border-fuchsia-600/30' : 'border-fuchsia-200',
                bg: isDark ? 'bg-fuchsia-600/10' : 'bg-fuchsia-50/80',
                iconBg: isDark ? 'bg-fuchsia-600/20' : 'bg-fuchsia-100',
                bar: 'bg-fuchsia-600'
            }
        };

        // Map legacy types to new colors
        const legacyMap = {
            info: themes.blue,
            success: themes.green,
            warning: themes.yellow,
            error: themes.red
        };

        return themes[type] || legacyMap[type] || themes.blue;
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 md:p-6 bg-slate-900/70 backdrop-blur-md">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 30 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 30 }}
                        className={`w-full max-w-3xl mx-auto rounded-[1.25rem] md:rounded-[1.5rem] shadow-[0_30px_100px_-20px_rgba(0,0,0,0.3)] overflow-hidden relative max-h-[90vh] md:max-h-[85vh] flex flex-col transition-all duration-300 ${isDark ? 'bg-[#1a1f2e]' : 'bg-white'}`}
                    >
                        {/* Header */}
                        <div className={`p-4 md:p-8 pb-3 md:pb-4 border-b flex items-center justify-between flex-shrink-0 ${isDark ? 'border-white/10' : 'border-slate-100'}`}>
                            <div className="flex items-center gap-2 md:gap-3">
                                <div className={`p-1 rounded-lg md:rounded-xl border border-primary/30 flex items-center justify-center overflow-hidden w-10 h-10 md:w-14 md:h-14 ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                                    <img
                                        src="/logo.png"
                                        alt="Logo"
                                        className="w-full h-full object-contain"
                                        onError={(e) => {
                                            e.target.style.display = 'none';
                                            e.target.nextSibling.style.display = 'block';
                                        }}
                                    />
                                    <GraduationCap className="w-6 h-6 md:w-8 md:h-8 text-primary hidden" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-1.5 md:gap-2">
                                        <h1 className="text-primary font-black text-[8px] md:text-[10px] uppercase tracking-[0.15em] md:tracking-[0.2em]">LMS Adeeb Tech Lab</h1>
                                        <div className="h-0.5 w-0.5 md:h-1 md:w-1 rounded-full bg-gray-400" />
                                        <span className={`text-[8px] md:text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-white/40' : 'text-gray-400'}`}>Official Notice</span>
                                    </div>
                                    <h2 className={`text-base md:text-2xl font-black tracking-tight leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>Important Announcements</h2>
                                    <p className={`text-[10px] md:text-xs font-medium ${isDark ? 'text-gray-300' : 'text-slate-500'}`}>
                                        You have <span className="text-primary font-bold">{activeNotifications.length}</span> {activeNotifications.length === 1 ? 'notification' : 'notifications'} to review
                                    </p>

                                </div>
                            </div>
                            <button
                                onClick={handleDismiss}
                                className={`p-2 md:p-3 rounded-xl md:rounded-2xl transition-all active:scale-90 flex-shrink-0 ${isDark ? 'text-white/40 hover:text-white hover:bg-white/10' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-100'}`}
                            >
                                <X className="w-5 h-5 md:w-6 md:h-6" />
                            </button>
                        </div>

                        {/* Scrollable Notifications Container */}
                        <div className="flex-1 overflow-y-auto px-4 md:px-5 pt-3 md:pt-4 pb-6 space-y-4">
                            {activeNotifications.map((notification, index) => {
                                const colors = getColorClasses(notification.type);
                                return (
                                    <motion.div
                                        key={notification._id || index}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.1 }}
                                        className={`border-2 ${colors.border} ${colors.bg} rounded-2xl overflow-hidden shadow-md hover:shadow-lg transition-all`}
                                    >
                                        {/* Type Color Bar */}
                                        <div className={`h-2 w-full ${colors.bar}`} />

                                        {/* Notification Content */}
                                        <div className="px-4 md:px-5 py-3 md:py-4">
                                            <h3 className={`text-base md:text-xl font-black leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                                {notification.title?.trim()}
                                            </h3>
                                            {notification.isHtml ? (
                                                <div
                                                    className={`text-[13px] md:text-base leading-relaxed prose prose-sm max-w-none announcement-html-content ${isDark ? 'text-gray-200 prose-invert' : 'text-slate-700'} mt-1.5`}
                                                    dangerouslySetInnerHTML={{ __html: notification.message }}
                                                />
                                            ) : (
                                                <div className={`text-[13px] md:text-base leading-relaxed whitespace-pre-wrap ${isDark ? 'text-gray-300' : 'text-slate-700'} mt-1.5`}>
                                                    {notification.message?.trim()}
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default NotificationPopup;


