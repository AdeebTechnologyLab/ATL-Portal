import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, UserPlus, Check, Loader2 } from 'lucide-react';
import { userAPI, teacherScreenAssignmentAPI } from '../../services/api';
import toast from 'react-hot-toast';

const AssignScreenModal = ({ isOpen, onClose, screenId, screenName }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [teachers, setTeachers] = useState([]);
    const [searching, setSearching] = useState(false);
    const [assignedTeachers, setAssignedTeachers] = useState([]);
    const [selectedIds, setSelectedIds] = useState([]);
    const [loadingAssigned, setLoadingAssigned] = useState(false);
    const [assigning, setAssigning] = useState(false);
    const timerRef = useRef(null);

    useEffect(() => {
        if (isOpen && screenId) {
            fetchAssigned();
            setSearchQuery('');
            setTeachers([]);
            setSelectedIds([]);
        }
    }, [isOpen, screenId]);

    const fetchAssigned = async () => {
        setLoadingAssigned(true);
        try {
            const res = await teacherScreenAssignmentAPI.getScreenTeachers(screenId);
            setAssignedTeachers(res.data.data || []);
        } catch {
            setAssignedTeachers([]);
        } finally {
            setLoadingAssigned(false);
        }
    };

    const searchTeachers = useCallback((query) => {
        setSearchQuery(query);
        if (timerRef.current) clearTimeout(timerRef.current);
        if (!query.trim()) { setTeachers([]); return; }
        timerRef.current = setTimeout(async () => {
            setSearching(true);
            try {
                const res = await userAPI.search(query.trim(), 'teacher');
                const assignedIds = assignedTeachers.map(a => a.teacher?._id || a.teacher);
                const results = (res.data.data || []).filter(t => !assignedIds.includes(t._id));
                setTeachers(results);
            } catch {
                setTeachers([]);
            } finally {
                setSearching(false);
            }
        }, 300);
    }, [assignedTeachers]);

    const toggleSelect = (teacherId) => {
        setSelectedIds(prev => prev.includes(teacherId) ? prev.filter(id => id !== teacherId) : [...prev, teacherId]);
    };

    const handleAssign = async () => {
        if (selectedIds.length === 0) return;
        setAssigning(true);
        try {
            await teacherScreenAssignmentAPI.assign(screenId, selectedIds);
            toast.success(`Screen assigned to ${selectedIds.length} teacher(s)`);
            setSelectedIds([]);
            setSearchQuery('');
            setTeachers([]);
            fetchAssigned();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to assign screen');
        } finally {
            setAssigning(false);
        }
    };

    const handleRemove = async (teacherId) => {
        try {
            await teacherScreenAssignmentAPI.remove(screenId, teacherId);
            toast.success('Access removed');
            fetchAssigned();
        } catch (error) {
            toast.error('Failed to remove access');
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full max-w-lg max-h-[85vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-slate-700">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                <UserPlus className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <h2 className="text-lg font-black text-gray-900 dark:text-white">Assign to Teacher</h2>
                                <p className="text-xs text-gray-500">Screen: <span className="font-bold text-primary">{screenName}</span></p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl transition-colors">
                            <X className="w-5 h-5 text-gray-500" />
                        </button>
                    </div>

                    {/* Search */}
                    <div className="p-4 border-b border-gray-100 dark:border-slate-700">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search teacher by name, roll no, email..."
                                value={searchQuery}
                                onChange={(e) => searchTeachers(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none"
                                autoFocus
                            />
                            {searching && (
                                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary animate-spin" />
                            )}
                        </div>

                        {/* Search Results */}
                        {teachers.length > 0 && (
                            <div className="mt-2 max-h-40 overflow-y-auto border border-gray-100 dark:border-slate-700 rounded-xl">
                                {teachers.map((teacher) => (
                                    <button
                                        key={teacher._id}
                                        onClick={() => toggleSelect(teacher._id)}
                                        className={`w-full flex items-center gap-3 p-3 transition-colors text-left border-b border-gray-50 dark:border-slate-700 last:border-0 ${
                                            selectedIds.includes(teacher._id) ? 'bg-primary/5' : 'hover:bg-gray-50 dark:hover:bg-slate-800'
                                        }`}
                                    >
                                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                                            selectedIds.includes(teacher._id) ? 'bg-primary border-primary' : 'border-gray-300 dark:border-slate-600'
                                        }`}>
                                            {selectedIds.includes(teacher._id) && <Check className="w-3 h-3 text-white" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-gray-900 dark:text-white text-sm truncate">{teacher.name}</p>
                                            <p className="text-[10px] text-gray-500 truncate">{teacher.email} {teacher.rollNo ? `• ${teacher.rollNo}` : ''}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Selected */}
                    {selectedIds.length > 0 && (
                        <div className="px-4 py-3 bg-primary/5 border-b border-gray-100 dark:border-slate-700">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-primary">{selectedIds.length} teacher(s) selected</span>
                                <button
                                    onClick={handleAssign}
                                    disabled={assigning}
                                    className="px-4 py-2 bg-primary text-white rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-50"
                                >
                                    {assigning ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserPlus className="w-3 h-3" />}
                                    Assign Screen
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Assigned Teachers */}
                    <div className="flex-1 overflow-y-auto p-4">
                        <p className="text-xs font-black uppercase tracking-widest text-gray-500 dark:text-slate-400 mb-3">
                            Assigned Teachers ({assignedTeachers.length})
                        </p>
                        {loadingAssigned ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="w-6 h-6 text-primary animate-spin" />
                            </div>
                        ) : assignedTeachers.length === 0 ? (
                            <p className="text-sm text-gray-400 text-center py-8">No teachers assigned yet</p>
                        ) : (
                            <div className="space-y-2">
                                {assignedTeachers.map((assignment) => {
                                    const teacher = assignment.teacher;
                                    return (
                                        <div key={assignment._id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-800 rounded-xl">
                                            {teacher?.photo ? (
                                                <img src={teacher.photo} alt={teacher.name} className="w-9 h-9 rounded-lg object-cover" />
                                            ) : (
                                                <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-700 dark:text-amber-400 font-bold text-sm">
                                                    {teacher?.name?.charAt(0)}
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-gray-900 dark:text-white text-sm">{teacher?.name}</p>
                                                <p className="text-[10px] text-gray-500">{teacher?.email} {teacher?.rollNo ? `• ${teacher.rollNo}` : ''}</p>
                                            </div>
                                            <button
                                                onClick={() => handleRemove(teacher?._id)}
                                                className="px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-[10px] font-bold hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default AssignScreenModal;
