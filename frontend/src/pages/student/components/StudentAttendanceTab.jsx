import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Clock, Calendar, ChevronLeft, ChevronRight, TrendingUp } from 'lucide-react';
import Loader from '../../../components/ui/Loader';
import Badge from '../../../components/ui/Badge';
import { attendanceAPI } from '../../../services/api';
import { useSelector } from 'react-redux';
import { toAttendanceDateKey } from '../../../utils/attendanceDate';
import { io } from 'socket.io-client';

const getSocketURL = () => {
    if (window.location.hostname === 'localhost') return 'http://localhost:5000';
    return window.location.origin;
};

const SOCKET_URL = getSocketURL();

const StudentAttendanceTab = ({ course }) => {
    const [attendanceData, setAttendanceData] = useState([]);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [isLoading, setIsLoading] = useState(true);
    const { user, role } = useSelector((state) => state.auth);

    useEffect(() => {
        fetchAttendance();

        const socket = io(SOCKET_URL, { withCredentials: true });
        const myId = String(user?.id || user?._id || '');
        if (myId) {
            socket.emit('join_chat', myId);
        }

        socket.on('attendance_updated', (data) => {
            if (String(data.courseId) === String(course._id)) {
                fetchAttendance();
            }
        });

        return () => {
            socket.disconnect();
        };
    }, [course, user]);

    const fetchAttendance = async () => {
        setIsLoading(true);
        try {
            const response = await attendanceAPI.getMy(course._id);
            setAttendanceData(response.data.attendances || response.data.data || []);
        } catch (err) {
            console.error('Error fetching attendance:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const getStatusConfig = (status) => {
        switch (status) {
            case 'present': return { bg: 'bg-present-fixed-light', text: 'text-present-fixed', icon: CheckCircle, label: 'Present' };
            case 'absent': return { bg: 'bg-absent-fixed-light', text: 'text-absent-fixed', icon: XCircle, label: 'Absent' };
            default: return { bg: 'bg-gray-100', text: 'text-gray-400', icon: Calendar, label: '-' };
        }
    };

    const getAttendanceForDate = (date) => {
        if (!attendanceData.length) return null;
        const dateStr = toAttendanceDateKey(date);
        const record = attendanceData.find((a) => {
            if (!a.date) return false;
            return toAttendanceDateKey(a.date) === dateStr;
        });
        return record || null;
    };

    const generateCalendarDays = () => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const days = [];

        for (let i = 0; i < firstDay.getDay(); i++) days.push(null);
        for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(year, month, d));
        return days;
    };

    if (isLoading) return (
        <Loader message="Fetching Attendance Records..." />
    );

    return (
        <div className="w-full min-w-0 overflow-hidden space-y-4 sm:space-y-6">
            {/* Stats */}
            <div data-testid="attendance-summary" className="grid min-w-0 grid-cols-4 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-[#1a1f2e]">
                <div className="min-w-0 px-1 py-2.5 sm:px-4 sm:py-4 text-center bg-present-fixed-light/50">
                    <div className="flex items-center justify-center gap-2">
                        <TrendingUp className="hidden sm:block w-4 h-4 text-present-fixed shrink-0" />
                        <p className="text-lg sm:text-2xl font-black leading-none text-present-fixed">
                            {attendanceData.length > 0
                                ? Math.round((attendanceData.filter(a => a.status === 'present').length / attendanceData.length) * 100)
                                : 0}%
                        </p>
                    </div>
                    <p className="mt-1 text-[8px] sm:text-[10px] font-black leading-tight text-gray-400 uppercase tracking-tight sm:tracking-wider">Attendance</p>
                </div>
                <div className="min-w-0 border-l border-gray-100 dark:border-gray-800 px-1 py-2.5 sm:px-4 sm:py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                        <CheckCircle className="hidden sm:block w-4 h-4 text-present-fixed shrink-0" />
                        <p className="text-lg sm:text-2xl font-black leading-none text-present-fixed">{attendanceData.filter(a => a.status === 'present').length}</p>
                    </div>
                    <p className="mt-1 text-[8px] sm:text-[10px] font-black leading-tight text-gray-400 uppercase tracking-tight sm:tracking-wider">Presents</p>
                </div>
                <div className="min-w-0 border-l border-gray-100 dark:border-gray-800 px-1 py-2.5 sm:px-4 sm:py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                        <XCircle className="hidden sm:block w-4 h-4 text-absent-fixed shrink-0" />
                        <p className="text-lg sm:text-2xl font-black leading-none text-absent-fixed">{attendanceData.filter(a => a.status === 'absent').length}</p>
                    </div>
                    <p className="mt-1 text-[8px] sm:text-[10px] font-black leading-tight text-gray-400 uppercase tracking-tight sm:tracking-wider">Absents</p>
                </div>
                <div className="min-w-0 border-l border-gray-100 dark:border-gray-800 px-1 py-2.5 sm:px-4 sm:py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                        <Calendar className="hidden sm:block w-4 h-4 text-primary shrink-0" />
                        <p className="text-lg sm:text-2xl font-black leading-none text-primary">{attendanceData.length}</p>
                    </div>
                    <p className="mt-1 text-[8px] sm:text-[10px] font-black leading-tight text-gray-400 uppercase tracking-tight sm:tracking-wider">{course?.targetAudience === 'interns' ? 'Total Meetings' : 'Total Classes'}</p>
                </div>
            </div>

            {/* Calendar */}
            <div data-testid="attendance-calendar" className="w-full min-w-0 bg-white rounded-2xl p-3 sm:p-6 border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 sm:mb-4">
                    <h3 className="text-sm sm:text-base font-black text-gray-900 uppercase italic">Attendance Calendar</h3>
                    <div className="flex w-full sm:w-auto items-center justify-between gap-1.5 sm:gap-3">
                        <button 
                            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))} 
                            className="p-1.5 hover:bg-primary/10 text-primary rounded-lg transition-colors border border-transparent hover:border-primary/20"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <div className="min-w-0 flex-1 sm:flex-none bg-primary/5 px-2 sm:px-5 py-1.5 rounded-lg border border-primary/10 text-center">
                            <span className="block font-black text-primary text-[11px] sm:text-sm uppercase tracking-wide whitespace-nowrap">
                                {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                            </span>
                        </div>
                        <button 
                            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))} 
                            className="p-1.5 hover:bg-primary/10 text-primary rounded-lg transition-colors border border-transparent hover:border-primary/20"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className="grid min-w-0 grid-cols-7 gap-1 sm:gap-2 lg:gap-4">
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                        <div key={i} className="min-w-0 text-center py-1.5 bg-primary/5 rounded-md sm:rounded-lg border border-primary/10">
                            <span className="text-[10px] sm:text-xs font-black text-primary uppercase tracking-[0.2em]">
                                {day}
                            </span>
                        </div>
                    ))}
                    {generateCalendarDays().map((date, index) => {
                        if (!date) return <div key={`empty-${index}`} className="h-10 sm:h-16 min-w-0 opacity-0" />;
                        const record = getAttendanceForDate(date);
                        const status = record?.status || null;
                        const config = status ? getStatusConfig(status) : null;
                        const isToday = date.toDateString() === new Date().toDateString();
                        const markedTime = record?.markedAt
                            ? new Date(record.markedAt).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: true
                            })
                            : null;

                        return (
                            <motion.div
                                key={date.toISOString()}
                                title={config && markedTime ? `${config.label} at ${markedTime}` : undefined}
                                aria-label={config && markedTime ? `${date.getDate()} ${config.label} at ${markedTime}` : undefined}
                                data-attendance-time={markedTime || undefined}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.01 }}
                                className={`h-10 sm:h-16 min-w-0 rounded-lg sm:rounded-xl flex flex-col items-center justify-center relative transition-all duration-300 group cursor-default border ${
                                    config 
                                        ? `${config.bg} border-transparent shadow-sm` 
                                        : 'bg-gray-50/50 dark:bg-white/5 border-gray-100 dark:border-gray-800'
                                } ${isToday ? 'ring-2 ring-primary ring-offset-1 sm:ring-offset-4 ring-offset-white dark:ring-offset-[#1a1f2e] z-10 shadow-lg shadow-primary/20' : 'sm:hover:scale-105 hover:shadow-md hover:z-10'}`}
                            >
                                <span className={`text-xs sm:text-base font-black leading-none transition-colors ${config ? config.text : 'text-gray-400 group-hover:text-gray-600'}`}>
                                    {date.getDate()}
                                </span>
                                
                                {config ? (
                                    <div className="flex flex-col items-center">
                                        <config.icon className={`hidden sm:block w-4 h-4 mt-1 ${config.text}`} />
                                        {record.markedAt && (
                                            <span className={`hidden text-[8px] font-bold opacity-60 ${config.text}`}>
                                                {new Date(record.markedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                            </span>
                                        )}
                                    </div>
                                ) : isToday && (
                                    <span className="text-[6px] sm:text-[7px] font-black text-primary uppercase tracking-tighter mt-0.5">Today</span>
                                )}

                                {/* Hover tooltip-like effect for status */}
                                {config && (
                                    <div className="absolute top-0.5 right-0.5">
                                        <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full border border-white dark:border-gray-900 ${status === 'present' ? 'bg-present-fixed' : 'bg-absent-fixed'}`}></div>
                                    </div>
                                )}
                            </motion.div>
                        );
                    })}
                </div>

                {/* Legend */}
                <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-4 mt-4 pt-3 border-t border-gray-50 dark:border-gray-800">
                    <div className="flex items-center gap-1.5 px-2 py-1.5 bg-present-fixed-light rounded-lg border border-present-fixed/10">
                        <div className="w-3 h-3 rounded-full bg-present-fixed shadow-sm shadow-present-fixed/20"></div>
                        <span className="text-[10px] font-black text-present-fixed uppercase tracking-widest">Present</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-2 py-1.5 bg-absent-fixed-light rounded-lg border border-absent-fixed/10">
                        <div className="w-3 h-3 rounded-full bg-absent-fixed shadow-sm shadow-absent-fixed/20"></div>
                        <span className="text-[10px] font-black text-absent-fixed uppercase tracking-widest">Absent</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-2 py-1.5 bg-norecord-fixed-light rounded-lg border border-gray-100">
                        <div className="w-3 h-3 rounded-full bg-gray-300 dark:bg-gray-600 shadow-sm"></div>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">No Record</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudentAttendanceTab;
