import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, Plus, Calendar, MoreHorizontal, Users, RefreshCw, CheckCircle, Clock, X, Upload, Edit2, Search, Trash2, Eye } from 'lucide-react';
import api, { assignmentAPI } from '../../../services/api';
import Modal from '../../../components/ui/Modal';
import Badge from '../../../components/ui/Badge';
import Loader, { ButtonLoader } from '../../../components/ui/Loader';
import { formatDate, formatDateTime } from '../../../utils/dateFormatter';
import RichTextEditor from '../../../components/ui/RichTextEditor';
import RichTextContent from '../../../components/ui/RichTextContent';

const getAutomaticFeedback = (percentage) => {
    if (!percentage || isNaN(percentage)) return '-';
    if (percentage >= 90) return 'Excellent! Perfect execution and great attention to detail. Keep it up!';
    if (percentage >= 85) return 'Outstanding effort! Very well done.';
    if (percentage >= 80) return 'Great job! Keep up the consistent effort.';
    if (percentage >= 75) return 'Good work! Solid understanding of the concepts.';
    if (percentage >= 70) return 'Satisfactory effort. Try to focus more on the requirements.';
    if (percentage >= 65) return 'Average work. Needs more attention and focus.';
    if (percentage >= 60) return 'Below expectations. Please review the instructions carefully.';
    return "Poor performance. Let's work on the basics and improve.";
};

