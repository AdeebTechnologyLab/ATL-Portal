import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { GraduationCap, Loader2, CheckCircle, Pin, X } from 'lucide-react';
import { registrationPageAPI } from '../../services/api';

const gradientMap = {
    student: 'from-primary via-primary to-primary',
    intern: 'from-blue-600 via-indigo-500 to-blue-800',
    job: 'from-primary via-fuchsia-500 to-purple-800',
    teacher: 'from-primary via-red-500 to-orange-700'
};

const badgeColorMap = {
    primary: 'bg-primary/10 text-primary border-primary/20',
    blue: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    amber: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    purple: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
    fuchsia: 'bg-fuchsia-500/10 text-fuchsia-600 border-fuchsia-500/20'
};

const statusColorMap = {
    green: { bg: 'bg-emerald-500', text: 'text-emerald-600', badge: 'bg-emerald-50 text-emerald-600 border border-emerald-200' },
    red: { bg: 'bg-red-500', text: 'text-red-600', badge: 'bg-red-50 text-red-600 border border-red-200' },
    yellow: { bg: 'bg-amber-500', text: 'text-amber-600', badge: 'bg-amber-50 text-amber-600 border border-amber-200' }
};

const iconFallbackMap = {
    student: GraduationCap,
    intern: GraduationCap,
    job: GraduationCap,
    teacher: GraduationCap
};

const RegistrationLeftPanel = ({ formType, mobileOpen = false, onMobileClose }) => {
    const [pageData, setPageData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPageData = async () => {
            try {
                const res = await registrationPageAPI.getByType(formType);
                setPageData(res.data.data);
            } catch (error) {
                console.error('Failed to load registration page data:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchPageData();
    }, [formType]);

    if (loading) {
        return (
            <div className={`${mobileOpen ? 'flex' : 'hidden'} fixed inset-0 z-[100] items-center justify-center bg-black/60 p-4 backdrop-blur-sm lg:static lg:z-auto lg:flex lg:w-1/2 lg:h-screen lg:p-0 lg:bg-gray-50 lg:backdrop-blur-none`}>
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        );
    }

    if (!pageData) return null;

    const gradient = gradientMap[formType] || gradientMap.student;
    const FallbackIcon = iconFallbackMap[formType] || GraduationCap;
    const statusColor = statusColorMap[pageData.statusInfo?.valueColor] || statusColorMap.green;

    return (
        <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className={`${mobileOpen ? 'flex' : 'hidden'} fixed inset-0 z-[100] items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm lg:sticky lg:top-0 lg:z-auto lg:flex lg:w-1/2 lg:h-screen lg:overflow-hidden lg:bg-gray-50 lg:p-0 lg:backdrop-blur-none`}
        >
            {/* Gradient accent strip */}
            <div className={`hidden lg:block absolute top-0 left-0 w-full h-2 bg-gradient-to-r ${gradient}`} />

            {/* Content */}
            <div className="relative z-10 flex w-full max-w-lg flex-col items-center justify-start lg:justify-center lg:w-full lg:h-full lg:max-w-none lg:p-12 lg:overflow-y-auto no-scrollbar">
                <div className="relative my-14 w-full max-w-lg rounded-3xl border border-gray-200 bg-white p-6 shadow-2xl sm:p-8 lg:my-0 lg:rounded-[2rem] lg:p-10 lg:shadow-xl">
                    {/* Logo */}
                    <div className="mb-8 flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                            <div className="w-12 h-12 shrink-0 bg-primary/10 rounded-xl flex items-center justify-center">
                                <img
                                    src="/logo.png"
                                    alt="Logo"
                                    className="w-8 h-8 object-contain"
                                    onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }}
                                />
                                <FallbackIcon className="w-6 h-6 text-primary hidden" />
                            </div>
                            <h2 className="text-gray-900 text-lg sm:text-xl font-bold leading-tight">LMS Adeeb Technology Lab</h2>
                        </div>
                        <button
                            type="button"
                            onClick={onMobileClose}
                            aria-label="Close information"
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-0 bg-primary text-white shadow-none outline-none ring-0 transition-transform hover:scale-105 focus:outline-none focus:ring-0 active:scale-95 lg:hidden"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Announcement */}
                    {pageData.announcement && (
                        <div className="mb-6 border border-gray-200 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                                <h3 className="text-gray-900 font-semibold text-sm">{pageData.announcement.heading}</h3>
                            </div>
                            <p className="text-gray-600 text-sm">{pageData.announcement.text}</p>
                        </div>
                    )}

                    {/* Status Info */}
                    {pageData.statusInfo && (
                        <div className="grid grid-cols-2 gap-3 mb-6">
                            <div className="bg-gray-50 border border-gray-100 rounded-xl p-3">
                                <span className="text-gray-400 text-[10px] font-bold uppercase tracking-widest block mb-1">
                                    {pageData.statusInfo.label}
                                </span>
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${statusColor.badge}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${statusColor.bg}`} />
                                    {pageData.statusInfo.value}
                                </span>
                            </div>
                            <div className="bg-gray-50 border border-gray-100 rounded-xl p-3">
                                <span className="text-gray-400 text-[10px] font-bold uppercase tracking-widest block mb-1">
                                    {pageData.statusInfo.dateLabel}
                                </span>
                                <span className="text-gray-900 font-semibold text-sm">{pageData.statusInfo.dateValue}</span>
                            </div>
                        </div>
                    )}

                    {/* Type Badge */}
                    {pageData.typeBadge && (
                        <div className="mb-6">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${badgeColorMap[pageData.typeBadge.color] || badgeColorMap.primary}`}>
                                {pageData.typeBadge.text}
                            </span>
                        </div>
                    )}

                    {/* Sections */}
                    <div className="space-y-5">
                        {pageData.sections?.map((section, idx) => (
                            <div key={idx}>
                                <h3 className="text-gray-900 font-bold text-xs uppercase tracking-widest mb-3 border-l-2 border-primary pl-3">
                                    {section.title}
                                </h3>

                                {section.type === 'list' && (
                                    <ul className="space-y-2">
                                        {section.items.map((item, iIdx) => (
                                            <li key={iIdx} className="flex items-center gap-2 text-gray-600 text-sm">
                                                <CheckCircle className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                )}

                                {section.type === 'grid' && (
                                    <div className="grid grid-cols-2 gap-2">
                                        {section.items.map((item, iIdx) => (
                                            <div key={iIdx} className="flex items-center gap-1.5 bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-1.5">
                                                <Pin className="w-3 h-3 text-primary flex-shrink-0" />
                                                <span className="text-gray-600 text-xs">{item}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {section.type === 'badges' && (
                                    <div className="flex flex-wrap gap-2">
                                        {section.items.map((item, iIdx) => (
                                            <span key={iIdx} className="px-3 py-1 bg-gray-100 rounded-full text-gray-600 text-xs font-medium">
                                                {item}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default RegistrationLeftPanel;
