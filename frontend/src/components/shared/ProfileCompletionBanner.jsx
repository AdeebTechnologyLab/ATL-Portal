import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, AlertTriangle } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

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
    requirements: 'Requirements',
    resumeUrl: 'Resume Link',
    experience: 'Experience',
    photo: 'Profile Photo',
    attendType: 'Attendance Type (On-Site/Online)',
};

const ROLE_FIELDS = {
    student: ['phone', 'city', 'address', 'cnic', 'fatherName', 'dob', 'gender', 'photo'],
    intern: ['phone', 'city', 'address', 'cnic', 'fatherName', 'dob', 'gender', 'photo', 'degree', 'university', 'education', 'guardianPhone', 'resumeUrl', 'requirements', 'skills'],
    teacher: ['phone', 'city', 'address', 'qualification', 'specialization', 'photo'],
    job: ['phone', 'city', 'address', 'skills', 'experience', 'photo'],
};

const ProfileCompletionBanner = () => {
    const { user, role } = useSelector((state) => state.auth);
    const navigate = useNavigate();
    const location = useLocation();
    const { isDark } = useTheme();

    const onDashboard = location.pathname.replace(/\/+$/, '').endsWith('/dashboard');

    const missingFields = useMemo(() => {
        if (!user || role === 'admin') return [];

        const fields = ROLE_FIELDS[role] || ROLE_FIELDS.student;
        return fields.filter((field) => {
            const val = user[field];
            if (val === undefined || val === null) return true;
            if (Array.isArray(val)) return val.length === 0;
            if (typeof val === 'string') return val.trim() === '';
            return false;
        });
    }, [user, role]);

    const handleComplete = () => {
        const profileRoutes = {
            student: '/student/profile',
            intern: '/intern/profile',
            teacher: '/teacher/profile',
            job: '/job/profile',
        };
        navigate(profileRoutes[role] || '/student/profile');
    };

    if (!user || role === 'admin' || !onDashboard || missingFields.length === 0) return null;

    const completionPct = Math.round(
        ((ROLE_FIELDS[role]?.length || 8) - missingFields.length) / (ROLE_FIELDS[role]?.length || 8) * 100
    );

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: -12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -12, scale: 0.98 }}
                className={`relative rounded-2xl border overflow-hidden ${
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

                <div className="relative p-3 sm:p-3.5 space-y-2.5">
                    {/* Header */}
                    <div className="flex items-center gap-2.5">
                        <div className={`shrink-0 w-8 h-8 rounded-xl flex items-center justify-center ${
                            isDark ? 'bg-amber-500/15' : 'bg-amber-100'
                        }`}>
                            <AlertTriangle className="w-4 h-4 text-amber-500" />
                        </div>
                        <h3 className={`text-[13px] font-black ${isDark ? 'text-amber-200' : 'text-amber-800'}`}>
                            Complete Your Profile
                        </h3>
                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider ${
                            isDark ? 'bg-amber-500/20 text-amber-300' : 'bg-amber-200 text-amber-700'
                        }`}>
                            {missingFields.length} missing
                        </span>
                    </div>

                    {/* Progress bar */}
                    <div className="flex items-center gap-2">
                        <div className={`flex-1 h-1.5 rounded-full overflow-hidden ${
                            isDark ? 'bg-amber-500/10' : 'bg-amber-200/60'
                        }`}>
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${completionPct}%` }}
                                transition={{ duration: 1, delay: 0.2 }}
                                className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500"
                            />
                        </div>
                        <span className={`text-[10px] font-black ${isDark ? 'text-amber-300' : 'text-amber-600'}`}>
                            {completionPct}%
                        </span>
                    </div>

                    <div className="flex items-start gap-3">
                        {/* Missing fields (left) */}
                        <div className="flex-1 min-w-0 flex flex-wrap gap-1.5">
                            {missingFields.map((field) => (
                                <span
                                    key={field}
                                    className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2 py-1 rounded-lg border ${
                                        isDark ? 'bg-amber-500/5 text-amber-200 border-amber-500/15' : 'bg-white/70 text-amber-800 border-amber-200'
                                    }`}
                                >
                                    <span className="w-1 h-1 rounded-full bg-amber-400 shrink-0" />
                                    {FIELD_LABELS[field] || field}
                                </span>
                            ))}
                        </div>

                        {/* Single action (right) */}
                        <button
                            onClick={handleComplete}
                            className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[11px] font-black rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all active:scale-95 shadow-md shadow-amber-500/25"
                        >
                            Fill Now
                            <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

export default ProfileCompletionBanner;
