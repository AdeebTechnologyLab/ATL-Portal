import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    Search, Calendar, Briefcase, CheckCircle, Send, Upload, CreditCard, AlertCircle, Link, Trash2, MessageSquare, ChevronLeft, ChevronRight, X, Eye
} from 'lucide-react';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { taskAPI } from '../../services/api';
import { getCategoryIcon, getCategoryColor, getCategoryBg } from '../../utils/taskCategoryIcons';
import Loader, { ButtonLoader } from '../../components/ui/Loader';
import BirthdayWish from '../../components/dashboard/BirthdayWish';

const BrowseTasks = () => {
    const { user } = useSelector((state) => state.auth);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('available');
    const [selectedTask, setSelectedTask] = useState(null);
    const [applyModalOpen, setApplyModalOpen] = useState(false);
    const [submitModalOpen, setSubmitModalOpen] = useState(false);
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [applicationMessage, setApplicationMessage] = useState('');
    const [submission, setSubmission] = useState({ notes: '', projectLink: '', bankName: '', accountName: '', accountNumber: '', requestedAmount: '' });
    const [tasks, setTasks] = useState([]);
    const [myTasks, setMyTasks] = useState([]);
    const [isFetching, setIsFetching] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [completedShowcase, setCompletedShowcase] = useState([]);
    const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
    const [feedbackData, setFeedbackData] = useState({ rating: 5, text: '' });
    const [viewingPayment, setViewingPayment] = useState(null);
    const [galleryOpen, setGalleryOpen] = useState(false);
    const [galleryImages, setGalleryImages] = useState([]);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    const location = useLocation();
    const navigate = useNavigate();
    
    useEffect(() => {
        if (location.state?.tab) {
            setActiveTab(location.state.tab);
        }
    }, [location.state]);

    const openGallery = (task) => {
        const imgs = task.images && task.images.length > 0 ? task.images : (task.image ? [task.image] : []);
        if (imgs.length > 0) {
            setGalleryImages(imgs);
            setCurrentImageIndex(0);
            setGalleryOpen(true);
        }
    };

    const nextImage = (e) => {
        e?.stopPropagation();
        setCurrentImageIndex((prev) => (prev + 1) % galleryImages.length);
    };

    const prevImage = (e) => {
        e?.stopPropagation();
        setCurrentImageIndex((prev) => (prev === 0 ? galleryImages.length - 1 : prev - 1));
    };

    // Fetch tasks on component mount
    useEffect(() => {
        fetchTasks();
        const refreshTasksSilently = () => fetchTasks(true);
        const refreshTimer = window.setInterval(refreshTasksSilently, 15000);
        window.addEventListener('job-applications-updated', refreshTasksSilently);
        return () => {
            window.clearInterval(refreshTimer);
            window.removeEventListener('job-applications-updated', refreshTasksSilently);
        };
    }, []);

    const fetchTasks = async (silent = false) => {
        if (!silent) setIsFetching(true);
        setError('');
        try {
            const [allTasksRes, myTasksRes, showcaseRes] = await Promise.all([
                taskAPI.getAll({}), // Fetch all statuses
                taskAPI.getMy(),
                taskAPI.getCompletedShowcase()
            ]);
            setTasks(allTasksRes.data.data || []);
            setMyTasks(myTasksRes.data.data || []);
            setCompletedShowcase(showcaseRes.data.data || []);
        } catch (err) {
            console.error('Error fetching tasks:', err);
            setError('Failed to load tasks. Please try again.');
        } finally {
            if (!silent) setIsFetching(false);
        }
    };

    // Check if user has applied to a task
    const getCurrentApplication = (task) => {
        const userId = String(user?.id || user?._id);
        return (task.applicants || [])
            .filter(application => String(application.user?._id || application.user) === userId)
            .sort((a, b) => (b.cycle || 1) - (a.cycle || 1))[0];
    };

    const hasApplied = (task) => {
        const application = getCurrentApplication(task);
        if (!application) return false;
        if (application.status) return application.status !== 'completed';
        const hasHistoricalFeedback = task.feedback?.some(feedback => String(feedback.user?._id || feedback.user) === String(user?.id || user?._id));
        return isAssignedToMe(task) || !hasHistoricalFeedback;
    };

    const hasCurrentFeedback = (task) => {
        const cycle = getCurrentApplication(task)?.cycle || 1;
        return task.feedback?.some(feedback => String(feedback.user?._id || feedback.user) === String(user?.id || user?._id) && (feedback.cycle || 1) === cycle);
    };

    const getCurrentPayment = (task) => {
        const userId = String(user?.id || user?._id);
        const cycle = getCurrentApplication(task)?.cycle || 1;
        return [...(task.paymentHistory || [])].reverse().find(payment =>
            String(payment.user?._id || payment.user) === userId && (payment.cycle || 1) === cycle
        );
    };

    const getUniqueApplicants = (task) => {
        const latestByUser = new Map();
        (task.applicants || []).forEach(applicant => latestByUser.set(String(applicant.user?._id || applicant.user), applicant));
        return [...latestByUser.values()];
    };

    // Check if task is assigned to current user
    const isAssignedToMe = (task) => {
        if (!task.assignedTo) return false;
        if (Array.isArray(task.assignedTo)) {
            return task.assignedTo.some(u => {
                const uId = u._id || u; // Handle populated object or ID string
                return String(uId) === String(user?.id) || String(uId) === String(user?._id);
            });
        }
        const tId = task.assignedTo._id || task.assignedTo;
        return String(tId) === String(user?.id) || String(tId) === String(user?._id);
    };

    // Check if I have submitted
    const hasSubmitted = (task) => {
        if (!task.submissions || !Array.isArray(task.submissions)) return false;
        const cycle = getCurrentApplication(task)?.cycle || 1;
        return task.submissions.some(s => (String(s.user?._id || s.user) === String(user?.id || user?._id)) && (s.cycle || 1) === cycle);
    };

    // Check if task deadline has passed
    const isExpired = (task) => {
        if (task.manualStatus === 'expired') return true;
        if (task.manualStatus === 'active') return false;
        if (task.isLifetime) return false;
        if (!task.deadline) return false;
        // Expired if not assigned to ANYONE and status is open
        return new Date(task.deadline) < new Date() && (!task.assignedTo || task.assignedTo.length === 0) && task.status === 'open';
    };

    // Get available tasks (open, assigned, or submitted - basically any not completed)
    const availableTasks = tasks.filter(t =>
        t.status !== 'completed' &&
        t.manualStatus !== 'completed' &&
        !isExpired(t) &&
        !hasApplied(t)
    );

    // Get tasks I've applied to (from my tasks)
    const appliedTasks = myTasks.filter(t => getCurrentApplication(t)?.status === 'applied' && !isAssignedToMe(t));

    // Get tasks assigned to me (in progress - not yet submitted, pending payment, or awaiting feedback)
    const assignedTasks = myTasks.filter(t =>
        isAssignedToMe(t) &&
        (t.status === 'assigned' ||
            (t.status === 'submitted' && !t.paymentSent) ||
            (t.status === 'completed' && t.paymentSent && !hasCurrentFeedback(t)))
    );

    // Get completed tasks (payment received AND feedback submitted)
    const completedTasks = myTasks.filter(t =>
        t.feedback?.some(f => String(f.user?._id || f.user) === String(user?.id || user?._id))
    );

    // Get expired tasks (deadline passed without assignment)
    const expiredTasks = tasks.filter(t => t.status === 'open' && isExpired(t));

    const getCurrentTasks = () => {
        switch (activeTab) {
            case 'applied': return appliedTasks;
            case 'assigned': return assignedTasks;
            case 'completed': return completedTasks;
            case 'expired': return expiredTasks;
            case 'showcase': return completedShowcase.filter(task => task.feedback?.length > 0);
            default: return availableTasks;
        }
    };

    const filteredTasks = getCurrentTasks().filter(t =>
        t.title?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Render category icon component
    const renderCategoryIcon = (category) => {
        const IconComponent = getCategoryIcon(category);
        return <IconComponent className={`w-6 h-6 ${getCategoryColor(category)}`} />;
    };

    const handleApply = async () => {
        if (!applicationMessage.trim() || !selectedTask) return;
        setIsSubmitting(true);
        setError('');
        try {
            await taskAPI.apply(selectedTask._id, applicationMessage);
            setApplyModalOpen(false);
            setApplicationMessage('');
            setSelectedTask(null);
            await fetchTasks(true);
            setActiveTab('applied');
            window.dispatchEvent(new CustomEvent('job-applications-updated'));
        } catch (err) {
            console.error('Error applying:', err);
            setError(err.response?.data?.message || 'Failed to apply. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSubmitWork = async () => {
        if (!submission.notes.trim() || !submission.bankName.trim() || !submission.accountName.trim() || !submission.accountNumber.trim() || !submission.requestedAmount || !selectedTask) {
            alert('Please fill all required fields');
            return;
        }
        setIsSubmitting(true);
        setError('');
        try {
            const formData = new FormData();
            formData.append('notes', submission.notes);
            formData.append('projectLink', submission.projectLink);
            const accountDetails = `Bank: ${submission.bankName} | Account Name: ${submission.accountName} | Account Number: ${submission.accountNumber}`;
            formData.append('accountDetails', accountDetails);
            formData.append('requestedAmount', submission.requestedAmount.replace(/,/g, ''));
            await taskAPI.submit(selectedTask._id, formData);
            setSubmitModalOpen(false);
            setSubmission({ notes: '', projectLink: '', bankName: '', accountName: '', accountNumber: '', requestedAmount: '' });
            setSelectedTask(null);
            fetchTasks();
        } catch (err) {
            console.error('Error submitting:', err);
            setError(err.response?.data?.message || 'Failed to submit. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleFeedbackSubmit = async () => {
        if (!feedbackData.text.trim() || !selectedTask) return;
        setIsSubmitting(true);
        setError('');
        try {
            await taskAPI.addFeedback(selectedTask._id, feedbackData);
            setFeedbackModalOpen(false);
            setFeedbackData({ rating: 5, text: '' });
            setSelectedTask(null);
            fetchTasks();
            alert('Feedback submitted successfully!');
        } catch (err) {
            console.error('Error submitting feedback:', err);
            setError(err.response?.data?.message || 'Failed to submit feedback. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isFetching) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader message="Loading Paid Tasks..." size="lg" />
            </div>
        );
    }

    return (
        <div className="space-y-4 sm:space-y-6">
            <BirthdayWish />
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Job Posting</h1>
                    <p className="text-xs sm:text-base text-gray-500 dark:text-slate-400">Browse, apply, and complete job postings</p>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    <span className="text-red-600">{error}</span>
                </div>
            )}

            <div>
                <div className="grid grid-cols-5 gap-1 rounded-xl bg-gray-100 dark:bg-slate-900 p-1 border border-gray-200/60 dark:border-slate-700">
                    {[
                        { id: 'available', label: 'Available', count: availableTasks.length },
                        { id: 'applied', label: 'Applied', count: appliedTasks.length },
                        { id: 'assigned', label: 'Assigned', count: assignedTasks.length },
                        { id: 'completed', label: 'Completed', count: completedTasks.length },
                        { id: 'expired', label: 'Expired', count: expiredTasks.length }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id)}
                            className={`min-w-0 px-0.5 sm:px-4 py-2 rounded-lg transition-all flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 ${
                                activeTab === tab.id
                                    ? 'bg-white dark:bg-slate-800 text-primary shadow-sm'
                                    : 'text-gray-500 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-slate-800/60'
                            }`}
                        >
                            <span className="max-w-full text-[7px] min-[380px]:text-[8px] sm:text-xs font-black uppercase tracking-tight sm:tracking-wider truncate">{tab.label}</span>
                            <span className={`min-w-4 h-4 sm:min-w-5 sm:h-5 px-1 sm:px-1.5 rounded flex items-center justify-center text-[8px] sm:text-[10px] font-black ${
                                activeTab === tab.id
                                    ? 'bg-primary/10 text-primary'
                                    : 'bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-slate-300'
                            }`}>
                                {tab.count}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Search */}
            <div className="bg-transparent sm:bg-white dark:bg-transparent sm:dark:bg-slate-900 rounded-xl sm:rounded-2xl p-0 sm:p-4 border-0 sm:border border-gray-100 dark:border-slate-700">
                <div className="flex items-center bg-white dark:bg-slate-900 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-200 dark:border-slate-700 shadow-sm">
                    <Search className="w-5 h-5 text-gray-400 mr-3" />
                    <input
                        type="text"
                        placeholder="Search tasks..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="!bg-transparent !border-0 !shadow-none !ring-0 outline-none w-full text-gray-700 dark:text-white text-sm p-0 focus:!ring-0 focus:!border-0"
                    />
                </div>
            </div>

            {/* Tasks Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-6">
                {filteredTasks.map((task, index) => {
                    const assigned = isAssignedToMe(task);
                    const submitted = hasSubmitted(task);
                    const isPaid = task.paymentSent && task.status === 'completed';
                    const currentPayment = getCurrentPayment(task);
                    const userId = String(user?.id || user?._id);
                    const userPaymentHistory = (task.paymentHistory || []).filter(payment =>
                        String(payment.user?._id || payment.user) === userId
                    );
                    const expired = isExpired(task);
                    const hasUserFeedback = hasCurrentFeedback(task);

                    return (
                        <motion.div
                            key={task._id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className={`bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl p-3.5 sm:p-6 border border-gray-100 dark:border-slate-700 shadow-sm hover:shadow-lg transition-all ${submitted && !isPaid ? 'opacity-75' : ''}`}
                        >
                            {(task.images && task.images.length > 0 || task.image) && (
                                <div 
                                    className="mb-3 sm:mb-4 aspect-video rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center cursor-pointer relative group"
                                    onClick={() => openGallery(task)}
                                >
                                    <img src={task.images && task.images.length > 0 ? task.images[0] : task.image} alt={task.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                         <span className="opacity-0 group-hover:opacity-100 bg-white text-gray-900 px-3 py-1.5 rounded-lg text-sm font-medium shadow-lg transition-opacity duration-300">
                                            View Pictures
                                         </span>
                                    </div>
                                    {((task.images && task.images.length > 1)) && (
                                        <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-md max-w-max">
                                            {task.images.length} images
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="flex items-start justify-between gap-2 sm:gap-3 mb-2.5 sm:mb-3">
                                <h3 className="font-bold text-sm sm:text-base text-gray-900 dark:text-white leading-snug break-words">{task.title}</h3>
                                <div className="flex items-center gap-2 shrink-0">
                                    {expired && <Badge variant="danger">Deadline Over</Badge>}
                                    {hasApplied(task) && !assigned && <Badge variant="warning">Applied</Badge>}
                                    {assigned && !submitted && <Badge variant="info">Assigned</Badge>}
                                    {submitted && !isPaid && <Badge variant="warning">Pending Payment</Badge>}
                                    {isPaid && !hasUserFeedback && <Badge variant="warning">Awaiting Feedback</Badge>}
                                    {isPaid && hasUserFeedback && <Badge variant="success"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>}
                                </div>
                            </div>

                            <div className="mb-3 sm:mb-4">
                                <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 line-clamp-2">{task.description}</p>
                                {task.description?.length > 100 && (
                                    <button 
                                        onClick={() => { setSelectedTask(task); setViewModalOpen(true); }}
                                        className="text-xs text-primary hover:text-purple-700 font-medium mt-1"
                                    >
                                        Read more
                                    </button>
                                )}
                            </div>


                            <div className="flex flex-nowrap sm:flex-wrap gap-1.5 sm:gap-1 mb-3 sm:mb-4 overflow-x-auto no-scrollbar pb-0.5">
                                {(task.skills || '').split(',').map((skill, i) => (
                                    <span key={i} className="flex-none px-2 py-1 bg-purple-50 dark:bg-slate-800 text-primary dark:text-orange-300 text-[10px] sm:text-xs rounded-md border border-transparent dark:border-slate-700 whitespace-nowrap">
                                        {skill.trim()}
                                    </span>
                                ))}
                            </div>

                            <div className="flex items-center justify-between gap-3 text-xs sm:text-sm mb-3 sm:mb-4">
                                <span className="flex items-center gap-1 text-gray-500 dark:text-slate-400">
                                    <Calendar className="w-4 h-4" />
                                    {task.isLifetime ? 'Lifetime' : (task.deadline && new Date(task.deadline).toLocaleDateString())}
                                </span>
                                <span className={task.type === 'product' ? "font-bold text-primary" : "font-bold text-primary"}>
                                    Rs {isNaN(Number(task.budget)) ? task.budget : Number(task.budget).toLocaleString()}
                                </span>
                            </div>

                            {/* Always show this user's historical payments on the same job post. */}
                            {userPaymentHistory.length > 0 && (
                                <div className="mb-3 sm:mb-4 p-2.5 sm:p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl border border-emerald-200 dark:border-emerald-900">
                                    <p className="text-[10px] sm:text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-2">
                                        Your Payments
                                    </p>
                                    <div className="flex sm:block gap-2 overflow-x-auto no-scrollbar">
                                        {[...userPaymentHistory].reverse().map((payment, paymentIndex) => (
                                            <div key={payment._id || `${payment.cycle || 1}-${paymentIndex}`} className="flex flex-none sm:flex items-center justify-between gap-4 sm:gap-3 text-xs rounded-lg bg-white/70 dark:bg-slate-900/60 px-2.5 py-2 sm:bg-transparent sm:dark:bg-transparent sm:px-0">
                                                <div>
                                                    <p className="font-semibold text-gray-700 dark:text-slate-200 whitespace-nowrap">Cycle {payment.cycle || 1}</p>
                                                    <p className="text-gray-500 dark:text-slate-400 whitespace-nowrap">
                                                        {payment.paidAt ? new Date(payment.paidAt).toLocaleDateString() : 'Payment date unavailable'}
                                                    </p>
                                                </div>
                                                <span className="font-black text-emerald-700">
                                                    Rs {Number(payment.amount || 0).toLocaleString()}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="pt-3 sm:pt-4 border-t border-gray-100 dark:border-slate-700 space-y-2.5">
                                {expired && activeTab !== 'showcase' && (
                                    <div className="w-full py-2.5 bg-gray-100 text-gray-400 rounded-xl font-medium text-center flex items-center justify-center gap-2 cursor-not-allowed">
                                        <AlertCircle className="w-4 h-4" />
                                        Deadline Over
                                    </div>
                                )}
                                {!expired && !hasApplied(task) && !assigned && activeTab === 'available' && task.status !== 'completed' && task.manualStatus !== 'completed' && (
                                    <button
                                        onClick={() => { setSelectedTask(task); setApplyModalOpen(true); }}
                                        className="w-full min-h-11 py-2.5 bg-primary hover:bg-orange-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm"
                                    >
                                        <Send className="w-4 h-4" />
                                        Apply Now
                                    </button>
                                )}
                                {hasApplied(task) && !assigned && (
                                    <div className="text-center text-sm text-gray-500 py-2">Application under review</div>
                                )}
                                {assigned && !submitted && activeTab !== 'showcase' && (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => { setSelectedTask(task); setSubmitModalOpen(true); }}
                                            className="flex-[1.35] min-w-0 px-3 py-2.5 bg-primary hover:bg-primary text-white rounded-xl font-medium flex items-center justify-center gap-1.5 whitespace-nowrap"
                                        >
                                            <Upload className="w-4 h-4" />
                                            Submit Project
                                        </button>
                                        <button
                                            onClick={() => navigate('/job/job-chat', { state: { taskId: task._id } })}
                                            className="flex-1 min-w-0 px-2 py-2.5 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-xl font-medium flex items-center justify-center gap-1.5 whitespace-nowrap"
                                        >
                                            <MessageSquare className="w-4 h-4" />
                                            Job Chat
                                        </button>
                                    </div>
                                )}
                                {submitted && !isPaid && (
                                    <div className="text-center text-sm text-amber-600 py-2">Awaiting verification & payment</div>
                                )}
                                {(isPaid || currentPayment) && (
                                    <div className="flex flex-col gap-2.5">
                                        <button
                                            onClick={() => setViewingPayment({ task, payment: currentPayment })}
                                            className="w-full min-h-11 py-2.5 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors shadow-sm"
                                        >
                                            <Eye className="w-4 h-4" />
                                            View Payment
                                        </button>
                                        {activeTab !== 'showcase' && !hasUserFeedback && (
                                            <>
                                                <div className="text-center text-xs text-amber-600 mb-1">
                                                    Action Required: Please leave feedback to complete this task.
                                                </div>
                                                <button
                                                    onClick={() => { setSelectedTask(task); setFeedbackModalOpen(true); }}
                                                    className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 animate-pulse"
                                                >
                                                    <span>★</span> Leave Feedback
                                                </button>
                                            </>
                                        )}
                                    </div>
                                )}
                                {activeTab === 'showcase' && task.feedback && task.feedback.length > 0 && (
                                    <div className="mt-4 space-y-3 bg-indigo-50/50 dark:bg-gray-900 p-4 rounded-xl border border-indigo-100 dark:border-gray-700">
                                        <p className="text-xs font-bold text-indigo-700 dark:text-primary uppercase tracking-widest">Jobber Feedback</p>
                                        {task.feedback.map((f, i) => (
                                            <div key={i} className="border-t border-indigo-100 dark:border-gray-700 pt-2 first:border-0 first:pt-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center overflow-hidden border border-indigo-200 shadow-sm">
                                                            {f.user?.photo ? (
                                                                <img src={f.user.photo} alt={f.user.name} className="w-full h-full object-cover" />
                                                            ) : (
                                                            <span className="text-xs font-bold text-indigo-600 dark:text-primary">{(f.user?.name || 'A').charAt(0)}</span>
                                                            )}
                                                        </div>
                                                        <div>
                                                            <span className="block text-sm font-semibold text-indigo-900 dark:text-white">{f.user?.name || 'Anonymous'}</span>
                                                            <div className="flex text-amber-500 text-xs mt-0.5" aria-label={`${f.rating || 0} out of 5 stars`}>
                                                                {[...Array(5)].map((_, starIndex) => (
                                                                    <span key={starIndex}>{starIndex < (f.rating || 0) ? '★' : '☆'}</span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <p className="text-sm text-indigo-800 dark:text-gray-300 italic">"{f.text}"</p>
                                                <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-1">Total Earnings: Rs {Number(f.user?.totalEarnings || 0).toLocaleString()}</p>
                                                <div className="hidden" aria-hidden="true">
                                                    {[...Array(5)].map((_, starIndex) => (
                                                        <span key={starIndex}>{starIndex < (f.rating || 0) ? '★' : '☆'}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {task.applicants?.length > 0 && !expired && activeTab !== 'showcase' && (
                                <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-100 dark:border-slate-700">
                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                                        Applied Users ({getUniqueApplicants(task).length})
                                    </p>
                                    <div className="flex flex-nowrap sm:flex-wrap gap-2 overflow-x-auto no-scrollbar pb-1">
                                        {getUniqueApplicants(task).map((applicant, applicantIndex) => (
                                            <div
                                                key={applicant.user?._id || applicantIndex}
                                                className="flex flex-none items-center gap-2 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-full pr-3 py-1 pl-1"
                                            >
                                                <div className="w-7 h-7 rounded-full overflow-hidden bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                                                    {applicant.user?.photo ? (
                                                        <img src={applicant.user.photo} alt={applicant.user?.name || 'Applicant'} className="w-full h-full object-cover" />
                                                    ) : (
                                                        applicant.user?.name?.charAt(0) || '?'
                                                    )}
                                                </div>
                                                <span className="text-xs font-semibold text-gray-700 dark:text-slate-300 whitespace-nowrap">
                                                    {applicant.user?.name || 'Applicant'} · Rs {Number(applicant.user?.totalEarnings || 0).toLocaleString()}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                        </motion.div>
                    );
                })}
            </div>

            {filteredTasks.length === 0 && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 sm:p-12 border border-gray-100 dark:border-slate-700 text-center">
                    <Briefcase className="w-10 h-10 sm:w-12 sm:h-12 text-gray-300 dark:text-slate-600 mx-auto mb-3 sm:mb-4" />
                    <p className="text-sm sm:text-base text-gray-500 dark:text-slate-400">No tasks found</p>
                </div>
            )}

            {/* Leave Feedback Modal */}
            <Modal isOpen={Boolean(viewingPayment)} onClose={() => setViewingPayment(null)} title="Payment Details" size="md" centerOnMobile>
                {viewingPayment && (
                    <div className="space-y-4">
                        <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                            <p className="font-bold text-gray-900">{viewingPayment.task.title}</p>
                            <p className="text-sm text-gray-500 mt-1">Payment received</p>
                            <p className="text-2xl font-black text-primary mt-2">Rs {Number(viewingPayment.payment?.amount || 0).toLocaleString()}</p>
                        </div>
                        {viewingPayment.payment?.paymentProof ? (
                            <button
                                type="button"
                                onClick={() => {
                                    setGalleryImages([viewingPayment.payment.paymentProof]);
                                    setCurrentImageIndex(0);
                                    setGalleryOpen(true);
                                }}
                                className="block w-full rounded-xl overflow-hidden border border-gray-200 bg-gray-50 cursor-zoom-in"
                                title="Open full image"
                            >
                                <img src={viewingPayment.payment.paymentProof} alt="Payment screenshot" className="w-full max-h-[420px] object-contain" />
                                <span className="flex items-center justify-center gap-2 py-3 text-sm font-bold text-primary"><Eye className="w-4 h-4" /> Open Full Screenshot</span>
                            </button>
                        ) : (
                            <div className="p-6 text-center text-sm text-gray-500 bg-gray-50 rounded-xl">Payment screenshot is not available for this older payment.</div>
                        )}
                        <button onClick={() => setViewingPayment(null)} className="w-full py-3 bg-primary text-white rounded-xl font-bold">Close</button>
                    </div>
                )}
            </Modal>

            {/* Leave Feedback Modal */}
            <Modal isOpen={feedbackModalOpen} onClose={() => setFeedbackModalOpen(false)} title="Share Your Experience" size="md" centerOnMobile>
                {selectedTask && (
                    <div className="space-y-4">
                        <div className="p-4 bg-indigo-50 rounded-xl">
                            <h3 className="font-semibold text-indigo-900">{selectedTask.title}</h3>
                            <p className="text-sm text-indigo-600 mt-1">Submit feedback for this completed task</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2 text-center">Your Rating</label>
                            <div className="flex justify-center gap-2 text-3xl">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        onClick={() => setFeedbackData({ ...feedbackData, rating: star })}
                                        className={`transition-colors ${feedbackData.rating >= star ? 'text-amber-500' : 'text-gray-300'}`}
                                    >
                                        ★
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Write your feedback *</label>
                            <textarea
                                value={feedbackData.text}
                                onChange={(e) => setFeedbackData({ ...feedbackData, text: e.target.value })}
                                placeholder="How was your experience working on this task?"
                                rows={4}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary outline-none"
                            />
                        </div>

                        <div className="flex gap-3 pt-4 border-t">
                            <button onClick={() => setFeedbackModalOpen(false)} className="flex-1 py-3 text-gray-600 hover:bg-gray-100 rounded-xl font-medium">
                                Cancel
                            </button>
                            <button
                                onClick={handleFeedbackSubmit}
                                disabled={!feedbackData.text.trim() || isSubmitting}
                                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                <ButtonLoader isLoading={isSubmitting}>
                                    Submit Feedback
                                </ButtonLoader>
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Apply Modal */}
            <Modal isOpen={applyModalOpen} onClose={() => setApplyModalOpen(false)} title={selectedTask?.type === 'product' ? "Buy Item" : "Apply for Task"} size="md" centerOnMobile>
                {selectedTask && (
                    <div className="space-y-4">
                        <div className="p-4 bg-gray-50 rounded-xl">
                            <h3 className="font-semibold text-gray-900">{selectedTask.title}</h3>
                            <p className={`text-sm font-medium mt-1 ${selectedTask.type === 'product' ? 'text-primary' : 'text-primary'}`}>
                                {selectedTask.type === 'product' ? 'Price: ' : 'Budget: '} Rs {isNaN(Number(selectedTask.budget)) ? selectedTask.budget : Number(selectedTask.budget).toLocaleString()}
                            </p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                {selectedTask.type === 'product' ? 'At what price do you want to buy? *' : 'Why should we hire you? *'}
                            </label>
                            <textarea
                                value={applicationMessage}
                                onChange={(e) => setApplicationMessage(e.target.value)}
                                placeholder={selectedTask.type === 'product' ? "Enter your proposed buying price..." : "Describe your experience and why you're the best fit..."}
                                rows={4}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl"
                            />
                        </div>
                        <div className="flex gap-3 pt-4 border-t">
                            <button onClick={() => setApplyModalOpen(false)} className="flex-1 py-3 text-gray-600 hover:bg-gray-100 rounded-xl font-medium">
                                Cancel
                            </button>
                            <button
                                onClick={handleApply}
                                disabled={isSubmitting}
                                className={`flex-1 py-3 text-white rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-70 ${selectedTask.type === 'product' ? 'bg-primary hover:bg-primary' : 'bg-primary hover:bg-purple-700'}`}
                            >
                                <ButtonLoader isLoading={isSubmitting}>
                                    {selectedTask.type === 'product' ? 'Submit Offer' : 'Submit Application'}
                                </ButtonLoader>
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Submit Work Modal */}
            <Modal isOpen={submitModalOpen} onClose={() => setSubmitModalOpen(false)} title="Submit Your Work" size="md" centerOnMobile>
                {selectedTask && (
                    <div className="space-y-4">
                        <div className="p-4 bg-gray-50 rounded-xl">
                            <h3 className="font-semibold text-gray-900">{selectedTask.title}</h3>
                            <p className="text-sm text-gray-500 mt-1">Deadline: {selectedTask.isLifetime ? 'Lifetime' : (selectedTask.deadline && new Date(selectedTask.deadline).toLocaleDateString())}</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Work Description / Notes *</label>
                            <textarea
                                value={submission.notes}
                                onChange={(e) => setSubmission({ ...submission, notes: e.target.value })}
                                placeholder="Describe what you've completed..."
                                rows={3}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                <Link className="w-4 h-4 inline mr-1" />
                                Project Link (e.g., GitHub, Drive)
                            </label>
                            <input
                                type="url"
                                value={submission.projectLink}
                                onChange={(e) => setSubmission({ ...submission, projectLink: e.target.value })}
                                placeholder="https://github.com/your-repo"
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                <CreditCard className="w-4 h-4 inline mr-1" />
                                Payment Account Details *
                            </label>
                            <div className="space-y-2">
                                <input
                                    type="text"
                                    value={submission.bankName}
                                    onChange={(e) => setSubmission({ ...submission, bankName: e.target.value })}
                                    placeholder="Bank Name (e.g., HBL, Meezan, JazzCash)"
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                                />
                                <input
                                    type="text"
                                    value={submission.accountName}
                                    onChange={(e) => setSubmission({ ...submission, accountName: e.target.value })}
                                    placeholder="Account Name (e.g., Muhammad Ali)"
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                                />
                                <input
                                    type="text"
                                    value={submission.accountNumber}
                                    onChange={(e) => setSubmission({ ...submission, accountNumber: e.target.value })}
                                    placeholder="Account Number / IBAN / Phone"
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                                />
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    value={submission.requestedAmount}
                                    onChange={(e) => {
                                        const digits = e.target.value.replace(/\D/g, '');
                                        setSubmission({ ...submission, requestedAmount: digits ? Number(digits).toLocaleString('en-US') : '' });
                                    }}
                                    placeholder="Requested Payment (Rs)"
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                                />
                            </div>
                        </div>
                        <div className="flex gap-3 pt-4 border-t">
                            <button onClick={() => setSubmitModalOpen(false)} className="flex-1 py-3 text-gray-600 hover:bg-gray-100 rounded-xl font-medium">
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmitWork}
                                disabled={isSubmitting}
                                className="flex-1 py-3 bg-primary hover:bg-primary text-white rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-70"
                            >
                                <ButtonLoader isLoading={isSubmitting}>
                                    Submit Work
                                </ButtonLoader>
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* View Description Modal */}
            <Modal isOpen={viewModalOpen} onClose={() => setViewModalOpen(false)} title="Task Details" size="md" centerOnMobile>
                {selectedTask && (
                    <div className="space-y-4">
                        <div className="p-4 bg-gray-50 rounded-xl">
                            <h3 className="font-semibold text-gray-900">{selectedTask.title}</h3>
                            <p className="text-sm text-primary font-medium mt-1">
                                Budget: Rs {isNaN(Number(selectedTask.budget)) ? selectedTask.budget : Number(selectedTask.budget).toLocaleString()}
                            </p>
                        </div>
                        <div className="p-4 bg-white border border-gray-100 rounded-xl whitespace-pre-wrap text-sm text-gray-700 max-h-96 overflow-y-auto">
                            {selectedTask.description}
                        </div>
                        <div className="pt-4 border-t">
                            <button onClick={() => setViewModalOpen(false)} className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-medium transition-colors">
                                Close
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Image Gallery Fullscreen View */}
            {galleryOpen && galleryImages.length > 0 && (
                <div className="fixed inset-0 z-[1200] bg-black flex items-center justify-center flex-col">
                    <div className="absolute top-4 right-4 flex items-center gap-4">
                        <span className="text-white/70 text-sm">{currentImageIndex + 1} / {galleryImages.length}</span>
                        <button 
                            onClick={() => setGalleryOpen(false)} 
                            className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-full transition-all"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="relative w-full max-w-5xl px-4 md:px-12 flex items-center justify-center">
                        {galleryImages.length > 1 && (
                            <button 
                                onClick={prevImage}
                                className="absolute left-2 md:left-4 bg-white/10 hover:bg-white/20 text-white p-3 rounded-full transition-all z-10"
                            >
                                <ChevronLeft className="w-6 h-6" />
                            </button>
                        )}
                        
                        <img 
                            src={galleryImages[currentImageIndex]} 
                            alt={`Gallery image ${currentImageIndex + 1}`} 
                            className="max-h-[85vh] w-auto max-w-full object-contain rounded-lg"
                        />

                        {galleryImages.length > 1 && (
                            <button 
                                onClick={nextImage}
                                className="absolute right-2 md:right-4 bg-white/10 hover:bg-white/20 text-white p-3 rounded-full transition-all z-10"
                            >
                                <ChevronRight className="w-6 h-6" />
                            </button>
                        )}
                    </div>
                    
                    {/* Thumbnails */}
                    {galleryImages.length > 1 && (
                        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 px-4 overflow-x-auto pb-2">
                            {galleryImages.map((img, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setCurrentImageIndex(idx)}
                                    className={`w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all ${currentImageIndex === idx ? 'border-primary scale-105 opacity-100' : 'border-transparent opacity-50 hover:opacity-100'}`}
                                >
                                    <img src={img} alt={`Thumbnail ${idx}`} className="w-full h-full object-cover" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default BrowseTasks;
