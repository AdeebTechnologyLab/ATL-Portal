import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronLeft, FileText, ClipboardList, User,
    CheckCircle, Clock, XCircle, ExternalLink, Upload,
    BookOpen, Tag, Calendar, AlertCircle
} from 'lucide-react';
import { assignmentAPI, enrollmentAPI, attendanceAPI, dailyTaskAPI } from '../../../services/api';
import api from '../../../services/api';
import Badge from '../../../components/ui/Badge';
import Loader from '../../../components/ui/Loader';
import { formatDate, formatDateTime } from '../../../utils/dateFormatter';
import RichTextContent from '../../../components/ui/RichTextContent';
import { stripHtmlToText } from '../../../utils/richText';
import { formatAttendanceDateDisplay, formatAttendanceWeekday } from '../../../utils/attendanceDate';

const TAB_ASSIGNMENTS = 'assignments';
const TAB_DAILY_TASKS = 'daily_tasks';
const TAB_ATTENDANCE = 'attendance';

const statusVariant = {
    graded: 'success',
    verified: 'success',
    rejected: 'error',
    submitted: 'warning',
    pending: 'warning',
};
const statusIcon = {
    graded: <CheckCircle className="w-3.5 h-3.5" />,
    verified: <CheckCircle className="w-3.5 h-3.5" />,
    rejected: <XCircle className="w-3.5 h-3.5" />,
    submitted: <Clock className="w-3.5 h-3.5" />,
    pending: <Clock className="w-3.5 h-3.5" />,
};

