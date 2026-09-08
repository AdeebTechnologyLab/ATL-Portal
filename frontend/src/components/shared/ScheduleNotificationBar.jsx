import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, Coffee } from 'lucide-react';
import { useSelector } from 'react-redux';
import { attendanceAPI } from '../../services/api';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const ScheduleNotificationBar = () => {
    const { user } = useSelector((state) => state.auth);
    const [offDays, setOffDays] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSchedule = async () => {
            try {
                const res = await attendanceAPI.getGlobalHolidays();
                setOffDays(res.data.holidayDays || []);
            } catch (err) {
                console.error('Failed to fetch schedule:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchSchedule();
    }, []);

    const todayIndex = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Karachi',
        weekday: 'long'
    }).format(new Date());

    const classTime = user?.classTime || null;

    if (loading) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full rounded-2xl border border-blue-200 dark:border-blue-500/20 bg-gradient-to-r from-blue-50 via-indigo-50 to-violet-50 dark:from-blue-950/30 dark:via-indigo-950/30 dark:to-violet-950/30 p-4 shadow-sm"
        >
            <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-sm font-black tracking-tight text-blue-700 dark:text-blue-300 uppercase">
                    Schedule Updates
                </h3>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-6">
                {/* Class Time */}
                {classTime && (
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-green-500/10 border border-green-200 dark:border-green-500/20 flex items-center justify-center shrink-0">
                            <Clock className="w-4 h-4 text-green-600 dark:text-green-400" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Class Time</p>
                            <p className="text-sm font-bold text-gray-800 dark:text-gray-200 truncate">{classTime}</p>
                        </div>
                    </div>
                )}

                {/* Weekly Off Days */}
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 flex items-center justify-center shrink-0">
                        <Coffee className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Weekly Off</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                            {offDays.length > 0 ? (
                                DAYS.map((day, idx) => (
                                    <span
                                        key={idx}
                                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide ${
                                            offDays.includes(idx)
                                                ? day === todayIndex
                                                    ? 'bg-orange-500 text-white shadow-sm'
                                                    : 'bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-500/30'
                                                : day === todayIndex
                                                    ? 'bg-blue-500 text-white shadow-sm'
                                                    : 'bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-gray-600'
                                        }`}
                                    >
                                        {DAY_ABBR[idx]}
                                    </span>
                                ))
                            ) : (
                                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">No off days set</span>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default ScheduleNotificationBar;
