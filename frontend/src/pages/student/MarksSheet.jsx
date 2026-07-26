import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    FileText,
    TrendingUp,
    Award,
    BookOpen,
    Download,
    RefreshCw,
    AlertCircle,
    GraduationCap,
    Zap
} from 'lucide-react';
import Badge from '../../components/ui/Badge';
import { BarChart } from '../../components/charts/Charts';
import { useSelector } from 'react-redux';
import { assignmentAPI, dailyTaskAPI, enrollmentAPI, testAPI } from '../../services/api';
import { formatDate } from '../../utils/dateFormatter';

const MarksSheet = () => {
    const { user } = useSelector((state) => state.auth);
    const [isLoading, setIsLoading] = useState(true);
    const [enrollments, setEnrollments] = useState([]);
    const [selectedCourseId, setSelectedCourseId] = useState('');

    useEffect(() => {
        fetchMarksData();
    }, [user?._id]);

    const fetchMarksData = async () => {
        setIsLoading(true);
        try {
            // 1. Fetch Enrollments
            const enrollRes = await enrollmentAPI.getMy();
            const enrollmentsData = enrollRes.data.data || [];

            // 2. Fetch Assignments Submissions
            const assignRes = await assignmentAPI.getMy();
            const assignments = assignRes.data.assignments || [];

            // Build a map of course marks
            const coursesWithMarks = enrollmentsData.map(enrollment => {
                const courseId = enrollment.course?._id;
                const courseTitle = enrollment.course?.title || 'Course';
                const targetAudience = enrollment.course?.targetAudience || 'students';

                // Get assignment marks for this course (Sort by date for consistent numbering)
                const courseAssignments = assignments
                    .filter(a => String(a.course?._id || a.course) === String(courseId))
                    .sort((a, b) => new Date(a.dueDate || a.createdAt) - new Date(b.dueDate || b.createdAt)) // Oldest first for #1, #2...
                    .map((a, index) => {
                        const mySub = a.submissions?.find(s =>
                            String(s.user?._id || s.user) === String(user?._id || user?.id)
                        );
                        if (mySub && (mySub.marks !== undefined && mySub.marks !== null)) {
                            return {
                                assessment: a.title,
                                date: formatDate(a.dueDate || a.createdAt),
                                number: index + 1,
                                type: 'Assignment',
                                marks: mySub.marks,
                                total: a.totalMarks || 100,
                                feedback: mySub.feedback
                            };
                        }
                        return null;
                    })
                    .filter(Boolean);

                // Find teacher name from teachers array
                const teacherObj = enrollment.course?.teachers?.[0]; // Default to first teacher
                const teacherName = teacherObj?.name || (typeof teacherObj === 'string' ? 'Assigned' : 'TBA');

                return {
                    id: enrollment._id,
                    name: courseTitle,
                    teacher: teacherName,
                    status: enrollment.status || 'enrolled',
                    grades: courseAssignments, // Start with assignments
                    courseId // Keep for fetching daily tasks later if needed
                };
            });

            // 3. Fetch Daily Tasks and Tests per course
            const updatedCourses = await Promise.all(coursesWithMarks.map(async (course) => {
                try {
                    // Fetch Daily Tasks
                    const dtRes = await dailyTaskAPI.getMy(course.courseId);
                    const tasks = dtRes.data.data || [];
                    const gradedTasks = tasks
                        .filter(t => t.status === 'graded' || t.status === 'verified')
                        .sort((a, b) => new Date(a.date || a.createdAt) - new Date(b.date || b.createdAt))
                        .map((t, index) => ({
                            assessment: 'Class Activity',
                            date: formatDate(t.date || t.createdAt),
                            number: index + 1,
                            type: 'Daily Task',
                            marks: t.marks,
                            total: 10,
                            feedback: t.feedback
                        }));

                    // Fetch Tests
                    const testRes = await testAPI.getByCourse(course.courseId);
                    const tests = testRes?.data?.tests || [];
                    const gradedTests = [...tests]
                        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
                        .map((t, index) => {
                            if (!t) return null;
                            const mySub = t.submissions?.find(s => 
                                String(s.user?._id || s.user || "") === String(user?._id || user?.id || "")
                            );
                            if (mySub) {
                                return {
                                    assessment: t.title || 'Untitled Test',
                                    date: formatDate(t.createdAt),
                                    number: index + 1,
                                    type: 'Test',
                                    marks: mySub.score || 0,
                                    total: mySub.totalPossibleScore || t.totalMarks || 100
                                };
                            }
                            return null;
                        })
                        .filter(Boolean);

                    return {
                        ...course,
                        grades: [...course.grades, ...gradedTasks, ...gradedTests]
                    };
                } catch (e) {
                    return course;
                }
            }));

            setEnrollments(updatedCourses);
            // If there's only one course, select it by default
            if (updatedCourses.length === 1) {
                setSelectedCourseId(updatedCourses[0].courseId);
            } else if (updatedCourses.length > 0 && !selectedCourseId) {
                // If there are courses but none selected, select the first one
                setSelectedCourseId(updatedCourses[0].courseId);
            }


        } catch (error) {
            console.error('Error fetching marks data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const calculatePercentage = (marks, total) => {
        return ((marks / total) * 100).toFixed(1);
    };

    const calculateSimpleAverage = (grades) => {
        if (!grades || grades.length === 0) return 0;
        const percentages = grades.map(g => (g.marks / g.total) * 100);
        const sum = percentages.reduce((a, b) => a + b, 0);
        return (sum / grades.length).toFixed(1);
    };

    const getOverallAverage = () => {
        // Average of ALL graded items across ALL courses
        const allGrades = enrollments.flatMap((c) => c.grades || []);
        if (allGrades.length === 0) return 0;
        return calculateSimpleAverage(allGrades);
    };

    const getGrade = (percentage) => {
        if (!percentage || isNaN(percentage)) return { grade: 'N/A', color: 'text-gray-400' };
        if (percentage >= 90) return { grade: 'A+', color: 'text-emerald-500 dark:text-emerald-400' };
        if (percentage >= 85) return { grade: 'A', color: 'text-emerald-500 dark:text-emerald-400' };
        if (percentage >= 80) return { grade: 'B+', color: 'text-sky-500 dark:text-sky-400' };
        if (percentage >= 75) return { grade: 'B', color: 'text-sky-500 dark:text-sky-400' };
        if (percentage >= 70) return { grade: 'C+', color: 'text-amber-500 dark:text-amber-400' };
        if (percentage >= 65) return { grade: 'C', color: 'text-amber-500 dark:text-amber-400' };
        if (percentage >= 60) return { grade: 'D', color: 'text-red-500 dark:text-red-400' };
        return { grade: 'F', color: 'text-red-600 dark:text-red-500' };
    };

    const getAutomaticFeedback = (percentage) => {
        if (!percentage || isNaN(percentage)) return '-';
        if (percentage >= 90) return "Excellent! Perfect execution and great attention to detail. Keep it up!";
        if (percentage >= 85) return "Outstanding effort! Very well done.";
        if (percentage >= 80) return "Great job! Keep up the consistent effort.";
        if (percentage >= 75) return "Good work! Solid understanding of the concepts.";
        if (percentage >= 70) return "Satisfactory effort. Try to focus more on the requirements.";
        if (percentage >= 65) return "Average work. Needs more attention and focus.";
        if (percentage >= 60) return "Below expectations. Please review the instructions carefully.";
        return "Poor performance. Let's work on the basics and improve.";
    };



    const overallAverage = getOverallAverage();
    const overallGrade = getGrade(parseFloat(overallAverage));
    const totalAssignmentsCount = enrollments.reduce((sum, c) => sum + (c.grades?.filter(g => g.type === 'Assignment').length || 0), 0);
    const totalTestsCount = enrollments.reduce((sum, c) => sum + (c.grades?.filter(g => g.type === 'Test').length || 0), 0);
    const totalDailyCount = enrollments.reduce((sum, c) => sum + (c.grades?.filter(g => g.type === 'Daily Task').length || 0), 0);
    const allGradesCount = totalAssignmentsCount + totalTestsCount + totalDailyCount;

    const selectedCourse = enrollments.find(c => c.courseId === selectedCourseId);

    // Chart data
    const chartData = {
        labels: enrollments.map((c) => c.name.split(' ')[0]),
        datasets: [
            {
                data: enrollments.map((c) => parseFloat(calculateSimpleAverage(c.grades))),
                backgroundColor: [getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#ff8e01', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444'],
                borderRadius: 8,
                barThickness: 40,
            },
        ],
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
                <img src="/loading.gif" alt="Loading" className="w-20 h-20 object-contain" />
                <span className="text-gray-600 font-medium">Loading marks...</span>
            </div>
        );
    }

    const GRADE_SCALE = [
        { grade: 'A+', range: '90–100', color: 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800' },
        { grade: 'A', range: '85–89', color: 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800' },
        { grade: 'B+', range: '80–84', color: 'bg-sky-50 text-sky-600 border-sky-200 dark:bg-sky-900/20 dark:text-sky-400 dark:border-sky-800' },
        { grade: 'B', range: '75–79', color: 'bg-sky-50 text-sky-600 border-sky-200 dark:bg-sky-900/20 dark:text-sky-400 dark:border-sky-800' },
        { grade: 'C+', range: '70–74', color: 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800' },
        { grade: 'C', range: '65–69', color: 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800' },
        { grade: 'D', range: '60–64', color: 'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800' },
        { grade: 'F', range: '0–59', color: 'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800' },
    ];

    return (
        <div className="space-y-4 sm:space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 sm:gap-4">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Academic Marks Sheet</h1>
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Select a course to view detailed grading and feedback</p>
                </div>
            </div>

            {/* Grade Scale Legend */}
            <div className="bg-white dark:bg-slate-900/50 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm px-3 sm:px-5 py-3 sm:py-4">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Grade Scale (out of 100)</p>
                <div className="flex gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar pb-0.5 sm:flex-wrap">
                    {GRADE_SCALE.map(({ grade, range, color }) => (
                        <div key={grade} className={`flex flex-none items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl border text-[9px] sm:text-xs font-black whitespace-nowrap ${color}`}>
                            <span className="text-xs sm:text-sm">{grade}</span>
                            <span className="opacity-60 font-medium">→ {range}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Overall Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-6">
                <motion.div 
                    initial={{ opacity: 0, y: 20 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    className="col-span-2 md:col-span-1 bg-gradient-to-br from-primary-darkest to-primary-dark rounded-2xl p-4 sm:p-6 text-white shadow-lg"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-white/70 text-[10px] sm:text-sm mb-1 uppercase font-black tracking-widest">
                                {selectedCourse ? 'Selected Course Average' : 'Global average'}
                            </p>
                            <p className="text-3xl sm:text-4xl font-black">
                                {selectedCourse ? calculateSimpleAverage(selectedCourse.grades) : overallAverage}%
                            </p>
                            <p className={`text-base sm:text-lg font-black mt-1 text-white/80`}>
                                Grade: {selectedCourse 
                                    ? getGrade(parseFloat(calculateSimpleAverage(selectedCourse.grades))).grade 
                                    : (allGradesCount > 0 ? overallGrade.grade : 'N/A')}
                            </p>
                        </div>
                        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white/10 rounded-2xl flex items-center justify-center">
                            <Award className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                        </div>
                    </div>
                </motion.div>

                <div className="bg-white dark:bg-slate-900/50 rounded-2xl p-3 sm:p-6 border border-gray-100 dark:border-slate-800 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-gray-400 text-[8px] sm:text-[10px] font-black uppercase tracking-widest mb-1">Enrolled Courses</p>
                        <p className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">{enrollments.length}</p>
                    </div>
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-50 rounded-xl flex items-center justify-center shrink-0 ml-2">
                        <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900/50 rounded-2xl p-3 sm:p-6 border border-gray-100 dark:border-slate-800 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-gray-400 text-[8px] sm:text-[10px] font-black uppercase tracking-widest mb-1">Graded Assessments</p>
                        <p className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">{totalAssignmentsCount + totalTestsCount}</p>
                    </div>
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/5 rounded-xl flex items-center justify-center shrink-0 ml-2">
                        <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                    </div>
                </div>
            </div>

            {/* Course Selector Step - High Visibility */}
            <div className="bg-[#f8fafc] dark:bg-slate-900/50 p-3.5 sm:p-8 rounded-2xl sm:rounded-3xl border border-primary/20 dark:border-primary/40 flex flex-col md:flex-row items-center justify-between gap-4 sm:gap-6 shadow-sm sm:shadow-xl shadow-primary/5 dark:shadow-none">
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="p-3 sm:p-4 bg-primary rounded-2xl shadow-lg shadow-primary shrink-0">
                        <GraduationCap className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                    </div>
                    <div>
                        <h3 className="font-black text-gray-900 dark:text-white uppercase tracking-tighter leading-none mb-1 text-base sm:text-lg">Step 1: Select Course</h3>
                        <p className="text-xs sm:text-sm text-gray-500 font-medium italic">Reveal your detailed performance</p>
                    </div>
                </div>
                <div className="relative w-full md:w-96">
                    <select
                        value={selectedCourseId}
                        onChange={(e) => setSelectedCourseId(e.target.value)}
                        className={`w-full px-4 sm:px-6 py-3 sm:py-4 bg-white dark:bg-slate-800 border-2 rounded-2xl outline-none transition-all font-black text-sm sm:text-lg uppercase tracking-tight appearance-none cursor-pointer ${!selectedCourseId ? 'border-amber-400 text-amber-600 animate-pulse ring-4 ring-amber-400/10' : 'border-primary text-primary'
                            }`}
                    >
                        <option value="">-- Choose Course Here --</option>
                        {enrollments.map(c => (
                            <option key={c.courseId} value={c.courseId}>{c.name}</option>
                        ))}
                    </select>
                    <div className="absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 pointer-events-none">
                        <div className={`w-2 h-2 sm:w-3 sm:h-3 border-r-2 border-b-2 rotate-45 ${!selectedCourseId ? 'border-amber-400' : 'border-primary'}`}></div>
                    </div>
                </div>
            </div>

            {/* Detailed Performance - Only shown when course is selected */}
            {selectedCourse ? (
                <div className="space-y-6">
                    {(() => {
                        const assignmentGrades = selectedCourse.grades.filter(g => g.type === 'Assignment');
                        const dailyTaskGrades = selectedCourse.grades.filter(g => g.type === 'Daily Task');

                        const average = calculateSimpleAverage(selectedCourse.grades);
                        const gradeInfo = getGrade(parseFloat(average));

                        const dailyAvgMarks = dailyTaskGrades.length > 0
                            ? (dailyTaskGrades.reduce((sum, g) => sum + g.marks, 0) / dailyTaskGrades.length).toFixed(1)
                            : null;

                        return (
                            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white dark:bg-slate-900/40 rounded-2xl sm:rounded-3xl border border-gray-100 dark:border-slate-800 overflow-hidden shadow-lg sm:shadow-2xl shadow-gray-200/50 dark:shadow-none">
                                <div className="p-4 sm:p-8 bg-gradient-to-r from-gray-50 to-white dark:from-slate-800/40 dark:to-slate-900/60 border-b border-gray-100 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                                    <div>
                                        <h3 className="font-black text-xl sm:text-3xl text-gray-900 dark:text-white uppercase tracking-tighter mb-2 leading-tight">{selectedCourse.name}</h3>
                                        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                                            <p className="text-[10px] sm:text-xs text-gray-400 font-black uppercase tracking-[0.2em]">Instructor: <span className="text-gray-900 dark:text-gray-200">{selectedCourse.teacher}</span></p>
                                            <Badge variant={selectedCourse.status === 'completed' ? 'success' : 'info'}>{selectedCourse.status.toUpperCase()}</Badge>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between gap-4 sm:gap-6 bg-white dark:bg-slate-800 p-3 sm:p-4 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm w-full sm:w-fit">
                                        <div className="text-right">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Course Avg</p>
                                            <p className="text-2xl sm:text-4xl font-black text-gray-900 dark:text-white">{average}%</p>
                                        </div>
                                        <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center font-black text-xl sm:text-3xl border-2 ${gradeInfo.color.replace('text', 'border').replace('600', '200')} ${gradeInfo.color} bg-gray-50 dark:bg-slate-900/50`}>
                                            {gradeInfo.grade}
                                        </div>
                                    </div>
                                </div>

                                <div className="p-3.5 sm:p-8 space-y-7 sm:space-y-12">
                                    {/* Assignments */}
                                    <div>
                                        <div className="flex flex-wrap items-center justify-between gap-2 mb-3 sm:mb-6 sm:px-2">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-blue-50 rounded-lg"><FileText className="w-5 h-5 text-blue-600" /></div>
                                                <h4 className="font-black text-gray-900 uppercase tracking-widest">Assignments</h4>
                                            </div>
                                            {average > 0 && <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-100 uppercase">Assignment Avg: {average}%</span>}
                                        </div>
                                        {assignmentGrades.length > 0 ? (
                                            <>
                                            <div className="space-y-2 sm:hidden">
                                                {assignmentGrades.map((grade, idx) => {
                                                    const perc = calculatePercentage(grade.marks, grade.total);
                                                    const gInfo = getGrade(parseFloat(perc));
                                                    return (
                                                        <div key={idx} className="p-3 rounded-xl border border-gray-100 dark:border-slate-700 bg-gray-50/70 dark:bg-slate-800/60">
                                                            <div className="flex items-start justify-between gap-3">
                                                                <div className="min-w-0">
                                                                    <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Assignment #{grade.number} · {grade.date}</p>
                                                                    <h5 className="text-sm font-bold text-gray-900 dark:text-white mt-1 break-words">{grade.assessment}</h5>
                                                                </div>
                                                                <div className={`text-right shrink-0 ${gInfo.color}`}>
                                                                    <p className="text-lg font-black leading-none">{gInfo.grade}</p>
                                                                    <p className="text-[10px] font-bold mt-1">{perc}%</p>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center justify-between gap-3 mt-3 pt-2.5 border-t border-gray-200 dark:border-slate-700">
                                                                <p className="text-xs font-black text-gray-900 dark:text-white">Marks: {grade.marks}<span className="text-gray-400">/{grade.total}</span></p>
                                                                <p className="text-[10px] text-gray-500 dark:text-gray-400 text-right break-words">{grade.feedback || 'No feedback'}</p>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            <div className="hidden sm:block overflow-x-auto no-scrollbar rounded-2xl border border-gray-100 dark:border-slate-700">
                                                <table className="w-full text-left min-w-[500px]">
                                                    <thead>
                                                        <tr className="bg-gray-50/80 dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700">
                                                            <th className="py-4 px-6 text-[10px] font-black text-gray-400 dark:text-slate-300 uppercase tracking-widest">#</th>
                                                            <th className="py-4 px-6 text-[10px] font-black text-gray-400 dark:text-slate-300 uppercase tracking-widest">Date</th>
                                                            <th className="py-4 px-6 text-[10px] font-black text-gray-400 dark:text-slate-300 uppercase tracking-widest">Assignment Name</th>
                                                            <th className="py-4 px-6 text-[10px] font-black text-gray-400 dark:text-slate-300 uppercase tracking-widest">Score</th>
                                                            <th className="py-4 px-6 text-[10px] font-black text-gray-400 dark:text-slate-300 uppercase tracking-widest">Feedback</th>
                                                            <th className="py-4 px-6 text-[10px] font-black text-gray-400 dark:text-slate-300 uppercase tracking-widest text-right">Grade</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                                                        {assignmentGrades.map((grade, idx) => {
                                                            const perc = calculatePercentage(grade.marks, grade.total);
                                                            const gInfo = getGrade(parseFloat(perc));
                                                            return (
                                                                <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/70 transition-colors">
                                                                    <td className="py-4 px-6 font-black text-gray-300 dark:text-slate-500">ASGN #{grade.number}</td>
                                                                    <td className="py-4 px-6 font-medium text-gray-500 dark:text-slate-400 text-xs">{grade.date}</td>
                                                                    <td className="py-4 px-6 font-bold text-gray-900 dark:text-white">{grade.assessment}</td>
                                                                    <td className="py-4 px-6 font-medium text-gray-600 dark:text-slate-300">
                                                                        <span className="text-gray-900 dark:text-white font-bold">{grade.marks}</span><span className="text-xs opacity-50">/{grade.total}</span>
                                                                    </td>
                                                                    <td className="py-4 px-6">
                                                                        <p className="text-xs font-medium text-gray-500 dark:text-slate-400 max-w-[200px] truncate" title={grade.feedback}>{grade.feedback || '-'}</p>
                                                                    </td>
                                                                    <td className={`py-4 px-6 font-black text-right ${gInfo.color}`}>{gInfo.grade} ({perc}%)</td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                            </>
                                        ) : <p className="text-center py-8 text-gray-400 font-medium italic bg-gray-50 rounded-2xl border border-dashed">No assignments graded yet.</p>}
                                    </div>

                                    {/* Daily Tasks */}
                                    <div>
                                        <div className="flex flex-wrap items-center justify-between gap-2 mb-3 sm:mb-6 sm:px-2">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-primary/5 rounded-lg"><RefreshCw className="w-5 h-5 text-primary" /></div>
                                                <h4 className="font-black text-gray-900 uppercase tracking-widest">{selectedCourse?.targetAudience === 'interns' ? 'Projects' : 'Daily classes'}</h4>
                                            </div>
                                            {dailyAvgMarks && <span className="text-[10px] font-black text-primary bg-primary/5 px-3 py-1.5 rounded-xl border border-primary/10 uppercase">Class Avg Score: {dailyAvgMarks}/10</span>}
                                        </div>
                                        {dailyTaskGrades.length > 0 ? (
                                            <>
                                            <div className="space-y-2 sm:hidden">
                                                {dailyTaskGrades.map((grade, idx) => {
                                                    const perc = calculatePercentage(grade.marks, grade.total);
                                                    const gInfo = getGrade(parseFloat(perc));
                                                    return (
                                                        <div key={idx} className="p-3 rounded-xl border border-gray-100 dark:border-slate-700 bg-gray-50/70 dark:bg-slate-800/60">
                                                            <div className="flex items-center justify-between gap-3">
                                                                <div>
                                                                    <p className="text-[9px] font-black text-primary uppercase tracking-widest">Class #{grade.number}</p>
                                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{grade.date}</p>
                                                                </div>
                                                                <div className={`text-right ${gInfo.color}`}>
                                                                    <p className="text-lg font-black leading-none">{gInfo.grade}</p>
                                                                    <p className="text-[10px] font-bold mt-1">{perc}%</p>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-start justify-between gap-3 mt-3 pt-2.5 border-t border-gray-200 dark:border-slate-700">
                                                                <p className="text-xs font-black text-gray-900 dark:text-white shrink-0">Marks: {grade.marks}/10</p>
                                                                <p className="text-[10px] text-gray-500 dark:text-gray-400 text-right break-words">{grade.feedback || 'No feedback'}</p>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            <div className="hidden sm:block overflow-x-auto no-scrollbar rounded-2xl border border-gray-100 dark:border-slate-700">
                                                <table className="w-full text-left min-w-[400px]">
                                                    <thead>
                                                        <tr className="bg-gray-50/80 dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700">
                                                            <th className="py-4 px-6 text-[10px] font-black text-gray-400 dark:text-slate-300 uppercase tracking-widest">#</th>
                                                            <th className="py-4 px-6 text-[10px] font-black text-gray-400 dark:text-slate-300 uppercase tracking-widest">Date</th>
                                                            <th className="py-4 px-6 text-[10px] font-black text-gray-400 dark:text-slate-300 uppercase tracking-widest">Score</th>
                                                            <th className="py-4 px-6 text-[10px] font-black text-gray-400 dark:text-slate-300 uppercase tracking-widest">Feedback</th>
                                                            <th className="py-4 px-6 text-[10px] font-black text-gray-400 dark:text-slate-300 uppercase tracking-widest text-right">Grade</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                                                        {dailyTaskGrades.map((grade, idx) => {
                                                            const perc = calculatePercentage(grade.marks, grade.total);
                                                            const gInfo = getGrade(parseFloat(perc));
                                                            return (
                                                                <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/70 transition-colors">
                                                                    <td className="py-4 px-6 font-black text-gray-300 dark:text-slate-500">Class #{grade.number}</td>
                                                                    <td className="py-4 px-6 font-bold text-gray-900 dark:text-white">{grade.date}</td>
                                                                    <td className="py-4 px-6 font-medium text-gray-600 dark:text-slate-300">
                                                                        <span className="text-gray-900 dark:text-white font-bold">{grade.marks}</span><span className="text-xs opacity-50">/10</span>
                                                                    </td>
                                                                    <td className="py-4 px-6">
                                                                        <p className="text-xs font-medium text-gray-500 dark:text-slate-400 max-w-[200px] truncate" title={grade.feedback}>{grade.feedback || '-'}</p>
                                                                    </td>
                                                                    <td className={`py-4 px-6 font-black text-right ${gInfo.color}`}>{gInfo.grade} ({perc}%)</td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                            </>
                                        ) : <p className="text-center py-8 text-gray-400 font-medium italic bg-gray-50 rounded-2xl border border-dashed">No classes graded yet.</p>}
                                    </div>

                                    {/* Tests */}
                                    <div>
                                        {(() => {
                                            const testGrades = selectedCourse.grades.filter(g => g.type === 'Test');
                                            const testAvg = testGrades.length > 0 
                                                ? calculateSimpleAverage(testGrades)
                                                : null;

                                            return (
                                                <>
                                                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3 sm:mb-6 sm:px-2">
                                                        <div className="flex items-center gap-3">
                                                            <div className="p-2 bg-primary/5 rounded-lg"><Zap className="w-5 h-5 text-primary" /></div>
                                                            <h4 className="font-black text-gray-900 uppercase tracking-widest">Tests & Exams</h4>
                                                        </div>
                                                        {testAvg && <span className="text-[10px] font-black text-primary bg-primary/5 px-3 py-1.5 rounded-xl border border-primary/10 uppercase">Test Avg: {testAvg}%</span>}
                                                    </div>
                                                    {testGrades.length > 0 ? (
                                                        <>
                                                        <div className="space-y-2 sm:hidden">
                                                            {testGrades.map((grade, idx) => {
                                                                const perc = calculatePercentage(grade.marks, grade.total);
                                                                const gInfo = getGrade(parseFloat(perc));
                                                                return (
                                                                    <div key={idx} className="p-3 rounded-xl border border-gray-100 dark:border-slate-700 bg-gray-50/70 dark:bg-slate-800/60">
                                                                        <div className="flex items-start justify-between gap-3">
                                                                            <div className="min-w-0">
                                                                                <p className="text-[9px] font-black text-primary uppercase tracking-widest">Test #{grade.number} - {grade.date}</p>
                                                                                <h5 className="text-sm font-bold text-gray-900 dark:text-white mt-1 break-words">{grade.assessment}</h5>
                                                                            </div>
                                                                            <div className={`text-right shrink-0 ${gInfo.color}`}>
                                                                                <p className="text-lg font-black leading-none">{gInfo.grade}</p>
                                                                                <p className="text-[10px] font-bold mt-1">{perc}%</p>
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex items-start justify-between gap-3 mt-3 pt-2.5 border-t border-gray-200 dark:border-slate-700">
                                                                            <p className="text-xs font-black text-gray-900 dark:text-white shrink-0">Marks: {grade.marks}<span className="text-gray-400">{grade.total ? `/${grade.total}` : ''}</span></p>
                                                                            <p className="text-[10px] text-gray-500 dark:text-gray-400 text-right break-words">{grade.feedback || getAutomaticFeedback(parseFloat(perc))}</p>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                        <div className="hidden sm:block overflow-x-auto no-scrollbar rounded-2xl border border-gray-100 dark:border-slate-700">
                                                            <table className="w-full text-left min-w-[500px]">
                                                                <thead>
                                                                    <tr className="bg-gray-50/80 dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700">
                                                                        <th className="py-4 px-6 text-[10px] font-black text-gray-400 dark:text-slate-300 uppercase tracking-widest">#</th>
                                                                        <th className="py-4 px-6 text-[10px] font-black text-gray-400 dark:text-slate-300 uppercase tracking-widest">Date</th>
                                                                        <th className="py-4 px-6 text-[10px] font-black text-gray-400 dark:text-slate-300 uppercase tracking-widest">Test Title</th>
                                                                        <th className="py-4 px-6 text-[10px] font-black text-gray-400 dark:text-slate-300 uppercase tracking-widest">Score</th>
                                                                        <th className="py-4 px-6 text-[10px] font-black text-gray-400 dark:text-slate-300 uppercase tracking-widest">Feedback</th>
                                                                        <th className="py-4 px-6 text-[10px] font-black text-gray-400 dark:text-slate-300 uppercase tracking-widest text-right">Grade</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                                                                    {testGrades.map((grade, idx) => {
                                                                        const perc = calculatePercentage(grade.marks, grade.total);
                                                                        const gInfo = getGrade(parseFloat(perc));
                                                                        return (
                                                                            <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/70 transition-colors">
                                                                                <td className="py-4 px-6 font-black text-gray-300 dark:text-slate-500">TEST #{grade.number}</td>
                                                                                <td className="py-4 px-6 font-medium text-gray-500 dark:text-slate-400 text-xs">{grade.date}</td>
                                                                                <td className="py-4 px-6 font-bold text-gray-900 dark:text-white">{grade.assessment}</td>
                                                                                <td className="py-4 px-6 font-medium text-gray-600 dark:text-slate-300">
                                                                                    <span className="text-gray-900 dark:text-white font-bold">{grade.marks}</span>
                                                                                </td>
                                                                                <td className="py-4 px-6">
                                                                                    <p className="text-xs font-medium text-gray-500 dark:text-slate-400 max-w-[200px] truncate" title={grade.feedback || getAutomaticFeedback(parseFloat(perc))}>{grade.feedback || getAutomaticFeedback(parseFloat(perc))}</p>
                                                                                </td>
                                                                                <td className={`py-4 px-6 font-black text-right ${gInfo.color}`}>{gInfo.grade} ({perc}%)</td>
                                                                            </tr>
                                                                        );
                                                                    })}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                        </>
                                                    ) : <p className="text-center py-8 text-gray-400 font-medium italic bg-gray-50 rounded-2xl border border-dashed">No tests taken yet.</p>}
                                                </>
                                            );
                                        })()}
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })()}
                </div>
            ) : (
                <div className="bg-gray-50 dark:bg-slate-900/40 border border-dashed border-gray-200 dark:border-slate-700 rounded-2xl sm:rounded-3xl p-6 sm:p-20 text-center">
                    <div className="w-14 h-14 sm:w-20 sm:h-20 bg-white dark:bg-slate-800 rounded-2xl sm:rounded-3xl flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-sm">
                        <TrendingUp className="w-7 h-7 sm:w-10 sm:h-10 text-gray-300" />
                    </div>
                    <h3 className="text-base sm:text-xl font-black text-gray-900 dark:text-white uppercase italic mb-2 tracking-tight">Viewing Stats Ready</h3>
                    <p className="text-xs sm:text-base text-gray-500 dark:text-gray-400 max-w-sm mx-auto font-medium">Please pick a course from the dropdown above to reveal your detailed academic breakdown and categories.</p>
                </div>
            )}
        </div>
    );
};

export default MarksSheet;



