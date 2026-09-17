import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Plus, Trash2, X, Check, Calendar, Moon, Shield, Zap, MessageSquare, Globe, MapPin, Users } from "lucide-react";
import { settingsAPI, attendanceAPI } from "../../services/api";
import { showToast } from "../../utils/customToast";
import Loader from "../../components/ui/Loader";
import ViewAsBar from '../../components/shared/ViewAsBar';

const STUDENT_SLOTS_KEY = "student_class_slots";
const INTERN_SLOTS_KEY = "intern_class_slots";
const STUDENT_HOLIDAYS_KEY = "student_holiday_days";
const INTERN_HOLIDAYS_KEY = "intern_holiday_days";

const DEFAULT_CLASSES = [
    { name: "Class 1", startTime: "09:00", endTime: "10:00", mode: "onsite" },
    { name: "Class 2", startTime: "10:00", endTime: "11:00", mode: "online" },
    { name: "Class 3", startTime: "11:00", endTime: "12:00", mode: "onsite" },
];
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const SectionCard = ({ icon: Icon, accent, label, sublabel, children }) => (
    <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden"
    >
        <div className="flex items-center gap-3 sm:gap-4 px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 border-b border-gray-50 dark:border-gray-700">
            <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl ${accent} flex items-center justify-center shrink-0 shadow-sm`}>
                <Icon className="w-5 h-5" />
            </div>
            <div>
                <p className="text-[8px] sm:text-[9px] font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] text-primary mb-0.5">{label}</p>
                <h2 className="text-sm sm:text-base font-black text-gray-900 dark:text-white uppercase tracking-tight leading-none">{sublabel}</h2>
            </div>
        </div>
        <div className="p-4 sm:p-6">{children}</div>
    </motion.div>
);

const ClassTimeSection = ({ classes, setClasses, isLoading, isSaving, setIsSaving, sectionKey, itemLabel = "Class", itemPrefix = "Class" }) => {
    const handleAddClass = async () => {
        const nextNum = classes.length + 1;
        const newClass = { name: `${itemPrefix} ${nextNum}`, startTime: "09:00", endTime: "10:00", mode: "onsite" };
        const updated = [...classes, newClass];
        setClasses(updated);
        await saveClasses(updated);
    };

    const handleDeleteClass = async (index) => {
        const updated = classes.filter((_, i) => i !== index);
        setClasses(updated);
        await saveClasses(updated);
    };

    const handleClassChange = async (index, field, value) => {
        const updated = classes.map((c, i) => i === index ? { ...c, [field]: value } : c);
        setClasses(updated);
        await saveClasses(updated);
    };

    const saveClasses = async (updated) => {
        setIsSaving(true);
        try {
            await settingsAPI.update(sectionKey, updated);
            showToast.success("Saved!", "Time table updated.");
        } catch { showToast.error("Error", "Could not save."); }
        finally { setIsSaving(false); }
    };

    return (
        <>
            {/* Header Row */}
            <div className="grid grid-cols-[1fr_100px_100px_90px_36px] gap-2 mb-3 px-1">
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider">{itemLabel}</span>
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider text-center">Start</span>
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider text-center">End</span>
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider text-center">Mode</span>
                <span></span>
            </div>

            {/* Slot List */}
            <div className="rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-700/40 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.25em]">
                        {classes.length} Class{classes.length !== 1 ? "es" : ""}
                    </span>
                    {isSaving && (
                        <span className="flex items-center gap-1 text-[9px] font-black text-primary animate-pulse">
                            <Zap className="w-3 h-3" /> Saving...
                        </span>
                    )}
                </div>

                {isLoading ? (
                    <div className="py-10 flex justify-center"><Loader /></div>
                ) : classes.length === 0 ? (
                    <div className="py-10 text-center text-gray-400">
                        <Clock className="w-7 h-7 mx-auto mb-2 opacity-30" />
                                    <p className="text-xs font-bold">No {itemLabel.toLowerCase()}s yet. Add one below.</p>
                    </div>
                ) : (
                    <AnimatePresence>
                        {classes.map((cls, index) => (
                            <motion.div key={index}
                                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                                className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-50 dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/20 transition-colors"
                            >
                                <div className="w-7 h-7 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                                    <span className="text-[9px] font-black text-primary">{index + 1}</span>
                                </div>

                                <input
                                    type="text"
                                    value={cls.name}
                                    onChange={(e) => handleClassChange(index, 'name', e.target.value)}
                                    className="min-w-0 flex-1 px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700/50 text-xs font-bold text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/30"
                                />

                                <input
                                    type="time"
                                    value={cls.startTime}
                                    onChange={(e) => handleClassChange(index, 'startTime', e.target.value)}
                                                className="w-[100px] px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700/50 text-xs font-bold text-gray-800 dark:text-gray-100 text-center focus:outline-none focus:ring-2 focus:ring-primary/30 [color-scheme:light] dark:[color-scheme:dark]"
                                            />

                                            <input
                                                type="time"
                                                value={cls.endTime}
                                                onChange={(e) => handleClassChange(index, 'endTime', e.target.value)}
                                                className="w-[100px] px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700/50 text-xs font-bold text-gray-800 dark:text-gray-100 text-center focus:outline-none focus:ring-2 focus:ring-primary/30 [color-scheme:light] dark:[color-scheme:dark]"
                                />

                                <select
                                    value={cls.mode || "onsite"}
                                    onChange={(e) => handleClassChange(index, 'mode', e.target.value)}
                                    className={`w-[90px] px-1 py-1.5 rounded-lg border text-xs font-bold text-center focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer ${
                                        cls.mode === 'online'
                                            ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                                            : 'border-orange-300 dark:border-orange-700 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400'
                                    }`}
                                >
                                    <option value="online">Online</option>
                                    <option value="onsite">On-Site</option>
                                </select>

                                <button onClick={() => handleDeleteClass(index)}
                                    className="p-1.5 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-500 hover:bg-red-100 transition-colors shrink-0">
                                    <Trash2 className="w-3 h-3" />
                                </button>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                )}
            </div>

            <button onClick={handleAddClass} disabled={isSaving}
                className="mt-4 w-full px-4 py-2.5 border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-xl text-xs font-bold text-gray-400 hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all flex items-center justify-center gap-2">
                <Plus className="w-4 h-4" /> Add New Class
            </button>
        </>
    );
};

const HolidaySection = ({ holidayDays, setHolidayDays, isLoading, isSaving, setIsSaving, syncedDay, setSyncedDay, sectionKey }) => {
    const toggleDay = async (dayIndex) => {
        setIsSaving(true);
        const updated = holidayDays.includes(dayIndex)
            ? holidayDays.filter(d => d !== dayIndex)
            : [...holidayDays, dayIndex];
        try {
            await attendanceAPI.updateGlobalHolidays(updated);
            setHolidayDays(updated);
            setSyncedDay(dayIndex);
            setTimeout(() => setSyncedDay(null), 1500);
        } catch { showToast.error("Error", "Failed to update."); }
        finally { setIsSaving(false); }
    };

    return (
        <>
            {isLoading ? (
                <div className="py-8 flex justify-center"><Loader /></div>
            ) : (
                <>
                    <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-4 sm:mb-5">
                        {DAY_NAMES.map((day, index) => {
                            const isOff = holidayDays.includes(index);
                            const isSyncing = syncedDay === index;
                            return (
                                <button key={day} onClick={() => toggleDay(index)} disabled={isSaving}
                                    className={`relative min-w-0 flex flex-col items-center justify-center py-3 sm:py-4 rounded-lg sm:rounded-2xl border sm:border-2 font-black text-center transition-all duration-300 active:scale-90 ${isOff
                                        ? "bg-slate-900 border-slate-900 text-white shadow-lg shadow-slate-900/20"
                                        : "bg-white dark:bg-gray-700 border-gray-100 dark:border-gray-600 text-gray-400 hover:border-primary/30 hover:text-primary hover:bg-primary/5"
                                    } ${isSaving ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
                                >
                                    {isOff ? (
                                        <Moon className="w-3.5 h-3.5 mb-1 text-blue-300 fill-blue-400/20" />
                                    ) : (
                                        <div className="w-1.5 h-1.5 rounded-full bg-gray-200 group-hover:bg-primary/40 mb-1" />
                                    )}
                                    <span className="text-[8px] sm:text-[10px] uppercase tracking-normal sm:tracking-wider">{day}</span>

                                    <AnimatePresence>
                                        {isSyncing && (
                                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                                                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center shadow-md">
                                                <Check className="w-3 h-3 text-white" strokeWidth={3} />
                                            </motion.div>
                                        )}
                                        {isOff && !isSyncing && (
                                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                                                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-white dark:bg-gray-800 rounded-full border-2 border-red-400 flex items-center justify-center shadow-sm">
                                                <X className="w-2.5 h-2.5 text-red-400" strokeWidth={3} />
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </button>
                            );
                        })}
                    </div>

                    <div className="bg-gradient-to-r from-slate-50 to-gray-50 dark:from-gray-700/40 dark:to-gray-700/20 rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-slate-100 dark:border-gray-700">
                        <div className="flex items-center gap-2 mb-3">
                            <Shield className="w-4 h-4 text-primary" />
                            <span className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-900 dark:text-white">System Protocols</span>
                        </div>
                        <ul className="space-y-2">
                            {[
                                "Selected days are bypassed during global attendance cycles.",
                                "No attendance records will be generated for bypassed days.",
                                "Statistical calculations exclude these intervals automatically."
                            ].map((txt, i) => (
                                <li key={i} className="flex items-start gap-2 text-[11px] text-gray-500 dark:text-gray-400">
                                    <div className="w-1 h-1 rounded-full bg-primary mt-1.5 shrink-0"></div>
                                    {txt}
                                </li>
                            ))}
                        </ul>
                    </div>
                </>
            )}
        </>
    );
};

