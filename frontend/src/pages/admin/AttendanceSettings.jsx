import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Plus, Trash2, Edit2, X, Check, Calendar, Moon, Sun, Shield, Zap, Settings2, CheckCircle2, MessageSquare } from "lucide-react";
import { settingsAPI, attendanceAPI } from "../../services/api";
import { showToast } from "../../utils/customToast";
import Loader from "../../components/ui/Loader";

const CLASS_TIME_KEY = "class_time_slots";
const DEFAULT_SLOTS = ["Class 1 11AM", "Class 2 3PM", "Class 3 5PM", "Class 3 9PM"];
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const SectionCard = ({ icon: Icon, accent, label, sublabel, children }) => (
    <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden"
    >
        {/* Card Header */}
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

const AttendanceSettings = () => {
    const [slots, setSlots] = useState([]);
    const [newSlot, setNewSlot] = useState("");
    const [editingIndex, setEditingIndex] = useState(null);
    const [editingValue, setEditingValue] = useState("");
    const [isSavingSlots, setIsSavingSlots] = useState(false);
    const [isLoadingSlots, setIsLoadingSlots] = useState(true);

    const [holidayDays, setHolidayDays] = useState([]);
    const [isLoadingHolidays, setIsLoadingHolidays] = useState(true);
    const [isSavingHoliday, setIsSavingHoliday] = useState(false);
    const [syncedDay, setSyncedDay] = useState(null);

    const [whatsappEnabled, setWhatsappEnabled] = useState(() => {
        return localStorage.getItem('attendance_whatsapp_enabled') !== 'false';
    });
    const [isSavingWA, setIsSavingWA] = useState(false);

    useEffect(() => {
        fetchSlots();
        fetchHolidays();
        fetchWhatsAppSetting();
    }, []);

    const fetchSlots = async () => {
        setIsLoadingSlots(true);
        try {
            const res = await settingsAPI.getAll();
            const saved = res.data.data?.[CLASS_TIME_KEY];
            setSlots(Array.isArray(saved) && saved.length > 0 ? saved : DEFAULT_SLOTS);
        } catch { setSlots(DEFAULT_SLOTS); }
        finally { setIsLoadingSlots(false); }
    };

    const saveSlots = async (updatedSlots) => {
        setIsSavingSlots(true);
        try {
            await settingsAPI.update(CLASS_TIME_KEY, updatedSlots);
            showToast.success("Saved!", "Class time slots updated.");
        } catch { showToast.error("Error", "Could not save slots."); }
        finally { setIsSavingSlots(false); }
    };

    const handleAdd = async () => {
        const trimmed = newSlot.trim();
        if (!trimmed || slots.includes(trimmed)) return;
        const updated = [...slots, trimmed];
        setSlots(updated); setNewSlot(""); await saveSlots(updated);
    };

    const handleDelete = async (i) => {
        const u = slots.filter((_, idx) => idx !== i);
        setSlots(u); await saveSlots(u);
    };

    const handleEditSave = async (i) => {
        const trimmed = editingValue.trim();
        if (!trimmed) return;
        const u = slots.map((s, idx) => idx === i ? trimmed : s);
        setSlots(u); setEditingIndex(null); setEditingValue(""); await saveSlots(u);
    };

    const fetchHolidays = async () => {
        try {
            const res = await attendanceAPI.getGlobalHolidays();
            setHolidayDays(res.data.holidayDays || []);
        } catch { } finally { setIsLoadingHolidays(false); }
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
        } finally {
            setIsSavingWA(false);
        }
    };

    const toggleDay = async (dayIndex) => {
        setIsSavingHoliday(true);
        const updated = holidayDays.includes(dayIndex)
            ? holidayDays.filter(d => d !== dayIndex)
            : [...holidayDays, dayIndex];
        try {
            await attendanceAPI.updateGlobalHolidays(updated);
            setHolidayDays(updated);
            setSyncedDay(dayIndex);
            setTimeout(() => setSyncedDay(null), 1500);
        } catch { showToast.error("Error", "Failed to update."); }
        finally { setIsSavingHoliday(false); }
    };

    return (
        <div className="min-h-0 bg-gradient-to-br from-gray-50 via-white to-primary/5 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 p-0 sm:p-4 md:p-6">
            <div className="w-full">

                <div className="mb-4 sm:mb-6">
                    <h1 className="text-xl sm:text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Attendance Settings</h1>
                    <p className="text-xs sm:text-sm text-gray-400 mt-1">Manage class schedules and weekly off days.</p>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 sm:gap-5 items-start">

                    {/* ── WhatsApp Notifications ── */}
                    <SectionCard icon={MessageSquare} accent="bg-green-50 text-green-600" label="Notifications" sublabel="WhatsApp Alerts">
                        <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                                <p className="text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-200">Attendance WhatsApp Message</p>
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

                    {/* ── Class Times ── */}
                    <SectionCard icon={Clock} accent="bg-primary/10 text-primary" label="Schedule" sublabel="Class Time Slots">
                        {/* Add Row */}
                        <div className="flex gap-2 mb-4 sm:mb-5">
                            <input
                                type="text" value={newSlot}
                                onChange={(e) => setNewSlot(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                                placeholder="e.g. Class 4 7PM"
                                className="min-w-0 flex-1 px-3 sm:px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 text-xs sm:text-sm font-bold text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:font-normal placeholder:text-gray-400"
                            />
                            <button onClick={handleAdd} disabled={!newSlot.trim() || isSavingSlots}
                                className="px-3 sm:px-5 py-2.5 bg-primary text-white rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5 sm:gap-2 hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-40 shadow-sm shadow-primary/20">
                                <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Add</span>
                            </button>
                        </div>

                        {/* Slot List */}
                        <div className="rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                            <div className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-700/40 border-b border-gray-100 dark:border-gray-700">
                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.25em]">
                                    {slots.length} Slot{slots.length !== 1 ? "s" : ""}
                                </span>
                                {isSavingSlots && (
                                    <span className="flex items-center gap-1 text-[9px] font-black text-primary animate-pulse">
                                        <Zap className="w-3 h-3" /> Saving...
                                    </span>
                                )}
                            </div>

                            {isLoadingSlots ? (
                                <div className="py-10 flex justify-center"><Loader /></div>
                            ) : slots.length === 0 ? (
                                <div className="py-10 text-center text-gray-400">
                                    <Clock className="w-7 h-7 mx-auto mb-2 opacity-30" />
                                    <p className="text-xs font-bold">No slots yet. Add one above.</p>
                                </div>
                            ) : (
                                <AnimatePresence>
                                    {slots.map((slot, index) => (
                                        <motion.div key={slot + index}
                                            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                                            className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 group transition-colors border-b border-gray-50 dark:border-gray-700 last:border-0 ${editingIndex === index ? "bg-primary/5" : "hover:bg-gray-50 dark:hover:bg-gray-700/20"}`}
                                        >
                                            <div className="w-7 h-7 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                                                <span className="text-[9px] font-black text-primary">{index + 1}</span>
                                            </div>

                                            {editingIndex === index ? (
                                                <input autoFocus type="text" value={editingValue}
                                                    onChange={(e) => setEditingValue(e.target.value)}
                                                    onKeyDown={(e) => { if (e.key === "Enter") handleEditSave(index); if (e.key === "Escape") { setEditingIndex(null); setEditingValue(""); } }}
                                                    className="flex-1 px-3 py-1.5 rounded-lg border border-primary/40 bg-white dark:bg-gray-700 text-sm font-bold text-gray-800 dark:text-gray-100 focus:outline-none"
                                                />
                                            ) : (
                                                <span className="flex-1 text-sm font-bold text-gray-700 dark:text-gray-200">{slot}</span>
                                            )}

                                            <div className={`flex items-center gap-1 transition-opacity ${editingIndex === index ? "opacity-100" : "opacity-100 sm:opacity-0 sm:group-hover:opacity-100"}`}>
                                                {editingIndex === index ? (
                                                    <>
                                                        <button onClick={() => handleEditSave(index)} className="p-1.5 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"><Check className="w-3 h-3" /></button>
                                                        <button onClick={() => { setEditingIndex(null); setEditingValue(""); }} className="p-1.5 rounded-lg bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-300 transition-colors"><X className="w-3 h-3" /></button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button onClick={() => { setEditingIndex(index); setEditingValue(slot); }} className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-500 hover:bg-blue-100 transition-colors"><Edit2 className="w-3 h-3" /></button>
                                                        <button onClick={() => handleDelete(index)} className="p-1.5 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-500 hover:bg-red-100 transition-colors"><Trash2 className="w-3 h-3" /></button>
                                                    </>
                                                )}
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            )}
                        </div>
                    </SectionCard>

                    {/* ── Weekly Off Days ── */}
                    <SectionCard icon={Calendar} accent="bg-indigo-50 text-indigo-500" label="Administrative Logic" sublabel="Weekly Off Days">
                        {isLoadingHolidays ? (
                            <div className="py-8 flex justify-center"><Loader /></div>
                        ) : (
                            <>
                                <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-4 sm:mb-5">
                                    {DAY_NAMES.map((day, index) => {
                                        const isOff = holidayDays.includes(index);
                                        const isSyncing = syncedDay === index;
                                        return (
                                            <button key={day} onClick={() => toggleDay(index)} disabled={isSavingHoliday}
                                                className={`relative min-w-0 flex flex-col items-center justify-center py-3 sm:py-4 rounded-lg sm:rounded-2xl border sm:border-2 font-black text-center transition-all duration-300 active:scale-90 ${isOff
                                                    ? "bg-slate-900 border-slate-900 text-white shadow-lg shadow-slate-900/20"
                                                    : "bg-white dark:bg-gray-700 border-gray-100 dark:border-gray-600 text-gray-400 hover:border-primary/30 hover:text-primary hover:bg-primary/5"
                                                } ${isSavingHoliday ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
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

                                {/* Info */}
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
                    </SectionCard>

                </div>
            </div>
        </div>
    );
};

export default AttendanceSettings;
