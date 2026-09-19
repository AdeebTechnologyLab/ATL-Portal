import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, CreditCard, PauseCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatDate } from '../../utils/dateFormatter';

const WorkspaceRestrictedBanner = ({
    role,
    pendingFees = 0,
    overdueInstallment = null,
    lockedCourses = [],
    restrictionType = 'fee',
    className = '',
}) => {
    const { t } = useTranslation();
    const navigate = useNavigate();

    const CONTENT = {
        fee: {
            heading: '⚠ Fee Payment Overdue',
            description: t('workspace.pausedReason'),
            primaryLabel: 'Pay Fee Now',
            showFeeCta: true,
        },
        paused: {
            heading: '⚠ Account Paused',
            description: t('dashboard.accountPausedDesc'),
            primaryLabel: null,
            showFeeCta: false,
        },
    };

    const content = CONTENT[restrictionType] || CONTENT.fee;

    if (!lockedCourses.length) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className={`w-full px-4 py-10 ${className}`}
        >
            <div className="w-full rounded-3xl border-2 border-red-500 p-6 sm:p-10 text-center shadow-xl bg-red-50 dark:bg-red-950/40">
                <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-red-600 text-white shadow-lg shadow-red-500/30">
                    {restrictionType === 'paused' ? (
                        <PauseCircle className="h-11 w-11" />
                    ) : (
                        <AlertCircle className="h-11 w-11" />
                    )}
                </div>

                <h1 className="text-2xl sm:text-3xl font-black text-red-700 dark:text-red-300">
                    {content.heading}
                </h1>

                <p className="mt-4 text-sm sm:text-base font-semibold leading-relaxed text-red-800 dark:text-red-100">
                    {content.description}
                </p>

                {restrictionType === 'fee' && pendingFees > 0 && (
                    <div className="mt-4 inline-flex items-center px-4 py-2 rounded-full bg-white dark:bg-black/20 border border-red-200 dark:border-red-400/30 text-red-700 dark:text-red-100 text-sm font-black">
                        {t('workspace.due', { amount: pendingFees.toLocaleString() })}
                    </div>
                )}

                {overdueInstallment && (
                    <div className="mt-4 rounded-2xl border p-4 text-sm border-red-200 dark:border-red-400/30 bg-white dark:bg-black/20 text-red-800 dark:text-red-100">
                        <p className="font-black text-base">{overdueInstallment.courseTitle}</p>
                        <p className="mt-1 font-semibold">
                            Installment #{overdueInstallment.installmentNumber} — Due: {formatDate(overdueInstallment.dueDate)}
                        </p>
                    </div>
                )}

                {lockedCourses.length > 0 && !overdueInstallment && (
                    <div className="mt-6 rounded-2xl border p-4 text-sm border-red-200 dark:border-red-400/30 bg-white dark:bg-black/20 text-red-800 dark:text-red-100">
                        {lockedCourses.map((c) => (
                            <p key={c.id || c._id} className="font-black">{c.title}</p>
                        ))}
                    </div>
                )}

                {content.showFeeCta && (
                    <button
                        type="button"
                        onClick={() => navigate(`/${role}/fees`)}
                        className="mt-7 inline-flex items-center gap-2 rounded-xl bg-red-600 px-6 py-3 font-black text-white shadow-lg transition hover:bg-red-700"
                    >
                        <CreditCard className="h-5 w-5" /> {content.primaryLabel}
                    </button>
                )}
            </div>
        </motion.div>
    );
};

export default WorkspaceRestrictedBanner;
