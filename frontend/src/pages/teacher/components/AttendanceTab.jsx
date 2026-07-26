import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, Search, Lock, AlertCircle, Save, Download, Calendar, Sun, RefreshCw } from 'lucide-react';
import Badge from '../../../components/ui/Badge';
import ProfileAvatar from '../../../components/ui/ProfileAvatar';
import { attendanceAPI, settingsAPI } from '../../../services/api';
import Loader, { ButtonLoader } from '../../../components/ui/Loader';

import {
    getLocalDateString,
    getTodayAttendanceDateKey,
} from '../../../utils/attendanceDate';

// Day names
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Import format for date-fns
import { format } from 'date-fns';

const formatLastSeen = (lastSeen) => {
    if (!lastSeen) return 'Offline';
    const lastSeenDate = new Date(lastSeen);
    const now = new Date();
    const diffInMs = now - lastSeenDate;
    const diffInMins = Math.floor(diffInMs / 1000 / 60);

    // Only show Online if active in the last 3 minutes AND not in the future (due to clock skew)
    if (diffInMins >= 0 && diffInMins < 3) return 'Online';
    if (diffInMins >= 0 && diffInMins < 60) return `${diffInMins}m ago`;
    const diffInHours = Math.floor(diffInMins / 60);
    if (diffInHours >= 0 && diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays > 90) return 'Offline';
    return format(lastSeenDate, 'dd MMM');
};

const getStatusColor = (lastSeen) => {
    if (!lastSeen) return 'bg-gray-300';
    const diffInMins = Math.floor((new Date() - new Date(lastSeen)) / 1000 / 60);
    if (diffInMins < 3) return 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)]';
    if (diffInMins < 60) return 'bg-amber-400';
    return 'bg-gray-400';
};

