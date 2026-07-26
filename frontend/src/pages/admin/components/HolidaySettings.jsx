import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sun, Check, Calendar, Moon, X, XCircle } from 'lucide-react';
import { attendanceAPI } from '../../../services/api';
import Loader from '../../../components/ui/Loader';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const SHORT_DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const HolidaySettings = () => {
    const [holidayDays, setHolidayDays] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    useEffect(() => {
        fetchHolidays();
    }, []);

    const fetchHolidays = async () => {
        try {
            const response = await attendanceAPI.getGlobalHolidays();
            setHolidayDays(response.data.holidayDays || []);
        } catch (err) {
            console.error('Error fetching holidays:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleDay = async (dayIndex) => {
        setIsSaving(true);
        setSaveSuccess(false);

        const newHolidayDays = holidayDays.includes(dayIndex)
            ? holidayDays.filter(d => d !== dayIndex)
            : [...holidayDays, dayIndex];

        try {
            await attendanceAPI.updateGlobalHolidays(newHolidayDays);
            setHolidayDays(newHolidayDays);
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 2000);
        } catch (err) {
            console.error('Error saving holidays:', err);
            alert('Failed to update holiday settings');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex items-center justify-center">
                <Loader />
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm"
        >
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary/5 flex items-center justify-center">
                        <Calendar className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-1">Administrative Logic</h2>
                        <h3 className="text-xl font-black text-gray-900 uppercase tracking-tighter leading-none">Weekly Off Days</h3>
                    </div>
                </div>
                {saveSuccess && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex items-center gap-2 px-3 py-1.5 bg-primary/5 text-primary rounded-full text-[10px] font-black uppercase tracking-widest border border-primary/10"
                    >
                        <Check className="w-3 h-3" />
                        SYNCED
                    </motion.div>
                )}
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-7 gap-4 mb-8">
                {SHORT_DAY_NAMES.map((day, index) => (
                    <button
                        key={day}
                        onClick={() => toggleDay(index)}
                        disabled={isSaving}
                        className={`relative py-6 px-2 rounded-[1.5rem] font-black text-center transition-all duration-500 border-2 ${holidayDays.includes(index)
                                ? 'bg-slate-900 text-white border-slate-900'
                                : 'bg-white text-gray-300 border-gray-100 hover:border-orange-200 hover:text-primary hover:bg-primary/5/30'
                            } ${isSaving ? 'opacity-50 cursor-not-allowed' : 'active:scale-90 cursor-pointer group'}`}
                    >
                        <div className="flex items-center justify-center gap-2">
                            {holidayDays.includes(index) ? (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.5 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                >
                                    <Moon className="w-4 h-4 text-blue-400 fill-blue-400/20" />
                                </motion.div>
                            ) : (
                                <div className="w-1.5 h-1.5 rounded-full bg-gray-200 group-hover:bg-orange-300 transition-colors" />
                            )}
                            <span className={`text-[11px] uppercase tracking-[0.1em] font-black ${holidayDays.includes(index) ? 'opacity-90' : 'text-gray-400'}`}>
                                {day}
                            </span>
                        </div>

                        {holidayDays.includes(index) && (
                            <motion.div
                                initial={{ scale: 0, rotate: -45 }}
                                animate={{ scale: 1, rotate: 0 }}
                                className="absolute -top-2 -right-2 w-8 h-8 bg-white rounded-2xl flex items-center justify-center shadow-lg shadow-red-500/20 border-2 border-red-500 z-10"
                            >
                                <X className="w-4 h-4 text-red-500" strokeWidth={4} />
                            </motion.div>
                        )}
                    </button>
                ))}
            </div>

            <div className="bg-slate-50 dark:bg-transparent rounded-3xl p-5 border border-slate-100 dark:border-slate-800">
                <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-xl bg-white dark:bg-transparent border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0">
                        <Sun className="w-4 h-4 text-primary" />
                    </div>
                    <div className="text-[11px] text-slate-500 font-medium leading-relaxed">
                        <p className="font-black text-gray-900 uppercase tracking-widest mb-2 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                            System Protocols
                        </p>
                        <ul className="space-y-2 opacity-80">
                            <li className="flex items-center gap-2">
                                <div className="w-1 h-1 rounded-full bg-orange-300"></div>
                                Selected days are bypassed during global attendance cycles.
                            </li>
                            <li className="flex items-center gap-2">
                                <div className="w-1 h-1 rounded-full bg-orange-300"></div>
                                No attendance records will be generated for bypassed days.
                            </li>
                            <li className="flex items-center gap-2">
                                <div className="w-1 h-1 rounded-full bg-orange-300"></div>
                                Statistical calculations exclude these intervals automatically.
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default HolidaySettings;



