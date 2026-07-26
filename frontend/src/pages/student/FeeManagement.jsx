import { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { io } from 'socket.io-client';
import {
    CreditCard, Upload, Clock, CheckCircle, AlertCircle, FileText, FileImage, Trash2, X, Eye
} from 'lucide-react';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import Loader, { ButtonLoader } from '../../components/ui/Loader';
import { feeAPI, enrollmentAPI } from '../../services/api';
import { formatDate } from '../../utils/dateFormatter';

const FeeManagement = () => {
    const location = useLocation();
    const successMsg = location.state?.message;
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [withdrawModal, setWithdrawModal] = useState({ open: false, enrollmentId: null, courseTitle: '' });
    const [selectedFee, setSelectedFee] = useState(null);
    const [selectedInstallment, setSelectedInstallment] = useState(null);
    const [uploadedFile, setUploadedFile] = useState(null);
    const [slipId, setSlipId] = useState('');
    const [paymentAmount, setPaymentAmount] = useState('');
    const [fees, setFees] = useState([]);
    const [isFetching, setIsFetching] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [showSlipError, setShowSlipError] = useState(false);
    const [qrPreview, setQrPreview] = useState({ open: false, src: '', title: '' });
    const [previewUrl, setPreviewUrl] = useState(null);

    const navigate = useNavigate();
    const QR_LINKS = {
        easypaisa: 'https://res.cloudinary.com/adeeb-tech-lab/image/upload/v1776804616/easypaisa_yr7gux.png'
    };

    const socketRef = useRef(null);
    const { user, role } = useSelector((state) => state.auth);

    const getSocketURL = () => {
    const rawUrl = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1' ? 'https://lms-adeeb-technology-lab.onrender.com/api' : 'http://localhost:5000/api');
    return rawUrl === '/api' ? 'https://lms-adeeb-technology-lab.onrender.com' : rawUrl.replace(/\/api\/?$/, '');
};

    useEffect(() => {
        fetchFees();

        // Initialize socket
        const SOCKET_URL = getSocketURL();
        socketRef.current = io(SOCKET_URL, { withCredentials: true });

        const myId = user?.id || user?._id;
        if (myId) {
            socketRef.current.emit('join_chat', myId);
        }

        socketRef.current.on('fee_updated', () => {
            console.log('🔄 Fee update received via socket. Refreshing...');
            fetchFees();
        });

        socketRef.current.on('new_browser_notification', () => {
            fetchFees();
        });

        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        };
    }, []);

    // Poll for updates while there are submitted payments awaiting verification
    useEffect(() => {
        let interval = null;
        const hasSubmitted = fees.some(fee => (fee.installments || []).some(i => i.status === 'submitted'));
        if (hasSubmitted) {
            // Still keeping polling as a fallback, but sockets are primary
            interval = setInterval(() => {
                fetchFees();
            }, 15000); // Increased interval since sockets are active
        }
        return () => clearInterval(interval);
    }, [fees]);

    const fetchFees = async () => {
        setIsFetching(true);
        setError('');
        try {
            const [feeRes, enrollRes] = await Promise.all([
                feeAPI.getMy(),
                enrollmentAPI.getMy()
            ]);

            const fetchedFees = feeRes.data.data || [];
            const enrollments = enrollRes.data.data || [];

            // Merge enrollment ID into fees
            const feesWithEnrollmentId = fetchedFees.map(fee => {
                const enrollment = enrollments.find(e =>
                    (e.course?._id || e.course) === (fee.course?._id || fee.course)
                );
                return { ...fee, enrollmentId: enrollment?._id, enrollmentIsActive: enrollment?.isActive || false, enrollmentIsPaused: enrollment?.isPaused || false, courseId: fee.course?._id || fee.course };
            });

            // Detect newly verified installments compared to current state
            try {
                const prev = fees || [];
                feesWithEnrollmentId.forEach(newFee => {
                    const oldFee = prev.find(f => String(f._id) === String(newFee._id));
                    if (!oldFee) return;
                    (newFee.installments || []).forEach((inst, idx) => {
                        const oldInst = (oldFee.installments || [])[idx];
                        if (oldInst && oldInst.status !== 'verified' && inst.status === 'verified') {
                            // If enrollment is active, navigate student to course page automatically
                            try {
                                if (newFee.enrollmentIsActive && newFee.courseId) {
                                    // small delay to allow UI to settle
                                    setTimeout(() => {
                                    if (newFee.courseId) {
                                        navigate(`/student/assignments`, { state: { courseId: newFee.courseId } });
                                    } else {
                                        navigate('/student/dashboard');
                                    }
                                    }, 400);
                                } else {
                                    alert(`Payment verified for ${newFee.course?.title || 'your course'}. Course is now accessible.`);
                                }
                            } catch (e) { console.error(e); }
                        }
                    });
                });
            } catch (e) { console.error('Diff check error', e); }

            setFees(feesWithEnrollmentId);
        } catch (err) {
            console.error('Error fetching fees:', err);
            setError('Failed to load fees. Please try again.');
        } finally {
            setIsFetching(false);
        }
    };

    const handlePayClick = (fee, installment) => {
        setSelectedFee(fee);
        setSelectedInstallment(installment);
        setPaymentAmount(installment.amount);
        setSlipId('');
        setIsUploadModalOpen(true);
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 1 * 1024 * 1024) {
                alert('File size must be less than 1MB');
                return;
            }
            setUploadedFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleSubmitPayment = async () => {
        if (!uploadedFile || !selectedFee || !selectedInstallment) {
            alert('Please select a file to upload');
            return;
        }
        if (!slipId.trim()) {
            setShowSlipError(true);
            return;
        }

        setIsSubmitting(true);
        setError('');
        try {
            const formData = new FormData();
            formData.append('receipt', uploadedFile);
            formData.append('installmentId', selectedInstallment._id);
            formData.append('slipId', slipId);

            await feeAPI.pay(selectedFee._id, formData);
            setIsUploadModalOpen(false);
            setUploadedFile(null);
            setPreviewUrl(null);
            setSlipId('');
            setSelectedFee(null);
            setSelectedInstallment(null);
            fetchFees();
        } catch (err) {
            console.error('Error submitting payment:', err);
            setError(err.response?.data?.message || 'Failed to submit payment');
        } finally {
            setIsSubmitting(false);
        }
    };

    const confirmWithdraw = async () => {
        try {
            await enrollmentAPI.withdraw(withdrawModal.enrollmentId);
            setWithdrawModal({ open: false, enrollmentId: null, courseTitle: '' });
            fetchFees();
            alert('Course revoked successfully. Pending fees removed.');
        } catch (error) {
            console.error('Withdrawal failed:', error);
            alert(error.response?.data?.message || 'Failed to revoke course');
        }
    };

    const getImageUrl = (url) => {
        if (!url) return '';
        try {
            const cleanUrl = String(url).trim();
            if (cleanUrl.toLowerCase().startsWith('http') || cleanUrl.toLowerCase().startsWith('data:')) {
                return cleanUrl;
            }
            const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');
            return `${baseUrl}/${cleanUrl.replace(/\\/g, '/').replace(/^\//, '')}`;
        } catch (e) {
            return url;
        }
    };

    // Calculate totals from installments
    const getTotals = () => {
        let pending = 0;
        let underReviewCount = 0;
        let verifiedCount = 0;
        let submittedAmount = 0; // total amount student has submitted/paid

        fees.forEach(fee => {
            (fee.installments || []).forEach(inst => {
                if (inst.status === 'pending' || inst.status === 'rejected' || inst.status === 'overdue') {
                    pending += inst.amount || 0;
                } else if (inst.status === 'submitted') {
                    underReviewCount++;
                    submittedAmount += inst.amount || 0;
                } else if (inst.status === 'verified') {
                    verifiedCount++;
                    submittedAmount += inst.amount || 0;
                }
            });
        });

        return { pending, underReviewCount, verifiedCount, submittedAmount };
    };

    const totals = getTotals();

    if (isFetching) {
        return (
            <Loader message="Loading fees..." />
        );
    }

    return (
        <div className="space-y-4 sm:space-y-6 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Fee Management</h1>
                    <p className="text-xs sm:text-base text-gray-500 dark:text-gray-400 mt-0.5">View and manage your monthly course fees</p>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    <span className="text-red-600">{error}</span>
                </div>
            )}

            {/* Success Message */}
            {successMsg && (
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-primary/5 border border-primary rounded-xl p-4 flex items-center gap-3"
                >
                    <CheckCircle className="w-5 h-5 text-primary" />
                    <span className="text-primary font-medium">{successMsg}</span>
                </motion.div>
            )}            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-2 sm:mb-6">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-gray-900 rounded-xl sm:rounded-2xl p-3 sm:p-6 border border-gray-100 dark:border-gray-800 shadow-sm group hover:border-primary/20 transition-all">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Pending</p>
                            <p className="text-base sm:text-xl font-black text-gray-900 dark:text-white break-words">Rs {totals.pending.toLocaleString()}</p>
                        </div>
                        <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-primary/5 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                            <AlertCircle className="w-4 h-4 sm:w-6 sm:h-6" />
                        </div>
                    </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white dark:bg-gray-900 rounded-xl sm:rounded-2xl p-3 sm:p-6 border border-gray-100 dark:border-gray-800 shadow-sm group hover:border-primary/20 transition-all">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Under Review</p>
                            <p className="text-base sm:text-xl font-black text-gray-900 dark:text-white">{totals.underReviewCount}</p>
                        </div>
                        <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-primary/5 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                            <Clock className="w-4 h-4 sm:w-6 sm:h-6" />
                        </div>
                    </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white dark:bg-gray-900 rounded-xl sm:rounded-2xl p-3 sm:p-6 border border-gray-100 dark:border-gray-800 shadow-sm group hover:border-primary/20 transition-all">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Verified</p>
                            <p className="text-base sm:text-xl font-black text-gray-900 dark:text-white">{totals.verifiedCount}</p>
                        </div>
                        <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-primary/5 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                            <CheckCircle className="w-4 h-4 sm:w-6 sm:h-6" />
                        </div>
                    </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white dark:bg-gray-900 rounded-xl sm:rounded-2xl p-3 sm:p-6 border border-gray-100 dark:border-gray-800 shadow-sm group hover:border-primary/20 transition-all">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Submitted Total</p>
                            <p className="text-base sm:text-xl font-black text-gray-900 dark:text-white break-words">Rs {totals.submittedAmount.toLocaleString()}</p>
                        </div>
                        <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-primary/5 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                            <FileText className="w-4 h-4 sm:w-6 sm:h-6" />
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Course Challan List */}
            <div className="space-y-4 order-1">
                <div className="flex items-center gap-2 mb-2">
                    <div className="w-1 h-6 bg-primary rounded-full"></div>
                    <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">Course Challan</h2>
                </div>

                {/* Paused Warning */}
                {fees.some(f => f.enrollmentIsPaused) && (
                    <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/30 px-3.5 sm:px-5 py-3 sm:py-4 rounded-xl sm:rounded-2xl flex items-start gap-3 sm:gap-4 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <AlertCircle className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                            <p className="text-sm font-black text-amber-800 uppercase tracking-wide">Account Temporarily Paused</p>
                            <p className="text-xs text-amber-700 font-medium mt-1 leading-relaxed">
                                Your access to this course has been paused by your teacher. Assignments, daily task submissions, and fee installments are blocked until your teacher resumes your access. Please contact your teacher for more information.
                            </p>
                        </div>
                    </div>
                )}

                {fees.length === 0 ? (
                    <div className="bg-white rounded-2xl p-12 border border-gray-100 text-center">
                        <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500">No challan found</p>
                        <p className="text-sm text-gray-400">Enroll in a course to see challan details</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {fees.map((fee, feeIndex) => (
                            <motion.div key={fee._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: feeIndex * 0.1 }} className="bg-white dark:bg-gray-900 rounded-2xl p-3.5 sm:p-6 border border-gray-100 dark:border-gray-800">
                                <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6 pb-3 sm:pb-4 border-b border-gray-100 dark:border-gray-800">
                                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-primary to-primary flex items-center justify-center shrink-0">
                                        <CreditCard className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-gray-900 dark:text-white text-sm sm:text-lg">
                                            {fee.course?.title || 'Course'}
                                            {fee.course?.city && <span className="text-sm font-normal text-gray-500 ml-2">({fee.course?.city})</span>}
                                        </h3>
                                        <p className="text-sm text-gray-500">Total Fee: Rs {(fee.totalFee ?? fee.course?.fee ?? 0).toLocaleString()}</p>
                                    </div>
                                </div>

                                {/* Installments */}
                                <div className="space-y-3">
                                    {(!fee.installments || fee.installments.length === 0) ? (
                                        <div className="p-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                            <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                            <p className="text-gray-600 font-medium">No payment plan active</p>
                                            <p className="text-sm text-gray-400 mt-1">Please contact the administration to set up your monthly fee plan.</p>
                                        </div>
                                    ) : (
                                        fee.installments.map((inst, index) => {
                                            const isOverdue = inst.status !== 'verified' && inst.dueDate && new Date(inst.dueDate) < new Date();
                                            const isPayable = inst.status === 'pending' || inst.status === 'rejected' || inst.status === 'overdue';
                                            return (
                                                <div key={inst._id || index} className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 rounded-xl gap-3 sm:gap-4 border transition-colors ${isOverdue ? 'bg-red-50 dark:bg-red-500/10 border-red-100 dark:border-red-500/20 hover:border-red-200' : 'bg-gray-50 dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:border-primary/10'}`}>
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="font-medium text-sm sm:text-base text-gray-900 dark:text-white">Month {index + 1} Fee</span>
                                                            <Badge variant={
                                                                inst.status === 'verified' ? 'success' :
                                                                    inst.status === 'submitted' ? 'info' :
                                                                        (inst.status === 'rejected' || isOverdue) ? 'danger' : 'warning'
                                                            }>
                                                                {isOverdue && inst.status !== 'submitted' ? 'OVERDUE' : 
                                                                 isOverdue && inst.status === 'submitted' ? 'PENDING VERIFICATION' : 
                                                                 inst.status}
                                                            </Badge>
                                                        </div>
                                                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                                                            <span className={isOverdue ? 'text-red-600 font-bold' : ''}>Due: {formatDate(inst.dueDate)}</span>
                                                            {inst.slipId && <span>Slip ID: {inst.slipId}</span>}
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center justify-between gap-3 sm:gap-4">
                                                        <span className={`font-bold text-base sm:text-lg ${isOverdue ? 'text-red-700 dark:text-red-300' : 'text-gray-900 dark:text-white'}`}>Rs {(inst.amount || 0).toLocaleString()}</span>
                                                        <div className="flex items-center justify-end gap-2">
                                                            {inst.receiptUrl && (
                                                                <button
                                                                    onClick={() => setQrPreview({ open: true, src: getImageUrl(inst.receiptUrl), title: 'Your Payment Receipt' })}
                                                                    className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors border border-blue-100 shadow-sm active:scale-90"
                                                                    title="View Uploaded Receipt"
                                                                >
                                                                    <Eye className="w-4 h-4" />
                                                                </button>
                                                            )}
                                                            {isPayable && (
                                                                <button
                                                                    onClick={() => handlePayClick(fee, inst)}
                                                                    disabled={fee.enrollmentIsPaused}
                                                                    className={`px-3 sm:px-4 py-2 ${fee.enrollmentIsPaused ? 'bg-gray-300 cursor-not-allowed' : 'bg-primary hover:bg-primary/90'} text-white text-xs sm:text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 sm:gap-2 shadow-sm active:scale-95 whitespace-nowrap`}
                                                                >
                                                                    <Upload className="w-4 h-4" />
                                                                    {fee.enrollmentIsPaused ? 'LOCKED' : (isOverdue ? 'Pay Late Fee' : 'Pay Now')}
                                                                </button>
                                                            )}
                                                            {inst.status === 'submitted' && (
                                                                <span className="text-sm text-primary font-medium bg-primary/5 px-3 py-1 rounded-lg">Processing</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {/* Payment Methods Section */}
            <div className="space-y-4 order-2">
                <div className="flex items-center gap-2 mb-2">
                    <div className="w-1 h-6 bg-primary rounded-full"></div>
                    <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">Payment Methods</h2>
                </div>

                <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)] gap-4 items-stretch">
                    {/* Easypaisa Card */}
                    <motion.div
                        whileHover={{ y: -5 }}
                        className="relative overflow-hidden bg-gradient-to-br from-white to-emerald-50/70 dark:from-slate-900 dark:to-emerald-950/30 rounded-2xl sm:rounded-3xl p-4 sm:p-7 border border-emerald-200 dark:border-emerald-800/70 shadow-lg shadow-emerald-900/5 hover:shadow-xl transition-all flex flex-col h-full"
                    >
                        <div className="absolute -top-20 -right-20 w-48 h-48 rounded-full bg-emerald-400/10 pointer-events-none" />
                        <div className="flex items-center justify-between gap-2 mb-4 sm:mb-6">
                            <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900/50 rounded-xl">
                                <CreditCard className="w-5 h-5 text-emerald-600 dark:text-emerald-300" />
                            </div>
                            <span className="text-[8px] sm:text-[10px] font-black text-emerald-700 dark:text-emerald-300 uppercase tracking-wider sm:tracking-widest bg-emerald-100 dark:bg-emerald-900/50 px-2 sm:px-3 py-1.5 rounded-full">Official Mobile Wallet</span>
                        </div>

                        <div className="grid grid-cols-[1fr_auto] items-center justify-between gap-3 sm:gap-5 mb-4 sm:mb-6">
                            <div className="space-y-4">
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Provider</p>
                                    <p className="font-black text-emerald-600 dark:text-emerald-300 text-xl sm:text-2xl">EASYPAISA</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Account Name</p>
                                    <p className="font-bold text-gray-900 dark:text-white text-sm sm:text-lg">Salman Yasin</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setQrPreview({ open: true, src: QR_LINKS.easypaisa, title: 'Easypaisa QR Code' })}
                                className="w-24 h-24 sm:w-32 sm:h-32 self-center rounded-xl sm:rounded-2xl overflow-hidden border-2 border-emerald-200 dark:border-emerald-700 bg-white hover:scale-105 transition-transform shadow-md flex-shrink-0 p-1.5 sm:p-2"
                                title="Open Easypaisa QR"
                            >
                                <img src={QR_LINKS.easypaisa} alt="Easypaisa QR" className="w-full h-full object-contain" />
                            </button>
                        </div>

                        <div className="mt-auto">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter mb-2">Transfer Number</p>
                            <div
                                onClick={() => {
                                    navigator.clipboard.writeText('03441713141');
                                    alert('Number copied!');
                                }}
                                className="bg-white/90 dark:bg-slate-800 p-3 sm:p-4 rounded-2xl border border-emerald-200 dark:border-emerald-700 font-black text-emerald-600 dark:text-emerald-300 text-lg sm:text-2xl tracking-wider cursor-pointer hover:bg-emerald-50 dark:hover:bg-slate-700 transition-all select-all flex justify-between items-center gap-3 group/copy"
                            >
                                <span className="min-w-0 break-all">03441713141</span>
                                <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-700 group-hover/copy:bg-emerald-600 group-hover/copy:text-white transition-colors">COPY</span>
                            </div>
                        </div>
                    </motion.div>

                    {/* Payment steps */}
                    <motion.div
                        whileHover={{ y: -5 }}
                        className="bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-900 dark:to-slate-950 rounded-2xl sm:rounded-3xl p-4 sm:p-7 border border-slate-700 shadow-lg text-white flex flex-col"
                    >
                        <div className="flex items-center gap-3 mb-5">
                            <div className="p-2.5 bg-primary/15 rounded-xl border border-primary/20">
                                <AlertCircle className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-primary">How to Pay</p>
                                <h3 className="font-black text-lg">Complete in 3 steps</h3>
                            </div>
                        </div>

                        <div className="space-y-3 flex-1">
                            {[
                                ['1', 'Transfer', 'Send the required amount to the EasyPaisa number.'],
                                ['2', 'Screenshot', 'Take a clear screenshot of the successful payment.'],
                                ['3', 'Upload', 'Click “Pay Now” and upload your payment proof.']
                            ].map(([number, title, description]) => (
                                <div key={number} className="flex gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                                    <span className="w-7 h-7 rounded-lg bg-primary text-white flex items-center justify-center text-xs font-black shrink-0">
                                        {number}
                                    </span>
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-wide">{title}</p>
                                        <p className="text-[11px] leading-relaxed text-slate-400 mt-0.5">{description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-400/20">
                            <p className="text-[10px] leading-relaxed text-amber-200 font-bold">
                                Please ensure the Slip ID is correct before submitting for verification.
                            </p>
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Fullscreen QR Preview */}
            {qrPreview.open && (
                <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
                    <button
                        onClick={() => setQrPreview({ open: false, src: '', title: '' })}
                        className="absolute top-4 right-4 p-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors"
                        aria-label="Close QR preview"
                    >
                        <X className="w-6 h-6" />
                    </button>
                    <div className="w-full max-w-4xl max-h-[90vh] flex flex-col items-center">
                        <h3 className="text-white font-bold text-lg mb-3">{qrPreview.title}</h3>
                        <img
                            src={qrPreview.src}
                            alt={qrPreview.title}
                            className="max-w-full max-h-[82vh] object-contain rounded-2xl shadow-2xl bg-white p-2"
                        />
                    </div>
                </div>
            )}

            {/* Upload Modal */}
            <Modal isOpen={isUploadModalOpen} onClose={() => { 
                setIsUploadModalOpen(false); 
                setUploadedFile(null); 
                setPreviewUrl(null);
                setSlipId(''); 
            }} title="Upload Payment Receipt" size="md" centerOnMobile>
                {selectedFee && selectedInstallment && (
                    <div className="space-y-4 sm:space-y-6">
                        {/* Course/amount summary removed per UX request */}

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Bank Slip ID (Transaction ID) <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                value={slipId}
                                onChange={(e) => {
                                    setSlipId(e.target.value);
                                    if (e.target.value.trim()) setShowSlipError(false);
                                }}
                                placeholder="Enter the unique ID from your slip"
                                className={`w-full px-4 py-2 border ${showSlipError ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-200'} rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all`}
                            />
                            {showSlipError && (
                                <p className="text-xs text-red-500 mt-1 font-bold italic">
                                    enter id number to submit
                                </p>
                            )}
                        </div>

                        <div className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-3 sm:p-4 text-center hover:border-primary transition-colors group cursor-pointer relative">
                            {uploadedFile ? (
                                <div className="space-y-3">
                                    {previewUrl ? (
                                        <div className="relative w-full max-h-36 rounded-lg overflow-hidden border border-gray-100 mb-3 group/preview">
                                            <img src={previewUrl} alt="Preview" className="w-full h-full object-contain bg-gray-50" />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/preview:opacity-100 transition-opacity flex items-center justify-center">
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); setUploadedFile(null); setPreviewUrl(null); }}
                                                    className="bg-white p-2 rounded-full text-red-500 shadow-lg hover:scale-110 transition-transform"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary">
                                            <FileImage className="w-5 h-5" />
                                        </div>
                                    )}
                                    <div className="flex flex-col items-center">
                                        <p className="font-medium text-sm text-gray-900">{uploadedFile.name}</p>
                                        <p className="text-xs text-gray-500">{(uploadedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                                    </div>
                                    <button onClick={(e) => { e.stopPropagation(); setUploadedFile(null); setPreviewUrl(null); }} className="text-sm text-red-500 hover:text-red-700 font-medium underline">
                                        Remove file
                                    </button>
                                </div>
                            ) : (
                                <label className="cursor-pointer w-full inline-flex items-center justify-center gap-4 py-3">
                                    <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 group-hover:bg-primary/5 group-hover:text-primary transition-colors">
                                        <Upload className="w-5 h-5" />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-gray-900 font-medium">Click to upload receipt</p>
                                        <p className="text-[11px] text-red-500 font-medium">⚠️ Upload image less than 1MB</p>
                                        <p className="text-xs text-gray-400">PNG, JPG, HEIC, WebP</p>
                                    </div>
                                    <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                                </label>
                            )}
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button onClick={() => { setIsUploadModalOpen(false); setUploadedFile(null); setPreviewUrl(null); setSlipId(''); }} className="flex-1 py-3 text-gray-600 font-medium hover:bg-gray-100 rounded-xl transition-colors">
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmitPayment}
                                disabled={isSubmitting || !uploadedFile}
                                className="flex-1 py-3 bg-primary-dark hover:bg-primary text-white font-medium rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/10"
                            >
                                <ButtonLoader isLoading={isSubmitting}>
                                    Submit Payment
                                </ButtonLoader>
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Withdraw Modal */}
            <Modal
                isOpen={withdrawModal.open}
                onClose={() => setWithdrawModal({ ...withdrawModal, open: false })}
                title={role === 'intern' ? 'Remove Skill Application' : 'Remove Course Application'}
                size="sm"
            >
                <div className="space-y-4">
                    <div className="bg-red-50 p-4 rounded-xl flex items-start gap-3">
                        <Trash2 className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <h4 className="font-bold text-red-700 text-sm">Are you sure?</h4>
                            <p className="text-xs text-red-600 mt-1">
                                You are about to remove <strong>{withdrawModal.courseTitle}</strong>.
                                This will remove the {role === 'intern' ? 'skill' : 'course'} and any pending fee records permanently.
                            </p>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            onClick={() => setWithdrawModal({ ...withdrawModal, open: false })}
                            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={confirmWithdraw}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium"
                        >
                            Confirm Remove
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default FeeManagement;
