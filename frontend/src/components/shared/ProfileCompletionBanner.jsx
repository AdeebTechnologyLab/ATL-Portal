import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { UserCheck, X, ArrowRight, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const DISMISS_KEY = 'profile_completion_dismissed';
const DISMISS_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

const FIELD_LABELS = {
    phone: 'Phone Number',
    city: 'City',
    address: 'Address',
    cnic: 'CNIC',
    fatherName: "Father's Name",
    dob: 'Date of Birth',
    gender: 'Gender',
    education: 'Education',
    degree: 'Degree',
    university: 'University',
    department: 'Department',
    qualification: 'Qualification',
    specialization: 'Specialization',
    skills: 'Skills',
    experience: 'Experience',
    photo: 'Profile Photo',
    attendType: 'Attendance Type (Physical/Online)',
};

const ROLE_FIELDS = {
    student: ['phone', 'city', 'address', 'cnic', 'fatherName', 'dob', 'gender', 'photo'],
    intern: ['phone', 'city', 'address', 'cnic', 'fatherName', 'dob', 'gender', 'photo', 'degree', 'university'],
    teacher: ['phone', 'city', 'address', 'qualification', 'specialization', 'photo'],
    job: ['phone', 'city', 'address', 'skills', 'experience', 'photo'],
};

const ProfileCompletionBanner = () => {
    const { user, role } = useSelector((state) => state.auth);
    const navigate = useNavigate();
    const { isDark } = useTheme();
    const [isDismissed, setIsDismissed] = useState(false);
    const [missingFields, setMissingFields] = useState([]);

    useEffect(() => {
        if (!user || role === 'admin') return;

        // Check if dismissed recently
        const dismissedAt = localStorage.getItem(DISMISS_KEY);
        if (dismissedAt && Date.now() - Number(dismissedAt) < DISMISS_DURATION) {
            setIsDismissed(true);
            return;
        }

        // Find missing fields for this role
        const fields = ROLE_FIELDS[role] || ROLE_FIELDS.student;
        const missing = fields.filter((field) => {
            const val = user[field];
            if (val === undefined || val === null || val === '') return true;
            if (field === 'photo' && val === null) return true;
            return false;
        });

        setMissingFields(missing);
    }, [user, role]);

    const handleDismiss = () => {
        localStorage.setItem(DISMISS_KEY, String(Date.now()));
        setIsDismissed(true);
    };

    const handleComplete = () => {
        const profileRoutes = {
            student: '/student/profile',
            intern: '/intern/profile',
            teacher: '/teacher/profile',
            job: '/job/profile',
        };
        navigate(profileRoutes[role] || '/student/profile');
    };

    if (!user || role === 'admin' || isDismissed || missingFields.length === 0) return null;

    const completionPct = Math.round(
        ((ROLE_FIELDS[role]?.length || 8) - missingFields.length) / (ROLE_FIELDS[role]?.length || 8) * 100
    );

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: -12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -12, scale: 0.98 }}
                className={`relative mb-4 rounded-2xl border overflow-hidden ${
                    isDark
                        ? 'bg-amber-950/30 border-amber-500/20'
                        : 'bg-gradient-to-r from-amber-50 via-orange-50 to-yellow-50 border-amber-200'
                }`}
            >
                {/* Animated shimmer */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <motion.div
                        animate={{ x: ['-10%', '110%'] }}
                        transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                        className="absolute top-0 w-32 h-full bg-amber-400/10 blur-2xl"
                    />
                </div>

                <div className="relative flex items-start gap-3 p-4 sm:p-5">
                    {/* Icon */}
                    <div className={`shrink-0 p-2.5 rounded-xl ${
                        isDark ? 'bg-amber-500/15' : 'bg-amber-100'
                    }`}>
                        <AlertTriangle className="w-5 h-5 text-amber-500" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className={`text-sm font-bold ${isDark ? 'text-amber-200' : 'text-amber-800'}`}>
                                Complete Your Profile
                            </h3>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                isDark ? 'bg-amber-500/20 text-amber-300' : 'bg-amber-200 text-amber-700'
                            }`}>
                                {missingFields.length} {missingFields.length === 1 ? 'field' : 'fields'} missing
                            </span>
                        </div>

                        <p className={`text-xs mb-2 ${isDark ? 'text-amber-200/70' : 'text-amber-700/80'}`}>
                            Aap ka profile mukammal nahi hai. Yeh fields fill karna zaroori hain:
                        </p>

                        {/* Missing fields chips */}
                        <div className="flex flex-wrap gap-1.5 mb-3">
                            {missingFields.map((field) => (
                                <span
                                    key={field}
                                    className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-lg ${
                                        isDark
                                            ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                                            : 'bg-amber-100 text-amber-700 border border-amber-200'
                                    }`}
                                >
                                    <span className="w-1 h-1 rounded-full bg-amber-400" />
                                    {FIELD_LABELS[field] || field}
                                </span>
                            ))}
                        </div>

                        {/* Progress bar */}
                        <div className="flex items-center gap-3">
                            <div className={`flex-1 h-1.5 rounded-full overflow-hidden ${
                                isDark ? 'bg-amber-500/10' : 'bg-amber-200/50'
                            }`}>
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${completionPct}%` }}
                                    transition={{ duration: 1, delay: 0.3 }}
                                    className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-400"
                                />
                            </div>
                            <span className={`text-[11px] font-bold ${isDark ? 'text-amber-300' : 'text-amber-600'}`}>
                                {completionPct}%
                            </span>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2 shrink-0">
                        <button
                            onClick={handleComplete}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all active:scale-95 shadow-md shadow-amber-500/20"
                        >
                            Fill Now
                            <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                        <button
                            onClick={handleDismiss}
                            className={`text-[10px] font-medium px-2 py-1 rounded-lg transition-colors ${
                                isDark
                                    ? 'text-amber-300/60 hover:text-amber-200 hover:bg-amber-500/10'
                                    : 'text-amber-600/60 hover:text-amber-700 hover:bg-amber-100'
                            }`}
                        >
                            Dismiss (7 days)
                        </button>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

export default ProfileCompletionBanner;
