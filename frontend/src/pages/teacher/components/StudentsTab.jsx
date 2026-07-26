import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, PauseCircle, UserCheck, RefreshCw } from 'lucide-react';
import { enrollmentAPI } from '../../../services/api';
import Loader from '../../../components/ui/Loader';
import { formatDate } from '../../../utils/dateFormatter';

const StudentsTab = ({ course }) => {
    const [enrollments, setEnrollments] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchEnrollments();
    }, [course]);

    const fetchEnrollments = async () => {
        setIsLoading(true);
        try {
            const res = await enrollmentAPI.getAll();
            const all = res.data.data || [];
            const courseId = String(course.id || course._id);
            const courseEnrollments = all.filter(e => {
                const eCourseId = String(e.course?._id || e.course);
                return eCourseId === courseId && (e.status === 'enrolled' || e.isPaused);
            });
            setEnrollments(courseEnrollments);
        } catch (err) {
            console.error('Error loading enrollments:', err);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading && enrollments.length === 0) {
        return <Loader message="Loading students..." />;
    }

    const pausedCount = enrollments.filter(e => e.isPaused).length;
    const activeCount = enrollments.length - pausedCount;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-black text-gray-900 uppercase italic">Student Directory</h3>
                <button 
                    onClick={fetchEnrollments}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-5 py-2.5 bg-primary/5 text-primary rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50"
                >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                    Refresh Students
                </button>
            </div>

            {/* Premium Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-primary/5 rounded-3xl p-6 border border-primary/10 text-center shadow-sm hover:shadow-md transition-all">
                    <p className="text-2xl sm:text-3xl font-black text-primary">{enrollments.length}</p>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Total Students</p>
                </div>
                <div className="bg-green-50 dark:bg-green-500/10 rounded-3xl p-6 border border-green-100 dark:border-green-500/20 text-center shadow-sm hover:shadow-md transition-all">
                    <p className="text-2xl sm:text-3xl font-black text-green-600 dark:text-green-400">{activeCount}</p>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Active Status</p>
                </div>
                <div className="bg-amber-50 dark:bg-amber-500/10 rounded-3xl p-6 border border-amber-100 dark:border-amber-500/20 text-center shadow-sm hover:shadow-md transition-all">
                    <p className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400">{pausedCount}</p>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Paused Seats</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-100 dark:border-gray-700 text-center shadow-sm hover:shadow-md transition-all">
                    <p className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-gray-100">{enrollments.length > 0 ? '100%' : '0%'}</p>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Integrity Rate</p>
                </div>
            </div>

            {enrollments.length === 0 ? (
                <div className="text-center py-16">
                    <Users className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-400 font-medium">No enrolled students found.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {enrollments.map((enrollment, index) => {
                        const student = enrollment.user || {};
                        const isPaused = enrollment.isPaused;

                        return (
                            <motion.div
                                key={enrollment._id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.04 }}
                                className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${isPaused
                                    ? 'bg-amber-50 border-amber-200'
                                    : 'bg-gray-50 border-gray-100'
                                    }`}
                            >
                                {/* Avatar */}
                                <div className={`w-11 h-11 rounded-xl overflow-hidden flex-shrink-0 border-2 ${isPaused ? 'border-amber-300 opacity-60' : 'border-white shadow'}`}>
                                    {student.photo ? (
                                        <img src={student.photo} alt={student.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full bg-gradient-to-br from-primary to-blue-500 flex items-center justify-center text-white font-bold text-sm">
                                            {(student.name || 'S').charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <p className={`font-bold text-sm truncate ${isPaused ? 'text-amber-800' : 'text-gray-900'}`}>
                                            {student.name || 'Unknown Student'}
                                        </p>
                                        {isPaused && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-200 text-amber-800 text-[10px] font-black uppercase rounded-full tracking-wider">
                                                <PauseCircle className="w-2.5 h-2.5" />
                                                Paused
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-400 font-medium">
                                        {student.rollNo || '—'} &bull; {student.email || '—'}
                                    </p>
                                    {isPaused && enrollment.pausedAt && (
                                        <p className="text-[10px] text-amber-600 font-medium mt-0.5">
                                            Paused on {formatDate(enrollment.pausedAt)}
                                        </p>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default StudentsTab;