const AssignmentsTab = ({ course, students }) => { // Accept students prop
    const isProjectCourse = ['intern', 'interns'].includes(String(course?.targetAudience || '').toLowerCase()) || (students?.length > 0 && students.every((student) => student.role === 'intern'));
    const itemLabel = isProjectCourse ? 'Project' : 'Assignment';
    const itemsLabel = isProjectCourse ? 'Projects' : 'Assignments';
    const itemLabelLower = itemLabel.toLowerCase();
    const itemsLabelLower = itemsLabel.toLowerCase();
    const [assignments, setAssignments] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isSubmissionsModalOpen, setIsSubmissionsModalOpen] = useState(false);
    const [selectedAssignment, setSelectedAssignment] = useState(null);
    const [editingAssignment, setEditingAssignment] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedSubmission, setSelectedSubmission] = useState(null);
    const [selectedStudentFilters, setSelectedStudentFilters] = useState(null);
    const [assignSearchTerm, setAssignSearchTerm] = useState(''); // For searching students when assigning
    const [assignmentTitleFilter, setAssignmentTitleFilter] = useState(''); // For searching assignments by title
    const [activeStatFilter, setActiveStatFilter] = useState('all'); // For stat block filtering
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
    const [reviewAssignment, setReviewAssignment] = useState(null);

    // Create Form State
    const [newAssignment, setNewAssignment] = useState({
        title: '',
        description: '',
        dueDate: '',
        publishDate: '', // Scheduling time
        totalMarks: 100,
        assignTo: 'all', // all | selected | none
        assignedUsers: [] // Array of student IDs
    });
    const [isCreating, setIsCreating] = useState(false);

    // Grading State
    const [gradeMarks, setGradeMarks] = useState('');
    const [gradeFeedback, setGradeFeedback] = useState('');
    const [isGrading, setIsGrading] = useState(false);

    // Rejection State
    const [rejectingSubmissionId, setRejectingSubmissionId] = useState(null);
    const [rejectFeedback, setRejectFeedback] = useState('');

    useEffect(() => {
        fetchAssignments();
    }, [course._id]);

    const fetchAssignments = async () => {
        setIsLoading(true);
        try {
            const res = await assignmentAPI.getByCourse(course._id);
            setAssignments(res.data.assignments || []);
        } catch (error) {
            console.error('Error fetching assignments:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateAssignment = async (e) => {
        e.preventDefault();
        setIsCreating(true);
        try {
            await assignmentAPI.create({
                ...newAssignment,
                courseId: course._id,
            });
            await fetchAssignments();
            setIsCreateModalOpen(false);
            setNewAssignment({
                title: '',
                description: '',
                dueDate: '',
                publishDate: '',
                totalMarks: 100,
                assignTo: 'all',
                assignedUsers: []
            });
            alert('Assignment created successfully!');
        } catch (error) {
            console.error('Error creating assignment:', error);
            alert('Failed to create assignment');
        } finally {
            setIsCreating(false);
        }
    };

    const handleEditAssignment = (assignment) => {
        setEditingAssignment({
            ...assignment,
            dueDate: assignment.dueDate ? new Date(assignment.dueDate).toISOString().split('T')[0] : '',
            publishDate: assignment.publishDate ? new Date(assignment.publishDate).toISOString().slice(0, 16) : '',
            assignTo: assignment.assignTo || 'all',
            assignedUsers: assignment.assignedUsers || []
        });
        setAssignSearchTerm(''); // Reset search term
        setIsEditModalOpen(true);
    };

    const handleUpdateAssignment = async (e) => {
        e.preventDefault();
        setIsCreating(true);
        try {
            await assignmentAPI.update(editingAssignment._id, editingAssignment);
            await fetchAssignments();
            setIsEditModalOpen(false);
            setEditingAssignment(null);
            alert('Assignment updated successfully!');
        } catch (error) {
            console.error('Error updating assignment:', error);
            alert('Failed to update assignment');
        } finally {
            setIsCreating(false);
        }
    };

    const handleDeleteAssignment = async (id) => {
        if (!confirm('Are you sure you want to delete this assignment? This will remove all student submissions as well.')) return;
        try {
            await assignmentAPI.delete(id);
            setAssignments(prev => prev.filter(a => a._id !== id));
            alert('Assignment deleted successfully');
        } catch (error) {
            console.error('Error deleting assignment:', error);
            alert('Failed to delete assignment');
        }
    };

    const handleViewSubmissions = (assignment) => {
        setSelectedAssignment(assignment);
        setIsSubmissionsModalOpen(true);
        setSelectedSubmission(null);
    };

    const handleGradeSubmission = async (e) => {
        e.preventDefault();
        submitAssignmentGrading('graded');
    };

    const handleRejectSubmission = async (submission = null) => {
        const targetSub = submission || selectedSubmission;
        if (!targetSub) return;

        // If rejection UI isn't shown yet, show it
        if (rejectingSubmissionId !== targetSub._id) {
            setRejectingSubmissionId(targetSub._id);
            setRejectFeedback('');
            return;
        }

        // Validate feedback
        if (!rejectFeedback.trim()) {
            alert('Please provide feedback explaining why the submission is being rejected.');
            return;
        }

        if (!confirm('Are you sure you want to reject this submission? The student will be notified to resubmit.')) return;

        // Send rejection with feedback
        setIsGrading(true);
        try {
            const res = await assignmentAPI.grade(
                selectedAssignment._id,
                targetSub._id,
                0,
                rejectFeedback,
                'rejected'
            );

            const updatedAssignments = assignments.map(a =>
                a._id === selectedAssignment._id ? res.data.assignment : a
            );
            setAssignments(updatedAssignments);
            setSelectedAssignment(res.data.assignment);
            setSelectedSubmission(null);
            setRejectingSubmissionId(null);
            setRejectFeedback('');
            setGradeMarks('');
            setGradeFeedback('');
            alert('Submission rejected with feedback.');
        } catch (error) {
            console.error('Error rejecting:', error);
            alert(error.response?.data?.message || 'Failed to reject submission');
        } finally {
            setIsGrading(false);
        }
    };

    const submitAssignmentGrading = async (status, submissionOverride = null) => {
        const targetSubmission = submissionOverride || selectedSubmission;
        if (!selectedAssignment || !targetSubmission) return;

        setIsGrading(true);
        try {
            const res = await assignmentAPI.grade(
                selectedAssignment._id,
                targetSubmission._id,
                status === 'rejected' ? 0 : Number(gradeMarks),
                submissionOverride ? '' : gradeFeedback,
                status
            );

            // Update local state to reflect grade and feedback
            const updatedAssignments = assignments.map(a =>
                a._id === selectedAssignment._id ? res.data.assignment : a
            );
            setAssignments(updatedAssignments);

            // Update selected assignment to refresh the modal view
            setSelectedAssignment(res.data.assignment);
            setSelectedSubmission(null);
            setGradeMarks('');
            setGradeFeedback('');
            alert(`Submission ${status === 'rejected' ? 'rejected' : 'graded'} successfully!`);
        } catch (error) {
            console.error('Error grading:', error);
            alert(`Failed to ${status === 'rejected' ? 'reject' : 'grade'} submission`);
        } finally {
            setIsGrading(false);
        }
    };

    const handleDeleteSubmission = async (assignmentId, submissionId) => {
        if (!window.confirm('Are you sure you want to delete this submission? This action cannot be undone.')) {
            return;
        }

        try {
            await assignmentAPI.deleteSubmission(assignmentId, submissionId);
            alert('Submission deleted successfully');

            // Refresh assignments
            fetchAssignments();

            // Update selected assignment state to remove the submission
            if (selectedAssignment && selectedAssignment._id === assignmentId) {
                setSelectedAssignment({
                    ...selectedAssignment,
                    submissions: selectedAssignment.submissions.filter(s => s._id !== submissionId)
                });
            }

            if (reviewAssignment && reviewAssignment._id === assignmentId) {
                setReviewAssignment({
                    ...reviewAssignment,
                    submissions: reviewAssignment.submissions.filter(s => s._id !== submissionId)
                });
            }
        } catch (error) {
            console.error('Error deleting submission:', error);
            alert('Failed to delete submission');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-900 text-lg">{itemsLabel}</h3>
                <div className="flex items-center gap-2">
                    <button
                        onClick={fetchAssignments}
                        disabled={isLoading}
                        className="flex items-center gap-2 px-5 py-2.5 bg-primary/5 text-primary rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                        Refresh List
                    </button>
                    <button
                        onClick={() => {
                            // Reset form state when opening modal to prevent focus issues
                            setNewAssignment({
                                title: '',
                                description: '',
                                dueDate: '',
                                publishDate: '',
                                totalMarks: 100,
                                assignedUsers: [],
                                assignTo: 'all'
                            });
                            setAssignSearchTerm('');
                            setIsCreateModalOpen(true);
                        }}
                        className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg shadow-primary/10 active:scale-95"
                    >
                        <Plus className="w-4 h-4" />
                        Create {itemLabel}
                    </button>
                </div>
            </div>

            {/* Quick Stats Summary Row */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                {[
                    { id: 'all', label: `Total ${itemsLabel}`, icon: FileText, count: assignments.length, color: 'text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800/30', activeColor: 'ring-4 ring-blue-500/20 bg-blue-100 dark:bg-blue-900/40 border-blue-400 scale-105', onClick: () => setActiveStatFilter('all') },
                    { id: 'submissions', label: 'Total Submissions', icon: CheckCircle, count: assignments.reduce((acc, a) => acc + (a.submissions?.length || 0), 0), color: 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800/30', activeColor: 'ring-4 ring-emerald-500/20 bg-emerald-100 dark:bg-emerald-900/40 border-emerald-400 scale-105', onClick: () => setActiveStatFilter(activeStatFilter === 'submissions' ? 'all' : 'submissions') },
                    { id: 'pending', label: 'Pending Marks', icon: Clock, count: assignments.reduce((acc, a) => { const submissions = a.submissions || []; const gradedCount = submissions.filter(s => s.status === 'graded' || s.status === 'rejected').length; return acc + (submissions.length - gradedCount); }, 0), color: 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800/30', activeColor: 'ring-4 ring-amber-500/20 bg-amber-100 dark:bg-amber-900/40 border-amber-400 scale-105', onClick: () => setActiveStatFilter(activeStatFilter === 'pending' ? 'all' : 'pending') },
                    { id: 'rejected', label: 'Rejected', icon: X, count: assignments.reduce((acc, a) => acc + (a.submissions?.filter(s => s.status === 'rejected').length || 0), 0), color: 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800/30', activeColor: 'ring-4 ring-red-500/20 bg-red-100 dark:bg-red-900/40 border-red-400 scale-105', onClick: () => setActiveStatFilter(activeStatFilter === 'rejected' ? 'all' : 'rejected') },
                ].map((stat) => (
                    <button
                        key={stat.id}
                        onClick={stat.onClick}
                        className={`${stat.color} ${activeStatFilter === stat.id ? stat.activeColor : 'border hover:scale-105'} rounded-2xl p-4 flex items-center justify-between shadow-sm text-left transition-all focus:outline-none`}
                    >
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-widest opacity-70 block mb-1">{stat.label}</span>
                            <p className="text-2xl font-black leading-none">{stat.count}</p>
                        </div>
                        <div className="p-2 rounded-xl bg-white/50 dark:bg-black/20 backdrop-blur-sm">
                            <stat.icon className="w-5 h-5 opacity-80" />
                        </div>
                    </button>
                ))}
                <div className="text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                    <div>
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-70 block mb-1">Total Students</span>
                        <p className="text-2xl font-black leading-none">{students.length}</p>
                    </div>
                    <div className="p-2 rounded-xl bg-white/50 dark:bg-black/20 backdrop-blur-sm">
                        <Users className="w-5 h-5 opacity-80" />
                    </div>
                </div>
            </div>

            {/* Student Filter */}
            <div className="relative">
                <div className="flex items-center justify-between gap-3 mb-2">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        <Users className="w-3 h-3" />
                        Filter by Student
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setSelectedStudentFilters(null)}
                            className="px-3 py-2 text-xs font-bold text-primary bg-primary/5 hover:bg-primary/10 rounded-lg"
                        >
                            Select All
                        </button>
                        <button
                            type="button"
                            onClick={() => setSelectedStudentFilters([])}
                            className="px-3 py-2 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg"
                        >
                            Clear
                        </button>
                    </div>
                </div>

                <div className="flex flex-wrap items-start gap-3">
                    {(students || []).map(student => {
                        const studentId = student.id || student._id;
                        const selected = selectedStudentFilters === null || selectedStudentFilters.map(String).includes(String(studentId));
                        return (
                            <label
                                key={studentId}
                                className={`inline-flex w-fit flex-none items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all ${selected
                                    ? 'border-primary bg-primary/5 shadow-sm'
                                    : 'border-gray-200 bg-white hover:border-primary/40 hover:shadow-sm'
                                    }`}
                            >
                                <input
                                    type="checkbox"
                                    checked={selected}
                                    onChange={(event) => {
                                        const allIds = students.map(item => item.id || item._id);
                                        const current = selectedStudentFilters === null ? allIds : selectedStudentFilters;
                                        setSelectedStudentFilters(event.target.checked
                                            ? [...new Set([...current, studentId])]
                                            : current.filter(id => String(id) !== String(studentId)));
                                    }}
                                    className="w-4 h-4 rounded accent-orange-500 text-orange-500 focus:ring-orange-500"
                                />
                                {student.photo ? (
                                    <img src={student.photo} alt={student.name} className="w-8 h-8 rounded-full object-cover" />
                                ) : (
                                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                                        {student.name?.charAt(0)}
                                    </div>
                                )}
                                <div>
                                    <p className="text-sm font-medium text-gray-900">{student.name}</p>
                                    {student.rollNo && <p className="text-xs text-gray-400">{student.rollNo}</p>}
                                </div>
                            </label>
                        );
                    })}
                </div>
            </div>

            {/* Assignment Title Search Bar */}
            <div className="bg-white dark:bg-slate-900/40 rounded-2xl p-4 border border-gray-100 dark:border-slate-800 shadow-sm">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder={`Search ${itemLabelLower} title...`}
                        value={assignmentTitleFilter}
                        onChange={(e) => setAssignmentTitleFilter(e.target.value)}
                        className="w-full pl-12 pr-4 py-3.5 bg-gray-50/50 dark:bg-white/5 border border-transparent focus:border-primary focus:bg-white dark:focus:bg-white/10 rounded-2xl transition-all outline-none text-sm font-medium"
                    />
                    {assignmentTitleFilter && (
                        <button
                            onClick={() => setAssignmentTitleFilter('')}
                            className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                        >
                            <X className="w-4 h-4 text-gray-400" />
                        </button>
                    )}
                </div>
            </div>

            {isLoading && assignments.length === 0 ? (
                <Loader message={`Loading ${itemsLabelLower}...`} />
            ) : (
                <div className="space-y-4">
                    {assignments
                        .filter(assignment => {
                            // 1. Filter by Assignment Title
                            if (assignmentTitleFilter.trim()) {
                                const titleMatch = assignment.title?.toLowerCase().includes(assignmentTitleFilter.toLowerCase());
                                if (!titleMatch) return false;
                            }

                            // 2. Filter by Stat
                            if (activeStatFilter === 'submissions') {
                                if (!assignment.submissions || assignment.submissions.length === 0) return false;
                            }
                            if (activeStatFilter === 'pending') {
                                const submissionCount = assignment.submissions?.length || 0;
                                const gradedCount = assignment.submissions?.filter(s => s.status === 'graded' || s.status === 'rejected').length || 0;
                                if (submissionCount <= gradedCount) return false;
                            }
                            if (activeStatFilter === 'rejected') {
                                const hasRejected = assignment.submissions?.some(s => s.status === 'rejected');
                                if (!hasRejected) return false;
                            }

                            // 3. Filter by Selected Student
                            if (selectedStudentFilters === null) return true;
                            if (selectedStudentFilters.length === 0) return false;

                            const selectedIds = selectedStudentFilters.map(String);
                            const isAssigned = assignment.assignedUsers &&
                                assignment.assignedUsers.some(userId => selectedIds.includes(String(userId?._id || userId)));

                            const hasSubmission = assignment.submissions &&
                                assignment.submissions.some(s => selectedIds.includes(String(s.user?._id || s.user)));

                            return isAssigned || hasSubmission;
                        })
                        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                        .map((assignment) => {
                            // Number assignments by creation order, while keeping the
                            // newest assignment at the top of the visible list.
                            const assignmentNumber = [...assignments]
                                .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
                                .findIndex(item => String(item._id) === String(assignment._id)) + 1;
                            const submissionCount = assignment.submissions?.length || 0;
                            const gradedCount = assignment.submissions?.filter(s => s.marks !== undefined && s.marks !== null).length || 0;
                            const isFullyGraded = submissionCount > 0 && gradedCount === submissionCount;
                            const isOverdue = new Date(assignment.dueDate) < new Date();
                            const isScheduled = new Date(assignment.publishDate) > new Date();

                            // Spotlight submission if student filter is active
                            const spotlightSubmission = selectedStudentFilters?.length === 1
                                ? assignment.submissions?.find(s => String(s.user?._id || s.user) === String(selectedStudentFilters[0]))
                                : null;

                            return (
                                <motion.div
                                    key={assignment._id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`bg-white rounded-2xl p-6 border border-gray-100 hover:shadow-lg transition-all ${isFullyGraded ? 'opacity-50 grayscale-[0.5]' : ''}`}
                                >
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-1">
                                                <span className="text-xs font-black text-gray-300 tracking-tighter uppercase whitespace-nowrap bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">ASGN #{assignmentNumber}</span>
                                                <h4 className="font-bold text-gray-900 text-lg uppercase tracking-tight">{assignment.title}</h4>
                                                <div className="flex gap-2">
                                                    <Badge variant="info">ASSIGNED</Badge>
                                                    {isScheduled && <Badge variant="warning">SCHEDULED</Badge>}
                                                    {isOverdue && <Badge variant="error font-black uppercase">Expired</Badge>}
                                                    {isFullyGraded && <Badge variant="success">ALL GRADED</Badge>}
                                                </div>
                                            </div>
                                            <RichTextContent
                                                html={assignment.description}
                                                className="text-sm"
                                                emptyText="No description"
                                            />
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Submissions</p>
                                            <div className="flex items-center gap-1">
                                                <span className="text-xl font-black text-primary">{submissionCount}</span>
                                                <span className="text-sm text-gray-400">/</span>
                                                <span className="text-xl font-black text-red-500">{assignment.assignTo === 'all' ? (students?.length || '?') : (assignment.assignedUsers?.length || 0)}</span>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleEditAssignment(assignment)}
                                                className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors border border-transparent hover:border-blue-100"
                                                title={`Edit ${itemLabel}`}
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteAssignment(assignment._id)}
                                                className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors border border-transparent hover:border-red-100"
                                                title="Delete Assignment"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Submission Spotlight - Shown when filtering by student */}
                                    {spotlightSubmission && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            className="mb-4 p-4 bg-primary/5/50 rounded-2xl border border-primary/10 flex items-center justify-between gap-4"
                                        >
                                            <div className="flex items-center gap-3">
                                                {spotlightSubmission.user?.photo ? (
                                                    <img src={spotlightSubmission.user.photo} alt="" className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm" />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm border-2 border-white shadow-sm">
                                                        {spotlightSubmission.user?.name?.charAt(0)}
                                                    </div>
                                                )}
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-gray-900 text-sm">{spotlightSubmission.user?.name}</span>
                                                        {spotlightSubmission.user?.rollNo && (
                                                            <span className="text-[9px] font-black text-red-500 bg-red-50 px-1.5 py-0.5 rounded-md border border-red-100 uppercase">
                                                                {spotlightSubmission.user?.rollNo}
                                                            </span>
                                                        )}
                                                        <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full border ${spotlightSubmission.user?.role === 'intern' ? 'bg-purple-50 text-primary border-primary/10' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                                                            {spotlightSubmission.user?.role || 'student'}
                                                        </span>
                                                    </div>
                                                    <p className="text-[10px] text-gray-400 font-medium flex items-center gap-1 mt-0.5">
                                                        <Clock className="w-3 h-3" />
                                                        {formatDateTime(spotlightSubmission.submittedAt)}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="text-right">
                                                <div className="flex flex-col items-end">
                                                    <Badge variant={spotlightSubmission.status === 'graded' ? 'success' : spotlightSubmission.status === 'rejected' ? 'error' : 'warning'}>
                                                        {spotlightSubmission.status?.toUpperCase() || 'SUBMITTED'}
                                                    </Badge>
                                                    {spotlightSubmission.marks !== undefined && spotlightSubmission.marks !== null && (
                                                        <p className="text-sm font-black text-primary mt-1">
                                                            {spotlightSubmission.marks}
                                                            <span className="text-[10px] text-gray-400 font-bold"> / {assignment.totalMarks}</span>
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}

                                    {/* All Submissions List - Shown when no specific student is filtered */}
                                    {!spotlightSubmission && assignment.submissions?.length > 0 && (
                                        <div className="mt-4 border-t border-gray-50 pt-4">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                <Users className="w-3 h-3" />
                                                Student Submissions ({assignment.submissions.length})
                                            </p>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar p-1">
                                                {[...assignment.submissions].sort((a, b) => {
                                                    const getPriority = (status) => {
                                                        if (status !== 'graded' && status !== 'rejected') return 0; // PENDING is highest priority
                                                        if (status === 'rejected') return 1; // REJECTED is second
                                                        return 2; // GRADED is last
                                                    };
                                                    const p = getPriority(a.status) - getPriority(b.status);
                                                    if (p !== 0) return p;
                                                    return new Date(b.submittedAt) - new Date(a.submittedAt);
                                                }).map((sub) => (
                                                    <div key={sub._id} className="p-2.5 bg-gray-50/50 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 hover:shadow-sm rounded-xl border border-gray-100 dark:border-white/10 transition-all flex items-center justify-between gap-3 group">
                                                        <div className="flex items-center gap-2 overflow-hidden">
                                                            {sub.user?.photo ? (
                                                                <img src={sub.user.photo} alt="" className="w-7 h-7 rounded-full object-cover border border-gray-100 dark:border-slate-800" />
                                                            ) : (
                                                                <div className="w-7 h-7 rounded-full bg-primary/5 dark:bg-primary/10 flex items-center justify-center text-primary font-bold text-[10px]">
                                                                    {sub.user?.name?.charAt(0)}
                                                                </div>
                                                            )}
                                                            <div className="min-w-0">
                                                                <p className="text-[11px] font-bold text-gray-900 dark:text-white truncate group-hover:text-primary transition-colors">{sub.user?.name}</p>
                                                                <div className="flex items-center gap-1.5">
                                                                    {sub.user?.rollNo && (
                                                                        <span className="text-[9px] font-black text-red-500/70">{sub.user?.rollNo}</span>
                                                                    )}
                                                                    <span className="text-[9px] text-gray-400 dark:text-gray-500 font-medium">
                                                                        {formatDate(sub.submittedAt)}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="text-right shrink-0">
                                                            <div className={`text-[9px] font-black px-2 py-0.5 rounded-lg border ${
                                                                sub.status === 'graded' ? 'bg-primary/5 dark:bg-primary/10 text-primary border-primary/10 dark:border-primary/20' :
                                                                sub.status === 'rejected' ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-100 dark:border-red-500/20' :
                                                                'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-500/20'
                                                            }`}>
                                                                {sub.status === 'graded' ? `${sub.marks}/${assignment.totalMarks}` : (sub.status === 'rejected' ? 'REJECTED' : 'PENDING')}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-1.5 px-3 py-1 bg-gray-50 rounded-lg border border-gray-100 text-xs font-bold text-gray-500 uppercase">
                                                <Calendar className="w-3.5 h-3.5" />
                                                Due: {formatDate(assignment.dueDate)}
                                            </div>
                                            {gradedCount < submissionCount && (
                                                <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 rounded-lg border border-amber-100 text-[10px] font-black text-amber-600 uppercase">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    {submissionCount - gradedCount} Pending Marks
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {gradedCount > 0 && (
                                                <button
                                                    onClick={() => { setReviewAssignment(assignment); setIsReviewModalOpen(true); }}
                                                    className="flex items-center gap-1.5 px-4 py-2.5 bg-primary/5 hover:bg-primary/10 text-primary border border-primary/20 rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-95"
                                                >
                                                    <Eye className="w-3.5 h-3.5" />
                                                    REVIEW GRADES
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleViewSubmissions(assignment)}
                                                className="px-6 py-2.5 bg-primary hover:bg-primary text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg active:scale-95"
                                            >
                                                {isFullyGraded ? 'GRADE SUBMISSIONS' : 'GRADE SUBMISSIONS'}
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}

                    {assignments.length === 0 && (
                        <div className="text-center py-12 text-gray-400">
                            No {itemsLabelLower} created yet.
                        </div>
                    )}
                </div>
            )}

            {/* Create {itemLabel} Modal */}
            <Modal
                key={isCreateModalOpen ? 'create-modal-open' : 'create-modal-closed'}
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                title={`Create New ${itemLabel}`}
                size="xl"
            >
                <form onSubmit={handleCreateAssignment} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                        <input
                            type="text"
                            value={newAssignment.title}
                            onChange={(e) => setNewAssignment({ ...newAssignment, title: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Description <span className="text-gray-400 font-normal">(visual editor)</span>
                        </label>
                        <RichTextEditor
                            value={newAssignment.description}
                            onChange={(html) => setNewAssignment({ ...newAssignment, description: html })}
                            placeholder="Write assignment instructions — bold, lists, links, headings…"
                            minHeight="200px"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                            <input
                                type="date"
                                value={newAssignment.dueDate}
                                onChange={(e) => setNewAssignment({ ...newAssignment, dueDate: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Total Marks</label>
                            <input
                                type="number"
                                value={newAssignment.totalMarks}
                                onChange={(e) => setNewAssignment({ ...newAssignment, totalMarks: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Publish At (Schedule) - Optional
                        </label>
                        <input
                            type="datetime-local"
                            value={newAssignment.publishDate}
                            onChange={(e) => setNewAssignment({ ...newAssignment, publishDate: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20"
                        />
                        <p className="text-[10px] text-gray-400 mt-1 uppercase font-bold tracking-tighter italic">Leave empty to publish immediately</p>
                    </div>

                    {/* Assign To Section */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Assign To</label>
                        <div className="flex gap-4 mb-3">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="assignTo"
                                    checked={newAssignment.assignTo === 'all'}
                                    onChange={() => setNewAssignment({ ...newAssignment, assignTo: 'all', assignedUsers: [] })}
                                    className="text-primary focus:ring-primary"
                                />
                                <span className="text-sm text-gray-600">All Students</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="assignTo"
                                    checked={newAssignment.assignTo === 'none'}
                                    onChange={() => setNewAssignment({ ...newAssignment, assignTo: 'none', assignedUsers: [] })}
                                    className="text-primary focus:ring-primary"
                                />
                                <span className="text-sm text-gray-600 italic">None (Draft)</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="assignTo"
                                    checked={newAssignment.assignTo === 'selected'}
                                    onChange={() => setNewAssignment({ ...newAssignment, assignTo: 'selected' })}
                                    className="text-primary focus:ring-primary"
                                />
                                <span className="text-sm text-gray-600">Selected Students</span>
                            </label>
                        </div>

                        {newAssignment.assignTo === 'selected' && (
                            <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                                {/* Search & Controls */}
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="Search by name or reg no..."
                                            value={assignSearchTerm}
                                            onChange={(e) => setAssignSearchTerm(e.target.value)}
                                            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const searchTerm = assignSearchTerm.toLowerCase();
                                            const visibleStudents = students.filter(s =>
                                            (s.name?.toLowerCase().includes(searchTerm) ||
                                                s.rollNo?.toLowerCase().includes(searchTerm))
                                            );
                                            // Add visible students to selection if not already selected
                                            const newSelection = new Set(newAssignment.assignedUsers || []);
                                            visibleStudents.forEach(s => newSelection.add(s.id || s._id));
                                            setNewAssignment({ ...newAssignment, assignedUsers: Array.from(newSelection) });
                                        }}
                                        className="px-3 py-2 text-xs font-bold text-primary bg-primary/5 hover:bg-primary/10 rounded-lg transition-colors whitespace-nowrap"
                                    >
                                        Select All
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setNewAssignment({ ...newAssignment, assignedUsers: [] })}
                                        className="px-3 py-2 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors whitespace-nowrap"
                                    >
                                        Clear
                                    </button>
                                </div>

                                {/* List */}
                                <div className="flex flex-wrap items-start gap-3">
                                    {students?.filter(s =>
                                        s.name?.toLowerCase().includes(assignSearchTerm.toLowerCase()) ||
                                        s.rollNo?.toLowerCase().includes(assignSearchTerm.toLowerCase())
                                    ).map(student => (
                                        <label key={student.id || student._id} className={`inline-flex w-fit flex-none items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition-all ${newAssignment.assignedUsers?.includes(student.id || student._id) ? 'border-primary bg-primary/5 shadow-sm' : 'border-gray-200 dark:border-white/10 bg-white dark:bg-slate-800 hover:border-primary/40 hover:shadow-sm'}`}>
                                            <input
                                                type="checkbox"
                                                checked={newAssignment.assignedUsers?.includes(student.id || student._id)}
                                                onChange={(e) => {
                                                    const sId = student.id || student._id;
                                                    const current = newAssignment.assignedUsers || [];
                                                    if (e.target.checked) {
                                                        setNewAssignment({ ...newAssignment, assignedUsers: [...current, sId] });
                                                    } else {
                                                        setNewAssignment({ ...newAssignment, assignedUsers: current.filter(id => id !== sId) });
                                                    }
                                                }}
                                                className="w-4 h-4 rounded accent-orange-500 text-orange-500 focus:ring-orange-500 border-gray-300 dark:border-white/20"
                                            />
                                            <div className="flex-1 flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    {student.photo ? (
                                                        <img src={student.photo} alt={student.name} className="w-8 h-8 rounded-full object-cover" />
                                                    ) : (
                                                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                                                            {student.name?.charAt(0)}
                                                        </div>
                                                    )}
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-900 dark:text-white">{student.name}</p>
                                                        <p className="text-xs text-gray-400 dark:text-gray-400">{student.rollNo}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </label>
                                    ))}
                                    {students?.length === 0 && (
                                        <p className="text-sm text-gray-400 text-center py-4">No students enrolled</p>
                                    )}
                                </div>
                                <div className="flex justify-between items-center px-1">
                                    <span className="text-xs text-gray-400">
                                        {students?.length} total students
                                    </span>
                                    <span className="text-xs font-bold text-primary">
                                        {newAssignment.assignedUsers?.length || 0} selected
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={() => setIsCreateModalOpen(false)}
                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isCreating}
                            className="px-6 py-2.5 bg-primary hover:bg-primary text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-primary/10 flex items-center gap-2"
                        >
                            {isCreating ? <ButtonLoader /> : <Plus className="w-4 h-4" />}
                            Create {itemLabel}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Edit Assignment Modal */}
            <Modal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                title={`Edit ${itemLabel}`}
                size="xl"
            >
                {editingAssignment && (
                    <form onSubmit={handleUpdateAssignment} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                            <input
                                type="text"
                                value={editingAssignment.title}
                                onChange={(e) => setEditingAssignment({ ...editingAssignment, title: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Description <span className="text-gray-400 font-normal">(visual editor)</span>
                            </label>
                            <RichTextEditor
                                value={editingAssignment.description || ''}
                                onChange={(html) =>
                                    setEditingAssignment({ ...editingAssignment, description: html })
                                }
                                placeholder="Update assignment instructions…"
                                minHeight="200px"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                                <input
                                    type="date"
                                    value={editingAssignment.dueDate}
                                    onChange={(e) => setEditingAssignment({ ...editingAssignment, dueDate: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Total Marks</label>
                                <input
                                    type="number"
                                    value={editingAssignment.totalMarks}
                                    onChange={(e) => setEditingAssignment({ ...editingAssignment, totalMarks: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Publish At (Schedule) - Optional
                            </label>
                            <input
                                type="datetime-local"
                                value={editingAssignment.publishDate}
                                onChange={(e) => setEditingAssignment({ ...editingAssignment, publishDate: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20"
                            />
                            <p className="text-[10px] text-gray-400 mt-1 uppercase font-bold tracking-tighter italic">Leave empty to publish immediately</p>
                        </div>

                        {/* Assign To Section for Edit */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Assign To</label>
                            <div className="flex gap-4 mb-3">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="editAssignTo"
                                        checked={editingAssignment.assignTo === 'all'}
                                        onChange={() => setEditingAssignment({ ...editingAssignment, assignTo: 'all', assignedUsers: [] })}
                                        className="text-primary focus:ring-primary"
                                    />
                                    <span className="text-sm text-gray-600">All Students</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="editAssignTo"
                                        checked={editingAssignment.assignTo === 'none'}
                                        onChange={() => setEditingAssignment({ ...editingAssignment, assignTo: 'none', assignedUsers: [] })}
                                        className="text-primary focus:ring-primary"
                                    />
                                    <span className="text-sm text-gray-600 italic">None (Draft)</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="editAssignTo"
                                        checked={editingAssignment.assignTo === 'selected'}
                                        onChange={() => setEditingAssignment({ ...editingAssignment, assignTo: 'selected' })}
                                        className="text-primary focus:ring-primary"
                                    />
                                    <span className="text-sm text-gray-600">Selected Students</span>
                                </label>
                            </div>

                            {editingAssignment.assignTo === 'selected' && (
                                <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                                    {/* Search & Controls */}
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input
                                                type="text"
                                                placeholder="Search by name or reg no..."
                                                value={assignSearchTerm}
                                                onChange={(e) => setAssignSearchTerm(e.target.value)}
                                                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const searchTerm = assignSearchTerm.toLowerCase();
                                                const visibleStudents = students.filter(s =>
                                                (s.name?.toLowerCase().includes(searchTerm) ||
                                                    s.rollNo?.toLowerCase().includes(searchTerm))
                                                );
                                                const newSelection = new Set(editingAssignment.assignedUsers || []);
                                                visibleStudents.forEach(s => newSelection.add(s.id || s._id));
                                                setEditingAssignment({ ...editingAssignment, assignedUsers: Array.from(newSelection) });
                                            }}
                                            className="px-3 py-2 text-xs font-bold text-primary bg-primary/5 hover:bg-primary/10 rounded-lg transition-colors whitespace-nowrap"
                                        >
                                            Select All
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setEditingAssignment({ ...editingAssignment, assignedUsers: [] })}
                                            className="px-3 py-2 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors whitespace-nowrap"
                                        >
                                            Clear
                                        </button>
                                    </div>

                                    {/* List */}
                                    <div className="flex flex-wrap items-start gap-3">
                                        {students?.filter(s =>
                                            s.name?.toLowerCase().includes(assignSearchTerm.toLowerCase()) ||
                                            s.rollNo?.toLowerCase().includes(assignSearchTerm.toLowerCase())
                                        ).map(student => (
                                            <label key={student.id || student._id} className={`inline-flex w-fit flex-none items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition-all ${editingAssignment.assignedUsers?.includes(student.id || student._id) ? 'border-primary bg-primary/5 shadow-sm' : 'border-gray-200 dark:border-white/10 bg-white dark:bg-slate-800 hover:border-primary/40 hover:shadow-sm'}`}>
                                                <input
                                                    type="checkbox"
                                                    checked={editingAssignment.assignedUsers?.includes(student.id || student._id)}
                                                    onChange={(e) => {
                                                        const sId = student.id || student._id;
                                                        const current = editingAssignment.assignedUsers || [];
                                                        if (e.target.checked) {
                                                            setEditingAssignment({ ...editingAssignment, assignedUsers: [...current, sId] });
                                                        } else {
                                                            setEditingAssignment({ ...editingAssignment, assignedUsers: current.filter(id => id !== sId) });
                                                        }
                                                    }}
                                                    className="w-4 h-4 rounded accent-orange-500 text-orange-500 focus:ring-orange-500 border-gray-300 dark:border-white/20"
                                                />
                                                <div className="flex-1 flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        {student.photo ? (
                                                            <img src={student.photo} alt={student.name} className="w-8 h-8 rounded-full object-cover" />
                                                        ) : (
                                                            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                                                                {student.name?.charAt(0)}
                                                            </div>
                                                        )}
                                                        <div>
                                                            <p className="text-sm font-medium text-gray-900 dark:text-white">{student.name}</p>
                                                            <p className="text-xs text-gray-400 dark:text-gray-400">{student.rollNo}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                    <div className="flex justify-between items-center px-1">
                                        <span className="text-xs text-gray-400">
                                            {students?.length} total students
                                        </span>
                                        <span className="text-xs font-bold text-primary">
                                            {editingAssignment.assignedUsers?.length || 0} selected
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-3 pt-4">
                            <button
                                type="button"
                                onClick={() => setIsEditModalOpen(false)}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isCreating}
                                className="px-6 py-2.5 bg-primary hover:bg-primary text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-primary/10 flex items-center gap-2"
                            >
                                {isCreating ? <ButtonLoader /> : <CheckCircle className="w-4 h-4" />}
                                Save Changes
                            </button>
                        </div>
                    </form>
                )}
            </Modal>

            {/* Submissions Modal */}
            <Modal
                isOpen={isSubmissionsModalOpen}
                onClose={() => setIsSubmissionsModalOpen(false)}
                title={`Submissions: ${selectedAssignment?.title}`}
                size="xl"
            >
                <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                    {selectedAssignment?.submissions && selectedAssignment.submissions.length > 0 ? (
                        [...selectedAssignment.submissions].sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt)).map((submission) => (
                            <div key={submission._id} className="bg-gray-50 p-4 rounded-xl border border-gray-100 relative">
                                <button
                                    onClick={() => handleDeleteSubmission(selectedAssignment._id, submission._id)}
                                    className="absolute top-4 right-4 p-2 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors border border-transparent hover:border-red-100"
                                    title="Delete Submission"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                                <div className="flex justify-between items-start mb-2 pr-10">
                                    <div className="flex items-center gap-3">
                                        {submission.user?.photo ? (
                                            <img src={submission.user.photo} alt={submission.user?.name} className="w-8 h-8 rounded-full object-cover" />
                                        ) : (
                                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                                                {submission.user?.name?.charAt(0)}
                                            </div>
                                        )}
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                <p className="font-bold text-gray-900 text-sm">{submission.user?.name}</p>
                                                {submission.user?.rollNo && (
                                                    <span className="text-[10px] font-black text-red-500 bg-red-50 px-2 py-0.5 rounded-lg border border-red-100 uppercase tracking-tighter">
                                                        {submission.user?.rollNo}
                                                    </span>
                                                )}
                                                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${submission.user?.role === 'intern' ? 'bg-purple-50 text-primary border-primary/10' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                                                    {submission.user?.role || 'student'}
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-gray-400 font-medium flex items-center gap-1.5">
                                                <Clock className="w-3.5 h-3.5" />
                                                {formatDateTime(submission.submittedAt)}
                                            </p>
                                        </div>
                                    </div>
                                    {submission.status === 'graded' ? (
                                        <div className="text-right">
                                            <Badge variant="success">Graded</Badge>
                                            <p className="text-lg font-bold text-primary mt-1">{submission.marks}<span className="text-xs text-primary">/{selectedAssignment.totalMarks}</span></p>
                                        </div>
                                    ) : submission.status === 'rejected' ? (
                                        <Badge variant="error">Rejected</Badge>
                                    ) : (
                                        <Badge variant="warning">Pending Grade</Badge>
                                    )}
                                </div>

                                <div className="space-y-3 mb-4">
                                    <div className="text-sm text-gray-700 bg-white p-3 rounded-lg border border-gray-100">
                                        <p className="font-black text-gray-400 text-[10px] uppercase mb-1 tracking-widest">Student Notes</p>
                                        <RichTextContent html={submission.notes || '<p>No notes provided</p>'} className="italic font-medium text-gray-700" />
                                    </div>

                                    {submission.fileUrl && (
                                        <a
                                            href={submission.fileUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100 border border-blue-100 transition-colors"
                                        >
                                            <Upload className="w-3.5 h-3.5" />
                                            {submission.googleDriveFile?.mimeType === 'application/vnd.google-apps.folder'
                                                ? 'VIEW SUBMISSION FOLDER'
                                                : 'VIEW ATTACHED FILE'}
                                        </a>
                                    )}

                                    {submission.feedback && (
                                        <div className="text-sm text-blue-700 bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                                            <p className="font-black text-blue-500 text-[10px] uppercase mb-1 tracking-widest">Teacher Feedback</p>
                                            <p className="italic font-medium">{submission.feedback}</p>
                                        </div>
                                    )}
                                </div>

                                <div className="pt-3 border-t border-gray-200">
                                    {selectedSubmission?._id === submission._id ? (
                                        <form onSubmit={handleGradeSubmission} className="space-y-3">
                                            <div className="flex gap-4">
                                                <div className="flex-1">
                                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Obtained Marks</label>
                                                    <div className="relative">
                                                        <input
                                                            type="number"
                                                            placeholder="0"
                                                            value={gradeMarks}
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                setGradeMarks(val);
                                                                
                                                                const numVal = parseFloat(val);
                                                                const total = selectedAssignment?.totalMarks || 100;
                                                                
                                                                if (!isNaN(numVal) && total > 0) {
                                                                    const percentage = (numVal / total) * 100;
                                                                    if (percentage >= 90) setGradeFeedback('Excellent! Perfect execution and great attention to detail. Keep it up!');
                                                                    else if (percentage >= 85) setGradeFeedback('Outstanding effort! Very well done.');
                                                                    else if (percentage >= 80) setGradeFeedback('Great job! Keep up the consistent effort.');
                                                                    else if (percentage >= 75) setGradeFeedback('Good work! Solid understanding of the concepts.');
                                                                    else if (percentage >= 70) setGradeFeedback('Satisfactory effort. Try to focus more on the requirements.');
                                                                    else if (percentage >= 65) setGradeFeedback('Average work. Needs more attention and focus.');
                                                                    else if (percentage >= 60) setGradeFeedback('Below expectations. Please review the instructions carefully.');
                                                                    else setGradeFeedback("Poor performance. Let's work on the basics and improve.");
                                                                }
                                                            }}
                                                            className="w-full px-4 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 font-bold"
                                                            max={selectedAssignment.totalMarks}
                                                            required
                                                        />
                                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">/ {selectedAssignment.totalMarks}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Teacher Feedback</label>
                                                <textarea
                                                    placeholder="Enter feedback for the student..."
                                                    value={gradeFeedback}
                                                    onChange={(e) => setGradeFeedback(e.target.value)}
                                                    className="w-full px-4 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 resize-none font-medium"
                                                    rows="2"
                                                />
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    type="submit"
                                                    disabled={isGrading}
                                                    className="flex-1 py-2.5 bg-primary hover:bg-primary text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-primary/10 active:scale-95"
                                                >
                                                    {isGrading ? 'SAVING...' : 'SAVE GRADE'}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRejectSubmission()}
                                                    disabled={isGrading}
                                                    className="px-6 py-2 bg-red-100 text-red-600 text-xs font-black uppercase tracking-widest rounded-xl hover:bg-red-200 transition-all font-bold active:scale-95"
                                                >
                                                    {isGrading ? '...' : 'REJECT'}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedSubmission(null);
                                                        setRejectingSubmissionId(null);
                                                        setRejectFeedback('');
                                                        setGradeMarks('');
                                                        setGradeFeedback('');
                                                    }}
                                                    className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-xl transition-all"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                            {rejectingSubmissionId === selectedSubmission?._id && (
                                                <div className="mt-3 p-3 bg-red-50 rounded-xl border border-red-200 space-y-2">
                                                    <label className="block text-[10px] font-black text-red-500 uppercase tracking-widest ml-1">Rejection Reason (Required)</label>
                                                    <textarea
                                                        placeholder="Explain why this submission is being rejected..."
                                                        value={rejectFeedback}
                                                        onChange={(e) => setRejectFeedback(e.target.value)}
                                                        className="w-full px-4 py-2 text-sm border border-red-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500/20 resize-none font-medium bg-white"
                                                        rows="2"
                                                        autoFocus
                                                    />
                                                    <div className="flex gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRejectSubmission()}
                                                            disabled={isGrading || !rejectFeedback.trim()}
                                                            className="flex-1 py-2 bg-red-600 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-red-700 transition-all disabled:opacity-50 active:scale-95 shadow-lg shadow-red-100"
                                                        >
                                                            {isGrading ? 'REJECTING...' : 'CONFIRM REJECT'}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => { setRejectingSubmissionId(null); setRejectFeedback(''); }}
                                                            className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-xl text-xs font-bold transition-all"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </form>
                                    ) : (
                                        <>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => {
                                                        setSelectedSubmission(submission);
                                                        setGradeMarks(submission.marks || '');
                                                        setGradeFeedback(submission.feedback || '');
                                                    }}
                                                    className="flex-1 py-2.5 bg-primary hover:bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-primary active:scale-95"
                                                >
                                                    {submission.marks ? 'EDIT GRADE' : 'GRADE SUBMISSION'}
                                                </button>
                                                {(submission.status === 'submitted' || !submission.status) && (
                                                    <button
                                                        onClick={() => handleRejectSubmission(submission)}
                                                        disabled={isGrading}
                                                        className="px-6 py-2.5 bg-red-100 text-red-600 hover:bg-red-200 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50"
                                                    >
                                                        REJECT
                                                    </button>
                                                )}
                                            </div>
                                            {rejectingSubmissionId === submission._id && !selectedSubmission && (
                                                <div className="mt-3 p-3 bg-red-50 rounded-xl border border-red-200 space-y-2">
                                                    <label className="block text-[10px] font-black text-red-500 uppercase tracking-widest ml-1">Rejection Reason (Required)</label>
                                                    <textarea
                                                        placeholder="Explain why this submission is being rejected..."
                                                        value={rejectFeedback}
                                                        onChange={(e) => setRejectFeedback(e.target.value)}
                                                        className="w-full px-4 py-2 text-sm border border-red-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500/20 resize-none font-medium bg-white"
                                                        rows="2"
                                                        autoFocus
                                                    />
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => handleRejectSubmission(submission)}
                                                            disabled={isGrading || !rejectFeedback.trim()}
                                                            className="flex-1 py-2 bg-red-600 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-red-700 transition-all disabled:opacity-50"
                                                        >
                                                            {isGrading ? 'REJECTING...' : 'CONFIRM REJECT'}
                                                        </button>
                                                        <button
                                                            onClick={() => { setRejectingSubmissionId(null); setRejectFeedback(''); }}
                                                            className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-xl text-xs font-bold transition-all"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-center text-gray-500 py-8">No submissions yet.</p>
                    )}
                </div>
            </Modal>

            {/* Review Grades Modal */}
            <Modal
                isOpen={isReviewModalOpen}
                onClose={() => { setIsReviewModalOpen(false); setReviewAssignment(null); }}
                title={`Review Grades: ${reviewAssignment?.title}`}
                size="xl"
            >
                <div className="space-y-4 max-h-[65vh] overflow-y-auto py-2 pr-2">
                    {reviewAssignment?.submissions && reviewAssignment.submissions.filter(s => s.status === 'graded').length > 0 ? (
                        reviewAssignment.submissions
                            .filter(s => s.status === 'graded')
                            .sort((a, b) => (b.marks || 0) - (a.marks || 0))
                            .map((submission, idx) => {
                                const percentage = reviewAssignment.totalMarks > 0
                                    ? Math.round((submission.marks / reviewAssignment.totalMarks) * 100)
                                    : 0;
                                const feedback = submission.feedback || getAutomaticFeedback(percentage);
                                const isPass = percentage >= 50;
                                return (
                                    <div key={submission._id} className="bg-gray-50 dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 overflow-hidden relative group">
                                        <button
                                            onClick={() => handleDeleteSubmission(reviewAssignment._id, submission._id)}
                                            className="absolute top-3 right-3 z-10 p-2 text-red-400 bg-white/90 dark:bg-slate-700 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all border border-red-100/60 dark:border-red-900/30 shadow-sm opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                                            title="Delete Graded Submission"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                        <div className="flex items-center justify-between p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black text-sm border-2 border-white dark:border-slate-800 shadow-sm shrink-0">
                                                    {idx + 1}
                                                </div>
                                                {submission.user?.photo ? (
                                                    <img src={submission.user.photo} alt="" className="w-10 h-10 rounded-full object-cover border-2 border-white dark:border-slate-800 shadow-sm" />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black text-sm border-2 border-white dark:border-slate-800 shadow-sm">
                                                        {submission.user?.name?.charAt(0)}
                                                    </div>
                                                )}
                                                <div>
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="font-black text-gray-900 dark:text-white text-sm">{submission.user?.name}</span>
                                                        {submission.user?.rollNo && (
                                                            <span className="text-[10px] font-black text-red-500 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded-lg border border-red-100 dark:border-red-800/30 uppercase">
                                                                {submission.user.rollNo}
                                                            </span>
                                                        )}
                                                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border uppercase ${submission.user?.role === 'intern' ? 'bg-purple-50 dark:bg-purple-900/20 text-primary border-primary/10 dark:border-primary/30' : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-800/30'}`}>
                                                            {submission.user?.role || 'student'}
                                                        </span>
                                                    </div>
                                                    <p className="text-[11px] text-gray-400 font-medium mt-0.5">{formatDateTime(submission.submittedAt)}</p>
                                                </div>
                                            </div>
                                            <div className="text-right shrink-0 pr-10">
                                                <span className={`text-[10px] font-black px-3 py-1 rounded-full border ${isPass ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-100 dark:border-green-800/30' : 'bg-red-50 dark:bg-red-900/20 text-red-500 border-red-100 dark:border-red-800/30'}`}>
                                                    {isPass ? 'PASSED' : 'FAILED'}
                                                </span>
                                                <p className="text-2xl font-black text-primary mt-1 leading-none">
                                                    {submission.marks}<span className="text-sm opacity-50">/{reviewAssignment.totalMarks}</span>
                                                </p>
                                                <p className="text-[10px] font-black text-gray-400 mt-0.5">{percentage}%</p>
                                            </div>
                                        </div>
                                        <div className="px-4 pb-4 pt-2 border-t border-gray-100 dark:border-slate-700 bg-white/60 dark:bg-slate-900/40">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Teacher Feedback</p>
                                            <p className="text-xs font-medium text-gray-600 dark:text-gray-300 italic">"{feedback}"</p>
                                        </div>
                                    </div>
                                );
                            })
                    ) : (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 rounded-full bg-gray-50 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4 border border-dashed border-gray-200 dark:border-slate-600">
                                <Users className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                            </div>
                            <h4 className="text-lg font-bold text-gray-900 dark:text-white uppercase">No Graded Submissions</h4>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Grade some submissions first to review them here.</p>
                        </div>
                    )}
                </div>
            </Modal>
        </div>
    );
};

export default AssignmentsTab;