const StudentWorkView = ({ student, onBack }) => {
    const [activeTab, setActiveTab] = useState(TAB_ASSIGNMENTS);
    const [assignments, setAssignments] = useState([]);
    const [dailyTasks, setDailyTasks] = useState([]);
    const [enrollments, setEnrollments] = useState([]);
    const [attendanceData, setAttendanceData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadStudentWork();
    }, [student]);

    const loadStudentWork = async () => {
        setIsLoading(true);
        try {
            const studentId = student.id || student._id;

            // 1. Get student's enrollments directly
            try {
                const enrollRes = await enrollmentAPI.getUserEnrollments(studentId);
                setEnrollments(enrollRes.data.data || []);
            } catch (err) {
                console.error('Error loading enrollments:', err);
                setEnrollments([]);
            }

            // 2. Get all assignments for this student
            try {
                const assignRes = await assignmentAPI.getUserAssignments(studentId);
                setAssignments(assignRes.data.assignments || []);
            } catch (err) {
                console.error('Error loading assignments:', err);
                setAssignments([]);
            }

            // 3. Get all class logs (daily tasks) for this student
            try {
                const logsRes = await dailyTaskAPI.getUserDailyTasks(studentId);
                const taskData = logsRes.data.data || [];
                setDailyTasks(taskData);
            } catch (err) {
                console.error('Error loading class logs:', err);
                setDailyTasks([]);
            }

            // 4. Get attendance history
            try {
                const attendanceRes = await attendanceAPI.getStudentAttendance(studentId);
                const attData = attendanceRes.data.data || [];
                setAttendanceData(attData);
            } catch (err) {
                console.error('Error loading attendance:', err);
                setAttendanceData([]);
            }
        } catch (err) {
            console.error('Critical error loading student work:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const assignmentsWithSubmission = assignments.filter(a => a.submissions && a.submissions.length > 0);
    const assignmentsWithoutSubmission = assignments.filter(a => !a.submissions || a.submissions.length === 0);

    const isInternCourse = enrollments.some(e => e.course?.targetAudience === 'interns');

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-primary hover:text-primary font-bold text-sm tracking-wide"
                >
                    <ChevronLeft className="w-4 h-4" />
                    BACK TO SEARCH
                </button>
            </div>

            {/* Student Card */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex items-center gap-5">
                <div className="w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0 border-2 border-primary/10 shadow">
                    {student.photo ? (
                        <img src={student.photo} alt={student.name} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white font-black text-2xl">
                            {(student.name || 'S').charAt(0).toUpperCase()}
                        </div>
                    )}
                </div>
                <div className="flex-1">
                    <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">{student.name}</h2>
                    <div className="flex flex-wrap items-center gap-3 mt-1">
                        {student.rollNo && (
                            <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-lg border border-red-100">
                                {student.rollNo}
                            </span>
                        )}
                        {student.email && (
                            <span className="text-xs text-gray-400 font-medium">{student.email}</span>
                        )}
                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${isInternCourse ? 'bg-primary/10 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                            {student.role || 'Student'}
                        </span>
                    </div>
                </div>

                {/* Quick Stats */}
                <div className="hidden sm:flex gap-6">
                    <div className="text-center">
                        <p className="text-2xl font-black text-primary">{enrollments.length}</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Courses</p>
                    </div>
                    <div className="text-center">
                        <p className="text-2xl font-black text-blue-600">{assignments.length}</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Assignments</p>
                    </div>
                    <div className="text-center">
                        <p className="text-2xl font-black text-primary">{dailyTasks.length}</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Daily Logs</p>
                    </div>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-2 bg-gray-100/80 p-1.5 rounded-2xl w-fit border border-gray-200">
                <button
                    onClick={() => setActiveTab(TAB_ASSIGNMENTS)}
                    className={`px-8 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${activeTab === TAB_ASSIGNMENTS
                        ? 'bg-white text-primary shadow-sm border border-primary/10'
                        : 'text-gray-500 hover:bg-gray-200 hover:text-gray-900'
                        }`}
                >
                    <FileText className="w-4 h-4" />
                    {isInternCourse ? 'Projects' : 'Assignments'}
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${activeTab === TAB_ASSIGNMENTS ? 'bg-primary/10 text-primary' : 'bg-gray-200 text-gray-500'}`}>
                        {assignments.length}
                    </span>
                </button>
                <button
                    onClick={() => setActiveTab(TAB_DAILY_TASKS)}
                    className={`px-8 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${activeTab === TAB_DAILY_TASKS
                        ? 'bg-white text-primary shadow-sm border border-primary/10'
                        : 'text-gray-500 hover:bg-gray-200 hover:text-gray-900'
                        }`}
                >
                    <ClipboardList className="w-4 h-4" />
                    {isInternCourse ? 'Meeting Logs' : 'Class Logs'}
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${activeTab === TAB_DAILY_TASKS ? 'bg-primary/10 text-primary' : 'bg-gray-200 text-gray-500'}`}>
                        {dailyTasks.length}
                    </span>
                </button>
                <button
                    onClick={() => setActiveTab(TAB_ATTENDANCE)}
                    className={`px-8 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${activeTab === TAB_ATTENDANCE
                        ? 'bg-white text-primary shadow-sm border border-primary/10'
                        : 'text-gray-500 hover:bg-gray-200 hover:text-gray-900'
                        }`}
                >
                    <CheckCircle className="w-4 h-4" />
                    Attendance
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${activeTab === TAB_ATTENDANCE ? 'bg-primary/10 text-primary' : 'bg-gray-200 text-gray-500'}`}>
                        {attendanceData.length} Courses
                    </span>
                </button>
            </div>

            {/* Tab Content */}
            <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-xl shadow-gray-200/50 min-h-[400px]">
                {isLoading ? (
                    <Loader message="Loading student work..." />
                ) : (
                    <AnimatePresence mode="wait">
                        {activeTab === TAB_ASSIGNMENTS && (
                            <motion.div
                                key="assignments"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="space-y-6"
                            >
                                <div className="flex items-center justify-between">
                                    <h3 className="font-bold text-gray-900 text-lg">All Assignments</h3>
                                    <div className="flex gap-3">
                                        <span className="text-xs font-bold text-primary bg-primary/5 px-3 py-1 rounded-full border border-primary/10">
                                            {assignmentsWithSubmission.length} submitted
                                        </span>
                                        <span className="text-xs font-bold text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-100">
                                            {assignmentsWithoutSubmission.length} not submitted
                                        </span>
                                    </div>
                                </div>

                                {assignments.length === 0 ? (
                                    <div className="text-center py-16">
                                        <FileText className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                                        <p className="text-gray-400 font-medium">No {isInternCourse ? 'projects' : 'assignments'} found for this student.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {assignments
                                            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                                            .map((assignment, idx) => {
                                                const submission = assignment.submissions?.[0];
                                                const isOverdue = new Date(assignment.dueDate) < new Date();

                                                return (
                                                    <motion.div
                                                        key={assignment._id}
                                                        initial={{ opacity: 0, y: 8 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ delay: idx * 0.05 }}
                                                        className="bg-gray-50 rounded-2xl p-5 border border-gray-100"
                                                    >
                                                        <div className="flex items-start justify-between gap-4 mb-3">
                                                            <div className="flex-1">
                                                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                                                    <span className="text-[10px] font-black text-gray-400 bg-white px-2 py-0.5 rounded border border-gray-200 uppercase tracking-tight">
                                                                        ASGN #{idx + 1}
                                                                    </span>
                                                                    <h4 className="font-bold text-gray-900 uppercase tracking-tight">{assignment.title}</h4>
                                                                    {isOverdue && !submission && (
                                                                        <Badge variant="error">Overdue</Badge>
                                                                    )}
                                                                </div>
                                                                {assignment.course?.title && (
                                                                    <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium mb-1">
                                                                        <BookOpen className="w-3 h-3" />
                                                                        {assignment.course.title}
                                                                    </div>
                                                                )}
                                                                {assignment.description && (
                                                                    <p className="text-xs text-gray-500 font-medium mt-1 line-clamp-2">
                                                                        {stripHtmlToText(assignment.description)}
                                                                    </p>
                                                                )}
                                                            </div>
                                                            <div className="text-right flex-shrink-0">
                                                                {submission ? (
                                                                    <div className="flex flex-col items-end gap-1">
                                                                        <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg ${submission.status === 'graded' ? 'bg-primary/5 text-primary' : submission.status === 'rejected' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>
                                                                            {statusIcon[submission.status] || statusIcon.pending}
                                                                            {submission.status === 'graded' ? 'GRADED' : submission.status === 'rejected' ? 'REJECTED' : 'PENDING'}
                                                                        </div>
                                                                        {submission.status === 'graded' && submission.marks !== undefined && (
                                                                            <p className="text-lg font-black text-primary">
                                                                                {submission.marks}
                                                                                <span className="text-xs text-primary font-bold">/{assignment.totalMarks}</span>
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded-lg uppercase">
                                                                        Not Submitted
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Submission Details */}
                                                        {submission && (
                                                            <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
                                                                {submission.notes && (
                                                                    <div className="bg-white p-3 rounded-xl border border-gray-100">
                                                                        <p className="text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">Student Notes</p>
                                                                        <RichTextContent html={submission.notes} className="text-sm text-gray-700 italic font-medium" />
                                                                    </div>
                                                                )}
                                                                {submission.fileUrl && (
                                                                    <a
                                                                        href={submission.fileUrl}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100 border border-blue-100 transition-colors"
                                                                    >
                                                                        <Upload className="w-3.5 h-3.5" />
                                                                        VIEW ATTACHED FILE
                                                                    </a>
                                                                )}
                                                                {submission.feedback && (
                                                                    <div className="bg-blue-50/60 p-3 rounded-xl border border-blue-100">
                                                                        <p className="text-[10px] font-black text-blue-500 uppercase mb-1 tracking-widest">Teacher Feedback</p>
                                                                        <p className="text-sm text-blue-900 italic font-medium">{submission.feedback}</p>
                                                                    </div>
                                                                )}
                                                                <p className="text-[10px] text-gray-400 font-medium">
                                                                    Submitted: {formatDateTime(submission.submittedAt)}
                                                                </p>
                                                            </div>
                                                        )}

                                                        <div className="mt-3 flex items-center gap-3 text-[10px] text-gray-400 font-bold uppercase">
                                                            <span className="flex items-center gap-1">
                                                                <Calendar className="w-3 h-3" />
                                                                Due: {formatDate(assignment.dueDate)}
                                                            </span>
                                                            <span className="flex items-center gap-1">
                                                                <Tag className="w-3 h-3" />
                                                                {assignment.totalMarks} marks
                                                            </span>
                                                        </div>
                                                    </motion.div>
                                                );
                                            })}
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {activeTab === TAB_DAILY_TASKS && (
                            <motion.div
                                key="daily_tasks"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="space-y-6"
                            >
                                <div className="flex items-center justify-between">
                                    <h3 className="font-bold text-gray-900 text-lg">{isInternCourse ? 'Meeting Logs' : 'Class Logs'}</h3>
                                    <div className="flex gap-3">
                                        <span className="text-xs font-bold text-primary bg-primary/5 px-3 py-1 rounded-full border border-primary/10">
                                            {dailyTasks.filter(t => t.status === 'verified' || t.status === 'graded').length} verified
                                        </span>
                                        <span className="text-xs font-bold text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-100">
                                            {dailyTasks.filter(t => t.status === 'submitted' || t.status === 'pending').length} pending
                                        </span>
                                    </div>
                                </div>

                                {dailyTasks.length === 0 ? (
                                    <div className="text-center py-16">
                                        <ClipboardList className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                                        <p className="text-gray-400 font-medium">No {isInternCourse ? 'meeting' : 'class'} logs found for this student.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {[...dailyTasks]
                                            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                                            .map((task, idx) => (
                                                <motion.div
                                                    key={task._id}
                                                    initial={{ opacity: 0, y: 8 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: idx * 0.05 }}
                                                    className={`bg-gray-50 rounded-2xl p-5 border border-gray-100 ${task.status === 'verified' || task.status === 'graded' ? 'opacity-70' : ''}`}
                                                >
                                                    <div className="flex items-start justify-between gap-4">
                                                        <div className="flex-1">
                                                            <div className="flex flex-wrap items-center gap-2 mb-2">
                                                                <span className="text-[10px] font-black text-primary bg-primary/5 px-2 py-0.5 rounded-lg border border-primary/10 uppercase tracking-tight">
                                                                    LOG #{dailyTasks.length - idx}
                                                                </span>
                                                                {task.course?.title && (
                                                                    <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100 uppercase tracking-tight">
                                                                        {task.course.title}
                                                                    </span>
                                                                )}
                                                                <span className="text-xs text-gray-400 font-medium flex items-center gap-1 ml-auto">
                                                                    <Clock className="w-3 h-3" />
                                                                    {formatDate(task.date || task.createdAt)}
                                                                </span>
                                                            </div>

                                                            {task.workLink && (
                                                                <a
                                                                    href={task.workLink}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="flex items-center gap-2 text-xs text-primary font-bold hover:underline bg-primary/5 w-fit px-3 py-1.5 rounded-xl border border-primary/10 mb-3"
                                                                >
                                                                    <ExternalLink className="w-3.5 h-3.5" />
                                                                    VIEW WORK LINK
                                                                </a>
                                                            )}

                                                            <RichTextContent
                                                                html={task.content}
                                                                className="bg-white p-4 rounded-2xl border border-gray-100 italic"
                                                            />

                                                            {task.feedback && (
                                                                <div className="mt-3 p-3 bg-blue-50/60 rounded-xl border border-blue-100">
                                                                    <p className="text-[10px] font-black text-blue-500 uppercase mb-1 tracking-widest">Feedback Given</p>
                                                                    <p className="text-sm text-blue-900 italic font-medium">{task.feedback}</p>
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="flex-shrink-0">
                                                            <Badge variant={statusVariant[task.status] || 'warning'}>
                                                                {task.status === 'verified' || task.status === 'graded'
                                                                    ? 'VERIFIED ✅'
                                                                    : task.status === 'rejected'
                                                                        ? 'REJECTED ❌'
                                                                        : 'PENDING ⏳'}
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            ))}
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {activeTab === TAB_ATTENDANCE && (
                            <motion.div
                                key="attendance"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="space-y-8"
                            >
                                <div className="flex items-center justify-between">
                                    <h3 className="font-bold text-gray-900 text-lg">Attendance History</h3>
                                    <div className="flex gap-4">
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-2.5 h-2.5 rounded-full bg-present-fixed"></div>
                                            <span className="text-xs font-bold text-gray-500">Present</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-2.5 h-2.5 rounded-full bg-absent-fixed"></div>
                                            <span className="text-xs font-bold text-gray-500">Absent</span>
                                        </div>
                                    </div>
                                </div>

                                {attendanceData.length === 0 ? (
                                    <div className="text-center py-16">
                                        <CheckCircle className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                                        <p className="text-gray-400 font-medium">No attendance records found for this student.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-8">
                                        {attendanceData.map((courseData, cIdx) => (
                                            <div key={courseData.courseId} className="bg-gray-50 rounded-3xl p-6 border border-gray-100">
                                                {/* Course Header */}
                                                <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                                                    <div>
                                                        <h4 className="font-black text-gray-900 uppercase tracking-tight text-base mb-1">{courseData.courseTitle}</h4>
                                                        <span className="text-[10px] bg-white px-2 py-0.5 rounded border border-gray-200 text-gray-400 font-black uppercase tracking-widest">{courseData.courseCategory}</span>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <div className="bg-present-fixed-light px-4 py-2 rounded-2xl border border-present-fixed/10 text-center">
                                                            <p className="text-xl font-black text-present-fixed">{courseData.present}</p>
                                                            <p className="text-[10px] text-present-fixed font-bold uppercase tracking-widest">Present</p>
                                                        </div>
                                                        <div className="bg-absent-fixed-light px-4 py-2 rounded-2xl border border-absent-fixed/10 text-center">
                                                            <p className="text-xl font-black text-absent-fixed">{courseData.absent}</p>
                                                            <p className="text-[10px] text-absent-fixed font-bold uppercase tracking-widest">Absent</p>
                                                        </div>
                                                        <div className="bg-blue-50 px-4 py-2 rounded-2xl border border-blue-100 text-center">
                                                            <p className="text-xl font-black text-blue-600">
                                                                {courseData.present + courseData.absent > 0 
                                                                    ? Math.round((courseData.present / (courseData.present + courseData.absent)) * 100) 
                                                                    : 0}%
                                                            </p>
                                                            <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">Ratio</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Attendance Log Grid */}
                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                                    {courseData.logs.map((log, lIdx) => (
                                                        <div 
                                                            key={lIdx}
                                                            className={`p-3 rounded-2xl border flex items-center justify-between ${
                                                                log.status === 'present' 
                                                                    ? 'bg-white border-primary/10 shadow-sm' 
                                                                    : 'bg-white border-red-100 shadow-sm'
                                                            }`}
                                                        >
                                                            <div className="flex flex-col">
                                                                <span className="text-xs font-bold text-gray-900">
                                                                    {formatAttendanceDateDisplay(log.date)}
                                                                </span>
                                                                <span className="text-[10px] text-gray-400 font-medium">
                                                                    {formatAttendanceWeekday(log.date)}
                                                                </span>
                                                            </div>
                                                            <div className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                                                                log.status === 'present' 
                                                                    ? 'bg-present-fixed text-white' 
                                                                    : 'bg-absent-fixed text-white'
                                                            }`}>
                                                                {log.status === 'present' ? 'PRESENT' : 'ABSENT'}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                )}
            </div>
        </div>
    );
};

export default StudentWorkView;



