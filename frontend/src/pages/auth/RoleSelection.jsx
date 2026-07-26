import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    GraduationCap, BookOpen, Briefcase, Users, ArrowLeft
} from 'lucide-react';
import GuestChatWidget from '../../components/shared/GuestChatWidget';

const RoleSelection = () => {
    const roles = [
        {
            id: 'student',
            title: 'Join as Student',
            description: 'Enroll in computer courses and start your learning journey',
            icon: BookOpen,
            path: '/register/student',
            tag: 'Learn',
            borderLeft: 'border-l-blue-500',
            iconBg: 'bg-blue-500/15',
            iconColor: 'text-blue-400',
            tagBg: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
            hoverBg: 'hover:bg-blue-500/5',
            hoverShadow: 'hover:shadow-blue-500/5'
        },
        {
            id: 'intern',
            title: 'Join as Intern',
            description: 'Apply for internships and gain hands-on experience',
            icon: Users,
            path: '/register/internship',
            tag: 'Build',
            borderLeft: 'border-l-emerald-500',
            iconBg: 'bg-emerald-500/15',
            iconColor: 'text-emerald-400',
            tagBg: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
            hoverBg: 'hover:bg-emerald-500/5',
            hoverShadow: 'hover:shadow-emerald-500/5'
        },
        {
            id: 'job',
            title: 'Apply for a Job',
            description: 'Looking for teaching or staff positions? Apply here',
            icon: Briefcase,
            path: '/register/job',
            tag: 'Work',
            borderLeft: 'border-l-amber-500',
            iconBg: 'bg-amber-500/15',
            iconColor: 'text-amber-400',
            tagBg: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
            hoverBg: 'hover:bg-amber-500/5',
            hoverShadow: 'hover:shadow-amber-500/5'
        },
        {
            id: 'teacher',
            title: 'Join as Teacher',
            description: 'Register to teach and share your knowledge',
            icon: GraduationCap,
            path: '/register/teacher',
            tag: 'Teach',
            borderLeft: 'border-l-purple-500',
            iconBg: 'bg-purple-500/15',
            iconColor: 'text-purple-400',
            tagBg: 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
            hoverBg: 'hover:bg-purple-500/5',
            hoverShadow: 'hover:shadow-purple-500/5'
        }
    ];

    return (
        <div className="h-screen flex overflow-hidden bg-[#0f1117]">
            {/* Left Side - Role Selection Form */}
            <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                className="w-full lg:w-1/2 flex items-center justify-center p-6 bg-[#0f1117] overflow-y-auto"
                style={{ fontFamily: "'Inter', sans-serif" }}
            >
                <div className="w-full max-w-xl py-4">
                    {/* Back Button */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="mb-8"
                    >
                        <Link
                            to="/login"
                            className="inline-flex items-center text-gray-500 hover:text-gray-300 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 mr-2" />
                            <span>Back to Login</span>
                        </Link>
                    </motion.div>

                    {/* Header */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="mb-10"
                    >
                        <h1
                            className="text-4xl font-bold text-white mb-3"
                            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                        >
                            Join Our Platform
                        </h1>
                        <p className="text-gray-400 text-lg">
                            Select your role to get started on your journey
                        </p>
                    </motion.div>

                    {/* Role Cards */}
                    <div className="grid grid-cols-1 gap-4">
                        {roles.map((role, index) => (
                            <motion.div
                                key={role.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 + index * 0.1 }}
                            >
                                <Link to={role.path}>
                                    <div
                                        className={`
                                            relative bg-[#1a1f2e] rounded-2xl p-5
                                            border border-[#252b3b] border-l-4 ${role.borderLeft}
                                            shadow-lg ${role.hoverShadow}
                                            ${role.hoverBg} hover:border-[#303750]
                                            transition-all duration-300 group cursor-pointer
                                            overflow-hidden
                                        `}
                                    >
                                        <div className="relative flex items-center gap-4">
                                            {/* Icon */}
                                            <div className={`w-14 h-14 ${role.iconBg} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0`}>
                                                <role.icon className={`w-7 h-7 ${role.iconColor}`} />
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3
                                                        className="text-lg font-semibold text-white"
                                                        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                                                    >
                                                        {role.title}
                                                    </h3>
                                                    <span
                                                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${role.tagBg}`}
                                                        style={{ fontFamily: "'JetBrains Mono', monospace" }}
                                                    >
                                                        {role.tag}
                                                    </span>
                                                </div>
                                                <p className="text-gray-400 text-sm leading-relaxed">
                                                    {role.description}
                                                </p>
                                            </div>

                                            {/* Arrow */}
                                            <div className="text-gray-600 group-hover:text-gray-400 group-hover:translate-x-1 transition-all flex-shrink-0">
                                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                </svg>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            </motion.div>
                        ))}
                    </div>

                    {/* Already have account */}
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.8 }}
                        className="text-center mt-8 text-gray-500"
                    >
                        Already have an account?{' '}
                        <Link to="/login" className="text-primary font-semibold hover:underline">
                            Log in here
                        </Link>
                    </motion.p>
                </div>
            </motion.div>

            {/* Right Side - Brand Panel */}
            <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                className="hidden lg:flex lg:w-1/2 relative overflow-hidden"
            >
                {/* Gradient Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f0f23]">
                    <div className="absolute top-20 left-20 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-pulse-slow" />
                    <div className="absolute bottom-20 right-20 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse-slow delay-300" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-pink-500/10 rounded-full blur-3xl animate-float" />

                    {/* Circuit Lines Background */}
                    <svg className="absolute inset-0 w-full h-full opacity-[0.07]" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                            <pattern id="circuit" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
                                <path d="M10 10 L40 10 L40 40 L70 40 L70 70 L100 70" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-primary" />
                                <path d="M0 60 L30 60 L30 30 L60 30 L60 0" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-primary" />
                                <circle cx="10" cy="10" r="2" fill="currentColor" className="text-primary" />
                                <circle cx="40" cy="40" r="2" fill="currentColor" className="text-primary" />
                                <circle cx="70" cy="70" r="2" fill="currentColor" className="text-primary" />
                                <circle cx="30" cy="60" r="2" fill="currentColor" className="text-primary" />
                                <circle cx="60" cy="30" r="2" fill="currentColor" className="text-primary" />
                                <circle cx="60" cy="0" r="2" fill="currentColor" className="text-primary" />
                            </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill="url(#circuit)" />
                    </svg>

                    {/* Animated circuit pulse */}
                    <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                        <div className="absolute top-[10%] left-[10%] w-px h-[60%] bg-gradient-to-b from-transparent via-primary/30 to-transparent animate-circuit-pulse" />
                        <div className="absolute top-[30%] left-[30%] w-px h-[40%] bg-gradient-to-b from-transparent via-primary/20 to-transparent animate-circuit-pulse delay-200" />
                        <div className="absolute top-[15%] right-[25%] w-px h-[50%] bg-gradient-to-b from-transparent via-primary/25 to-transparent animate-circuit-pulse delay-400" />
                    </div>
                </div>

                {/* Center Content */}
                <div className="relative z-10 flex items-center justify-center w-full h-full p-8">
                    <div className="flex flex-col items-center justify-center gap-4">
                        {/* Logo */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.4, duration: 0.6 }}
                            className="relative w-56 h-56 group"
                        >
                            {/* Glow */}
                            <div className="absolute -inset-4 bg-primary/20 rounded-3xl blur-2xl group-hover:bg-primary/30 transition-all duration-500" />

                            {/* Glass Box */}
                            <div className="absolute inset-0 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-2xl overflow-hidden flex items-center justify-center p-6">
                                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
                                <img
                                    src="/logo.png"
                                    alt="Adeeb Technology Lab Logo"
                                    className="w-full h-full object-contain z-10"
                                    onError={(e) => {
                                        e.target.style.display = "none";
                                        e.target.nextSibling.style.display = "block";
                                    }}
                                />
                                <GraduationCap className="w-20 h-20 text-white hidden" />
                            </div>
                        </motion.div>

                        {/* Text under logo */}
                        <motion.div
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.55, duration: 0.4 }}
                            className="text-center"
                        >
                            <h2
                                className="text-white text-3xl font-bold leading-tight"
                                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                            >
                                Adeeb Technology Lab
                            </h2>
                            <p
                                className="text-white/60 text-sm mt-1"
                                style={{ fontFamily: "'JetBrains Mono', monospace" }}
                            >
                                Digital Tech Expert • Software House • LMS
                            </p>
                        </motion.div>
                    </div>
                </div>

                {/* Bottom Gradient */}
                <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-primary/10 to-transparent" />
            </motion.div>

            <GuestChatWidget />
        </div>
    );
};

export default RoleSelection;
