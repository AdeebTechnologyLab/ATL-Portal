import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { X, Bell, Info, AlertCircle, CheckCircle, GraduationCap } from 'lucide-react';

let toastAudio = null;
let lastToastSoundAt = 0;

/** Play the notification ringtone that ships in /public. Throttled so a burst
 *  of toasts doesn't stack the sound on top of itself. */
const playToastSound = () => {
    try {
        const now = Date.now();
        if (now - lastToastSoundAt < 1200) return;
        lastToastSoundAt = now;

        if (!toastAudio) {
            toastAudio = new Audio('/ringtone.wav');
            toastAudio.preload = 'auto';
            toastAudio.volume = 0.7;
        }
        toastAudio.currentTime = 0;
        const promise = toastAudio.play();
        if (promise?.catch) promise.catch(() => {});
    } catch {
        /* autoplay may be blocked until the first user gesture */
    }
};

const CustomToast = ({ t, title, message, type = 'info', icon: IconComponent, onClick }) => {
    const getColors = () => {
        switch (type) {
            case 'success': return { bg: 'bg-primary', border: 'border-primary', text: 'text-primary', icon: 'text-primary', iconBg: 'bg-primary' };
            case 'error': return { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-800', icon: 'text-rose-500', iconBg: 'bg-rose-100' };
            case 'warning': return { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800', icon: 'text-amber-500', iconBg: 'bg-amber-100' };
            default: return { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', icon: 'text-blue-500', iconBg: 'bg-blue-100' };
        }
    };

    const colors = getColors();
    const isClickable = typeof onClick === 'function';

    const handleClick = () => {
        if (!isClickable) return;
        onClick();
        toast.dismiss(t.id);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            onClick={handleClick}
            role={isClickable ? 'button' : undefined}
            tabIndex={isClickable ? 0 : undefined}
            onKeyDown={isClickable ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleClick();
                }
            } : undefined}
            className={`max-w-md w-full bg-white dark:bg-[#1a1f2e] shadow-2xl rounded-2xl pointer-events-auto flex ring-1 ring-black ring-opacity-5 overflow-hidden border-2 ${colors.border} ${isClickable ? 'cursor-pointer transition-transform hover:scale-[1.01]' : ''}`}
        >
            <div className="flex-1 w-0 p-4">
                <div className="flex items-start">
                    <div className="flex-shrink-0 pt-0.5">
                        <div className={`p-3 rounded-2xl ${colors.iconBg} shadow-inner flex items-center justify-center`}>
                            <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain" />
                        </div>
                    </div>
                    <div className="ml-4 flex-1">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">LMS Adeeb Tech Lab</span>
                            </div>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    toast.dismiss(t.id);
                                }}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg"
                                aria-label="Close notification"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <p className={`mt-2 text-sm font-black ${colors.text} leading-tight`}>
                            {title}
                        </p>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 leading-relaxed font-medium">
                            {message}
                        </p>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

const createToast = (type) => (title, message, icon, options = {}) => {
    const { onClick, duration = Infinity, sound = true } = options || {};
    if (sound) playToastSound();
    toast.custom(
        (t) => (
            <CustomToast
                t={t}
                title={title}
                message={message}
                type={type}
                icon={icon}
                onClick={onClick}
            />
        ),
        { duration }
    );
};

export const showToast = {
    success: createToast('success'),
    error: createToast('error'),
    warning: createToast('warning'),
    info: createToast('info')
};


