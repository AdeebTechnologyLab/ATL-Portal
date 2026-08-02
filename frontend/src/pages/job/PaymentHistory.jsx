import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarDays, Eye, ReceiptText, X } from 'lucide-react';
import { taskAPI } from '../../services/api';

const PaymentHistory = () => {
    const { user } = useSelector((state) => state.auth);
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedPayment, setSelectedPayment] = useState(null);

    useEffect(() => {
        const loadPayments = async () => {
            try {
                setLoading(true);
                setError('');
                const response = await taskAPI.getMy();
                setTasks(response.data.data || []);
            } catch (loadError) {
                console.error('Error loading payments:', loadError);
                setError('Payment history could not be loaded. Please try again.');
            } finally {
                setLoading(false);
            }
        };

        loadPayments();
    }, []);

    const payments = useMemo(() => {
        const userId = String(user?._id || user?.id || '');
        return tasks.flatMap((task) => (task.paymentHistory || [])
            .filter((payment) => String(payment.user?._id || payment.user || '') === userId)
            .map((payment) => ({
                ...payment,
                taskId: task._id,
                projectName: task.title,
                category: task.category
            })))
            .sort((a, b) => new Date(b.paidAt || 0) - new Date(a.paidAt || 0));
    }, [tasks, user]);

    const totalPaid = payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

    const formatDate = (date) => date
        ? new Intl.DateTimeFormat('en-PK', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(date))
        : 'Date unavailable';

    if (loading) {
        return (
            <div className="flex min-h-[420px] flex-col items-center justify-center gap-3">
                <img src="/loading.gif" alt="Loading payments" className="h-20 w-20 object-contain" />
                <p className="font-medium text-gray-500 dark:text-slate-400">Loading your payments...</p>
            </div>
        );
    }

    return (
        <div className="space-y-5 sm:space-y-6">
            <motion.section
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                className="overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 p-5 text-white shadow-lg sm:p-8"
            >
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-emerald-100">Payment record</p>
                        <h1 className="text-2xl font-black sm:text-3xl">My Payments</h1>
                        <p className="mt-2 text-sm text-emerald-50 sm:text-base">Completed projects and payment screenshots in one place.</p>
                    </div>
                    <div className="min-w-[190px] rounded-2xl border border-white/20 bg-white/15 p-4 backdrop-blur-sm">
                        <p className="text-xs font-semibold uppercase tracking-wider text-emerald-100">Total received</p>
                        <p className="mt-1 text-2xl font-black">Rs {totalPaid.toLocaleString()}</p>
                        <p className="mt-1 text-xs text-emerald-100">{payments.length} payment{payments.length === 1 ? '' : 's'}</p>
                    </div>
                </div>
            </motion.section>

            {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">{error}</div>}

            {!error && payments.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-14 text-center dark:border-slate-700 dark:bg-slate-900">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/30">
                        <ReceiptText className="h-7 w-7 text-emerald-600" />
                    </div>
                    <h2 className="mt-4 text-lg font-bold text-gray-900 dark:text-white">No payments yet</h2>
                    <p className="mx-auto mt-2 max-w-md text-sm text-gray-500 dark:text-slate-400">Your completed project payments will appear here after payment is confirmed.</p>
                </div>
            ) : (
                <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
                    <div className="hidden grid-cols-[minmax(0,1fr)_180px_160px_64px] items-center gap-4 border-b border-gray-200 bg-gray-50 px-5 py-3 text-xs font-bold uppercase tracking-wider text-gray-500 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-400 md:grid">
                        <span>Project</span>
                        <span>Date</span>
                        <span>Payment</span>
                        <span className="text-center">Slip</span>
                    </div>
                    {payments.map((payment, index) => (
                        <motion.article
                            key={`${payment.taskId}-${payment._id || payment.cycle}-${index}`}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: Math.min(index * 0.05, 0.3) }}
                            className="grid gap-4 border-b border-gray-100 p-4 last:border-b-0 hover:bg-gray-50/80 dark:border-slate-800 dark:hover:bg-slate-800/50 md:grid-cols-[minmax(0,1fr)_180px_160px_64px] md:items-center md:px-5"
                        >
                            <div className="min-w-0">
                                <h2 className="truncate font-bold text-gray-900 dark:text-white" title={payment.projectName}>{payment.projectName}</h2>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-300">
                                <CalendarDays className="h-4 w-4 flex-none text-gray-400" />
                                <span className="md:hidden text-xs font-semibold text-gray-400">Date:</span>
                                {formatDate(payment.paidAt)}
                            </div>
                            <div>
                                <p className="font-black text-gray-900 dark:text-white">Rs {Number(payment.amount || 0).toLocaleString()}</p>
                            </div>
                            <div className="flex md:justify-center">
                                <button
                                    type="button"
                                    onClick={() => payment.paymentProof && setSelectedPayment(payment)}
                                    disabled={!payment.paymentProof}
                                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 transition-colors hover:bg-emerald-600 hover:text-white disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-300 dark:bg-emerald-950/40 dark:text-emerald-400 dark:hover:bg-emerald-600 dark:hover:text-white dark:disabled:bg-slate-800 dark:disabled:text-slate-600"
                                    aria-label={payment.paymentProof ? `View payment slip for ${payment.projectName}` : `Payment slip unavailable for ${payment.projectName}`}
                                    title={payment.paymentProof ? 'View payment slip' : 'Payment slip unavailable'}
                                >
                                    <Eye className="h-5 w-5" />
                                </button>
                                <div className="ml-3 self-center text-xs font-semibold text-gray-500 md:hidden">
                                    {payment.paymentProof ? 'View payment slip' : 'Slip unavailable'}
                                </div>
                            </div>
                        </motion.article>
                    ))}
                </div>
            )}

            <AnimatePresence>
                {selectedPayment && (
                    <motion.div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedPayment(null)}>
                        <motion.div className="relative max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900" initial={{ scale: 0.95, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 12 }} onClick={(event) => event.stopPropagation()}>
                            <div className="flex items-center justify-between border-b border-gray-100 p-4 dark:border-slate-700">
                                <div>
                                    <h2 className="font-bold text-gray-900 dark:text-white">{selectedPayment.projectName}</h2>
                                    <p className="text-sm text-emerald-600">Rs {Number(selectedPayment.amount || 0).toLocaleString()} · {formatDate(selectedPayment.paidAt)}</p>
                                </div>
                                <button type="button" onClick={() => setSelectedPayment(null)} className="rounded-full p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800" aria-label="Close screenshot"><X className="h-5 w-5" /></button>
                            </div>
                            <div className="max-h-[calc(90vh-76px)] overflow-auto bg-gray-100 p-3 dark:bg-slate-950">
                                <img src={selectedPayment.paymentProof} alt={`Payment screenshot for ${selectedPayment.projectName}`} className="mx-auto max-h-[75vh] max-w-full rounded-lg object-contain" />
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default PaymentHistory;
