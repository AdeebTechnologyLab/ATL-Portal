import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Lock, ShieldAlert, CreditCard, BookOpen, ArrowRight, PauseCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const WorkspaceRestrictedBanner = ({
    role,
    pendingFees = 0,
    lockedCourses = [],
    restrictionType = 'fee',
    onBack,
    backLabel = 'View Courses',
    className = '',
}) => {
    const { t } = useTranslation();
    const navigate = useNavigate();

    const CONTENT = {
        fee: {
            badge: t('workspace.accessLocked'),
            description: t('workspace.pausedReason'),
            steps: [
                t('workspace.step1'),
                t('workspace.step2'),
            ],
            primaryLabel: t('workspace.payVerifyFee'),
            showFeeCta: true,
        },
        paused: {
            badge: t('dashboard.accountPaused'),
            description: t('dashboard.accountPausedDesc'),
            steps: [
                t('workspace.contactAdmin'),
                t('workspace.accessResumed'),
            ],
            primaryLabel: null,
            showFeeCta: false,
        },
    };

    const content = CONTENT[restrictionType] || CONTENT.fee;

    if (!lockedCourses.length) return null;

    const handleBack = () => {
        if (onBack) onBack();
        else navigate(`/${role}/courses`);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className={`relative overflow-hidden rounded-2xl border border-red-200/80 dark:border-red-500/25 bg-gradient-to-br from-red-600 via-red-500 to-rose-600 p-5 sm:p-6 md:p-7 text-white shadow-xl shadow-red-500/20 ${className}`}
        >
            <motion.div
                aria-hidden
                className="pointer-events-none absolute -top-12 -right-12 h-40 w-40 rounded-full bg-white/10 blur-2xl"
                animate={{ scale: [1, 1.08, 1], opacity: [0.35, 0.55, 0.35] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            />
            <div aria-hidden className="pointer-events-none absolute -bottom-16 -left-8 h-36 w-36 rounded-full bg-black/10 blur-2xl" />

            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center gap-5 lg:gap-8">
                <motion.div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className="relative shrink-0">
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/25 flex items-center justify-center">
                            {restrictionType === 'paused' ? (
                                <PauseCircle className="w-7 h-7 sm:w-8 sm:h-8" />
                            ) : (
                                <Lock className="w-7 h-7 sm:w-8 sm:h-8" />
                            )}
                        </div>
                        <span className="absolute -top-1 -right-1 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-300 opacity-75" />
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-400 border-2 border-red-600" />
                        </span>
                    </div>

                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 border border-white/20 text-[10px] font-black uppercase tracking-widest">
                                <ShieldAlert className="w-3 h-3" />
                                {content.badge}
                            </span>
                            {restrictionType === 'fee' && pendingFees > 0 && (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-white text-red-600 text-[10px] font-black uppercase tracking-widest">
                                    {t('workspace.due', { amount: pendingFees.toLocaleString() })}
                                </span>
                            )}
                        </div>

                        <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight leading-tight mb-2">
                            {t('workspace.restricted')}
                        </h2>

                        <p className="text-sm text-white/85 leading-relaxed max-w-xl">{content.description}</p>

                        <ul className="mt-3 space-y-1.5 text-xs sm:text-sm text-white/90">
                            {content.steps.map((step) => (
                                <li key={step} className="flex items-start gap-2">
                                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-300" />
                                    {step}
                                </li>
                            ))}
                        </ul>

                        <div className="mt-3 flex flex-wrap gap-1.5">
                            {lockedCourses.map((c) => (
                                <span
                                    key={c.id || c._id}
                                    className="px-2 py-0.5 rounded-lg bg-black/15 border border-white/15 text-[10px] font-bold uppercase tracking-wide truncate max-w-[220px]"
                                >
                                    {c.title}
                                </span>
                            ))}
                        </div>
                    </div>
                </motion.div>

                <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 shrink-0 w-full lg:w-auto">
                    {content.showFeeCta && (
                        <button
                            type="button"
                            onClick={() => navigate(`/${role}/fees`)}
                            className="group flex items-center justify-center gap-2 px-5 py-3.5 bg-white text-red-600 rounded-xl font-black uppercase tracking-widest text-[10px] sm:text-xs hover:bg-red-50 transition-all shadow-lg"
                        >
                            <CreditCard className="w-4 h-4" />
                            {content.primaryLabel}
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={handleBack}
                        className="flex items-center justify-center gap-2 px-5 py-3.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-black uppercase tracking-widest text-[10px] sm:text-xs border border-white/25 transition-all backdrop-blur-sm"
                    >
                        <BookOpen className="w-4 h-4" />
                        {backLabel === 'View Courses' ? t('workspace.viewCourses') : backLabel}
                    </button>
                </div>
            </div>
        </motion.div>
    );
};


export default WorkspaceRestrictedBanner;
