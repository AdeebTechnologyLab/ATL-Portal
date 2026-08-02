import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Search, Calendar, CheckCircle, Eye, Users, Briefcase, AlertCircle, Link, Trash2, PenSquare, MessageSquare, Star, X, ChevronLeft, ChevronRight, ImagePlus, DollarSign
} from 'lucide-react';
import Loader, { ButtonLoader } from '../../components/ui/Loader';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import ProfileAvatar from '../../components/ui/ProfileAvatar';
import { taskAPI, userNotificationAPI, userAPI } from '../../services/api';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { getCategoryIcon, getCategoryColor, getCategoryBg } from '../../utils/taskCategoryIcons';

const PaidTasksManagement = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('all');
    const [isLoading, setIsLoading] = useState(false);
    const [isFetching, setIsFetching] = useState(true);
    const { user } = useSelector((state) => state.auth);
    const navigate = useNavigate();
    const [isDeleting, setIsDeleting] = useState(false);
    const [deletingApplicantId, setDeletingApplicantId] = useState(null);
    const [selectedTask, setSelectedTask] = useState(null);
    const [editingTask, setEditingTask] = useState(null);
    const [viewMode, setViewMode] = useState(null);
    const [viewingProfile, setViewingProfile] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [completedShowcase, setCompletedShowcase] = useState([]);
    const [editingFeedback, setEditingFeedback] = useState(null);
    const [editFeedbackData, setEditFeedbackData] = useState({ text: '', rating: 5 });
    const [isSavingFeedback, setIsSavingFeedback] = useState(false);
    const [error, setError] = useState('');
    const [teachers, setTeachers] = useState([]);
    const [paymentTask, setPaymentTask] = useState(null);
    const [viewingPaymentHistoryTask, setViewingPaymentHistoryTask] = useState(null);
    const [viewingPaymentProof, setViewingPaymentProof] = useState(null);
    const [paymentAmounts, setPaymentAmounts] = useState({});
    const [paymentProof, setPaymentProof] = useState('');
    const [isCompletingPayment, setIsCompletingPayment] = useState(false);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        budget: '',
        deadline: '',
        skills: '',
        category: 'web',
        type: 'task',
        images: [],
        isLifetime: false,
        manualStatus: 'none',
        jobManagers: []
    });
    const [imagePreviews, setImagePreviews] = useState([]);

    const [galleryOpen, setGalleryOpen] = useState(false);
    const [galleryImages, setGalleryImages] = useState([]);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

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

    useEffect(() => {
        const title = (formData.title || '').toLowerCase();

        if (title.includes('web dev without coding')) {
            setFormData(prev => ({ ...prev, category: 'Web Dev Without Coding' }));
        } else if (title.includes('app dev without coding')) {
            setFormData(prev => ({ ...prev, category: 'App Dev Without Coding' }));
        } else if (title.includes('web development') || title.includes('site') || title.includes('react') || title.includes('html') || title.includes('frontend') || title.includes('backend') || title.includes('fullstack')) {
            setFormData(prev => ({ ...prev, category: 'Web Development' }));
        } else if (title.includes('app development') || title.includes('ios') || title.includes('android') || title.includes('flutter')) {
            setFormData(prev => ({ ...prev, category: 'App Development' }));
        } else if (title.includes('cyber security')) {
            setFormData(prev => ({ ...prev, category: 'Cyber Security' }));
        } else if (title.includes('machine learning') || title.includes('ml')) {
            setFormData(prev => ({ ...prev, category: 'Machine learning' }));
        } else if (title.includes('ai') || title.includes('intelligence')) {
            setFormData(prev => ({ ...prev, category: 'ai' }));
        } else if (title.includes('iot') || title.includes('internet of thing')) {
            setFormData(prev => ({ ...prev, category: 'Internet of Thing [IOT]' }));
        } else if (title.includes('office work')) {
            setFormData(prev => ({ ...prev, category: 'Office Work [IT]' }));
        } else if (title.includes('freelanc')) {
            setFormData(prev => ({ ...prev, category: 'Freelancing' }));
        } else if (title.includes('marketing') || title.includes('ads')) {
            setFormData(prev => ({ ...prev, category: 'Digital Marketing, Ads' }));
        } else if (title.includes('video edit')) {
            setFormData(prev => ({ ...prev, category: 'Video Editing' }));
        } else if (title.includes('graphic design')) {
            setFormData(prev => ({ ...prev, category: 'Graphic Designer' }));
        } else if (title.includes('e-commerce') || title.includes('amazon') || title.includes('shopify')) {
            setFormData(prev => ({ ...prev, category: 'E-Commerce' }));
        } else if (title.includes('ui') || title.includes('ux') || title.includes('design') || title.includes('figma')) {
            setFormData(prev => ({ ...prev, category: 'UX/UI Designing' }));
        } else if (title.includes('youtube')) {
            setFormData(prev => ({ ...prev, category: 'Youtuber Course' }));
        } else if (title.includes('arch')) {
            setFormData(prev => ({ ...prev, category: 'Home Architecture' }));
        } else if (title.includes('programm')) {
            setFormData(prev => ({ ...prev, category: 'Programming' }));
        } else if (title.includes('tax')) {
            setFormData(prev => ({ ...prev, category: 'Taxation' }));
        } else if (title.includes('trad')) {
            setFormData(prev => ({ ...prev, category: 'Trading' }));
        } else if (title.includes('truck') || title.includes('dispatch')) {
            setFormData(prev => ({ ...prev, category: 'Truck Dispatching' }));
        } else if (title.includes('software dev')) {
            setFormData(prev => ({ ...prev, category: 'Software Development' }));
        }
    }, [formData.title]);

    // Fetch tasks on component mount
    useEffect(() => {
        fetchTasks();
        if (user?.role === 'admin') {
            userAPI.getVerifiedByRole('teacher')
                .then(res => setTeachers(res.data.data || []))
                .catch(() => setTeachers([]));
        }
    }, []);

    const fetchTasks = async (silent = false) => {
        if (!silent) setIsFetching(true);
        setError('');
        try {
            const [allRes, showcaseRes] = await Promise.all([
                taskAPI.getAll(),
                taskAPI.getCompletedShowcase()
            ]);
            const loadedTasks = allRes.data.data || [];
            setTasks(user?.role === 'teacher' ? loadedTasks.filter(task => {
                const managerIds = task.jobManagers?.length ? task.jobManagers.map(manager => manager?._id || manager) : [task.jobManager?._id || task.jobManager || task.createdBy?._id || task.createdBy];
                return managerIds.some(id => String(id) === String(user?.id || user?._id));
            }) : loadedTasks);
            setCompletedShowcase(showcaseRes.data.data || []);
        } catch (err) {
            console.error('Error fetching tasks:', err);
            setError('Failed to load tasks. Please try again.');
        } finally {
            if (!silent) setIsFetching(false);
        }
    };

    const isExpired = (task) => {
        if (task.manualStatus === 'expired') return true;
        if (task.manualStatus === 'active') return false;
        if (task.isLifetime) return false;
        if (!task.deadline) return false;
        // Expired if not assigned to ANYONE and status is open
        return new Date(task.deadline) < new Date() && (!task.assignedTo || task.assignedTo.length === 0) && task.status === 'open';
    };

    const getPendingApplicants = (task) => {
        const latestByUser = new Map();
        (task.applicants || []).forEach(applicant => {
            const applicantId = String(applicant.user?._id || applicant.user);
            const existing = latestByUser.get(applicantId);
            if (!existing || (applicant.cycle || 1) >= (existing.cycle || 1)) {
                latestByUser.set(applicantId, applicant);
            }
        });

        return [...latestByUser.values()].filter(applicant => {
            const applicantId = applicant.user?._id || applicant.user;
            const isAlreadyAssigned = (task.assignedTo || []).some(assignedUser =>
                String(assignedUser?._id || assignedUser) === String(applicantId)
            );
            return applicant.status === 'applied' && !isAlreadyAssigned;
        });
    };

    // Filter tasks by status category
    const openTasks = tasks.filter(t => t.status === 'open' && !isExpired(t));
    const applicantTasks = tasks.filter(task => getPendingApplicants(task).length > 0);
    // Assigned or submitted means "in progress" effectively
    const assignedTasks = tasks.filter(t => t.status === 'assigned' || t.status === 'submitted');
    const submittedTasks = tasks.filter(t => (t.submissions || []).length > 0);
    const completedTasks = tasks.filter(t => t.status === 'completed');
    const expiredTasks = tasks.filter(t => isExpired(t));

    const getFilteredByTab = () => {
        switch (activeTab) {
            case 'applicants': return applicantTasks;
            case 'open': return openTasks;
            case 'assigned': return assignedTasks;
            case 'submitted': return submittedTasks;
            case 'completed': return completedTasks;
            case 'expired': return expiredTasks;
            case 'showcase': return completedShowcase;
            default: return tasks;
        }
    };

    const handleEditFeedback = (task, feedback) => {
        setEditingFeedback({ taskId: task._id, feedbackId: feedback._id });
        setEditFeedbackData({ text: feedback.text, rating: feedback.rating });
    };

    const handleSaveFeedback = async () => {
        if (!editingFeedback || !editFeedbackData.text.trim()) return;
        setIsSavingFeedback(true);
        try {
            await taskAPI.editFeedback(editingFeedback.taskId, editingFeedback.feedbackId, editFeedbackData);
            setEditingFeedback(null);
            setEditFeedbackData({ text: '', rating: 5 });
            fetchTasks();
            alert('Feedback updated successfully!');
        } catch (err) {
            console.error('Error editing feedback:', err);
            alert(err.response?.data?.message || 'Failed to update feedback');
        } finally {
            setIsSavingFeedback(false);
        }
    };

    const handleDeleteFeedback = async (taskId, feedbackId) => {
        if (!window.confirm('Are you sure you want to delete this feedback? This action cannot be undone.')) return;
        try {
            await taskAPI.deleteFeedback(taskId, feedbackId);
            fetchTasks();
            alert('Feedback deleted successfully!');
        } catch (err) {
            console.error('Error deleting feedback:', err);
            alert(err.response?.data?.message || 'Failed to delete feedback');
        }
    };

    const filteredTasks = getFilteredByTab().filter((task) =>
        task.title?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getStatusConfig = (status) => {
        switch (status) {
            case 'open': return { variant: 'success', label: 'Open for Applications' };
            case 'assigned': return { variant: 'warning', label: 'Assigned' };
            case 'submitted': return { variant: 'info', label: 'Pending Review' };
            case 'completed': return { variant: 'primary', label: 'Completed' };
            default: return { variant: 'secondary', label: status };
        }
    };

    const handleCreateTask = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const submitData = new FormData();
            submitData.append('title', formData.title);
            submitData.append('description', formData.description);
            submitData.append('budget', formData.budget);
            submitData.append('deadline', formData.deadline);
            submitData.append('skills', formData.skills);
            if (user?.role === 'admin') formData.jobManagers.forEach(managerId => submitData.append('jobManagers', managerId));
            submitData.append('type', formData.type);
            submitData.append('isLifetime', formData.isLifetime);
            submitData.append('manualStatus', formData.manualStatus);
            
            if (formData.images && formData.images.length > 0) {
                formData.images.forEach(img => {
                    if (img instanceof File) {
                        submitData.append('images', img);
                    } else if (typeof img === 'string') {
                        submitData.append('existingImages', img);
                    }
                });
            }

            if (editingTask) {
                await taskAPI.update(editingTask._id, submitData);
            } else {
                await taskAPI.create(submitData);
            }
            setIsModalOpen(false);
            setEditingTask(null);
            setFormData({ title: '', description: '', budget: '', deadline: '', skills: '', category: 'web', type: 'task', images: [], isLifetime: false, manualStatus: 'none', jobManagers: [] });
            setImagePreviews([]);
            await fetchTasks(true); // Refresh cards without replacing the page with a loader
        } catch (err) {
            console.error('Error saving task:', err);
            setError(err.response?.data?.message || 'Failed to save task/item');
        } finally {
            setIsLoading(false);
        }
    };

    const handleEditClick = (task) => {
        setEditingTask(task);
        setFormData({
            title: task.title,
            description: task.description,
            budget: task.budget,
            deadline: task.deadline ? new Date(task.deadline).toISOString().split('T')[0] : '',
            skills: task.skills,
            category: task.category || 'web',
            type: task.type || 'task',
            images: task.images && task.images.length > 0 ? task.images : (task.image ? [task.image] : []),
            isLifetime: task.isLifetime || false,
            manualStatus: task.manualStatus || 'none',
            jobManagers: task.jobManagers?.length ? task.jobManagers.map(manager => String(manager?._id || manager)) : (task.jobManager ? [String(task.jobManager?._id || task.jobManager)] : []),
        });
        setImagePreviews(task.images && task.images.length > 0 ? task.images : (task.image ? [task.image] : []));
        setIsModalOpen(true);
    };

    const handleUnassignTask = async (taskId, userId) => {
        if (!window.confirm("Are you sure you want to remove this user from the task?")) return;
        try {
            await taskAPI.unassign(taskId, userId);
            // Update local state without full reload if possible, or just fetchTasks
            fetchTasks();
            // Update selectedTask if in view mode
            if (selectedTask && selectedTask._id === taskId) {
                const updatedTaskRes = await taskAPI.getAll();
                const updatedTask = updatedTaskRes.data.data.find(t => t._id === taskId);
                setSelectedTask(updatedTask);
            }
            alert('User unassigned successfully!');
        } catch (err) {
            console.error('Error unassigning task:', err);
            alert(err.response?.data?.message || 'Failed to unassign task');
        }
    };

    const handleAssignTask = async (taskId, applicantId) => {
        try {
            await taskAPI.assign(taskId, applicantId);
            // Don't close modal or clear view mode immediately, so they can assign more if they want
            // Just refresh data
            fetchTasks();
            // We need to update selectedTask too if we are viewing applicants
            const updatedTaskRes = await taskAPI.getAll();
            const updatedTask = updatedTaskRes.data.data.find(t => t._id === taskId);
            setSelectedTask(updatedTask);
            alert('User assigned successfully!');
        } catch (err) {
            console.error('Error assigning task:', err);
            alert(err.response?.data?.message || 'Failed to assign task');
        }
    };

    const handleViewApplicants = async (task) => {
        setSelectedTask(task);
        setViewMode('applicants');

        // Mark related notifications as read
        try {
            const notifRes = await userNotificationAPI.getAll();
            const relatedNotifications = (notifRes.data.data || []).filter(
                n => n.relatedTask?._id === task._id || n.relatedTask === task._id
            );
            for (const notif of relatedNotifications) {
                if (!notif.isRead) {
                    await userNotificationAPI.markAsRead(notif._id);
                }
            }
        } catch (err) {
            console.error('Error marking notifications as read:', err);
        }
    };

    const openPaymentDialog = (taskOrId) => {
        const task = typeof taskOrId === 'string'
            ? (tasks.find(item => item._id === taskOrId) || selectedTask)
            : taskOrId;
        const payableUsers = [...new Map((task?.submissions || []).filter(sub => sub.user).map(sub => [String(sub.user._id || sub.user), sub.user])).values()];
        if (!payableUsers.length) {
            alert('No submitted users found for payment.');
            return;
        }
        setPaymentTask(task);
        const suggestedAmounts = {};
        payableUsers.forEach(payableUser => {
            const payableUserId = String(payableUser._id || payableUser);
            const userSubmission = [...(task.submissions || [])].reverse().find(submission => String(submission.user?._id || submission.user) === payableUserId);
            if (Number(userSubmission?.requestedAmount) > 0) suggestedAmounts[payableUserId] = Number(userSubmission.requestedAmount).toLocaleString('en-US');
        });
        setPaymentAmounts(suggestedAmounts);
        setPaymentProof('');
        setViewMode(null);
    };

    const handleCompleteAndPayClick = (task) => {
        if (user?.role !== 'admin') {
            alert('Only Admin can complete the task and make the payment.');
            return;
        }
        openPaymentDialog(task);
    };

    const handlePaymentProof = (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            alert('Please select an image screenshot.');
            return;
        }
        const reader = new FileReader();
        reader.onload = () => setPaymentProof(String(reader.result || ''));
        reader.readAsDataURL(file);
    };

    const handleVerifyAndPay = async () => {
        if (!paymentTask) return;
        const payableUsers = [...new Map((paymentTask.submissions || []).filter(sub => sub.user).map(sub => [String(sub.user._id || sub.user), sub.user])).values()];
        const payments = payableUsers.map(payableUser => ({
            userId: payableUser._id || payableUser,
            amount: Number(String(paymentAmounts[String(payableUser._id || payableUser)] || '').replace(/,/g, '').trim())
        }));
        if (payments.some(payment => !Number.isFinite(payment.amount) || payment.amount <= 0)) {
            alert('Please enter a valid payment amount for every submitted user.');
            return;
        }
        if (!paymentProof) {
            alert('Please upload the payment screenshot.');
            return;
        }

        setIsCompletingPayment(true);
        try {
            await taskAPI.adminComplete(paymentTask._id, payments, paymentProof);
            setPaymentTask(null);
            setPaymentAmounts({});
            setPaymentProof('');
            setViewMode(null);
            setSelectedTask(null);
            setActiveTab('completed'); // Switch to completed tab
            fetchTasks(); // Refresh list
        } catch (err) {
            console.error('Error completing task:', err);
            alert(err.response?.data?.message || 'Failed to complete task');
        } finally {
            setIsCompletingPayment(false);
        }
    };

    const handleDeleteTask = async (taskId) => {
        if (!window.confirm('Are you sure you want to PERMANENTLY delete this task from the database? This action cannot be undone.')) return;

        setIsDeleting(taskId);
        try {
            await taskAPI.delete(taskId);
            fetchTasks(); // Refresh list
            alert('Task deleted permanently.');
        } catch (err) {
            console.error('Error deleting task:', err);
            alert(err.response?.data?.message || 'Failed to delete task');
        } finally {
            setIsDeleting(false);
        }
    };

    const isAssignedTo = (task, userId) => {
        if (!task.assignedTo || !Array.isArray(task.assignedTo)) return false;
        return task.assignedTo.some(u => {
            const uId = u._id || u;
            return String(uId) === String(userId);
        });
    };

    const handleDeleteApplicant = async (taskId, applicantId) => {
        if (!window.confirm('Remove this application? The user will be able to apply for this job again.')) return;

        setDeletingApplicantId(String(applicantId));
        try {
            await taskAPI.deleteApplicant(taskId, applicantId);
            const removeApplicant = task => task._id === taskId
                ? {
                    ...task,
                    applicants: (task.applicants || []).filter(applicant =>
                        String(applicant.user?._id || applicant.user) !== String(applicantId)
                    )
                }
                : task;

            setTasks(previousTasks => previousTasks.map(removeApplicant));
            setSelectedTask(previousTask => previousTask ? removeApplicant(previousTask) : previousTask);
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to remove application');
        } finally {
            setDeletingApplicantId(null);
        }
    };

    const getLatestApplicants = (task) => {
        const latestByUser = new Map();
        (task.applicants || []).forEach(applicant => {
            const userId = String(applicant.user?._id || applicant.user);
            const existing = latestByUser.get(userId);
            if (!existing || (applicant.cycle || 1) >= (existing.cycle || 1)) latestByUser.set(userId, applicant);
        });
        return [...latestByUser.values()].sort((a, b) => {
            const aIsAssigned = isAssignedTo(task, a.user?._id || a.user);
            const bIsAssigned = isAssignedTo(task, b.user?._id || b.user);
            return Number(bIsAssigned) - Number(aIsAssigned);
        });
    };

    if (isFetching) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader message="Loading Paid Tasks..." size="lg" />
            </div>
        );
    }

    const totalApplicantsCount = tasks.reduce((sum, task) => sum + getPendingApplicants(task).length, 0);
    const totalAssignedCount = assignedTasks.reduce((sum, task) => sum + (task.assignedTo?.length || 0), 0);
    const totalSubmittedCount = tasks.reduce((sum, task) => sum + new Set((task.submissions || []).map(submission => String(submission.user?._id || submission.user))).size, 0);

    return (
        <div className="space-y-4 sm:space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 sm:gap-4">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Job Posting</h1>
                    <p className="text-gray-500 dark:text-slate-400 text-xs sm:text-sm mt-0.5 sm:mt-1">Create and manage freelance tasks</p>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                    <div className="grid grid-cols-3 items-center gap-1 sm:gap-1.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 p-1 shadow-sm">
                        <button
                            type="button"
                            onClick={() => setActiveTab('applicants')}
                            className={`min-w-0 flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 px-1.5 sm:px-3 py-2 rounded-lg transition-all ${activeTab === 'applicants' ? 'bg-yellow-500 text-white shadow-sm' : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:text-yellow-700 hover:bg-yellow-50'}`}
                        >
                            <span className="text-[10px] font-black uppercase tracking-wide">Applicants</span>
                            <span className={`min-w-5 h-5 px-1.5 rounded-md flex items-center justify-center text-[10px] font-black ${activeTab === 'applicants' ? 'bg-white/25 text-white' : 'bg-yellow-100 text-yellow-700'}`}>{totalApplicantsCount}</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('assigned')}
                            className={`min-w-0 flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 px-1.5 sm:px-3 py-2 rounded-lg transition-all ${activeTab === 'assigned' ? 'bg-green-600 text-white shadow-sm' : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:text-green-700 hover:bg-green-50'}`}
                        >
                            <span className="text-[10px] font-black uppercase tracking-wide">Assigned</span>
                            <span className={`min-w-5 h-5 px-1.5 rounded-md flex items-center justify-center text-[10px] font-black ${activeTab === 'assigned' ? 'bg-white/25 text-white' : 'bg-green-100 text-green-700'}`}>{totalAssignedCount}</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('submitted')}
                            className={`min-w-0 flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 px-1.5 sm:px-3 py-2 rounded-lg transition-all ${activeTab === 'submitted' ? 'bg-blue-600 text-white shadow-sm' : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:text-blue-700 hover:bg-blue-50'}`}
                        >
                            <span className="text-[10px] font-black uppercase tracking-wide">Submitted</span>
                            <span className={`min-w-5 h-5 px-1.5 rounded-md flex items-center justify-center text-[10px] font-black ${activeTab === 'submitted' ? 'bg-white/25 text-white' : 'bg-blue-100 text-blue-700'}`}>{totalSubmittedCount}</span>
                        </button>
                    </div>
                    {(user?.role !== 'teacher' || user?.isActive !== false) && (
                        <button
                            onClick={() => {
                                setEditingTask(null);
                                setFormData({ title: '', description: '', budget: '', deadline: '', skills: '', category: 'web', type: 'task', images: [], isLifetime: false, manualStatus: 'none', jobManagers: [] });
                                setImagePreviews([]);
                                setIsModalOpen(true);
                            }}
                            className="w-full sm:w-auto self-stretch flex items-center justify-center gap-2 px-5 py-2.5 bg-primary hover:bg-orange-600 text-white rounded-xl transition-all duration-300 font-bold text-xs uppercase tracking-widest shadow-md shadow-primary/20"
                        >
                            <Briefcase className="w-5 h-5" />
                            Create Task
                        </button>
                    )}
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    <span className="text-red-600">{error}</span>
                </div>
            )}

            {/* Tabs */}
            <div className="overflow-x-auto pb-0.5 no-scrollbar">
                <div className="flex gap-1 sm:gap-2 bg-gray-100 dark:bg-slate-900 p-1 rounded-xl w-max min-w-full sm:min-w-0 whitespace-nowrap">
                    <button
                        onClick={() => setActiveTab('all')}
                        className={`px-3 sm:px-4 py-2 rounded-lg text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'all' ? 'bg-white dark:bg-slate-800 text-primary shadow-sm' : 'text-gray-600 dark:text-slate-400'}`}
                    >
                        All ({tasks.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('open')}
                        className={`px-3 sm:px-4 py-2 rounded-lg text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'open' ? 'bg-white dark:bg-slate-800 text-primary shadow-sm' : 'text-gray-600 dark:text-slate-400'}`}
                    >
                        Active ({openTasks.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('assigned')}
                        className={`px-3 sm:px-4 py-2 rounded-lg text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'assigned' ? 'bg-white dark:bg-slate-800 text-amber-600 shadow-sm' : 'text-gray-600 dark:text-slate-400'}`}
                    >
                        Assigned ({assignedTasks.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('completed')}
                        className={`px-3 sm:px-4 py-2 rounded-lg text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'completed' ? 'bg-white dark:bg-slate-800 text-primary shadow-sm' : 'text-gray-600 dark:text-slate-400'}`}
                    >
                        Completed ({completedTasks.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('expired')}
                        className={`px-3 sm:px-4 py-2 rounded-lg text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'expired' ? 'bg-white dark:bg-slate-800 text-red-600 shadow-sm' : 'text-gray-600 dark:text-slate-400'}`}
                    >
                        Expired ({expiredTasks.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('showcase')}
                        className={`px-3 sm:px-4 py-2 rounded-lg text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 sm:gap-2 ${activeTab === 'showcase' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm' : 'text-gray-600 dark:text-slate-400'}`}
                    >
                        <MessageSquare className="w-4 h-4" />
                        Feedback ({completedShowcase.filter(t => t.feedback && t.feedback.length > 0).length})
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className="bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl p-2.5 sm:p-4 border border-gray-100 dark:border-slate-700">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search tasks..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-11 sm:pl-12 pr-4 py-2.5 sm:py-3 bg-gray-50 dark:bg-slate-800 dark:text-white border border-transparent focus:border-primary focus:bg-white dark:focus:bg-slate-800 rounded-xl transition-all outline-none text-sm font-medium"
                    />
                </div>
            </div>

            {/* No Tasks */}
            {filteredTasks.length === 0 && activeTab !== 'showcase' && (
                <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
                    <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-600">No tasks found</h3>
                    <p className="text-gray-400">Create your first paid task to get started</p>
                </div>
            )}

            {/* Work Feedback Showcase Tab */}
            {activeTab === 'showcase' && (
                <div className="space-y-6">
                    {completedShowcase.filter(t => t.feedback && t.feedback.length > 0).length === 0 ? (
                        <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
                            <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-600">No feedback yet</h3>
                            <p className="text-gray-400">Feedback from job seekers will appear here after they complete tasks</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {completedShowcase
                                .filter(t => t.feedback && t.feedback.length > 0)
                                .map((task, index) => (
                                    <motion.div
                                        key={task._id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.1 }}
                                        className="bg-white rounded-2xl p-6 border border-gray-100 hover:shadow-lg transition-all"
                                    >
                                        <div className="flex items-start justify-end mb-4">
                                              <Badge variant="success"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>
                                        </div>

                                                                                <h3 className="font-bold text-gray-900 mb-2">{task.title}</h3>
                                        
                                        {((task.images && task.images.length > 0) || task.image) && (
                                            <div 
                                                className="mb-4 aspect-video rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center cursor-pointer relative group"
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
                                        <p className="text-sm text-gray-500 mb-4 line-clamp-2">{task.description}</p>

                                        <div className="flex flex-wrap gap-1 mb-4">
                                            {(task.skills || '').split(',').map((skill, i) => (
                                                <span key={i} className="px-2 py-1 bg-purple-50 text-primary text-xs rounded-md">
                                                    {skill.trim()}
                                                </span>
                                            ))}
                                        </div>

                                        {/* Completed By */}
                                        <div className="mb-4 pt-3 border-t border-gray-50 flex items-center justify-between">
                                            <span className="text-xs text-gray-400 font-medium">Completed By:</span>
                                            <div className="flex -space-x-2">
                                                {(task.assignedTo || []).map((u, i) => (
                                                    <div key={i} title={u.name} className="w-7 h-7 rounded-full border-2 border-white bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                                                        {u.photo ? <img src={u.photo} alt="" className="w-full h-full rounded-full object-cover" /> : u.name?.charAt(0)}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Feedback Entries */}
                                        <div className="space-y-3">
                                            <p className="text-xs font-bold text-indigo-700 dark:text-primary uppercase tracking-widest">Jobber Feedback</p>
                                            {task.feedback.map((f) => (
                                                <div key={f._id} className="bg-indigo-50/50 dark:bg-gray-800 p-4 rounded-xl border border-indigo-100 dark:border-gray-700 shadow-sm dark:shadow-none">
                                                    <div className="flex items-center justify-between gap-3 mb-3">
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center overflow-hidden border border-indigo-200 shadow-sm shrink-0">
                                                                {f.user?.photo ? (
                                                                    <img src={f.user.photo} alt={f.user.name || 'User'} className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <span className="text-xs font-bold text-indigo-600 dark:text-primary">{(f.user?.name || 'A').charAt(0)}</span>
                                                                )}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <span className="block text-sm font-semibold text-indigo-900 dark:text-white truncate">{f.user?.name || 'Anonymous'}</span>
                                                                <div className="flex text-amber-500 text-xs mt-0.5" aria-label={`${f.rating || 0} out of 5 stars`}>
                                                                    {[...Array(5)].map((_, starIndex) => (
                                                                        <span key={starIndex}>{starIndex < (f.rating || 0) ? '★' : '☆'}</span>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="hidden">
                                                            {[...Array(5)].map((_, i) => (
                                                                <span key={i}>{i < f.rating ? '★' : '☆'}</span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <p className="text-sm text-indigo-800 dark:text-gray-300 italic mb-3">"{f.text}"</p>
                                                    <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-2">Total Earnings: Rs {Number(f.user?.totalEarnings || 0).toLocaleString()}</p>
                                                    <div className="flex items-center gap-2 pt-2">
                                                        {user?.role === 'admin' && <button
                                                            onClick={() => handleEditFeedback(task, f)}
                                                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-indigo-600 bg-white hover:bg-indigo-100 rounded-lg border border-indigo-200 transition-all"
                                                        >
                                                            <PenSquare className="w-3 h-3" />
                                                            Edit
                                                        </button>}
                                                        {user?.role === 'admin' && <button
                                                            onClick={() => handleDeleteFeedback(task._id, f._id)}
                                                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-red-600 bg-white hover:bg-red-50 rounded-lg border border-red-200 transition-all"
                                                        >
                                                            <Trash2 className="w-3 h-3" />
                                                            Delete
                                                        </button>}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </motion.div>
                                ))}
                        </div>
                    )}
                </div>
            )}

            {/* Tasks Grid */}
            {activeTab !== 'showcase' && <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
                {filteredTasks.map((task, index) => {
                    const statusConfig = getStatusConfig(task.status);
                    const unassignedApplicantsCount = task.applicants?.filter(a => !isAssignedTo(task, a.user?._id)).length || 0;
                    const hasNewApplicants = task.status === 'assigned' && unassignedApplicantsCount > 0;

                    return (
                        <motion.div
                            key={task._id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className={`bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl p-3.5 sm:p-6 border border-gray-100 dark:border-slate-700 shadow-sm dark:shadow-black/20 ${task.status === 'assigned' ? 'opacity-95' : ''}`}
                        >
                            <div className="flex items-start justify-end mb-2 sm:mb-4">
                                              <div className="flex flex-wrap items-center justify-end gap-2">
                                    {user?.role === 'admin' && <button
                                        onClick={() => handleDeleteTask(task._id)}
                                        disabled={isDeleting === task._id}
                                        className="px-3 py-1 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-lg transition-all disabled:opacity-50 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider shadow-sm border border-red-100"
                                        title="Permanently Delete Task"
                                    >
                                        <ButtonLoader isLoading={isDeleting === task._id} icon={<Trash2 className="w-3 h-3" />}>
                                            Delete
                                        </ButtonLoader>
                                    </button>}
                                    <button
                                        onClick={() => handleEditClick(task)}
                                        className="px-3 py-1 bg-purple-50 text-primary hover:bg-primary hover:text-white rounded-lg transition-all flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider shadow-sm border border-primary/10"
                                        title="Edit Task"
                                    >
                                        <PenSquare className="w-3 h-3" />
                                        Edit
                                    </button>
                                </div>
                            </div>

                            {(task.images && task.images.length > 0 || task.image) && (
                                <div className="mb-4 aspect-video rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center">
                                    <img src={task.images && task.images.length > 0 ? task.images[0] : task.image} alt={task.title} className="w-full h-full object-cover" />
                                    {(task.images && task.images.length > 1) && (
                                        <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-md">
                                            +{task.images.length - 1} images
                                        </div>
                                    )}
                                </div>
                            )}

                            <h3 className="font-bold text-sm sm:text-base text-gray-900 dark:text-slate-100 mb-1.5 sm:mb-2 leading-snug">{task.title}</h3>
                            <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 mb-3 sm:mb-4 line-clamp-2">{task.description}</p>

                            <div className="flex flex-wrap gap-1 mb-4">
                                {(task.skills || '').split(',').map((skill, i) => (
                                    <span key={i} className="px-2 py-1 bg-purple-50 dark:bg-slate-800 text-primary dark:text-orange-300 text-xs rounded-md border border-transparent dark:border-slate-700">
                                        {skill.trim()}
                                    </span>
                                ))}
                            </div>

                            <div className="flex items-center justify-between text-sm mb-4">
                                <span className="flex items-center gap-1 text-gray-500 dark:text-slate-400">
                                    <Calendar className="w-4 h-4" />
                                    {task.isLifetime ? 'Lifetime' : (task.deadline && new Date(task.deadline).toLocaleDateString())}
                                </span>
                                <span className={task.type === 'product' ? "font-bold text-primary" : "font-bold text-primary"}>
                                    Rs {isNaN(Number(task.budget)) ? task.budget : Number(task.budget).toLocaleString()}
                                </span>
                            </div>

                            {/* Assigned Person Info */}
                            {task.assignedTo && task.assignedTo.length > 0 && (
                                <div className="mb-4 p-3 bg-amber-50 rounded-xl border border-amber-100">
                                    <p className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-1">Assigned To ({task.assignedTo.length})</p>
                                    <div className="flex flex-wrap gap-1">
                                        {task.assignedTo.map((u, i) => (
                                            <Badge key={i} variant="warning" className="flex items-center gap-1">
                                                {u.name}
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleUnassignTask(task._id, u._id); }}
                                                    className="ml-1 hover:text-red-600 focus:outline-none"
                                                    title="Remove User"
                                                >
                                                    &times;
                                                </button>
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Keep the card compact; full payment details open in a dialog. */}
                            {user?.role === 'admin' && task.paymentHistory && task.paymentHistory.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => setViewingPaymentHistoryTask(task)}
                                    className="mb-4 w-full px-3 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 dark:text-emerald-300 rounded-xl border border-emerald-200 dark:border-emerald-800 flex items-center justify-center gap-2 text-sm font-bold transition-colors"
                                    title="View payment names, amounts and screenshots"
                                >
                                    <Eye className="w-4 h-4" />
                                    View Payments ({task.paymentHistory.length})
                                </button>
                            )}

                            {/* Actions based on status */}
                            <div className="flex gap-2 pt-4 border-t border-gray-100 dark:border-slate-700">
                                {task.status === 'open' && (
                                    <button
                                        onClick={() => handleViewApplicants(task)}
                                        className="flex-1 py-2 text-sm font-bold text-primary dark:text-orange-300 bg-purple-50 hover:bg-primary/10 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl border border-transparent dark:border-slate-700 flex items-center justify-center gap-1 transition-colors"
                                    >
                                        <Users className="w-4 h-4" />
                                        {task.applicants?.length || 0} Applicants
                                    </button>
                                )}
                                {task.status === 'assigned' && (
                                    <div className="flex gap-2 w-full">
                                        <button
                                            onClick={() => handleViewApplicants(task)}
                                            className={`flex-1 py-2 text-sm font-medium rounded-xl flex items-center justify-center gap-1 relative ${hasNewApplicants ? 'bg-red-50 text-red-600 hover:bg-red-100 ring-1 ring-red-200' : 'text-amber-600 bg-amber-50 hover:bg-amber-100'}`}
                                            title="View Applicants & Assign More"
                                        >
                                            <Users className="w-4 h-4" />
                                            {hasNewApplicants ? `New Applicants (${unassignedApplicantsCount})` : `Assigned (${task.assignedTo?.length || 0})`}
                                            {hasNewApplicants && (
                                                <span className="absolute top-0 right-0 -mr-1 -mt-1 w-3 h-3 bg-red-500 rounded-full animate-pulse border-2 border-white"></span>
                                            )}
                                        </button>
                                        {user?.role === 'admin' && <button
                                            onClick={() => openPaymentDialog(task)}
                                            className="px-4 py-2 text-sm font-medium text-primary bg-primary/5 hover:bg-primary/10 rounded-xl flex items-center justify-center gap-1"
                                            title="Complete & Pay Task"
                                        >
                                            <CheckCircle className="w-4 h-4" />
                                            Complete & Pay
                                        </button>}
                                    </div>
                                )}
                                {task.status === 'submitted' && (
                                    <div className="flex gap-2 w-full">
                                        <button
                                            onClick={() => { setSelectedTask(task); setViewMode('submission'); }}
                                            className="flex-1 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl flex items-center justify-center gap-1"
                                        >
                                            <Eye className="w-4 h-4" />
                                            Review {task.submissions?.length || 0} Submissions
                                        </button>
                                        <button
                                            onClick={() => handleViewApplicants(task)}
                                            className="px-4 py-2 text-sm font-medium text-primary bg-purple-50 hover:bg-primary/10 rounded-xl flex items-center justify-center gap-1"
                                            title="View Applicants & Assign More"
                                        >
                                            <Users className="w-4 h-4" />
                                            Applicants
                                        </button>
                                        {user?.role === 'admin' && <button
                                            onClick={() => openPaymentDialog(task)}
                                            className="px-4 py-2 text-sm font-medium text-primary bg-primary/5 hover:bg-primary/10 rounded-xl flex items-center justify-center gap-1"
                                            title="Complete & Pay Task"
                                        >
                                            <CheckCircle className="w-4 h-4" />
                                            Complete & Pay
                                        </button>}
                                    </div>
                                )}
                                {task.status === 'completed' && (
                                    <div className="flex-1 py-2 text-sm text-center text-primary bg-primary/5 rounded-xl flex items-center justify-center gap-1">
                                        <CheckCircle className="w-4 h-4" />
                                        Payment Sent
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    );
                })}
            </div>}

            <Modal
                isOpen={Boolean(viewingPaymentHistoryTask)}
                onClose={() => setViewingPaymentHistoryTask(null)}
                title="Payment Details"
                size="lg"
                centerOnMobile
            >
                {viewingPaymentHistoryTask && (
                    <div className="space-y-4">
                        <div className="p-4 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
                            <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Job</p>
                            <p className="font-bold text-gray-900 dark:text-white mt-1">{viewingPaymentHistoryTask.title}</p>
                        </div>

                        <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-slate-700">
                            {[...viewingPaymentHistoryTask.paymentHistory].reverse().map((payment, paymentIndex) => (
                                <div key={payment._id || `${payment.user?._id || payment.user}-${payment.cycle || 1}-${paymentIndex}`} className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 border-b last:border-b-0 border-gray-200 dark:border-slate-700">
                                    {payment.user?.photo ? (
                                        <img
                                            src={payment.user.photo}
                                            alt={payment.user?.name || 'Paid user'}
                                            className="w-9 h-9 shrink-0 rounded-full object-cover border border-gray-200 dark:border-slate-600"
                                        />
                                    ) : (
                                        <div className="w-9 h-9 shrink-0 rounded-full bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-black">
                                            {(payment.user?.name || 'U').charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                    <div className="min-w-0 flex-1">
                                        <p className="font-bold text-sm text-gray-900 dark:text-white truncate">{payment.user?.name || 'Paid User'}</p>
                                        <p className="text-xs text-gray-500 dark:text-slate-400">
                                            {payment.paidAt ? new Date(payment.paidAt).toLocaleString() : 'Date unavailable'}
                                        </p>
                                    </div>
                                    <p className="shrink-0 font-black text-sm text-emerald-700 dark:text-emerald-400">
                                        Rs {Number(payment.amount || 0).toLocaleString()}
                                    </p>
                                    {payment.paymentProof ? (
                                        <button
                                            type="button"
                                            onClick={() => setViewingPaymentProof({
                                                image: payment.paymentProof,
                                                userName: payment.user?.name || 'Paid User'
                                            })}
                                            className="shrink-0 p-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary dark:text-purple-300 transition-colors"
                                            title="View payment screenshot"
                                            aria-label={`View payment screenshot for ${payment.user?.name || 'paid user'}`}
                                        >
                                            <DollarSign className="w-4 h-4" />
                                        </button>
                                    ) : (
                                        <span className="shrink-0 text-[10px] text-gray-400 dark:text-slate-500">No screenshot</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </Modal>

            <Modal
                isOpen={Boolean(viewingPaymentProof)}
                onClose={() => setViewingPaymentProof(null)}
                title={`Payment Screenshot${viewingPaymentProof?.userName ? ` - ${viewingPaymentProof.userName}` : ''}`}
                size="lg"
                centerOnMobile
            >
                {viewingPaymentProof?.image && (
                    <div className="p-2 bg-gray-100 dark:bg-slate-900 rounded-xl">
                        <img
                            src={viewingPaymentProof.image}
                            alt={`Payment proof for ${viewingPaymentProof.userName}`}
                            className="w-full max-h-[70vh] object-contain rounded-lg"
                        />
                    </div>
                )}
            </Modal>

            {/* Create/Edit Task Modal */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingTask ? (editingTask.type === 'product' ? "Edit Item" : "Edit Paid Task") : (formData.type === 'product' ? "Add Item For Sale" : "Create Paid Task")} size="lg" centerOnMobile>
                <form onSubmit={handleCreateTask} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Task Images (Optional)</label>
                        <div className="flex flex-wrap items-center gap-4">
                                {imagePreviews.map((preview, idx) => (
                                    <div key={idx} className="relative mt-2">
                                        <img src={preview} alt="Preview" className="w-20 h-20 rounded-xl object-cover border border-gray-200" />
                                        <button 
                                            type="button" 
                                            onClick={() => {
                                                const newImages = [...formData.images];
                                                newImages.splice(idx, 1);
                                                const newPreviews = [...imagePreviews];
                                                newPreviews.splice(idx, 1);
                                                setFormData({ ...formData, images: newImages });
                                                setImagePreviews(newPreviews);
                                            }}
                                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                                            title="Remove image"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                                <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={(e) => {
                                        const files = Array.from(e.target.files);
                                        if (files.length > 0) {
                                            const validFiles = files.filter(f => f.type.startsWith('image/'));
                                            setFormData({ ...formData, images: [...formData.images, ...validFiles] });
                                            const newPreviews = validFiles.map(f => URL.createObjectURL(f));
                                            setImagePreviews([...imagePreviews, ...newPreviews]);
                                        }
                                        e.target.value = ''; // Reset input to allow adding same file again if needed
                                    }}
                                    className="w-full mt-2 text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-primary/5 file:text-primary hover:file:bg-primary/10 transition-colors"
                                />
                            </div>
                        </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">{formData.type === 'product' ? 'Product Name *' : 'Task Title *'}</label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            placeholder={formData.type === 'product' ? "e.g., Premium Office Chair" : "e.g., Build a Landing Page"}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            rows={3}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl"
                            required
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Budget (Rs) *</label>
                            <input
                                type="text"
                                value={formData.budget}
                                onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                                placeholder="e.g., 25000 or 1500-2500"
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl"
                                required
                            />
                        </div>
                        <div className="col-span-1">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Deadline *</label>
                            <div className="flex flex-col gap-2">
                                <input
                                    type="date"
                                    value={formData.deadline}
                                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl"
                                    required={false}
                                    disabled={formData.isLifetime}
                                />
                                <label className="flex items-center gap-2 cursor-pointer mt-1">
                                    <input 
                                        type="checkbox" 
                                        checked={formData.isLifetime}
                                        onChange={(e) => setFormData({ ...formData, isLifetime: e.target.checked, deadline: e.target.checked ? '' : formData.deadline })}
                                        className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                                    />
                                    <span className="text-sm text-gray-600">Lifetime (No Deadline)</span>
                                </label>
                            </div>
                        </div>
                    </div>
                    {formData.type !== 'product' && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Required Skills</label>
                                <input
                                    type="text"
                                    value={formData.skills}
                                    onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                                    placeholder="e.g., React, Node.js, MongoDB"
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl"
                                />
                            </div>
                            {user?.role === 'admin' && <div>
                                <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                                        Assign Teacher <span className="text-red-500">*</span>
                                    </label>
                                    {teachers.length > 0 && (
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setFormData({ ...formData, jobManagers: teachers.map(teacher => teacher._id) })}
                                                className="px-3 py-1.5 text-xs font-bold text-primary bg-primary/10 hover:bg-primary/15 rounded-lg transition-colors"
                                            >
                                                Select All
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setFormData({ ...formData, jobManagers: [] })}
                                                className="px-3 py-1.5 text-xs font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                            >
                                                Clear
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-3 sm:p-4 bg-gray-50 dark:bg-gray-900">
                                    {teachers.length === 0 ? (
                                        <p className="text-sm text-gray-400 dark:text-gray-500">No teachers available</p>
                                    ) : (
                                        <div className="flex flex-wrap items-start gap-3">
                                            {teachers.map(teacher => {
                                                const isSelected = formData.jobManagers.some(id => String(id) === String(teacher._id));
                                                return (
                                                    <label
                                                        key={teacher._id}
                                                        className={`inline-flex w-full sm:w-auto sm:max-w-sm flex-none items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer text-left transition-all ${isSelected
                                                            ? 'border-primary bg-primary/5 dark:bg-primary/10 shadow-sm'
                                                            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-primary/40 hover:shadow-sm'
                                                            }`}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            onChange={(e) => setFormData({
                                                                ...formData,
                                                                jobManagers: e.target.checked
                                                                    ? [...formData.jobManagers, teacher._id]
                                                                    : formData.jobManagers.filter(id => String(id) !== String(teacher._id))
                                                            })}
                                                            className="w-4 h-4 flex-none rounded accent-orange-500 text-orange-500 focus:ring-orange-500"
                                                        />
                                                        {teacher.photo ? (
                                                            <img src={teacher.photo} alt={teacher.name} className="w-9 h-9 flex-none rounded-full object-cover" />
                                                        ) : (
                                                            <div className="w-9 h-9 flex-none rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                                                                {teacher.name?.charAt(0)}
                                                            </div>
                                                        )}
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{teacher.name}</p>
                                                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{teacher.specialization || teacher.email}</p>
                                                        </div>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    {formData.jobManagers.length} teacher(s) selected — all selected teachers can edit this job and chat with applicants.
                                </p>
                            </div>}
                    </>
                )}
                    {editingTask && formData.type !== 'product' && (
                        <div className="p-4 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
                            <label className="block text-sm font-bold text-gray-800 dark:text-white mb-3">Job Status</label>
                            <div className="flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, manualStatus: 'active' })}
                                    className={`px-4 py-2 rounded-lg text-xs font-black uppercase transition-all ${formData.manualStatus === 'active' ? 'bg-green-600 text-white' : 'bg-white dark:bg-slate-900 text-gray-500 border border-gray-200 dark:border-slate-700'}`}
                                >
                                    Active
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, manualStatus: 'expired' })}
                                    className={`px-4 py-2 rounded-lg text-xs font-black uppercase transition-all ${formData.manualStatus === 'expired' ? 'bg-red-600 text-white' : 'bg-white dark:bg-slate-900 text-gray-500 border border-gray-200 dark:border-slate-700'}`}
                                >
                                    Expired
                                </button>
                                <button
                                    type="button"
                                    disabled={editingTask.status === 'completed' && editingTask.paymentSent}
                                    onClick={() => setFormData({ ...formData, manualStatus: 'completed' })}
                                    className={`px-4 py-2 rounded-lg text-xs font-black uppercase transition-all ${formData.manualStatus === 'completed' || (editingTask.status === 'completed' && editingTask.paymentSent) ? 'bg-primary text-white' : 'bg-white dark:bg-slate-900 text-gray-500 border border-gray-200 dark:border-slate-700'} disabled:cursor-not-allowed`}
                                >
                                    Complete
                                </button>
                                <button
                                    type="button"
                                    onClick={async () => {
                                        if (editingTask.status === 'completed') {
                                            try {
                                                await taskAPI.reopen(editingTask._id);
                                                setIsModalOpen(false);
                                                setEditingTask(null);
                                                fetchTasks();
                                            } catch (err) {
                                                alert(err.response?.data?.message || 'Unable to reopen job');
                                            }
                                            return;
                                        }
                                        setFormData({ ...formData, manualStatus: 'active' });
                                    }}
                                    className="px-4 py-2 rounded-lg text-xs font-black uppercase transition-all bg-slate-700 hover:bg-slate-800 text-white"
                                >
                                    Uncomplete
                                </button>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-slate-400 mt-2">Choose a status, then click Update Task. Uncomplete reopens a completed job immediately.</p>
                        </div>
                    )}
                    <div className="flex gap-3 pt-4 border-t">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 text-gray-600 hover:bg-gray-100 rounded-xl font-medium">
                            Cancel
                        </button>
                        <button type="submit" disabled={isLoading || (!editingTask && user?.role === 'admin' && formData.type !== 'product' && formData.jobManagers.length === 0)} className={`flex-1 py-3 text-white rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${formData.type === 'product' ? 'bg-primary hover:bg-primary' : 'bg-primary hover:bg-purple-700'}`}>
                            <ButtonLoader isLoading={isLoading}>
                                {editingTask ? 'Update ' + (formData.type === 'product' ? 'Item' : 'Task') : 'Create ' + (formData.type === 'product' ? 'Item' : 'Task')}
                            </ButtonLoader>
                        </button>
                    </div>
                </form>
            </Modal>

            {/* View Applicants Modal */}
            <Modal isOpen={viewMode === 'applicants' && selectedTask} onClose={() => { setViewMode(null); setSelectedTask(null); }} title="Task Applicants" size="lg" centerOnMobile>
                {selectedTask && (
                    <div className="space-y-4">
                        <div className="p-4 bg-gray-50 rounded-2xl">
                            <h3 className="font-black text-gray-900 uppercase tracking-tight">{selectedTask.title}</h3>
                            <p className="text-xs font-bold text-primary mt-1">Budget: Rs {isNaN(Number(selectedTask.budget)) ? selectedTask.budget : Number(selectedTask.budget).toLocaleString()}</p>
                        </div>
                        {(!selectedTask.applicants || selectedTask.applicants.length === 0) ? (
                            <div className="text-center py-12">
                                <Users className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                                <p className="text-gray-500 font-medium">No applications yet</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {getLatestApplicants(selectedTask).map((applicant) => {
                                    const isAssigned = isAssignedTo(selectedTask, applicant.user?._id);
                                    return (
                                        <div key={applicant.user?._id || applicant._id} className={`p-4 rounded-2xl border-2 transition-all ${isAssigned ? 'bg-amber-50 border-amber-200 shadow-sm' : 'bg-white border-gray-100 hover:border-primary/10'}`}>
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="relative">
                                                        {applicant.user?.photo ? (
                                                            <img src={applicant.user.photo} alt="" className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm" />
                                                        ) : (
                                                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
                                                                {applicant.user?.name?.charAt(0) || '?'}
                                                            </div>
                                                        )}
                                                        {isAssigned && (
                                                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full border-2 border-white flex items-center justify-center">
                                                                <CheckCircle className="w-2 h-2 text-white" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <p className="font-black text-gray-900 truncate">{applicant.user?.name}</p>
                                                            {isAssigned && <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-black uppercase rounded-lg">Assigned</span>}
                                                        </div>
                                                        <p className="text-xs text-gray-500 truncate">{applicant.user?.email}</p>
                                                        <p className="text-xs font-bold text-emerald-600 mt-1">Total Earnings: Rs {Number(applicant.user?.totalEarnings || 0).toLocaleString()}</p>
                                                        {applicant.user?.rating && (
                                                            <div className="flex items-center gap-1 mt-1">
                                                                <div className="flex text-amber-500 text-[10px]">
                                                                    {[...Array(5)].map((_, i) => (
                                                                        <span key={i}>{i < applicant.user.rating ? '★' : '☆'}</span>
                                                                    ))}
                                                                </div>
                                                                <span className="text-[10px] font-bold text-gray-400">({applicant.user.completedTasks || 0} tasks)</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {!isAssigned && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteApplicant(selectedTask._id, applicant.user?._id)}
                                                            disabled={deletingApplicantId === String(applicant.user?._id)}
                                                            className="w-9 h-9 flex items-center justify-center bg-red-50 hover:bg-red-100 text-red-500 rounded-xl transition-all disabled:opacity-50"
                                                            title="Delete application"
                                                            aria-label={`Delete ${applicant.user?.name || 'user'} application`}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    {user?.role === 'admin' && <button
                                                        onClick={() => setViewingProfile(applicant.user)}
                                                        className="flex-1 sm:flex-none px-4 py-2 text-primary bg-purple-50 hover:bg-primary/10 text-xs rounded-xl font-black uppercase tracking-widest transition-all"
                                                    >
                                                        Profile
                                                    </button>}
                                                    {isAssigned ? (
                                                        <button
                                                            onClick={() => handleUnassignTask(selectedTask._id, applicant.user?._id)}
                                                            className="flex-1 sm:flex-none px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-xs rounded-xl font-black uppercase tracking-widest transition-all"
                                                        >
                                                            Unassign
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleAssignTask(selectedTask._id, applicant.user?._id)}
                                                            className="flex-1 sm:flex-none px-6 py-2 bg-primary hover:bg-purple-700 text-white text-xs rounded-xl font-black uppercase tracking-widest shadow-lg shadow-purple-200 transition-all"
                                                        >
                                                            Assign
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            {applicant.message && (
                                                <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Application Message</p>
                                                    <p className="text-sm text-gray-700 leading-relaxed italic">"{applicant.message}"</p>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </Modal>

            {/* View Profile Modal */}
            <Modal isOpen={viewingProfile !== null} onClose={() => setViewingProfile(null)} title="Applicant Profile" size="lg" centerOnMobile>
                {viewingProfile && (
                    <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl">
                            {viewingProfile.photo ? (
                                <img
                                    src={viewingProfile.photo}
                                    alt={viewingProfile.name}
                                    className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-lg"
                                />
                            ) : (
                                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-white font-black text-3xl border-4 border-white shadow-lg">
                                    {viewingProfile.name?.charAt(0)}
                                </div>
                            )}
                            <div className="text-center sm:text-left">
                                <h3 className="text-xl font-black text-gray-900 uppercase tracking-tighter leading-none mb-1">{viewingProfile.name}</h3>
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">{viewingProfile.email}</p>
                                {(viewingProfile.rating > 0 || viewingProfile.completedTasks > 0) && (
                                    <div className="flex items-center justify-center sm:justify-start gap-2 mt-2">
                                        <div className="flex text-amber-500 text-sm">
                                            {[...Array(5)].map((_, i) => (
                                                <span key={i}>{i < viewingProfile.rating ? '★' : '☆'}</span>
                                            ))}
                                        </div>
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">({viewingProfile.completedTasks || 0} tasks)</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 sm:gap-4">
                            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Phone</p>
                                <p className="text-sm font-bold text-gray-900">{viewingProfile.phone || 'N/A'}</p>
                            </div>
                            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Exp.</p>
                                <p className="text-sm font-bold text-gray-900">{viewingProfile.experience || 'N/A'}</p>
                            </div>
                            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Edu.</p>
                                <p className="text-sm font-bold text-gray-900 truncate" title={viewingProfile.education}>{viewingProfile.education || 'N/A'}</p>
                            </div>
                            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">CNIC</p>
                                <p className="text-sm font-bold text-gray-900">{viewingProfile.cnic || 'N/A'}</p>
                            </div>
                        </div>

                        {(viewingProfile.city || viewingProfile.address) && (
                            <div className="p-4 bg-gray-50 rounded-xl">
                                <p className="text-xs text-gray-400 mb-2">Address</p>
                                <p className="text-sm font-medium text-gray-900">
                                    {[viewingProfile.address, viewingProfile.city].filter(Boolean).join(', ') || 'Not provided'}
                                </p>
                            </div>
                        )}

                        <div className="p-4 bg-gray-50 rounded-xl">
                            <p className="text-xs text-gray-400 mb-2">Skills</p>
                            <div className="flex flex-wrap gap-2">
                                {(viewingProfile.skills || 'No skills listed').split(',').map((skill, i) => (
                                    <span key={i} className="px-3 py-1 bg-primary/10 text-purple-700 text-sm rounded-lg">
                                        {skill.trim()}
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {viewingProfile.portfolio && (
                                <a
                                    href={viewingProfile.portfolio}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-4 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors"
                                >
                                    <p className="text-xs text-gray-400 mb-1">Portfolio</p>
                                    <p className="text-blue-600 font-medium text-sm truncate">{viewingProfile.portfolio}</p>
                                </a>
                            )}
                            {viewingProfile.cvUrl && (
                                <a
                                    href={viewingProfile.cvUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-4 bg-green-50 rounded-xl hover:bg-green-100 transition-colors"
                                >
                                    <p className="text-xs text-gray-400 mb-1">CV/Resume</p>
                                    <p className="text-green-600 font-medium text-sm">View CV →</p>
                                </a>
                            )}
                        </div>

                        <button onClick={() => setViewingProfile(null)} className="w-full py-3 text-gray-600 hover:bg-gray-100 rounded-xl font-medium">
                            Close
                        </button>
                    </div>
                )}
            </Modal>

            {/* View Submission Modal */}
            <Modal isOpen={viewMode === 'submission' && selectedTask} onClose={() => { setViewMode(null); setSelectedTask(null); }} title={`Review Submissions (${selectedTask?.submissions?.length || 0})`} size="lg" centerOnMobile>
                {selectedTask?.submissions && selectedTask.submissions.length > 0 ? (
                    <div className="space-y-6">
                        <div className="p-4 bg-gray-50 rounded-xl">
                            <h3 className="font-semibold text-gray-900">{selectedTask.title}</h3>
                            <p className="text-sm text-gray-500">Budget: Rs {isNaN(Number(selectedTask.budget)) ? selectedTask.budget : Number(selectedTask.budget).toLocaleString()}</p>
                        </div>

                        {selectedTask.submissions.map((sub, idx) => (
                            <div key={idx} className="p-4 border rounded-xl bg-white shadow-sm">
                                <div className="flex items-center justify-between mb-3 pb-3 border-b">
                                    <div className="flex items-center gap-3">
                                        <ProfileAvatar
                                            src={sub.user?.photo}
                                            name={sub.user?.name || 'User'}
                                            size="md"
                                            fallbackColor="bg-blue-500"
                                        />
                                        <div>
                                            <p className="font-semibold text-gray-900">{sub.user?.name || 'Unknown User'}</p>
                                            <p className="text-xs text-gray-500">{sub.user?.email}</p>
                                        </div>
                                    </div>
                                    <span className="text-xs text-gray-400">{new Date(sub.submittedAt).toLocaleString()}</span>
                                </div>

                                <div className="space-y-3">
                                    <div className="bg-blue-50 p-3 rounded-lg">
                                        <p className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-1">Notes</p>
                                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{sub.notes}</p>
                                    </div>

                                    {sub.projectLink && (
                                        <div className="bg-gray-50 p-3 rounded-lg">
                                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Project Link</p>
                                            <a href={sub.projectLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1 text-sm font-medium">
                                                <Link className="w-3 h-3" /> {sub.projectLink}
                                            </a>
                                        </div>
                                    )}

                                    <div className="bg-primary/5 p-3 rounded-lg">
                                        <p className="text-xs font-bold text-primary uppercase tracking-wider mb-1">Payment Details</p>
                                        <div className="space-y-1 text-sm font-mono text-primary">
                                            {(sub.accountDetails || '').split('|').map((detail, detailIndex) => {
                                                const [label, ...valueParts] = detail.trim().split(':');
                                                const value = valueParts.join(':').trim();
                                                const displayLabel = label.trim().replace(/^Account\s+/i, '');
                                                return (
                                                    <p key={`${label}-${detailIndex}`} className="break-words">
                                                        {value ? <><span className="font-bold">{displayLabel}:</span> {value}</> : detail.trim()}
                                                    </p>
                                                );
                                            })}
                                        </div>
                                        {Number(sub.requestedAmount) > 0 && (
                                            <p className="text-sm font-black text-emerald-600 mt-2">Requested Payment: Rs {Number(sub.requestedAmount).toLocaleString()}</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}

                        <div className="flex gap-3 pt-4 border-t sticky bottom-0 bg-white">
                            <button onClick={() => { setViewMode(null); setSelectedTask(null); }} className="flex-1 py-3 text-gray-600 hover:bg-gray-100 rounded-xl font-medium">
                                Close
                            </button>
                            <button
                                onClick={() => handleCompleteAndPayClick(selectedTask)}
                                className="flex-1 py-3 bg-primary hover:bg-primary text-white rounded-xl font-medium flex items-center justify-center gap-2"
                            >
                                <CheckCircle className="w-5 h-5" />
                                Complete & Pay Task
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="py-12 text-center text-gray-500">
                        No submissions found for this task yet.
                    </div>
                )}
            </Modal>

            {/* Complete task and record payment */}
            <Modal
                isOpen={Boolean(paymentTask)}
                onClose={() => !isCompletingPayment && setPaymentTask(null)}
                title="Complete & Pay Task"
                size="md"
                centerOnMobile
            >
                <div className="space-y-5">
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <p className="font-bold text-gray-900">{paymentTask?.title}</p>
                        <p className="text-sm text-gray-500 mt-1">
                            Project budget: <span className="font-semibold text-primary">Rs {isNaN(Number(paymentTask?.budget)) ? paymentTask?.budget : Number(paymentTask?.budget || 0).toLocaleString()}</span>
                        </p>
                    </div>

                    <div className="space-y-3">
                        <p className="text-sm font-bold text-gray-800">Payment Amount</p>
                        {[...new Map((paymentTask?.submissions || []).filter(sub => sub.user).map(sub => [String(sub.user._id || sub.user), sub.user])).values()].map(payableUser => {
                            const payableUserId = String(payableUser._id || payableUser);
                            return (
                                <div key={payableUserId}>
                                    <label className="block text-xs font-medium text-gray-500 mb-1.5">{payableUser.name || 'Submitted user'} (Rs)</label>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        value={paymentAmounts[payableUserId] || ''}
                                        onChange={event => {
                                            const digits = event.target.value.replace(/\D/g, '');
                                            const formattedAmount = digits ? Number(digits).toLocaleString('en-US') : '';
                                            setPaymentAmounts(previous => ({ ...previous, [payableUserId]: formattedAmount }));
                                        }}
                                        placeholder="Enter payment amount"
                                        className="w-full px-4 py-3 bg-white text-gray-900 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                    />
                                </div>
                            );
                        })}
                    </div>

                    <div>
                        <p className="text-sm font-bold text-gray-800 mb-2">Payment Screenshot</p>
                        <label className="min-h-32 border-2 border-dashed border-gray-200 hover:border-primary rounded-xl flex flex-col items-center justify-center cursor-pointer overflow-hidden transition-colors bg-gray-50">
                            {paymentProof ? (
                                <img src={paymentProof} alt="Payment screenshot preview" className="w-full max-h-56 object-contain" />
                            ) : (
                                <div className="py-7 text-center text-gray-500">
                                    <ImagePlus className="w-8 h-8 mx-auto mb-2 text-primary" />
                                    <p className="text-sm font-medium">Upload payment screenshot</p>
                                    <p className="text-xs mt-1">PNG, JPG or WEBP</p>
                                </div>
                            )}
                            <input type="file" accept="image/*" onChange={handlePaymentProof} className="hidden" />
                        </label>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            disabled={isCompletingPayment}
                            onClick={() => setPaymentTask(null)}
                            className="flex-1 py-3 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            disabled={isCompletingPayment}
                            onClick={handleVerifyAndPay}
                            className="flex-1 py-3 bg-primary hover:bg-primary text-white rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-60"
                        >
                            {isCompletingPayment ? <ButtonLoader /> : <CheckCircle className="w-5 h-5" />}
                            Confirm Payment
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Edit Feedback Modal */}
            <Modal isOpen={editingFeedback !== null} onClose={() => setEditingFeedback(null)} title="Edit Feedback" size="md" centerOnMobile>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2 text-center">Rating</label>
                        <div className="flex justify-center gap-2 text-3xl">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    type="button"
                                    onClick={() => setEditFeedbackData({ ...editFeedbackData, rating: star })}
                                    className={`transition-colors ${editFeedbackData.rating >= star ? 'text-amber-500' : 'text-gray-300'}`}
                                >
                                    ★
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Feedback Text *</label>
                        <textarea
                            value={editFeedbackData.text}
                            onChange={(e) => setEditFeedbackData({ ...editFeedbackData, text: e.target.value })}
                            placeholder="Feedback text..."
                            rows={4}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    </div>

                    <div className="flex gap-3 pt-4 border-t">
                        <button onClick={() => setEditingFeedback(null)} className="flex-1 py-3 text-gray-600 hover:bg-gray-100 rounded-xl font-medium">
                            Cancel
                        </button>
                        <button
                            onClick={handleSaveFeedback}
                            disabled={isSavingFeedback || !editFeedbackData.text.trim()}
                            className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            <ButtonLoader isLoading={isSavingFeedback}>
                                Save Changes
                            </ButtonLoader>
                        </button>
                    </div>
                </div>
            </Modal>

        </div>
    );
};

export default PaidTasksManagement;



