import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSelector } from 'react-redux';
import {
    Search,
    CheckCircle,
    Clock,
    ExternalLink,
    Save,
    FileText
} from 'lucide-react';
import Badge from '../../components/ui/Badge';
import Loader, { ButtonLoader } from '../../components/ui/Loader';
import RichTextContent from '../../components/ui/RichTextContent';
import { courseAPI, assignmentAPI } from '../../services/api';
import { formatDate, formatDateTime } from '../../utils/dateFormatter';

const GradingSystem = () => {
    const { user } = useSelector((state) => state.auth);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCourse, setSelectedCourse] = useState('all');
    const [courses, setCourses] = useState([]);
    const [submissions, setSubmissions] = useState([]);
    const [grades, setGrades] = useState({});

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            // Fetch courses where this teacher is assigned
            const coursesRes = await courseAPI.getAll();
            const allCourses = coursesRes.data.data || [];
            const teacherCourses = allCourses.filter(c =>
                c.teachers?.some(t => String(t._id || t) === String(user?._id))
            );
            setCourses(teacherCourses);

            // Fetch assignments for each course
            let allSubmissions = [];
            for (const course of teacherCourses) {
                try {
                    const assignmentsRes = await assignmentAPI.getByCourse(course._id);
                    const assignments = assignmentsRes.data.assignments || [];

                    // Extract submissions from each assignment
                    for (const assignment of assignments) {
                        if (assignment.submissions && assignment.submissions.length > 0) {
                            for (const submission of assignment.submissions) {
                                allSubmissions.push({
                                    id: submission._id,
                                    assignmentId: assignment._id,
                                    student: submission.user?.name || 'Student',
                                    studentId: submission.user?._id || submission.user,
                                    assignment: assignment.title,
                                    course: course.title,
                                    courseId: course._id,
                                    submittedAt: submission.submittedAt,
                                    link: submission.fileUrl || submission.notes || '',
                                    notes: submission.notes || '',
                                    status: submission.marks != null ? 'graded' : 'pending',
                                    currentGrade: submission.marks || null,
                                    totalMarks: assignment.totalMarks || 100
                                });
                            }
                        }
                    }
                } catch (e) {
                    console.error('Error fetching assignments for course:', course._id, e);
                }
            }

            setSubmissions(allSubmissions);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const filteredSubmissions = submissions.filter((sub) => {
        const matchesSearch =
            sub.student.toLowerCase().includes(searchQuery.toLowerCase()) ||
            sub.assignment.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCourse = selectedCourse === 'all' || sub.courseId === selectedCourse;
        return matchesSearch && matchesCourse;
    });

    const handleGradeChange = (submissionId, value) => {
        setGrades((prev) => ({
            ...prev,
            [submissionId]: value,
        }));
    };

    const handleSaveGrade = async (submission) => {
        const grade = grades[submission.id];
        if (!grade || grade < 0 || grade > submission.totalMarks) {
            alert(`Please enter a valid grade (0-${submission.totalMarks})`);
            return;
        }

        setIsSaving(submission.id);
        try {
            await assignmentAPI.grade(submission.assignmentId, submission.id, parseInt(grade));

            // Update local state
            setSubmissions(prev => prev.map(s =>
                s.id === submission.id
                    ? { ...s, status: 'graded', currentGrade: parseInt(grade) }
                    : s
            ));

            // Clear the input
            setGrades(prev => {
                const newGrades = { ...prev };
                delete newGrades[submission.id];
                return newGrades;
            });
        } catch (error) {
            console.error('Error saving grade:', error);
            alert(error.response?.data?.message || 'Failed to save grade');
        } finally {
            setIsSaving(null);
        }
    };

    const handleRejectSubmission = async (submission) => {
        if (!confirm('Are you sure you want to reject this submission? The student will be notified to resubmit.')) return;

        setIsSaving(submission.id);
        try {
            await assignmentAPI.grade(submission.assignmentId, submission.id, 0, '', 'rejected');

            // Update local state
            setSubmissions(prev => prev.map(s =>
                s.id === submission.id
                    ? { ...s, status: 'rejected', currentGrade: 0 }
                    : s
            ));
            alert('Submission rejected successfully');
        } catch (error) {
            console.error('Error rejecting grade:', error);
            alert(error.response?.data?.message || 'Failed to reject submission');
        } finally {
            setIsSaving(null);
        }
    };


    if (isLoading) {
        return <Loader message="Analyzing grading records..." />;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Grading System</h1>
                    <p className="text-gray-500">Review submissions and assign grades</p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl p-4 border border-primary/20 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                    <div className="flex-1 flex items-center bg-gray-50 rounded-xl px-4 py-3">
                        <Search className="w-5 h-5 text-gray-400 mr-3" />
                        <input
                            type="text"
                            placeholder="Search by student or assignment..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="!bg-transparent border-none outline-none w-full text-gray-700 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/30 font-medium"
                        />
                    </div>

                    <select
                        value={selectedCourse}
                        onChange={(e) => setSelectedCourse(e.target.value)}
                        className="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                        <option value="all">All Courses</option>
                        {courses.map((course) => (
                            <option key={course._id} value={course._id}>
                                {course.title}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* No Submissions */}
            {submissions.length === 0 && (
                <div className="bg-white rounded-2xl p-12 border border-gray-100 text-center">
                    <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No Submissions Yet</h3>
                    <p className="text-gray-500">Submissions from your students will appear here for grading.</p>
                </div>
            )}

            {/* Submissions List */}
            <div className="space-y-4">
                {filteredSubmissions.map((submission, index) => (
                    <motion.div
                        key={submission.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="bg-white rounded-2xl p-6 border border-primary/20 shadow-sm"
                    >
                        <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                            {/* Student Info */}
                            <div className="flex items-center gap-4 flex-1">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary flex items-center justify-center text-white font-semibold">
                                    {submission.student.charAt(0)}
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900">{submission.student}</h3>
                                    <p className="text-sm text-gray-500">{submission.assignment}</p>
                                    <p className="text-xs text-gray-400 mt-1">{submission.course}</p>
                                </div>
                            </div>

                            {/* Submission Details */}
                            <div className="flex flex-wrap items-center gap-4">
                                <div className="text-sm text-gray-500">
                                    <Clock className="w-4 h-4 inline mr-1" />
                                    {formatDateTime(submission.submittedAt)}
                                </div>

                                {submission.link && (
                                    <a
                                        href={submission.link.startsWith('http') ? submission.link : `https://${submission.link}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-colors"
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                        View Submission
                                    </a>
                                )}

                                <Badge variant={submission.status === 'graded' ? 'success' : 'warning'}>
                                    {submission.status === 'graded' ? (
                                        <>
                                            <CheckCircle className="w-3 h-3 mr-1" />
                                            Graded: {submission.currentGrade}/{submission.totalMarks}
                                        </>
                                    ) : (
                                        <>
                                            <Clock className="w-3 h-3 mr-1" />
                                            Pending
                                        </>
                                    )}
                                </Badge>
                            </div>

                            {/* Grade Input */}
                            <div className="flex items-center gap-3">
                                <div className="flex items-center">
                                    <input
                                        type="number"
                                        min="0"
                                        max={submission.totalMarks}
                                        value={grades[submission.id] ?? submission.currentGrade ?? ''}
                                        onChange={(e) => handleGradeChange(submission.id, e.target.value)}
                                        placeholder={`0-${submission.totalMarks}`}
                                        className="w-24 px-3 py-2 border border-gray-200 rounded-l-lg text-center focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                    />
                                    <span className="px-3 py-2 bg-gray-100 border border-l-0 border-gray-200 rounded-r-lg text-gray-500">
                                        /{submission.totalMarks}
                                    </span>
                                </div>
                                <button
                                    onClick={() => handleSaveGrade(submission)}
                                    disabled={isSaving === submission.id}
                                    className="px-4 py-2 bg-primary hover:bg-primary text-white rounded-lg font-medium transition-all flex items-center gap-2 disabled:opacity-50"
                                >
                                    {isSaving === submission.id ? (
                                        <ButtonLoader />
                                    ) : (
                                        <Save className="w-4 h-4" />
                                    )}
                                    Save
                                </button>
                                {submission.status !== 'rejected' && (
                                    <button
                                        onClick={() => handleRejectSubmission(submission)}
                                        disabled={isSaving === submission.id}
                                        className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg font-medium transition-all flex items-center gap-2 disabled:opacity-50"
                                    >
                                        Reject
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Notes */}
                        {submission.notes && (
                            <div className="mt-4 p-4 bg-gray-50 rounded-xl">
                                <p className="text-sm font-medium text-gray-700 mb-1">Student Notes:</p>
                                <RichTextContent html={submission.notes} className="text-sm text-gray-600" />
                            </div>
                        )}
                    </motion.div>
                ))}
            </div>

            {filteredSubmissions.length === 0 && submissions.length > 0 && (
                <div className="bg-white rounded-2xl p-12 border border-gray-100 text-center">
                    <p className="text-gray-500">No submissions match your search</p>
                </div>
            )}
        </div>
    );
};

export default GradingSystem;



