import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useSelector } from 'react-redux';
import {
    Search, BookOpen, Users, Star, Clock, CheckCircle, Calendar, Award, AlertCircle, Upload, Trash2, Filter, Eye, Heart
} from 'lucide-react';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import Loader, { ButtonLoader } from '../../components/ui/Loader';
import { courseAPI, enrollmentAPI, certificateAPI, assignmentAPI, dailyTaskAPI, testAPI } from '../../services/api';
import { getCourseIcon, getCourseColor, getCourseStyle } from '../../utils/courseIcons';
import { formatDate } from '../../utils/dateFormatter';

const CITY_OPTIONS = [
    { value: 'Bahawalpur', label: 'Bahawalpur' },
    { value: 'Islamabad', label: 'Islamabad' }
];

const BrowseCourses = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { role, user } = useSelector((state) => state.auth);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCities, setSelectedCities] = useState([]);
    const [activeTab, setActiveTab] = useState('available');
    const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [withdrawModal, setWithdrawModal] = useState({ open: false, enrollmentId: null, courseTitle: '' });
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [isFetching, setIsFetching] = useState(true);
    const [isEnrolling, setIsEnrolling] = useState(false);
    const [internshipDurationMonths, setInternshipDurationMonths] = useState('');
    const [durationValidationAttempt, setDurationValidationAttempt] = useState(0);
    const [error, setError] = useState('');
    const [courses, setCourses] = useState([]);
    const [myEnrollments, setMyEnrollments] = useState([]);
    const [myCertificates, setMyCertificates] = useState([]);
    const [likedCourses, setLikedCourses] = useState({});
    const [lastViewAt, setLastViewAt] = useState({});

    // Fetch data on component mount
    useEffect(() => {
        fetchData();

        // Handle initial tab from navigation state
        if (location.state?.tab || location.state?.activeTab) {
            setActiveTab(location.state.tab || location.state.activeTab);
        }
    }, [location.state]);

    const fetchData = async () => {
        setIsFetching(true);
        setError('');
        try {
            const [coursesRes, enrollmentsRes, assignRes, certRes] = await Promise.all([
                courseAPI.getAll({ targetAudience: role === 'intern' ? 'interns' : 'students' }),
                enrollmentAPI.getMy(),
                assignmentAPI.getMy(),
                certificateAPI.getMy().catch(() => ({ data: { certificates: [] } }))
            ]);

            const courses = coursesRes.data.data || [];
            const rawEnrollments = enrollmentsRes.data.data || [];
            const allAssignments = assignRes.data.assignments || [];
            setMyCertificates(certRes.data.certificates || []);
            setCourses(courses);

            // Enrich completed enrollments with dynamic grades (same as MarksSheet)
            const enrichedEnrollments = await Promise.all(rawEnrollments.map(async (e) => {
                if (e.status !== 'completed' || !e.course) return e;
                
                try {
                    const courseId = e.course._id;
                    const [dtRes, testRes] = await Promise.all([
                        dailyTaskAPI.getMy(courseId),
                        testAPI.getByCourse(courseId)
                    ]);

                    const courseAssignments = allAssignments
                        .filter(a => String(a.course?._id || a.course) === String(courseId));
                    
                    const assignmentGrades = courseAssignments.map(a => {
                        const mySub = a.submissions?.find(s => String(s.user?._id || s.user) === String(user?._id || user?.id));
                        if (mySub && mySub.marks != null) return { marks: mySub.marks, total: a.totalMarks || 100 };
                        return null;
                    }).filter(Boolean);

                    const tasks = (dtRes.data.data || [])
                        .filter(t => t.status === 'graded' || t.status === 'verified')
                        .map(t => ({ marks: t.marks, total: 10 }));

                    const tests = (testRes?.data?.tests || []).map(t => {
                        const mySub = t.submissions?.find(s => String(s.user?._id || s.user) === String(user?._id || user?.id));
                        if (mySub) return { marks: mySub.score || 0, total: t.totalMarks || 100 };
                        return null;
                    }).filter(Boolean);

                    const allGrades = [...assignmentGrades, ...tasks, ...tests];
                    const avg = calculateSimpleAverage(allGrades);
                    
                    return {
                        ...e,
                        percentage: avg,
                        grade: getGrade(avg).grade
                    };
                } catch (err) {
                    console.error('Error calculating grade for course:', e.course?.title, err);
                    return e;
                }
            }));
            
            setMyEnrollments(enrichedEnrollments);
        } catch (err) {
            console.error('Error fetching data:', err);
            setError('Failed to load courses. Please try again.');
        } finally {
            setIsFetching(false);
        }
    };

    // Get enrollment status for a course
    const getEnrollmentStatus = (courseId) => {
        const enrollment = myEnrollments.find(e => e.course?._id === courseId);
        if (!enrollment) return 'available';
        return enrollment.status; // 'pending', 'enrolled', 'completed', 'suspended'
    };

    // Separate courses by enrollment status
    // Use myEnrollments directly to ensure all user's courses are shown regardless of audience filters
    const enrolledCourses = myEnrollments
        .filter(e => (e.status === 'enrolled' || e.status === 'pending') && e.course)
        .map(e => ({ ...e.course, enrolledStatus: e.status }));

    const completedCourses = myEnrollments
        .filter(e => e.status === 'completed' && e.course)
        .map(e => ({ ...e.course, enrolledStatus: 'completed' }));

    const getCurrentCourses = () => {
        switch (activeTab) {
            case 'enrolled': return enrolledCourses;
            case 'completed': return completedCourses;
            default: return courses; // Show all courses
        }
    };

    const filteredCourses = getCurrentCourses().filter((course) => {
        const matchesSearch = course.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            course.teachers?.some(t => t.name?.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesCity = selectedCities.length === 0 ||
            selectedCities.some(city =>
                city.toLowerCase() === (course.city?.toLowerCase() || course.location?.toLowerCase())
            );

        return matchesSearch && matchesCity;
    });

    const handleEnrollClick = (course) => {
        setSelectedCourse(course);
        setInternshipDurationMonths('');
        setDurationValidationAttempt(0);
        setIsEnrollModalOpen(true);
    };

    const handleConfirmEnroll = async () => {
        if (!selectedCourse) return;
        if (role === 'intern' && !internshipDurationMonths) {
            setError('Please select your internship duration.');
            setDurationValidationAttempt(attempt => attempt + 1);
            navigator.vibrate?.(120);
            return;
        }
        setIsEnrolling(true);
        setError('');
        try {
            await enrollmentAPI.enroll(selectedCourse._id, role === 'intern'
                ? { internshipDurationMonths: Number(internshipDurationMonths) }
                : {});
            setIsEnrollModalOpen(false);
            setSelectedCourse(null);
            // fetchData(); // No need to fetch here if we are navigating
            navigate(`/${role === 'intern' ? 'intern' : 'student'}/fees`, {
                state: {
                    message: 'Enrollment successful! Please upload your payment receipt here to get verified.'
                }
            });
        } catch (err) {
            console.error('Error enrolling:', err);
            setError(err.response?.data?.message || 'Failed to enroll. Please try again.');
        } finally {
            setIsEnrolling(false);
        }
    };



    const confirmWithdraw = async () => {
        try {
            await enrollmentAPI.withdraw(withdrawModal.enrollmentId);
            setWithdrawModal({ open: false, enrollmentId: null, courseTitle: '' });
            fetchData(); // Refresh list to update UI
        } catch (error) {
            console.error('Withdrawal failed:', error);
            alert(error.response?.data?.message || 'Failed to revoke course');
        }
    };

    const handleViewCourse = (course) => {
        const enrollment = myEnrollments.find(e => e.course?._id === course._id);
        if (!enrollment) return;

        // If status is enrolled, it means at least the first installment is verified.
        // The user wants to see assignments if verified, otherwise payment.
        if (enrollment.status === 'enrolled') {
            navigate(`/${role === 'intern' ? 'intern' : 'student'}/assignments`, { state: { courseId: course._id } });
        } else {
            navigate(`/${role === 'intern' ? 'intern' : 'student'}/fees`);
        }
    };

    const formatCompactCount = (value) => {
        const num = Number(value) || 0;
        if (num >= 1000000) return `${(num / 1000000).toFixed(num >= 10000000 ? 0 : 1).replace('.0', '')}M`;
        if (num >= 1000) return `${(num / 1000).toFixed(num >= 10000 ? 0 : 1).replace('.0', '')}K`;
        return `${num}`;
    };

    const getGrade = (percentage) => {
        const p = parseFloat(percentage);
        if (!p || isNaN(p)) return { grade: 'N/A', color: 'text-gray-400' };
        if (p >= 90) return { grade: 'A+', color: 'text-primary' };
        if (p >= 85) return { grade: 'A', color: 'text-primary' };
        if (p >= 80) return { grade: 'B+', color: 'text-blue-600' };
        if (p >= 75) return { grade: 'B', color: 'text-blue-600' };
        if (p >= 70) return { grade: 'C+', color: 'text-amber-600' };
        if (p >= 65) return { grade: 'C', color: 'text-amber-600' };
        if (p >= 60) return { grade: 'D', color: 'text-primary' };
        return { grade: 'F', color: 'text-red-600' };
    };

    const calculateSimpleAverage = (grades) => {
        if (!grades || grades.length === 0) return 0;
        const percentages = grades.map(g => (g.marks / g.total) * 100);
        const sum = percentages.reduce((a, b) => a + b, 0);
        return (sum / grades.length).toFixed(1);
    };

    const getDownloadLink = (link) => {
        if (!link) return '';
        // If it's a Google Drive link, transform it for direct download
        if (link.includes('drive.google.com')) {
            const fileIdMatch = link.match(/[-\w]{25,}/);
            if (fileIdMatch) {
                return `https://drive.google.com/uc?export=download&id=${fileIdMatch[0]}`;
            }
        }
        return link;
    };

    const handleCourseSeen = async (courseId) => {
        if (!courseId) return;
        const now = Date.now();
        const lastSeen = lastViewAt[courseId] || 0;
        if (now - lastSeen < 10000) return; // 1 view per 10s per course
        setLastViewAt(prev => ({ ...prev, [courseId]: now }));
        try {
            const res = await courseAPI.addView(courseId);
            setCourses(prev => prev.map(c => c._id === courseId ? {
                ...c,
                views: res.data.views
            } : c));
        } catch (e) {
            console.error('Failed to update view count:', e);
        }
    };

    const handleLikeCourse = async (e, courseId) => {
        e.stopPropagation();
        if (!courseId) return;
        try {
            const res = await courseAPI.addLike(courseId);
            setCourses(prev => prev.map(c => c._id === courseId ? {
                ...c,
                likes: res.data.likes,
                isLiked: res.data.isLiked
            } : c));
        } catch (e) {
            console.error('Failed to update like count:', e);
        }
    };

    if (isFetching) {
        return <Loader message="Loading courses..." />;
    }

    return (
        <div className="space-y-4 sm:space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between px-0.5">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{role === 'intern' ? 'Browse Skills' : 'Courses'}</h1>
                    <p className="text-xs sm:text-base text-gray-500 dark:text-gray-400 mt-0.5">
                        {role === 'intern' ? 'Browse internship skills' : 'Discover and enroll in courses'}
                    </p>
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
            <div className="grid grid-cols-3 gap-1 sm:gap-1.5 bg-gray-100/80 dark:bg-slate-900 p-1 sm:p-1.5 rounded-xl sm:rounded-2xl w-full sm:w-fit border border-primary/40 dark:border-slate-700 shadow-sm">
                <button
                    onClick={() => setActiveTab('available')}
                    className={`min-w-0 px-1.5 sm:px-6 py-2.5 rounded-lg sm:rounded-xl text-[10px] sm:text-sm font-bold transition-all flex items-center justify-center whitespace-nowrap ${activeTab === 'available'
                        ? 'bg-primary text-white shadow-md border border-primary'
                        : 'text-gray-600 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white border border-transparent'
                        }`}
                >
                    <span className="sm:hidden">All <span className="opacity-75">({courses.length})</span></span>
                    <span className="hidden sm:inline">All Courses ({courses.length})</span>
                </button>
                <button
                    onClick={() => setActiveTab('enrolled')}
                    className={`min-w-0 px-1.5 sm:px-6 py-2.5 rounded-lg sm:rounded-xl text-[10px] sm:text-sm font-bold transition-all flex items-center justify-center whitespace-nowrap ${activeTab === 'enrolled'
                        ? 'bg-primary text-white shadow-md border border-primary'
                        : 'text-gray-600 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white border border-transparent'
                        }`}
                >
                    Enrolled <span className="opacity-75">({enrolledCourses.length})</span>
                </button>
                <button
                    onClick={() => setActiveTab('completed')}
                    className={`min-w-0 px-1.5 sm:px-6 py-2.5 rounded-lg sm:rounded-xl text-[10px] sm:text-sm font-bold transition-all flex items-center justify-center whitespace-nowrap ${activeTab === 'completed'
                        ? 'bg-primary text-white shadow-md border border-primary'
                        : 'text-gray-600 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white border border-transparent'
                        }`}
                >
                    Completed <span className="opacity-75">({completedCourses.length})</span>
                </button>
            </div>

            {/* Search and Filters */}
            <div className="bg-white dark:bg-gray-900 rounded-xl sm:rounded-2xl p-2.5 sm:p-4 border border-gray-100 dark:border-gray-800 flex flex-col gap-3 sm:gap-4 z-50 relative">
                <div className="w-full flex items-center bg-gray-50 dark:bg-gray-800 rounded-xl px-3 sm:px-4 py-2.5 border border-gray-100 dark:border-gray-700 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                    <Search className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 mr-2.5 sm:mr-3" />
                    <input
                        type="text"
                        placeholder="Search courses or teachers..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="!bg-transparent border-none outline-none w-full text-gray-700 dark:text-white/90 placeholder:text-gray-400 dark:placeholder:text-white/30 font-medium"
                    />
                </div>
                {!(role === 'student' || role === 'intern') && (
                    <div className="flex gap-2">
                        {CITY_OPTIONS.map((city) => {
                            const isSelected = selectedCities.includes(city.value);
                            return (
                                <button
                                    key={city.value}
                                    onClick={() => {
                                        if (isSelected) {
                                            setSelectedCities(prev => prev.filter(c => c !== city.value));
                                        } else {
                                            setSelectedCities(prev => [...prev, city.value]);
                                        }
                                    }}
                                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${isSelected
                                        ? 'bg-primary text-white shadow-lg shadow-primary'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                >
                                    {city.label}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Courses Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
                {filteredCourses.map((course, index) => {
                    const status = getEnrollmentStatus(course._id);
                    const enrollment = myEnrollments.find(e => e.course?._id === course._id);
                    const certificate = myCertificates.find(c => c.course?._id === course._id || c.course === course._id);

                    return (
                        <motion.div
                            key={course._id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            onMouseEnter={() => handleCourseSeen(course._id)}
                            onTouchStart={() => handleCourseSeen(course._id)}
                            className="bg-white dark:bg-gray-900 rounded-xl sm:rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-lg transition-all duration-300"
                        >
                            {/* Course Image */}
                            {(() => {
                                const style = getCourseStyle(course.category, course.title);
                                const Icon = style.icon;
                                return (
                                    <div className={`h-28 sm:h-auto sm:aspect-video relative bg-gradient-to-br ${style.gradient}`}>
                                        {course.image ? (
                                            <img src={course.image} alt={course.title} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center">
                                                    <Icon className="w-7 h-7 sm:w-10 sm:h-10 text-white" />
                                                </div>
                                            </div>
                                        )}
                                        {course.city && (
                                            <div className="absolute top-2.5 sm:top-4 right-2.5 sm:right-4">
                                                <Badge variant="primary" size="sm">{course.city}</Badge>
                                            </div>
                                        )}
                                        {status === 'enrolled' && (
                                            <div className="absolute top-2.5 sm:top-4 left-2.5 sm:left-4">
                                                <Badge variant="success" size="sm">
                                                    <CheckCircle className="w-3 h-3 mr-1" />
                                                    Enrolled
                                                </Badge>
                                            </div>
                                        )}
                                        {status === 'pending' && (
                                            <div className="absolute top-2.5 sm:top-4 left-2.5 sm:left-4">
                                                <Badge variant="warning" size="sm">
                                                    <Clock className="w-3 h-3 mr-1" />
                                                    Waiting for Verification
                                                </Badge>
                                            </div>
                                        )}
                                        {status === 'completed' && (
                                            <div className="absolute top-2.5 sm:top-4 left-2.5 sm:left-4">
                                                <Badge variant="info" size="sm">
                                                    <Award className="w-3 h-3 mr-1" />
                                                    Completed
                                                </Badge>
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}

                            {/* Course Content */}
                            <div className="p-3 sm:p-5">
                                <h3 className="font-bold text-[15px] sm:text-base text-gray-900 dark:text-white mb-1 sm:mb-2 line-clamp-2 leading-snug">{course.title}</h3>
                                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-1.5 sm:mb-2 line-clamp-2">{course.description}</p>
                                {course.description?.length > 100 && (
                                    <button
                                        onClick={() => { setSelectedCourse(course); setViewModalOpen(true); }}
                                        className="text-xs text-primary hover:text-primary font-medium mt-1 mb-4"
                                    >
                                        Read more
                                    </button>
                                )}

                                {/* Teachers */}
                                <div className="mb-2.5 sm:mb-4">
                                    {course.teachers && course.teachers.length > 0 ? (
                                        <div>
                                            <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5 sm:mb-2">Teachers</p>
                                            <div className="flex flex-wrap gap-2">
                                                {course.teachers
                                                    .filter((teacher, idx, arr) => {
                                                        const key = (teacher?._id || teacher?.id || teacher?.name || idx).toString();
                                                        return arr.findIndex(t => ((t?._id || t?.id || t?.name || '').toString() === key)) === idx;
                                                    })
                                                    .map((teacher, idx) => (
                                                        <div key={teacher?._id || teacher?.id || idx} className="relative group">
                                                            {teacher?.photo ? (
                                                                <img
                                                                    src={teacher.photo}
                                                                    alt={teacher?.name || 'Teacher'}
                                                                    className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover border-2 border-gray-100 dark:border-gray-700"
                                                                />
                                                            ) : (
                                                                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-primary to-primary flex items-center justify-center text-white text-xs font-bold border-2 border-gray-100 dark:border-gray-700">
                                                                    {teacher?.name?.charAt(0)?.toUpperCase() || 'T'}
                                                                </div>
                                                            )}
                                                            <div className="absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap bg-gray-900 text-white text-[10px] font-medium px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-20">
                                                                {teacher?.name || 'Teacher'}
                                                            </div>
                                                        </div>
                                                    ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <span className="text-sm text-gray-400">No teachers assigned</span>
                                    )}
                                </div>

                                {/* Stats */}
                                <div className="pt-2.5 sm:pt-3 border-t border-gray-100 dark:border-gray-800 w-full grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2 mb-3 sm:mb-4 text-[11px] sm:text-sm text-gray-500 dark:text-gray-400">
                                    <span className="flex items-center justify-start sm:justify-center gap-1.5 whitespace-nowrap rounded-lg bg-gray-50 dark:bg-gray-800/70 px-2 py-2 sm:bg-transparent sm:dark:bg-transparent sm:px-0 sm:py-0">
                                        <Clock className="w-4 h-4" /> {course.durationMonths} {course.durationMonths === 1 ? 'month' : 'months'}
                                    </span>
                                    <span className="flex items-center justify-start sm:justify-center gap-1.5 rounded-lg bg-gray-50 dark:bg-gray-800/70 px-2 py-2 sm:bg-transparent sm:dark:bg-transparent sm:px-0 sm:py-0">
                                        <Users className="w-4 h-4" /> {formatCompactCount(course.enrolledCount)}
                                    </span>
                                    <span className="flex items-center justify-start sm:justify-center gap-1.5 rounded-lg bg-gray-50 dark:bg-gray-800/70 px-2 py-2 sm:bg-transparent sm:dark:bg-transparent sm:px-0 sm:py-0">
                                        <Eye className="w-4 h-4" /> {formatCompactCount(course.views)}
                                    </span>
                                    <button
                                        onClick={(e) => handleLikeCourse(e, course._id)}
                                        className={`flex items-center justify-start sm:justify-center gap-1.5 rounded-lg bg-gray-50 dark:bg-gray-800/70 px-2 py-2 sm:bg-transparent sm:dark:bg-transparent sm:px-0 sm:py-0 ${course.isLiked || course.likedBy?.includes(user?.id || user?._id) ? 'text-red-500' : 'text-gray-400 hover:text-red-500'} transition-colors`}
                                        title="Like this course"
                                    >
                                        <Heart className={`w-4 h-4 ${(course.isLiked || course.likedBy?.includes(user?.id || user?._id)) ? 'fill-current' : 'fill-transparent stroke-current'}`} />
                                        {formatCompactCount(course.likes)}
                                    </button>
                                </div>

                                {/* Completed - Show Grade */}
                                {status === 'completed' && enrollment && (
                                    <div className="mb-3 sm:mb-4 p-3 bg-purple-50 dark:bg-purple-500/10 rounded-xl">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-gray-600 dark:text-gray-300">Final Grade (%)</span>
                                            <span className={`font-black ${getGrade(enrollment.percentage).color}`}>
                                                {getGrade(enrollment.percentage).grade} ({enrollment.percentage || 0}%)
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {/* Price and Action */}
                                <div className="flex items-center justify-between flex-wrap gap-3 pt-3 sm:pt-4 border-t border-gray-100 dark:border-gray-800">
                                    <div className="flex flex-col min-w-0">
                                        {course.originalPrice && !isNaN(parseFloat(course.originalPrice)) && !isNaN(parseFloat(course.fee)) && parseFloat(course.originalPrice) > parseFloat(course.fee) && (
                                            <span className="text-xs text-red-500 line-through font-medium">
                                                Rs {Number(course.originalPrice).toLocaleString()}
                                            </span>
                                        )}
                                        <div className={`flex items-center gap-1 font-bold text-base sm:text-lg ${course.originalPrice && !isNaN(parseFloat(course.originalPrice)) && parseFloat(course.originalPrice) > parseFloat(course.fee) ? 'text-primary' : 'text-gray-900 dark:text-white'}`}>
                                            {isNaN(Number(course.fee)) ? course.fee : `Rs ${Number(course.fee).toLocaleString()}`}
                                            <span className="text-xs font-normal text-gray-500">/month</span>
                                        </div>
                                    </div>

                                    {status === 'available' && !isNaN(Number(course.fee)) && (
                                        <button
                                            onClick={() => handleEnrollClick(course)}
                                            className="flex-1 sm:flex-none min-w-[120px] px-4 py-2.5 sm:py-2 bg-primary-dark hover:bg-primary text-white rounded-lg font-bold text-sm transition-all"
                                        >
                                            Enroll Now
                                        </button>
                                    )}
                                    {status === 'pending' && (
                                        <div className="grid grid-cols-2 sm:flex items-center gap-2 sm:gap-1.5 sm:ml-2">
                                            {enrollment && (
                                                <button
                                                    onClick={() => setWithdrawModal({ open: true, enrollmentId: enrollment._id, courseTitle: course.title })}
                                                    className="px-2.5 py-2.5 sm:py-1.5 text-red-500 hover:text-white hover:bg-red-500 rounded-lg transition-colors border border-red-200 hover:border-red-500 flex items-center justify-center gap-1 text-[10px] sm:text-xs font-bold whitespace-nowrap"
                                                    title={role === 'intern' ? 'Remove my Skill' : 'Remove My Course'}
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                    <span className="hidden sm:inline">{role === 'intern' ? 'Remove my Skill' : 'Remove My Course'}</span>
                                                    <span className="sm:hidden">Remove</span>
                                                </button>
                                            )}
                                            <button
                                                onClick={() => navigate(`/${role === 'intern' ? 'intern' : 'student'}/fees`)}
                                                className="px-3 sm:px-4 py-2.5 sm:py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-all flex items-center justify-center gap-1.5 text-[10px] sm:text-xs font-bold whitespace-nowrap shadow-sm"
                                            >
                                                <Upload className="w-3.5 h-3.5" />
                                                Upload Receipt
                                            </button>
                                        </div>
                                    )}
                                    {status === 'enrolled' && (
                                        <button
                                            onClick={() => handleViewCourse(course)}
                                            className="flex-1 sm:flex-none min-w-[120px] px-4 py-2.5 sm:py-2 bg-white dark:bg-gray-900 border border-gray-900 dark:border-gray-600 text-gray-900 dark:text-white hover:bg-gray-900 hover:text-white rounded-lg sm:rounded-xl font-bold text-sm transition-all duration-300 shadow-sm"
                                        >
                                            View Course
                                        </button>
                                    )}
                                    {status === 'completed' && (
                                        <div className="flex w-full sm:w-auto gap-2">
                                            {certificate?.certificateLink ? (
                                                    <a
                                                        href={getDownloadLink(certificate.certificateLink)}
                                                        download
                                                        className="w-full sm:w-auto text-center px-3 py-2.5 sm:py-2 bg-primary text-white rounded-lg font-medium text-sm hover:bg-purple-700 transition-all"
                                                    >
                                                        Download
                                                    </a>
                                            ) : (
                                                <span className="w-full sm:w-auto text-center px-3 py-2.5 sm:py-2 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-lg font-medium text-sm">
                                                    Certificate Pending
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {filteredCourses.length === 0 && (
                <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 sm:p-12 border border-gray-100 dark:border-gray-800 text-center">
                    <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No courses found</p>
                </div>
            )}

            {/* Enrollment Modal */}
            <Modal
                isOpen={isEnrollModalOpen}
                onClose={() => setIsEnrollModalOpen(false)}
                title="Enroll in Course"
                size="md"
                centerOnMobile
            >
                {selectedCourse && (
                    <div className="space-y-6">
                        <div className="p-4 bg-gray-50 rounded-xl">
                            <h3 className="font-semibold text-gray-900 mb-2">{selectedCourse.title}</h3>
                            <p className="text-sm text-gray-500 whitespace-pre-wrap leading-relaxed">{selectedCourse.description}</p>
                            <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                                <span className="flex items-center gap-1">
                                    <Calendar className="w-4 h-4" />
                                    {selectedCourse.startDate && new Date(selectedCourse.startDate).toLocaleDateString()} -
                                    {selectedCourse.endDate && new Date(selectedCourse.endDate).toLocaleDateString()}
                                </span>
                            </div>
                        </div>

                        <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-gray-600">Course Fee</span>
                                <div className="flex flex-col items-end">
                                    {selectedCourse.originalPrice && !isNaN(parseFloat(selectedCourse.originalPrice)) && !isNaN(parseFloat(selectedCourse.fee)) && parseFloat(selectedCourse.originalPrice) > parseFloat(selectedCourse.fee) && (
                                        <span className="text-sm text-red-500 line-through font-medium">
                                            Rs {Number(selectedCourse.originalPrice).toLocaleString()}
                                        </span>
                                    )}
                                    <span className="text-2xl font-bold text-primary">
                                        {isNaN(Number(selectedCourse.fee)) ? selectedCourse.fee : `Rs ${Number(selectedCourse.fee).toLocaleString()}`}
                                    </span>
                                </div>
                            </div>
                            <p className="text-xs text-gray-500">
                                By enrolling, you agree to pay the course fee. You can upload your payment receipt in Fee Management.
                            </p>
                        </div>

                        {role === 'intern' && (
                            <motion.div
                                key={`duration-validation-${durationValidationAttempt}`}
                                animate={durationValidationAttempt > 0 ? { x: [0, -9, 9, -7, 7, -4, 4, 0] } : { x: 0 }}
                                transition={{ duration: 0.45 }}
                                className={`rounded-xl border p-3 transition-colors ${
                                    durationValidationAttempt > 0 && !internshipDurationMonths
                                        ? 'border-red-500 bg-red-50/70 dark:bg-red-950/20'
                                        : 'border-transparent'
                                }`}
                            >
                                <label className={`block text-sm font-bold mb-3 ${
                                    durationValidationAttempt > 0 && !internshipDurationMonths
                                        ? 'text-red-600 dark:text-red-400'
                                        : 'text-gray-700'
                                }`}>
                                    Internship Duration <span className="text-red-500">*</span>
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    {[3, 6, 12].map(months => (
                                        <button
                                            key={months}
                                            type="button"
                                            onClick={() => {
                                                setInternshipDurationMonths(months);
                                                setDurationValidationAttempt(0);
                                                setError('');
                                            }}
                                            className={`py-3 px-2 rounded-xl border text-sm font-bold transition-all ${
                                                Number(internshipDurationMonths) === months
                                                    ? 'bg-primary text-white border-primary shadow-md'
                                                    : durationValidationAttempt > 0
                                                        ? 'bg-white dark:bg-slate-900 text-red-600 dark:text-red-400 border-red-400 hover:bg-red-50'
                                                    : 'bg-white text-gray-600 border-gray-200 hover:border-primary hover:text-primary'
                                            }`}
                                        >
                                            {months} Months
                                        </button>
                                    ))}
                                </div>
                                <p className={`mt-2 text-xs ${
                                    durationValidationAttempt > 0 && !internshipDurationMonths
                                        ? 'text-red-600 dark:text-red-400 font-semibold'
                                        : 'text-gray-500'
                                }`}>
                                    {durationValidationAttempt > 0 && !internshipDurationMonths
                                        ? 'Please select 3, 6, or 12 months before confirming.'
                                        : 'Select how long you want to join this internship.'}
                                </p>
                            </motion.div>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={() => setIsEnrollModalOpen(false)}
                                className="flex-1 py-3 text-gray-600 font-medium hover:bg-gray-100 rounded-xl"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmEnroll}
                                disabled={isEnrolling}
                                className="flex-1 py-3 bg-primary-dark hover:bg-primary text-white font-medium rounded-xl flex items-center justify-center gap-2 disabled:opacity-70"
                            >
                                <ButtonLoader isLoading={isEnrolling}>
                                    Confirm Enrollment
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
                title={role === 'intern' ? 'Remove Skill Application' : 'Revoke Course Application'}
                size="sm"
            >
                <div className="space-y-4">
                    <div className="bg-red-50 p-4 rounded-xl flex items-start gap-3">
                        <Trash2 className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <h4 className="font-bold text-red-700 text-sm">Are you sure?</h4>
                            <p className="text-xs text-red-600 mt-1">
                                You are about to withdraw from <strong>{withdrawModal.courseTitle}</strong>.
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
                            Confirm Revoke
                        </button>
                    </div>
                </div>
            </Modal>

            {/* View Course Description Modal */}
            <Modal
                isOpen={viewModalOpen}
                onClose={() => setViewModalOpen(false)}
                title="Course Overview"
                size="md"
            >
                {selectedCourse && (
                    <div className="space-y-4">
                        <div className="p-4 bg-primary/5 rounded-xl">
                            <h3 className="font-semibold text-gray-900 mb-2">{selectedCourse.title}</h3>
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                                <span className="flex items-center gap-1">
                                    <Clock className="w-4 h-4" />
                                    {selectedCourse.durationMonths} {selectedCourse.durationMonths === 1 ? 'month' : 'months'}
                                </span>
                            </div>
                        </div>
                        <div className="p-4 border border-gray-100 rounded-xl bg-white">
                            <h4 className="font-medium text-gray-900 mb-2">Description</h4>
                            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                                {selectedCourse.description}
                            </p>
                        </div>
                        <div className="flex justify-end pt-2">
                            <button
                                onClick={() => setViewModalOpen(false)}
                                className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default BrowseCourses;