const AttendanceSettings = () => {
    const [activeFilter, setActiveFilter] = useState("student");
    const [studentClasses, setStudentClasses] = useState([]);
    const [internClasses, setInternClasses] = useState([]);
    const [isSavingStudent, setIsSavingStudent] = useState(false);
    const [isSavingIntern, setIsSavingIntern] = useState(false);
    const [isLoadingStudent, setIsLoadingStudent] = useState(true);
    const [isLoadingIntern, setIsLoadingIntern] = useState(true);

    const [studentHolidays, setStudentHolidays] = useState([]);
    const [internHolidays, setInternHolidays] = useState([]);
    const [isLoadingStudentHolidays, setIsLoadingStudentHolidays] = useState(true);
    const [isLoadingInternHolidays, setIsLoadingInternHolidays] = useState(true);
    const [isSavingStudentHoliday, setIsSavingStudentHoliday] = useState(false);
    const [isSavingInternHoliday, setIsSavingInternHoliday] = useState(false);
    const [syncedStudentDay, setSyncedStudentDay] = useState(null);
    const [syncedInternDay, setSyncedInternDay] = useState(null);

    const [whatsappEnabled, setWhatsappEnabled] = useState(() => {
        return localStorage.getItem('attendance_whatsapp_enabled') !== 'false';
    });
    const [isSavingWA, setIsSavingWA] = useState(false);

    useEffect(() => {
        fetchStudentClasses();
        fetchInternClasses();
        fetchStudentHolidays();
        fetchInternHolidays();
        fetchWhatsAppSetting();
    }, []);

    const fetchStudentClasses = async () => {
        setIsLoadingStudent(true);
        try {
            const res = await settingsAPI.getAll();
            const saved = res.data.data?.[STUDENT_SLOTS_KEY];
            setStudentClasses(Array.isArray(saved) && saved.length > 0 && saved[0].startTime ? saved : [...DEFAULT_CLASSES]);
        } catch { setStudentClasses([...DEFAULT_CLASSES]); }
        finally { setIsLoadingStudent(false); }
    };

    const fetchInternClasses = async () => {
        setIsLoadingIntern(true);
        try {
            const res = await settingsAPI.getAll();
            const saved = res.data.data?.[INTERN_SLOTS_KEY];
            setInternClasses(Array.isArray(saved) && saved.length > 0 && saved[0].startTime ? saved : [...DEFAULT_CLASSES]);
        } catch { setInternClasses([...DEFAULT_CLASSES]); }
        finally { setIsLoadingIntern(false); }
    };

    const fetchStudentHolidays = async () => {
        try {
            const res = await attendanceAPI.getGlobalHolidays();
            setStudentHolidays(res.data.holidayDays || []);
        } catch { } finally { setIsLoadingStudentHolidays(false); }
    };

    const fetchInternHolidays = async () => {
        try {
            const res = await attendanceAPI.getGlobalHolidays();
            setInternHolidays(res.data.holidayDays || []);
        } catch { } finally { setIsLoadingInternHolidays(false); }
    };

    const fetchWhatsAppSetting = async () => {
        try {
            const res = await settingsAPI.getAll();
            const saved = res.data.data?.['whatsapp_attendance_enabled'];
            if (saved !== undefined) {
                const enabled = saved === true || saved === 'true';
                setWhatsappEnabled(enabled);
                localStorage.setItem('attendance_whatsapp_enabled', String(enabled));
            }
        } catch { }
    };

    const toggleWhatsApp = async () => {
        const next = !whatsappEnabled;
        setIsSavingWA(true);
        try {
            await settingsAPI.update('whatsapp_attendance_enabled', next);
            setWhatsappEnabled(next);
            localStorage.setItem('attendance_whatsapp_enabled', String(next));
            showToast.success("Saved!", `WhatsApp notifications ${next ? 'enabled' : 'disabled'}.`);
        } catch {
            showToast.error("Error", "Could not save setting.");
        } finally { setIsSavingWA(false); }
    };

    return (
        <div className="min-h-0 bg-gradient-to-br from-gray-50 via-white to-primary/5 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 p-0 sm:p-4 md:p-6">
            <div className="w-full">
                <ViewAsBar />

                <div className="mb-4 sm:mb-6">
                    <h1 className="text-xl sm:text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Time Table</h1>
                    <p className="text-xs sm:text-sm text-gray-400 mt-1">Manage class schedules and weekly off days.</p>
                </div>

                {/* ── WhatsApp Notifications ── */}
                <div className="mb-3 sm:mb-5">
                    <SectionCard icon={MessageSquare} accent="bg-green-50 text-green-600" label="Notifications" sublabel="WhatsApp Alerts">
                        <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                                <p className="text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-200">Time Table WhatsApp Message</p>
                                <p className="text-[10px] sm:text-[11px] text-gray-400 mt-1">Jab teacher attendance lagaye toh guardian ko WhatsApp par report bhejega.</p>
                            </div>
                            <button
                                onClick={toggleWhatsApp}
                                disabled={isSavingWA}
                                className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors duration-300 focus:outline-none disabled:opacity-50 ${whatsappEnabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                            >
                                <span className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-lg transition-transform duration-300 ${whatsappEnabled ? 'translate-x-7' : 'translate-x-1'}`} />
                            </button>
                        </div>
                        <div className={`mt-3 sm:mt-4 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border text-[10px] sm:text-[11px] font-bold flex items-center gap-2 ${whatsappEnabled
                            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400'
                            : 'bg-gray-50 dark:bg-gray-700/40 border-gray-200 dark:border-gray-600 text-gray-400'
                            }`}>
                            <div className={`w-2 h-2 rounded-full ${whatsappEnabled ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
                            {whatsappEnabled ? 'Active — Guardian ko WhatsApp jayega' : 'Inactive — WhatsApp disabled hai'}
                        </div>
                    </SectionCard>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 sm:gap-5 items-start">

                    {/* ── Filter Tabs ── */}
                    <div className="xl:col-span-2 flex gap-1.5 p-1 bg-gray-100 dark:bg-gray-700/50 rounded-xl mb-2">
                        <button
                            onClick={() => setActiveFilter("student")}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-xs font-black uppercase tracking-wider transition-all duration-200 ${
                                activeFilter === "student"
                                    ? "bg-white dark:bg-gray-800 text-primary shadow-sm"
                                    : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            }`}
                        >
                            <Clock className="w-4 h-4" />
                            Student
                        </button>
                        <button
                            onClick={() => setActiveFilter("intern")}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-xs font-black uppercase tracking-wider transition-all duration-200 ${
                                activeFilter === "intern"
                                    ? "bg-white dark:bg-gray-800 text-blue-600 shadow-sm"
                                    : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            }`}
                        >
                            <Users className="w-4 h-4" />
                            Internship
                        </button>
                    </div>

                    {/* ── Student ── */}
                    {activeFilter === "student" && (
                        <>
                            <SectionCard icon={Clock} accent="bg-primary/10 text-primary" label="Student" sublabel="Class Time Slots">
                                <ClassTimeSection
                                    classes={studentClasses}
                                    setClasses={setStudentClasses}
                                    isLoading={isLoadingStudent}
                                    isSaving={isSavingStudent}
                                    setIsSaving={setIsSavingStudent}
                                    sectionKey={STUDENT_SLOTS_KEY}
                                />
                            </SectionCard>

                            <SectionCard icon={Calendar} accent="bg-indigo-50 text-indigo-500" label="Student" sublabel="Weekly Off Days">
                                <HolidaySection
                                    holidayDays={studentHolidays}
                                    setHolidayDays={setStudentHolidays}
                                    isLoading={isLoadingStudentHolidays}
                                    isSaving={isSavingStudentHoliday}
                                    setIsSaving={setIsSavingStudentHoliday}
                                    syncedDay={syncedStudentDay}
                                    setSyncedDay={setSyncedStudentDay}
                                    sectionKey={STUDENT_HOLIDAYS_KEY}
                                />
                            </SectionCard>
                        </>
                    )}

                    {/* ── Internship ── */}
                    {activeFilter === "intern" && (
                        <>
                            <SectionCard icon={Users} accent="bg-blue-50 text-blue-600" label="Internship" sublabel="Class Time Slots">
                                <ClassTimeSection
                                    classes={internClasses}
                                    setClasses={setInternClasses}
                                    isLoading={isLoadingIntern}
                                    isSaving={isSavingIntern}
                                    setIsSaving={setIsSavingIntern}
                                    sectionKey={INTERN_SLOTS_KEY}
                                />
                            </SectionCard>

                            <SectionCard icon={Calendar} accent="bg-purple-50 text-purple-500" label="Internship" sublabel="Weekly Off Days">
                                <HolidaySection
                                    holidayDays={internHolidays}
                                    setHolidayDays={setInternHolidays}
                                    isLoading={isLoadingInternHolidays}
                                    isSaving={isSavingInternHoliday}
                                    setIsSaving={setIsSavingInternHoliday}
                                    syncedDay={syncedInternDay}
                                    setSyncedDay={setSyncedInternDay}
                                    sectionKey={INTERN_HOLIDAYS_KEY}
                                />
                            </SectionCard>
                        </>
                    )}

                </div>
            </div>
        </div>
    );
};

export default AttendanceSettings;