const AttendanceTab = ({ course, students }) => {
    const [selectedDate, setSelectedDate] = useState(getTodayAttendanceDateKey());
    const [attendanceMarks, setAttendanceMarks] = useState({});
    const [isSaving, setIsSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLocked, setIsLocked] = useState(false);
    const [holidayDays, setHolidayDays] = useState([]);
    const [isHoliday, setIsHoliday] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    // Fail closed until the admin-controlled server setting is loaded.
    const [whatsappEnabled, setWhatsappEnabled] = useState(false);

    useEffect(() => {
        fetchGlobalHolidays();
        fetchWhatsAppSetting();
    }, []);

    useEffect(() => {
        const syncOnFocus = () => fetchWhatsAppSetting();
        const syncOnVisibility = () => {
            if (document.visibilityState === 'visible') fetchWhatsAppSetting();
        };
        const syncFromStorage = (event) => {
            if (event.key === 'attendance_whatsapp_enabled') {
                setWhatsappEnabled(event.newValue === 'true');
            }
        };

        window.addEventListener('focus', syncOnFocus);
        document.addEventListener('visibilitychange', syncOnVisibility);
        window.addEventListener('storage', syncFromStorage);

        return () => {
            window.removeEventListener('focus', syncOnFocus);
            document.removeEventListener('visibilitychange', syncOnVisibility);
            window.removeEventListener('storage', syncFromStorage);
        };
    }, []);

    useEffect(() => {
        fetchAttendance();
        checkLockStatus();
    }, [course._id, selectedDate, holidayDays]);

    // Fetch global holiday settings
    const fetchGlobalHolidays = async () => {
        try {
            const response = await attendanceAPI.getGlobalHolidays();
            setHolidayDays(response.data.holidayDays || []);
        } catch (err) {
            console.error('Error fetching holiday settings:', err);
        }
    };

    const fetchWhatsAppSetting = async () => {
        try {
            const response = await settingsAPI.getAll();
            const saved = response.data.data?.whatsapp_attendance_enabled;
            const enabled = saved === true || saved === 'true';
            setWhatsappEnabled(enabled);
            localStorage.setItem('attendance_whatsapp_enabled', String(enabled));
        } catch {
            // Never send guardian messages when the central permission cannot be verified.
            setWhatsappEnabled(false);
        }
    };

    const checkLockStatus = () => {
        const now = new Date();
        const today = getTodayAttendanceDateKey();

        const courseStart = course.startDate ? getLocalDateString(new Date(course.startDate)) : null;
        const courseEnd = course.endDate ? getLocalDateString(new Date(course.endDate)) : null;

        let locked = false;

        // 1. Lock only if future date
        if (selectedDate > today) locked = true;

        // 2. Lock if outside course duration
        if (courseStart && selectedDate < courseStart) locked = true;
        if (courseEnd && selectedDate > courseEnd) locked = true;

        // 3. Check if selected date is a holiday
        const [year, month, day] = selectedDate.split('-').map(Number);
        const selectedDateObj = new Date(year, month - 1, day);
        const dayOfWeek = selectedDateObj.getDay();
        const dateIsHoliday = holidayDays.includes(dayOfWeek);
        setIsHoliday(dateIsHoliday);

        // Lock if it's a holiday (no attendance marking allowed)
        if (dateIsHoliday) locked = true;

        setIsLocked(locked);
    };

    const fetchAttendance = async () => {
        setIsLoading(true);
        try {
            const response = await attendanceAPI.get(course._id, selectedDate);
            const data = response.data.attendance || response.data.data || {};
            const serverMarks = {};
            (data.records || []).forEach(record => {
                serverMarks[record.user?._id || record.user] = {
                    status: record.status,
                    markedAt: record.markedAt
                };
            });

            // Merge with local cache for unsaved changes
            const cacheKey = `attendance_${course._id}_${selectedDate}`;
            const cached = localStorage.getItem(cacheKey);
            if (cached) {
                const localMarks = JSON.parse(cached);
                console.log('Restoring local unsaved markings for:', selectedDate);
                setAttendanceMarks({ ...serverMarks, ...localMarks });
            } else {
                setAttendanceMarks(serverMarks);
            }
        } catch (err) {
            console.error('Error fetching attendance:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const markAttendance = async (studentId, status) => {
        if (isLocked) return;

        // 1. Update local state immediately for UI responsiveness
        const newMarks = { ...attendanceMarks, [studentId]: { status, markedAt: new Date().toISOString() } };
        setAttendanceMarks(newMarks);

        // 2. Save to local cache (fallback)
        const cacheKey = `attendance_${course._id}_${selectedDate}`;
        localStorage.setItem(cacheKey, JSON.stringify(newMarks));

        const student = students.find(s => s.id === studentId);

        // WHATSAPP POPUP LOGIC (Triggered before await to bypass browser popup blocker)
        if (whatsappEnabled && student && student.guardianPhone) {
            const isIntern = course?.targetAudience === 'interns';
            const academyName = isIntern ? "Adeeb Technology Lab" : "The Computer Courses";
            const tagline = isIntern ? "Digital Tech Expert Software House" : "Learn and Earn";
            const campusName = student.location && student.location !== 'N/A' ? student.location : "";
            const dt = new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });

            // Sanitize user-provided strings to remove invisible/control characters and asterisks
            const sanitize = (s) => {
                if (s === undefined || s === null) return '';
                try {
                    return String(s)
                        .normalize('NFKC')
                        .replace(/[\u200B-\u200D\uFEFF]/g, '') // zero-width
                        .replace(/[\x00-\x1F\x7F]/g, '') // control chars
                        .replace(/\*/g, '') // remove asterisks that break WhatsApp formatting
                        .trim();
                } catch (e) {
                    return String(s);
                }
            };

            const studentName = sanitize(student.name);
            const courseName = sanitize(student.courseName || course?.title || course?.name || '');
            const campusDisplay = sanitize(campusName);

            // Build header: Academy Name - Campus on line 1, tagline on line 2
            let firstLine = academyName;
            if (campusDisplay) firstLine += ' ' + campusDisplay;

            const statusIndicator = status === 'present' ? '✅' : (status === 'absent' ? '❌' : '');
            const message = `📋 *DAILY ATTENDANCE REPORT*\n${firstLine}\n${tagline}\n\n*Student:* ${studentName}\n*Course:* ${courseName}\n*Date:* ${dt}\n*Status:* ${status.toUpperCase()} ${statusIndicator}`;

            // Debug: log plain and encoded message to help diagnose rendering issues
            try {
                console.debug('WhatsApp attendance message:', message);
                console.debug('WhatsApp encoded:', encodeURIComponent(message));
            } catch (e) {
                // ignore logging errors
            }
            
            const formattedPhone = student.guardianPhone.replace(/\D/g, '');
            let finalPhone = formattedPhone;
            if (finalPhone.startsWith('0')) {
                finalPhone = '92' + finalPhone.substring(1);
            } else if (!finalPhone.startsWith('92') && finalPhone.length === 10) {
                finalPhone = '92' + finalPhone; 
            }

            window.open(`https://wa.me/${finalPhone}?text=${encodeURIComponent(message)}`, '_blank');
        }

        // 3. Auto-save to server
        setIsSaving(true);
        try {
            // OPTIMIZED: Only send the changed student to the backend to prevent notification storms 
            // and reduce server load.
            const defaultMode = (student?.attendType || '').toLowerCase().includes('online') ? 'online' : 'onsite';

            const record = {
                userId: studentId,
                status: status,
                mode: defaultMode
            };

            await attendanceAPI.mark({
                courseId: course._id,
                date: selectedDate,
                records: [record]
            });

            setLastSaved(new Date());
        } catch (err) {
            console.error('Auto-save failed:', err);
        } finally {
            setIsSaving(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const records = students.map(student => ({
                userId: student.id,
                status: attendanceMarks[student.id]?.status || 'absent'
            }));
            await attendanceAPI.mark({
                courseId: course._id,
                date: selectedDate,
                records
            });

            // Clear local cache after successful save
            localStorage.removeItem(`attendance_${course._id}_${selectedDate}`);

            alert('Attendance saved successfully!');
        } catch (err) {
            console.error('Error saving:', err);
            alert('Failed to save attendance');
        } finally {
            setIsSaving(false);
        }
    };

    const filteredStudents = students.filter(student =>
        student.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.rollNo?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getStatusButton = (studentId, status, currentMark) => {
        const isActive = currentMark?.status === status;
        const config = status === 'present'
            ? { bg: isActive ? 'bg-present-fixed !important' : 'bg-gray-100 text-gray-600 hover:bg-present-fixed-light', label: 'P', text: isActive ? 'text-white' : 'text-present-fixed' }
            : { bg: isActive ? 'bg-absent-fixed !important' : 'bg-gray-100 text-gray-600 hover:bg-absent-fixed-light', label: 'A', text: isActive ? 'text-white' : 'text-absent-fixed' };

        return (
            <button
                onClick={() => markAttendance(studentId, status)}
                disabled={isLocked}
                className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm transition-all ${config.bg} ${config.text} ${isLocked ? 'cursor-not-allowed opacity-60' : 'active:scale-95 shadow-sm'}`}
            >
                {config.label}
            </button>
        );
    };

    // Get row background color based on attendance status
    const getRowBgColor = (studentId) => {
        const mark = attendanceMarks[studentId];
        if (!mark) return '';
        if (mark.status === 'present') return 'bg-present-fixed-light';
        if (mark.status === 'absent') return 'bg-absent-fixed-light';
        return '';
    };

    return (
        <div className="space-y-6">
            {/* Quick Summary Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-present-fixed-light rounded-3xl p-4 border border-present-fixed/10 text-center shadow-sm">
                    <p className="text-xl sm:text-2xl font-black text-present-fixed">
                        {Object.values(attendanceMarks).filter(m => m.status === 'present').length}
                    </p>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Present Today</p>
                </div>
                <div className="bg-absent-fixed-light rounded-3xl p-4 border border-absent-fixed/10 text-center shadow-sm">
                    <p className="text-xl sm:text-2xl font-black text-absent-fixed">
                        {Object.values(attendanceMarks).filter(m => m.status === 'absent').length}
                    </p>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Absent Today</p>
                </div>
                <div className="bg-primary/5 rounded-3xl p-4 border border-primary/10 text-center shadow-sm">
                    <p className="text-xl sm:text-2xl font-black text-primary">
                        {students.length - Object.keys(attendanceMarks).length}
                    </p>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Unmarked</p>
                </div>
                <div className="bg-white rounded-3xl p-4 border border-gray-100 text-center shadow-sm">
                    <p className="text-xl sm:text-2xl font-black text-gray-900">{students.length}</p>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Total Students</p>
                </div>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                {/* Weekly Off Days Display (Read-only, set by admin) */}
                {holidayDays.length > 0 && (
                    <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Sun className="w-4 h-4 text-yellow-600" />
                            <p className="text-xs font-bold text-yellow-800 uppercase tracking-wider">Weekly Off Days</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {DAY_NAMES.map((day, index) => (
                                <span
                                    key={day}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold ${holidayDays.includes(index)
                                        ? 'bg-yellow-400 text-yellow-900'
                                        : 'bg-gray-100 text-gray-400'
                                        }`}
                                >
                                    {day}
                                </span>
                            ))}
                        </div>
                        <p className="text-[11px] text-yellow-700 mt-2">
                            Off days are set by admin and apply to all courses. Attendance is not marked on these days.
                        </p>
                    </div>
                )}

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                        <h3 className="text-lg font-black text-gray-900 uppercase italic">Attendance Sheet</h3>
                        <div className="flex items-center gap-2">
                            <p className="text-sm text-gray-500 font-medium">{selectedDate === getTodayAttendanceDateKey() ? "Current Session" : "Historical Record"}</p>
                            {lastSaved && (
                                <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold uppercase animate-pulse">
                                    Auto-saved {lastSaved.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={fetchAttendance}
                            disabled={isLoading}
                            className="flex items-center gap-2 px-5 py-2.5 bg-primary/5 text-primary rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                            Refresh Data
                        </button>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20 text-gray-700"
                            />
                        </div>
                    </div>
                </div>

                {isHoliday ? (
                    <div className="bg-yellow-50 text-yellow-800 p-4 rounded-xl flex items-center gap-3 text-sm mb-6 border border-yellow-200">
                        <Sun className="w-5 h-5 text-yellow-600" />
                        <div>
                            <p className="font-bold">Weekly Off Day</p>
                            <p className="text-yellow-700">This day is marked as an off day. Attendance is not recorded and won't count in totals.</p>
                        </div>
                    </div>
                ) : isLocked ? (
                    <div className="bg-amber-50 text-amber-800 p-4 rounded-xl flex items-center gap-3 text-sm mb-6 border border-amber-200">
                        <Lock className="w-5 h-5 text-amber-600" />
                        <div>
                            <p className="font-bold">Entry Restricted</p>
                            <p className="text-amber-700">Attendance cannot be marked for future dates or outside course duration.</p>
                        </div>
                    </div>
                ) : (
                    <div className="bg-primary/5 border border-primary rounded-xl p-4 flex items-center gap-3 mb-6">
                        <Clock className="w-5 h-5 text-primary" />
                        <div>
                            <p className="font-bold text-primary text-sm">Active Attendance Window</p>
                            <p className="text-sm text-primary font-medium">Attendance auto-saves at 12AM. Mark students as P (Present) or A (Absent).</p>
                        </div>
                    </div>
                )}

                {/* Color Legend */}
                <div className="flex items-center gap-4 mb-4 text-xs font-bold">
                    <div className="flex items-center gap-1.5">
                        <div className="w-4 h-4 rounded bg-present-fixed"></div>
                        <span className="text-gray-600 dark:text-gray-400">Present</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-4 h-4 rounded bg-absent-fixed"></div>
                        <span className="text-gray-600 dark:text-gray-400">Absent</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-4 h-4 rounded bg-yellow-400"></div>
                        <span className="text-gray-600">Off Day</span>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row items-center gap-3 mb-6">
                    <div className="flex-1 w-full bg-gray-50 px-4 py-3 rounded-2xl flex items-center border border-gray-100">
                        <Search className="w-5 h-5 text-gray-400 mr-3" />
                        <input
                            type="text"
                            placeholder="Search student name or roll no..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-transparent border-none outline-none w-full text-sm font-medium"
                        />
                    </div>
                    {!isLocked && (
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="w-full md:w-auto px-8 py-3 bg-primary hover:bg-primary text-white rounded-2xl flex items-center justify-center gap-2 font-bold transition-all shadow-lg shadow-primary"
                        >
                            {isSaving ? <ButtonLoader /> : <Save className="w-5 h-5" />}
                            {isSaving ? 'SAVING...' : 'SAVE ATTENDANCE'}
                        </button>
                    )}
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-slate-900">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Roll No</th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Marked At</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                            {filteredStudents.map((student) => (
                                <tr key={student.id} className={`hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors ${getRowBgColor(student.id)}`}>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className="relative">
                                                <ProfileAvatar
                                                    src={student.photo}
                                                    name={student.name}
                                                    size="sm"
                                                    border={formatLastSeen(student.lastSeen) === 'Online' ? 'online-avatar-glow' : `border ${attendanceMarks[student.id]?.status === 'present' ? 'border-primary' : attendanceMarks[student.id]?.status === 'absent' ? 'border-red-300' : 'border-gray-200'}`}
                                                />
                                                {formatLastSeen(student.lastSeen) === 'Online' && (
                                                    <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border border-white flex items-center justify-center z-10">
                                                        <div className="absolute w-full h-full rounded-full bg-green-500 animate-status-ping opacity-75"></div>
                                                        <div className="relative w-1 h-1 rounded-full bg-white"></div>
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <div className="text-sm font-black text-gray-900 uppercase tracking-tight">{student.name}</div>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    {formatLastSeen(student.lastSeen) === 'Online' ? (
                                                        <div className="flex items-center gap-1 bg-green-500/10 px-1.5 py-0.5 rounded border border-green-500/20">
                                                            <span className="text-[8px] font-black text-green-600 uppercase tracking-wider">Active</span>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <div className={`w-1.5 h-1.5 rounded-full ${getStatusColor(student.lastSeen)} opacity-60`}></div>
                                                            <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">
                                                                {formatLastSeen(student.lastSeen)}
                                                            </span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 font-mono text-sm text-gray-500">{student.rollNo}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center justify-center gap-2">
                                            {getStatusButton(student.id, 'present', attendanceMarks[student.id])}
                                            {getStatusButton(student.id, 'absent', attendanceMarks[student.id])}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-gray-400">
                                        {attendanceMarks[student.id]?.markedAt ? new Date(attendanceMarks[student.id].markedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : '-'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AttendanceTab;



