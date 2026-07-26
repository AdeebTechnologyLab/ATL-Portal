import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell, Megaphone } from 'lucide-react';
import { notificationAPI } from '../../services/api';

const AnnouncementsPopup = ({ autoShow = true }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [announcements, setAnnouncements] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const STORAGE_KEY = 'announcements_dismissed_at';
    const DISMISS_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

    useEffect(() => {
        fetchAnnouncements();
    }, []);

    const fetchAnnouncements = async () => {
        try {
            setIsLoading(true);
            const response = await notificationAPI.getActive();
            const data = response.data.data || [];
            setAnnouncements(data);

            // Auto-show popup if there are announcements and not recently dismissed
            if (autoShow && data.length > 0) {
                const dismissedAt = localStorage.getItem(STORAGE_KEY);
                if (!dismissedAt || Date.now() - parseInt(dismissedAt) > DISMISS_DURATION) {
                    setIsOpen(true);
                }
            }
        } catch (error) {
            console.error('Error fetching announcements:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        setIsOpen(false);
        localStorage.setItem(STORAGE_KEY, Date.now().toString());
    };

    // Get style classes based on notification type
    const getAnnouncementStyle = (type) => {
        switch (type) {
            case 'error':
                // Important - Dark Blue background (like in reference)
                return {
                    container: 'bg-[#003366] text-white',
                    text: 'text-white font-bold'
                };
            case 'success':
                // Highlighted - Green background
                return {
                    container: 'bg-[#28a745] text-white',
                    text: 'text-white'
                };
            case 'warning':
                // Notice - Yellow/Gold background
                return {
                    container: 'bg-[#ffc107] text-gray-900',
                    text: 'text-gray-900'
                };
            case 'info':
            default:
                // Default - Plain text with border
                return {
                    container: 'bg-white border-b border-gray-200',
                    text: 'text-gray-800'
                };
        }
    };

    // Don't render anything if no announcements
    if (!isLoading && announcements.length === 0) {
        return null;
    }

    return (
        <>
            {/* Floating Bell Button - Always visible when there are announcements */}
            {announcements.length > 0 && !isOpen && (
                <motion.button
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsOpen(true)}
                    className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-full shadow-lg shadow-blue-500/30 flex items-center justify-center hover:shadow-xl transition-shadow"
                >
                    <Megaphone className="w-6 h-6" />
                    {/* Notification Badge */}
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                        {announcements.length}
                    </span>
                </motion.button>
            )}

            {/* Popup Modal */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    >
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={handleClose}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />

                        {/* Modal */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-100 rounded-xl">
                                        <Bell className="w-6 h-6 text-blue-600" />
                                    </div>
                                    <h2 className="text-2xl font-black text-gray-900">Announcements</h2>
                                </div>
                                <button
                                    onClick={handleClose}
                                    className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                                >
                                    <X className="w-6 h-6 text-gray-500" />
                                </button>
                            </div>

                            {/* Announcements List */}
                            <div className="overflow-y-auto max-h-[calc(85vh-80px)]">
                                {isLoading ? (
                                    <div className="flex items-center justify-center py-16">
                                        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                                    </div>
                                ) : (
                                    <div className="divide-y divide-gray-100">
                                        {announcements.map((announcement) => {
                                            const style = getAnnouncementStyle(announcement.type);
                                            return (
                                                <div
                                                    key={announcement._id}
                                                    className={`px-6 py-4 ${style.container} transition-colors`}
                                                >
                                                    {announcement.isHtml ? (
                                                        <div
                                                            className={`announcement-html-content ${style.text}`}
                                                            dangerouslySetInnerHTML={{ __html: announcement.message }}
                                                        />
                                                    ) : (
                                                        <div className="space-y-1">
                                                            {announcement.title && (
                                                                <h3 className={`font-bold text-lg ${style.text}`}>
                                                                    {announcement.title}
                                                                </h3>
                                                            )}
                                                            <p className={`${style.text} leading-relaxed`}>
                                                                {announcement.message}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
                                <p className="text-xs text-gray-500 text-center">
                                    {announcements.length} announcement{announcements.length !== 1 ? 's' : ''} • Click outside or press X to close
                                </p>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default AnnouncementsPopup;


