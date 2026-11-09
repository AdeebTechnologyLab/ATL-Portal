import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { io } from 'socket.io-client';
import {
    Bell,
    CreditCard,
    FileText,
    Award,
    Calendar,
    Zap,
    Megaphone,
    AlertCircle,
    CheckCircle,
    UserCheck,
    X,
    ArrowRight,
} from 'lucide-react';
import { getSocketURL } from '../../config/apiBaseUrl';

// Short notification chime (Web Audio, no audio file needed).
const playNotificationSound = () => {
    try {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return;
        const ctx = new Ctx();
        const note = (freq, start, dur, vol = 0.18) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.0001, ctx.currentTime + start);
            gain.gain.exponentialRampToValueAtTime(vol, ctx.currentTime + start + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + dur);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(ctx.currentTime + start);
            osc.stop(ctx.currentTime + start + dur + 0.05);
        };
        note(783.99, 0, 0.14);      // G5
        note(1046.5, 0.09, 0.22);   // C6
        setTimeout(() => ctx.close(), 1000);
    } catch {
        /* audio unavailable */
    }
};

// Pick the big icon, gradient and category label from the notification content.
const getVisual = (title = '', message = '', type = '') => {
    const text = `${title} ${message} ${type}`.toLowerCase();

    if (/(fee|payment|installment|challan|invoice|reimburs)/.test(text)) {
        return { Icon: CreditCard, gradient: 'from-emerald-500 to-teal-600', shadow: 'shadow-emerald-500/30', category: 'Fees & Payments' };
    }
    if (/(attendance|present|absent|late|leave)/.test(text)) {
        return { Icon: UserCheck, gradient: 'from-sky-500 to-blue-600', shadow: 'shadow-sky-500/30', category: 'Attendance' };
    }
    if (/(assignment|submission|work log|daily task|job)/.test(text)) {
        return { Icon: FileText, gradient: 'from-blue-500 to-indigo-600', shadow: 'shadow-blue-500/30', category: 'Assignments' };
    }
    if (/(result|marks|grade|certificate|roll|score)/.test(text)) {
        return { Icon: Award, gradient: 'from-amber-500 to-orange-600', shadow: 'shadow-amber-500/30', category: 'Results' };
    }
    if (/(class|session|meeting|zoom|live|lecture)/.test(text)) {
        return { Icon: Calendar, gradient: 'from-indigo-500 to-violet-600', shadow: 'shadow-indigo-500/30', category: 'Live Classes' };
    }
    if (/(holiday|closed|day off|announcement|notice)/.test(text)) {
        return { Icon: Megaphone, gradient: 'from-rose-500 to-pink-600', shadow: 'shadow-rose-500/30', category: 'Announcement' };
    }
    if (/(urgent|important|attention|warning|alert)/.test(text)) {
        return { Icon: Zap, gradient: 'from-fuchsia-500 to-purple-600', shadow: 'shadow-fuchsia-500/30', category: 'Important' };
    }
    if (type === 'success') {
        return { Icon: CheckCircle, gradient: 'from-emerald-500 to-green-600', shadow: 'shadow-emerald-500/30', category: 'Success' };
    }
    if (type === 'warning' || type === 'error') {
        return { Icon: AlertCircle, gradient: 'from-amber-500 to-rose-600', shadow: 'shadow-rose-500/30', category: 'Alert' };
    }
    return { Icon: Bell, gradient: 'from-violet-500 to-indigo-600', shadow: 'shadow-violet-500/30', category: 'Notification' };
};

