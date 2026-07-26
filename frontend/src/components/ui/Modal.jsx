import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

const Modal = ({
    isOpen,
    onClose,
    title,
    children,
    size = 'md',
    showClose = true,
    noScroll = false,
    zIndex = 1000,
    centerOnMobile = false,
}) => {
    const sizes = {
        sm: 'max-w-md',
        md: 'max-w-lg',
        lg: 'max-w-2xl',
        xl: 'max-w-4xl',
        full: 'max-w-[100vw] sm:max-w-[90vw]',
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
                        style={{ zIndex }}
                    />

                    {/* Modal Container - Centered */}
                    <div
                        className={`fixed inset-0 flex justify-center pointer-events-none ${centerOnMobile
                            ? 'items-center p-3 sm:p-4'
                            : 'items-end sm:items-center p-0 sm:p-4'
                            }`}
                        style={{ zIndex }}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            transition={{ duration: 0.2 }}
                            className={`w-full ${sizes[size]} ${centerOnMobile
                                ? 'max-h-[calc(100dvh-1.5rem)] rounded-2xl'
                                : 'max-h-[96dvh] rounded-t-3xl sm:rounded-2xl'
                                } sm:max-h-[calc(100dvh-2rem)] bg-white dark:bg-slate-900 shadow-2xl overflow-hidden pointer-events-auto border border-transparent dark:border-slate-700`}
                        >
                            {/* Header */}
                            {(title || showClose) && (
                                <div className="flex items-center justify-between gap-3 px-4 py-3.5 sm:p-6 border-b border-gray-100 dark:border-slate-700">
                                    {title && (
                                        <h2 className="min-w-0 text-base sm:text-xl font-bold text-gray-900 dark:text-white leading-snug break-words">{title}</h2>
                                    )}
                                    {showClose && (
                                        <button
                                            onClick={onClose}
                                            className="shrink-0 p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors ml-auto"
                                        >
                                            <X className="w-5 h-5 text-gray-500 dark:text-slate-400" />
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* Content */}
                            <div className={`p-4 sm:p-6 ${centerOnMobile
                                ? 'max-h-[calc(100dvh-5.5rem)]'
                                : 'max-h-[calc(96dvh-3.75rem)]'
                                } sm:max-h-[calc(100dvh-7rem)] ${noScroll ? 'overflow-visible' : 'overflow-y-auto overscroll-contain scrollbar-hide'}`}>{children}</div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
};

export default Modal;


