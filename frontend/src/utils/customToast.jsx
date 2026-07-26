import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { X, Bell, Info, AlertCircle, CheckCircle, GraduationCap } from 'lucide-react';

const CustomToast = ({ t, title, message, type = 'info', icon: IconComponent }) => {
    const getColors = () => {
        switch (type) {
            case 'success': return { bg: 'bg-primary', border: 'border-primary', text: 'text-primary', icon: 'text-primary', iconBg: 'bg-primary' };
            case 'error': return { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-800', icon: 'text-rose-500', iconBg: 'bg-rose-100' };
            case 'warning': return { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800', icon: 'text-amber-500', iconBg: 'bg-amber-100' };
            default: return { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', icon: 'text-blue-500', iconBg: 'bg-blue-100' };
        }
    };

    const colors = getColors();

    return (
        <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className={`max-w-md w-full bg-white dark:bg-[#1a1f2e] shadow-2xl rounded-2xl pointer-events-auto flex ring-1 ring-black ring-opacity-5 overflow-hidden border-2 ${colors.border}`}
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
                                onClick={() => toast.dismiss(t.id)}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg"
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

export const showToast = {
    success: (title, message, icon) => {
        toast.custom((t) => (
            <CustomToast t={t} title={title} message={message} type="success" icon={icon} />
        ));
    },
    error: (title, message, icon) => {
        toast.custom((t) => (
            <CustomToast t={t} title={title} message={message} type="error" icon={icon} />
        ));
    },
    warning: (title, message, icon) => {
        toast.custom((t) => (
            <CustomToast t={t} title={title} message={message} type="warning" icon={icon} />
        ));
    },
    info: (title, message, icon) => {
        toast.custom((t) => (
            <CustomToast t={t} title={title} message={message} type="info" icon={icon} />
        ));
    }
};