// Global in-app notification toast — har LMS screen par sound ke sath 5 second
// ke liye show hota hai (assignment, attendance, fees, tasks, grading, etc.).
const InAppNotification = () => {
    const navigate = useNavigate();
    const { role, user } = useSelector((state) => state.auth);
    const myId = user?.id || user?._id || '';
    const ready = Boolean(myId && role);

    const resolveUrl = (url) => {
        if (!url) return '';
        if (role === 'intern' && url.startsWith('/student/')) {
            return url.replace('/student/', '/intern/');
        }
        return url;
    };

    const showToast = ({ title, message, url, type }) => {
        if (!title && !message) return;
        playNotificationSound();

        const visual = getVisual(title, message, type);
        const { Icon } = visual;
        const toastId = `inapp-${title || ''}-${message || ''}`.slice(0, 80);
        const target = resolveUrl(url);

        toast(
            () => (
                <div
                    onClick={() => {
                        toast.dismiss(toastId);
                        if (target) navigate(target);
                    }}
                    className={`w-full select-none overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-2xl ${visual.shadow} dark:border-violet-500/25 dark:bg-[#1a1825] ${target ? 'cursor-pointer' : ''}`}
                >
                    {/* Top gradient strip */}
                    <div className={`h-1 w-full bg-gradient-to-r ${visual.gradient}`} />

                    <div className="p-4">
                        {/* Brand header */}
                        <div className="mb-3 flex items-center gap-2">
                            <img
                                src="/logo.png"
                                alt="Logo"
                                className="h-6 w-6 object-contain"
                                onError={(e) => { e.target.style.display = 'none'; }}
                            />
                            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-primary">
                                LMS Adeeb Tech Lab
                            </span>
                            <span className={`ml-auto rounded-full bg-gradient-to-r ${visual.gradient} px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-white`}>
                                {visual.category}
                            </span>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    toast.dismiss(toastId);
                                }}
                                className="shrink-0 rounded-lg p-1 text-gray-300 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:text-gray-600 dark:hover:bg-white/10 dark:hover:text-gray-300"
                                aria-label="Dismiss"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex items-start gap-3">
                            <div className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${visual.gradient} shadow-lg ${visual.shadow}`}>
                                <Icon className="h-6 w-6 text-white" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-[15px] font-black leading-tight text-gray-900 dark:text-white">
                                    {title || 'New Notification'}
                                </p>
                                {message && (
                                    <p className="mt-1 text-[12px] font-semibold leading-snug text-gray-500 dark:text-gray-400">
                                        {message}
                                    </p>
                                )}
                                {target && (
                                    <div className="mt-2 flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-primary">
                                        Open <ArrowRight className="h-3 w-3" />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            ),
            {
                duration: 5000,
                id: toastId,
                style: { maxWidth: '420px', width: '100%', padding: 0, background: 'transparent' },
            }
        );
    };

    useEffect(() => {
        if (!ready) return;

        const socket = io(getSocketURL(), { withCredentials: true });
        const joinPersonalRoom = () => {
            if (myId) socket.emit('join_chat', String(myId));
        };
        joinPersonalRoom();
        socket.on('connect', joinPersonalRoom);

        // Most events (attendance, fees, grading, tasks, profile updates…)
        socket.on('new_browser_notification', (payload = {}) => {
            showToast({
                title: payload.title,
                message: payload.message || payload.body,
                url: payload.url,
                type: payload.type,
            });
        });

        // Assignment posted for a student.
        socket.on('new_assignment', (payload = {}) => {
            showToast({
                title: 'New Assignment',
                message: `A new assignment "${payload.title || 'Untitled'}" has been posted in your course.`,
                url: `/${role}/assignments`,
                type: 'assignment',
            });
        });

        // Assignment submitted / resubmitted for a teacher.
        socket.on('new_submission', (payload = {}) => {
            showToast({
                title: 'New Submission',
                message: `${payload.studentName || 'A student'} submitted "${payload.assignmentTitle || 'an assignment'}".`,
                url: '/teacher/dashboard',
                type: 'assignment',
            });
        });

        // Daily work log submitted for a teacher.
        socket.on('new_daily_task', (payload = {}) => {
            showToast({
                title: 'New Work Log',
                message: `${payload.studentName || 'A student'} submitted a work log for ${payload.courseTitle || 'a course'}.`,
                url: '/teacher/dashboard',
                type: 'assignment',
            });
        });

        return () => {
            socket.disconnect();
        };
    }, [ready, myId, role]);

    return null;
};

export default InAppNotification;
