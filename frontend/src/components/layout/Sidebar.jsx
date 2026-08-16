import { useSelector, useDispatch } from 'react-redux';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { assignmentAPI, courseAPI, dailyTaskAPI, chatAPI, enrollmentAPI, feeAPI, certificateAPI, testAPI, taskAPI, teacherFinanceAPI, financeAPI } from '../../services/api';
import { isDueDateOverdue } from '../../utils/dueDate';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutDashboard,
    BookOpen,
    Users,
    CreditCard,
    FileText,
    Settings,
    LogOut,
    ChevronDown,
    GraduationCap,
    ClipboardList,
    BarChart3,
    User,
    Calendar,
    X,
    Briefcase,
    BriefcaseBusiness,
    Award,
    Bell,
    FolderOpen,
    Zap,
    CheckCircle,
    Clock,
    MessageSquare,
    Wallet,
    Search
} from 'lucide-react';
import { logout, loginSuccess } from '../../features/auth/authSlice';
import { userAPI, authAPI } from '../../services/api';
import { useTranslation } from 'react-i18next';
import ProfileAvatar from '../ui/ProfileAvatar';
import Loader, { ButtonLoader } from '../ui/Loader';
import SocialLinks from '../shared/SocialLinks';
import { getSocketURL } from '../../config/apiBaseUrl';

const Sidebar = ({ isOpen, setIsOpen }) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const dispatch = useDispatch();
    const { user, role } = useSelector((state) => state.auth);
    const [pendingCount, setPendingCount] = useState(0);
    const [adminPendingCounts, setAdminPendingCounts] = useState({});
    const [teacherSubmissionCount, setTeacherSubmissionCount] = useState(0);
    const [jobChatSummary, setJobChatSummary] = useState({ totalUnread: 0, totalApplicants: 0, totalAssigned: 0, totalSubmitted: 0 });
    const [jobPostingCounts, setJobPostingCounts] = useState({ totalAssigned: 0, totalSubmitted: 0 });
    const [jobApplicationCount, setJobApplicationCount] = useState(0);
    const [jobAssignedCount, setJobAssignedCount] = useState(0);
    const [jobAvailableCount, setJobAvailableCount] = useState(0);
    const [studentNavCounts, setStudentNavCounts] = useState({});
    const [discussionUnread, setDiscussionUnread] = useState(0);
    const [teacherProjectCount, setTeacherProjectCount] = useState(0);
    const [adminProjectCount, setAdminProjectCount] = useState(0);
    const [availableRoles, setAvailableRoles] = useState([]);
    const [isSwitchingRole, setIsSwitchingRole] = useState(false);
    const [showRoleMenu, setShowRoleMenu] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        if (!['admin', 'teacher', 'job'].includes(role)) return;
        const loadJobSummary = async () => {
            try {
                const [chatRes, countsRes] = await Promise.all([
                    chatAPI.getJobChats(),
                    taskAPI.getCounts()
                ]);
                setJobChatSummary({
                    totalUnread: chatRes.data.totalUnread || 0,
                    totalApplicants: chatRes.data.totalApplicants || 0,
                    totalAssigned: chatRes.data.totalAssigned || 0,
                    totalSubmitted: chatRes.data.totalSubmitted || 0
                });
                setJobPostingCounts({
                    totalAssigned: countsRes.data.data?.totalAssigned || 0,
                    totalSubmitted: countsRes.data.data?.totalSubmitted || 0
                });
            } catch (_) { /* no job chats yet */ }
        };
        loadJobSummary();
        const timer = setInterval(loadJobSummary, 30000);
        return () => clearInterval(timer);
    }, [role]);

    useEffect(() => {
        if (role !== 'job' || !user) return;

        const loadApplicationCount = async () => {
            try {
                const [myTasksResponse, allTasksResponse] = await Promise.all([
                    taskAPI.getMy(),
                    taskAPI.getAll({})
                ]);
                const userId = String(user._id || user.id);
                const myJobTasks = myTasksResponse.data.data || [];
                const allJobTasks = allTasksResponse.data.data || [];
                const count = myJobTasks.filter(task => {
                    const assigned = (task.assignedTo || []).some(assignedUser =>
                        String(assignedUser?._id || assignedUser) === userId
                    );
                    const applications = (task.applicants || [])
                        .filter(application => String(application.user?._id || application.user) === userId)
                        .sort((a, b) => (b.cycle || 1) - (a.cycle || 1));
                    return !assigned && applications[0]?.status === 'applied';
                }).length;
                setJobApplicationCount(count);
                setJobAssignedCount(myJobTasks.filter(task =>
                    task.status !== 'completed' && (task.assignedTo || []).some(assignedUser =>
                        String(assignedUser?._id || assignedUser) === userId
                    )
                ).length);

                const isTaskExpired = (task) => {
                    if (task.manualStatus === 'expired') return true;
                    if (task.manualStatus === 'active' || task.isLifetime || !task.deadline) return false;
                    return new Date(task.deadline) < new Date() &&
                        (!task.assignedTo || task.assignedTo.length === 0) &&
                        task.status === 'open';
                };
                const hasCurrentApplication = (task) => {
                    const latestApplication = (task.applicants || [])
                        .filter(application => String(application.user?._id || application.user) === userId)
                        .sort((a, b) => (b.cycle || 1) - (a.cycle || 1))[0];
                    return Boolean(latestApplication && latestApplication.status !== 'completed');
                };
                setJobAvailableCount(allJobTasks.filter(task =>
                    task.status !== 'completed' &&
                    task.manualStatus !== 'completed' &&
                    !isTaskExpired(task) &&
                    !hasCurrentApplication(task)
                ).length);
            } catch (_) {
                setJobApplicationCount(0);
                setJobAssignedCount(0);
                setJobAvailableCount(0);
            }
        };

        loadApplicationCount();
        const timer = window.setInterval(loadApplicationCount, 15000);
        window.addEventListener('job-applications-updated', loadApplicationCount);
        return () => {
            window.clearInterval(timer);
            window.removeEventListener('job-applications-updated', loadApplicationCount);
        };
    }, [role, user]);

    useEffect(() => {
        if (!user || !role) return;

        const isDiscussionOpen = location.pathname.includes('/discussion-room');

        const refreshDiscussionUnread = async () => {
            try {
                if (isDiscussionOpen) {
                    setDiscussionUnread(0);
                    await chatAPI.markDiscussionRead();
                    return;
                }
                const res = await chatAPI.getDiscussionUnread();
                setDiscussionUnread(Number(res.data.count || 0));
            } catch (error) {
                console.error('Error fetching discussion unread count:', error);
            }
        };

        refreshDiscussionUnread();
        const timer = setInterval(refreshDiscussionUnread, 30000);
        const socket = io(getSocketURL(), { withCredentials: true });
        const myId = user?._id || user?.id;
        const myEmail = (user?.email || '').toLowerCase();
        if (myId) socket.emit('join_chat', String(myId));

        socket.on('discussion_message', (message) => {
            const sender = message?.sender || {};
            const isMine = String(sender._id || sender) === String(myId)
                || (!!myEmail && (sender.email || '').toLowerCase() === myEmail);
            if (isDiscussionOpen || isMine) {
                setDiscussionUnread(0);
                if (isDiscussionOpen) chatAPI.markDiscussionRead().catch(() => {});
                return;
            }
            refreshDiscussionUnread();
        });

        socket.on('discussion_read', () => {
            setDiscussionUnread(0);
        });

        socket.on('discussion_cleared', () => {
            setDiscussionUnread(0);
        });

        return () => {
            clearInterval(timer);
            socket.disconnect();
        };
    }, [user, role, location.pathname]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowRoleMenu(false);
            }
        };

        if (showRoleMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        } else {
            document.removeEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showRoleMenu]);

    useEffect(() => {
        if (role !== 'teacher') return;
        const loadTeacherProjects = async () => {
            try {
                const res = await teacherFinanceAPI.getAssignedProjects();
                const allProjects = res.data.data || [];
                setTeacherProjectCount(allProjects.filter(p => p.status !== 'completed').length);
            } catch (_) {
                setTeacherProjectCount(0);
            }
        };
        loadTeacherProjects();
        const timer = setInterval(loadTeacherProjects, 30000);
        return () => clearInterval(timer);
    }, [role]);

    useEffect(() => {
        if (role !== 'admin') return;
        const loadAdminProjects = async () => {
            try {
                const res = await financeAPI.getProjects();
                const allProjects = res.data.data || [];
                setAdminProjectCount(allProjects.filter(p => p.status !== 'completed').length);
            } catch (_) {
                setAdminProjectCount(0);
            }
        };
        loadAdminProjects();
        const timer = setInterval(loadAdminProjects, 30000);
        return () => clearInterval(timer);
    }, [role]);

    useEffect(() => {
        if (role === 'student' || role === 'intern') {
            fetchPendingCount();
            if (role === 'student') fetchStudentNavCounts();
            const interval = setInterval(fetchPendingCount, 5 * 60 * 1000);
            const navInterval = role === 'student' ? setInterval(fetchStudentNavCounts, 60 * 1000) : null;
            return () => {
                clearInterval(interval);
                if (navInterval) clearInterval(navInterval);
            };
        } else if (role === 'admin') {
            fetchAdminPendingCounts();
            window.addEventListener('admin-pending-counts-changed', fetchAdminPendingCounts);
            const interval = setInterval(fetchAdminPendingCounts, 2 * 60 * 1000); // Admin refresh more frequent
            return () => {
                clearInterval(interval);
                window.removeEventListener('admin-pending-counts-changed', fetchAdminPendingCounts);
            };
        } else if (role === 'teacher') {
            fetchTeacherSubmissionCount();
            const interval = setInterval(fetchTeacherSubmissionCount, 5 * 60 * 1000);
            return () => clearInterval(interval);
        }
    }, [role, user]);

    useEffect(() => {
        const fetchRoles = async () => {
            try {
                const res = await authAPI.getAvailableRoles();
                if (res.data.success) {
                    const roleOrder = { 'job': 1, 'teacher': 2, 'intern': 3, 'student': 4, 'admin': 5 };
                    const sortedRoles = res.data.roles.sort((a, b) => (roleOrder[a] || 99) - (roleOrder[b] || 99));
                    setAvailableRoles(sortedRoles);
                }
            } catch (err) {
                console.error('Error fetching available roles:', err);
            }
        };
        if (user) {
            fetchRoles();
        }
    }, [user, role]);

    const handleSwitchRole = async (targetRole) => {
        if (targetRole === role) return;
        setIsSwitchingRole(true);
        try {
            const rememberMe = localStorage.getItem('rememberMe') === 'true';
            const res = await authAPI.switchRole({ targetRole, rememberMe });
            if (res.data.success) {
                dispatch(loginSuccess({
                    user: res.data.user,
                    token: res.data.token,
                    rememberMe
                }));
                navigate('/');
                setShowRoleMenu(false);
                setIsOpen(false);
            }
        } catch (err) {
            console.error('Role switch error:', err);
            alert(err.response?.data?.message || t('auth.switchRoleFailed'));
        } finally {
            setIsSwitchingRole(false);
        }
    };

    const fetchTeacherSubmissionCount = async () => {
        try {
            const teacherId = (user?.id || user?._id)?.toString();
            if (!teacherId) return;

            // Get all courses
            const coursesRes = await courseAPI.getAll();
            const allCourses = coursesRes.data.data || [];

            // Filter teacher's courses (same logic as TeacherCourses.jsx)
            const teacherCourses = allCourses.filter(c => {
                if (!c.teachers || c.teachers.length === 0) return false;
                return c.teachers.some(t => {
                    const tId = String(t._id || t.id || t);
                    return tId === teacherId;
                });
            });

            // Count pending (ungraded) submissions across all teacher's courses
            let pendingSubmissions = 0;
            for (const course of teacherCourses) {
                try {
                    const assignmentsRes = await assignmentAPI.getByCourse(course._id);
                    const assignments = assignmentsRes.data.assignments || [];
                    assignments.forEach(a => {
                        (a.submissions || []).forEach(s => {
                            // Count ungraded: marks is null, undefined, or not a number
                            const isUngraded = s.marks === undefined || s.marks === null || (typeof s.marks !== 'number');
                            if (isUngraded) {
                                pendingSubmissions++;
                            }
                        });
                    });
                } catch (e) {
                    // Skip courses with no assignments
                }
            }

            setTeacherSubmissionCount(pendingSubmissions);
        } catch (error) {
            console.error('Error fetching teacher submission count:', error);
        }
    };

    const fetchAdminPendingCounts = async () => {
        try {
            const res = await userAPI.getPendingCounts();
            if (res.data.success) {
                setAdminPendingCounts(res.data.data);
            }
        } catch (error) {
            console.error('Error fetching admin pending counts:', error);
        }
    };

    const fetchPendingCount = async () => {
        try {
            const res = await assignmentAPI.getMy();
            const assignments = res.data.assignments || [];

            const count = assignments.filter(a => {
                const mySub = a.submissions?.find(s => (s.user?._id || s.user) === (user?._id || user?.id));
                const isSubmitted = !!mySub;
                const isRejected = mySub?.status === 'rejected';
                const isDeadlinePassed = isDueDateOverdue(a.dueDate);

                // Count if: 
                // 1. Never submitted AND deadline not passed
                // 2. OR Submitted but REJECTED (needs action regardless of deadline usually)
                return (!isSubmitted && !isDeadlinePassed) || isRejected;
            }).length;

            setPendingCount(count);
        } catch (error) {
            console.error('Error fetching pending assignments for sidebar:', error);
        }
    };

    const fetchStudentNavCounts = async () => {
        try {
            const userId = String(user?._id || user?.id || '');
            if (!userId) return;

            const [enrollmentResult, feeResult, assignmentResult, certificateResult, chatResult] = await Promise.allSettled([
                enrollmentAPI.getMy(),
                feeAPI.getMy(),
                assignmentAPI.getMy(),
                certificateAPI.getMy(),
                chatAPI.getStudentCourses()
            ]);

            const enrollments = enrollmentResult.status === 'fulfilled' ? (enrollmentResult.value.data.data || []) : [];
            const fees = feeResult.status === 'fulfilled' ? (feeResult.value.data.data || []) : [];
            const assignments = assignmentResult.status === 'fulfilled' ? (assignmentResult.value.data.assignments || []) : [];
            const certificates = certificateResult.status === 'fulfilled' ? (certificateResult.value.data.certificates || []) : [];
            const chatCourses = chatResult.status === 'fulfilled' ? (chatResult.value.data.data || []) : [];
            const courseIds = enrollments.map(e => String(e.course?._id || e.course || '')).filter(Boolean);

            const [dailyResults, testResults] = await Promise.all([
                Promise.allSettled(courseIds.map(courseId => dailyTaskAPI.getMy(courseId))),
                Promise.allSettled(courseIds.map(courseId => testAPI.getByCourse(courseId)))
            ]);

            const ungradedLogs = dailyResults.reduce((total, result) => {
                if (result.status !== 'fulfilled') return total;
                const logs = result.value.data.data || [];
                return total + logs.filter(log => !['graded', 'verified'].includes(log.status)).length;
            }, 0);

            const pendingTests = testResults.reduce((total, result) => {
                if (result.status !== 'fulfilled') return total;
                const tests = result.value.data.tests || [];
                return total + tests.filter(test => !(test.submissions || []).length).length;
            }, 0);

            const pendingAssignments = assignments.filter(assignment => {
                const mySubmission = (assignment.submissions || []).find(submission =>
                    String(submission.user?._id || submission.user || '') === userId
                );
                if (!mySubmission) return true;
                const hasMarks = typeof mySubmission.marks === 'number';
                return !hasMarks && !['graded', 'verified'].includes(mySubmission.status);
            }).length;

            const pendingFees = fees.reduce((total, fee) => total + (fee.installments || [])
                .filter(installment => installment.status !== 'verified').length, 0);
            const unreadChat = chatCourses.reduce((total, course) => total + Number(course.totalUnread || 0), 0);
            const actionableTotal = pendingFees + ungradedLogs + pendingAssignments + pendingTests + unreadChat;

            setStudentNavCounts({
                dashboard: actionableTotal,
                courses: enrollments.length,
                fees: pendingFees,
                classLogs: ungradedLogs,
                assignments: pendingAssignments,
                tests: pendingTests,
                certificates: certificates.length,
                chat: unreadChat
            });
        } catch (error) {
            console.error('Error fetching student navigation counts:', error);
        }
    };

    const handleLogout = () => {
        dispatch(logout());
        navigate('/login');
    };

    // Menu items based on role
    const getMenuItems = () => {
        const baseItems = {
            admin: [
                { id: 'dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard, path: '/admin/dashboard' },
                { id: 'directory', labelKey: 'nav.directory', icon: FolderOpen, path: '/admin/directory' },
                { id: 'courses', labelKey: 'nav.courses', icon: BookOpen, path: '/admin/courses' },
                { id: 'certificates', labelKey: 'nav.certificates', icon: Award, path: '/admin/certificates' },
                { id: 'students', labelKey: 'nav.students', icon: Users, path: '/admin/students', badge: adminPendingCounts.studentRegisteredNew },
                { id: 'teachers', labelKey: 'nav.teachers', icon: GraduationCap, path: '/admin/teachers', badge: adminPendingCounts.teacherActive },
                { id: 'interns', labelKey: 'nav.interns', icon: Users, path: '/admin/interns', badge: adminPendingCounts.internRegisteredNew },
                { id: 'notifications', labelKey: 'nav.notifications', icon: Bell, path: '/admin/notifications' },
                { id: 'fees', labelKey: 'nav.feeVerification', icon: CreditCard, path: '/admin/fees', badge: adminPendingCounts.fees, secondaryBadge: adminPendingCounts.feesAwaiting },
                { id: 'expenses', labelKey: 'Expenses', icon: Wallet, path: '/admin/expense' },
                { id: 'discussion-room', labelKey: 'Discussion Room', icon: MessageSquare, path: '/admin/discussion-room', badge: discussionUnread },
                { id: 'attendance-settings', labelKey: 'nav.attendanceSettings', icon: ClipboardList, path: '/admin/attendance-settings' },
                { id: 'registration-pages', labelKey: 'Registration Forms', icon: FileText, path: '/admin/registration-pages' },
                { id: 'job-section-label', type: 'section', label: 'Job' },
                { id: 'paid-tasks', labelKey: 'nav.paidTasks', icon: Briefcase, path: '/admin/paid-tasks', counters: { assigned: jobPostingCounts.totalAssigned || 0, submitted: jobPostingCounts.totalSubmitted || 0 } },
                ...(jobChatSummary.totalAssigned > 0 ? [{ id: 'job-chat', labelKey: 'Job Chats', icon: MessageSquare, path: '/admin/job-chat', badge: jobChatSummary.totalUnread }] : []),
                { id: 'jobs', labelKey: 'nav.freelancers', icon: Briefcase, path: '/admin/jobs', badge: adminPendingCounts.job },
                { id: 'projects', labelKey: 'Projects', icon: FolderOpen, path: '/admin/projects', badge: adminProjectCount },
            ],
            teacher: [
                { id: 'dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard, path: '/teacher/dashboard', submissionBadge: teacherSubmissionCount },
                { id: 'profile', labelKey: 'nav.myProfile', icon: User, path: '/teacher/profile' },
                { id: 'courses', labelKey: 'nav.myCourses', icon: BookOpen, path: '/teacher/courses' },
                { id: 'student-search', labelKey: 'Students', icon: Search, path: '/teacher/student-search' },
                { id: 'attendance', labelKey: 'nav.attendance', icon: Calendar, path: '/teacher/quick-attendance' },
                { id: 'certificates', labelKey: 'nav.certificates', icon: Award, path: '/teacher/certificates' },
                { id: 'discussion-room', labelKey: 'Discussion Room', icon: MessageSquare, path: '/teacher/discussion-room', badge: discussionUnread },
                { id: 'projects-section-label', type: 'section', label: 'Projects & Jobs' },
                { id: 'jobs', labelKey: 'Job Posting', icon: Briefcase, path: '/teacher/jobs', badge: (jobPostingCounts.totalAssigned || 0) + (jobPostingCounts.totalSubmitted || 0) },
                ...(teacherProjectCount > 0 ? [{ id: 'my-projects', labelKey: 'My Projects', icon: BriefcaseBusiness, path: '/teacher/projects', badge: teacherProjectCount }] : []),
                ...(jobChatSummary.totalAssigned > 0 ? [{ id: 'job-chat', labelKey: 'Applicant Chats', icon: MessageSquare, path: '/teacher/job-chat', badge: jobChatSummary.totalUnread }] : []),
            ],
            student: [
                { id: 'dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard, path: '/student/dashboard', badge: studentNavCounts.dashboard },
                { id: 'profile', labelKey: 'nav.myProfile', icon: User, path: '/student/profile' },
                { id: 'courses', labelKey: 'nav.myCourses', icon: BookOpen, path: '/student/courses', badge: studentNavCounts.courses },
                { id: 'discussion-room', labelKey: 'Discussion Room', icon: MessageSquare, path: '/student/discussion-room', badge: discussionUnread },
                { id: 'fees', labelKey: 'nav.feePayment', icon: CreditCard, path: '/student/fees', badge: studentNavCounts.fees },
                { id: 'attendance', labelKey: 'nav.myAttendance', icon: Calendar, path: '/student/assignments', state: { tab: 'attendance' } },
                { id: 'class-logs', labelKey: 'nav.classLogs', icon: ClipboardList, path: '/student/assignments', state: { tab: 'daily_tasks' }, badge: studentNavCounts.classLogs },
                { id: 'assignments', labelKey: 'nav.assignments', icon: FileText, path: '/student/assignments', state: { tab: 'assignments' }, badge: studentNavCounts.assignments },
                { id: 'tests', labelKey: 'nav.myTests', icon: Zap, path: '/student/assignments', state: { tab: 'tests' }, badge: studentNavCounts.tests },
                { id: 'marks', labelKey: 'nav.marksSheet', icon: BarChart3, path: '/student/marks' },
                { id: 'certificates', labelKey: 'Certificates', icon: Award, path: '/student/courses', state: { tab: 'completed' }, badge: studentNavCounts.certificates },
                { id: 'chat', labelKey: 'Teacher Chat', icon: MessageSquare, path: '/student/assignments', state: { tab: 'chat' }, badge: studentNavCounts.chat },
            ],
            intern: [
                { id: 'dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard, path: '/intern/dashboard' },
                { id: 'profile', labelKey: 'nav.myProfile', icon: User, path: '/intern/profile' },
                { id: 'courses', labelKey: 'nav.mySkills', icon: BookOpen, path: '/intern/courses' },
                { id: 'discussion-room', labelKey: 'Discussion Room', icon: MessageSquare, path: '/intern/discussion-room', badge: discussionUnread },
                { id: 'fees', labelKey: 'nav.feePayment', icon: CreditCard, path: '/intern/fees' },
                { id: 'attendance', labelKey: 'nav.myAttendance', icon: Calendar, path: '/intern/assignments', state: { tab: 'attendance' } },
                { id: 'class-logs', labelKey: 'nav.meetingLogs', icon: ClipboardList, path: '/intern/assignments', state: { tab: 'daily_tasks' } },
                { id: 'assignments', labelKey: 'nav.dailyTask', icon: FileText, path: '/intern/assignments', state: { tab: 'assignments' } },
                { id: 'tests', labelKey: 'nav.myTests', icon: Zap, path: '/intern/assignments', state: { tab: 'tests' } },
                { id: 'marks', labelKey: 'nav.marksSheet', icon: BarChart3, path: '/intern/marks' },
                { id: 'certificates', labelKey: 'Certificates', icon: Award, path: '/intern/courses', state: { tab: 'completed' } },
                { id: 'chat', labelKey: 'Teacher Chat', icon: MessageSquare, path: '/intern/assignments', state: { tab: 'chat' } },
            ],
            job: [
                { id: 'dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard, path: '/job/dashboard' },
                { id: 'available', labelKey: 'Available', icon: Briefcase, path: '/job/tasks', state: { tab: 'available' }, badge: jobAvailableCount },
                { id: 'applied', labelKey: 'Applications', icon: FileText, path: '/job/tasks', state: { tab: 'applied' }, badge: jobApplicationCount },
                { id: 'assigned', labelKey: 'Assigned', icon: CheckCircle, path: '/job/tasks', state: { tab: 'assigned' }, badge: jobAssignedCount },
                ...(jobChatSummary.totalAssigned > 0 ? [{ id: 'job-chat', labelKey: 'Job Chat', icon: MessageSquare, path: '/job/job-chat', badge: jobChatSummary.totalUnread }] : []),
                { id: 'completed', labelKey: 'Completed', icon: Award, path: '/job/tasks', state: { tab: 'completed' } },
                { id: 'payments', labelKey: 'Payments', icon: Wallet, path: '/job/payments' },
                { id: 'expired', labelKey: 'Expired', icon: Clock, path: '/job/tasks', state: { tab: 'expired' } },
                { id: 'showcase', labelKey: 'Feedback', icon: MessageSquare, path: '/job/tasks', state: { tab: 'showcase' } },
                { id: 'profile', labelKey: 'nav.myProfile', icon: User, path: '/job/profile' },
                { id: 'discussion-room', labelKey: 'Discussion Room', icon: MessageSquare, path: '/job/discussion-room', badge: discussionUnread },
            ],
        };

        return baseItems[role] || baseItems.student;
    };

    const menuItems = getMenuItems();

    // Get role display name
    const getRoleDisplayName = () => t(`roles.${role}`, { defaultValue: t('roles.user') });

    return (
        <>
            {/* Mobile Overlay */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsOpen(false)}
                        className="fixed inset-0 bg-black/50 z-[70] lg:hidden"
                    />
                )}
            </AnimatePresence>

            <aside
                className={`fixed lg:relative top-0 left-0 z-[80] h-screen w-[280px] bg-[var(--bg-sidebar)] flex flex-col transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
                    }`}
            >
                <div
                    className="p-6 border-b border-[var(--border-sidebar)] cursor-pointer hover:bg-white/[0.02] transition-colors"
                    onClick={() => {
                        const defaultPages = {
                            admin: '/admin/dashboard',
                            teacher: '/teacher/dashboard',
                            student: '/student/dashboard',
                            intern: '/intern/dashboard',
                            job: '/job/dashboard'
                        };
                        navigate(defaultPages[role] || '/');
                        setIsOpen(false);
                    }}
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 border-2 border-primary rounded-full flex items-center justify-center overflow-hidden">
                                <img
                                    src="/logo.png"
                                    alt="Logo"
                                    className="w-full h-full object-contain"
                                    onError={(e) => {
                                        e.target.style.display = 'none';
                                        e.target.nextSibling.style.display = 'block';
                                    }}
                                />
                                <GraduationCap className="w-6 h-6 text-white hidden" />
                            </div>
                            <div>
                                <h1 className="text-[var(--text-sidebar)] font-bold text-lg tracking-tight">{t('app.name')}</h1>
                                <p className="text-primary text-[8px] font-black uppercase tracking-wider whitespace-nowrap">
                                    digital tech software house
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsOpen(false);
                            }}
                            className="lg:hidden text-white/60 hover:text-white"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="relative mx-4 mt-4" ref={dropdownRef}>
                    <div 
                        className={`p-4 bg-[var(--bg-sidebar-light)]/40 rounded-xl border border-[var(--border-sidebar)] shadow-inner transition-colors ${availableRoles.length > 1 ? 'cursor-pointer hover:bg-[var(--bg-sidebar-light)]/60' : ''}`}
                        onClick={() => {
                            if (availableRoles.length > 1) setShowRoleMenu(!showRoleMenu);
                        }}
                    >
                        <div className="flex items-center gap-3">
                            <div className="relative shrink-0">
                                <ProfileAvatar src={role === 'admin' ? "https://res.cloudinary.com/adeeb-tech-lab/image/upload/v1780787310/Company%20Logo/LMS_admin.jpg" : user?.photo} name={user?.name} size="md" border="border border-[var(--border-sidebar)]" fallbackColor="bg-gradient-to-br from-[var(--bg-sidebar-light)] to-[var(--bg-sidebar)]" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[var(--text-sidebar)] font-medium text-sm truncate">
                                    {user?.name || t('roles.user')}
                                </p>
                                <p className="text-primary text-[10px] font-black uppercase tracking-widest truncate mt-0.5">
                                    {getRoleDisplayName()}
                                </p>
                            </div>
                            {availableRoles.length > 1 && (
                                <ChevronDown className={`w-4 h-4 text-[var(--text-sidebar-muted)] transition-transform ${showRoleMenu ? 'rotate-180' : ''}`} />
                            )}
                        </div>
                    </div>

                    <AnimatePresence>
                        {showRoleMenu && availableRoles.length > 1 && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="absolute top-full left-0 right-0 mt-2 bg-[var(--bg-sidebar-dark)] border border-[var(--border-sidebar)] rounded-xl overflow-hidden shadow-xl z-50 py-2"
                            >
                                <div className="px-4 py-2 border-b border-[var(--border-sidebar)] mb-2 flex items-center justify-between">
                                    <span className="text-[10px] font-black text-[var(--text-sidebar-muted)] uppercase tracking-widest">{t('layout.switchProfile')}</span>
                                </div>
                                        {availableRoles.map(r => (
                                            <button
                                                key={r}
                                                disabled={isSwitchingRole}
                                                onClick={() => handleSwitchRole(r)}
                                                className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between ${
                                                    r === role 
                                                        ? 'bg-primary/10 text-primary font-bold border-l-2 border-primary' 
                                                        : 'text-[var(--text-sidebar-muted)] hover:bg-white/5 hover:text-[var(--text-sidebar)] font-medium border-l-2 border-transparent'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span className="capitalize">{t(`roles.${r}`, { defaultValue: r })} {t('nav.dashboard')}</span>
                                                    {isSwitchingRole && r === role && <ButtonLoader className="w-3 h-3" />}
                                                </div>
                                                {r === role && <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>}
                                            </button>
                                        ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Navigation */}
                <nav className="no-scrollbar flex-1 overflow-y-auto py-4 px-3">
                    <ul className="space-y-1">
                        {menuItems.map((item) => item.type === 'section' ? (
                            <li key={item.id} className="pt-5 pb-2 px-4">
                                <div className="flex items-center gap-3">
                                    <span className="text-[9px] font-black uppercase tracking-[0.18em] text-primary whitespace-nowrap">
                                        {item.label}
                                    </span>
                                    <span className="h-px min-w-4 flex-1 bg-[#ff8a00]" />
                                </div>
                            </li>
                        ) : (
                            <li key={item.id}>
                                <NavLink
                                    to={item.path}
                                    state={item.state}
                                    onClick={() => setIsOpen(false)}
                                    className={() => {
                                        const isPathActive = location.pathname === item.path;
                                        const isStateActive = !item.state || location.state?.tab === item.state.tab;
                                        const isActive = isPathActive && isStateActive;

                                        return `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group ${isActive
                                            ? 'bg-[var(--bg-sidebar-light)] text-[var(--text-sidebar)] border-l-4 border-primary shadow-lg shadow-black/20'
                                            : 'text-[var(--text-sidebar-muted)] hover:text-[var(--text-sidebar)] hover:bg-[var(--bg-sidebar-light)]/50'
                                        }`;
                                    }}
                                >
                                    <item.icon className="w-5 h-5 flex-shrink-0" />
                                    <div className="font-medium flex-1 min-w-0">
                                        <span>{t(item.labelKey)}</span>
                                    </div>
                                    {item.counters && (item.counters.assigned > 0 || item.counters.submitted > 0) && (
                                        <div className="flex flex-none items-center gap-1.5">
                                            {item.counters.assigned > 0 && (
                                                <motion.span
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                    className="flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-black text-white shadow-lg shadow-emerald-500/20"
                                                    title="Assigned"
                                                >
                                                    {item.counters.assigned > 99 ? '99+' : item.counters.assigned}
                                                </motion.span>
                                            )}
                                            {item.counters.submitted > 0 && (
                                                <motion.span
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                    className="flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-500 px-1 text-[10px] font-black text-white shadow-lg shadow-blue-500/20"
                                                    title="Submitted"
                                                >
                                                    {item.counters.submitted > 99 ? '99+' : item.counters.submitted}
                                                </motion.span>
                                            )}
                                        </div>
                                    )}
                                    {item.id === 'assignments' && role !== 'student' && pendingCount > 0 && (
                                        <motion.span
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            className="bg-primary text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-lg shadow-primary/20"
                                        >
                                            {pendingCount}
                                        </motion.span>
                                    )}
                                    {/* Navigation count badge */}
                                    {!item.counters && item.badge > 0 && (
                                        <motion.span
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            className={`${item.id === 'fees' ? 'bg-emerald-500 shadow-emerald-500/20' : item.id === 'discussion-room' ? 'bg-red-500 shadow-red-500/20' : 'bg-primary shadow-primary/20'} text-white text-[10px] font-black min-w-5 h-5 px-1 rounded-full flex items-center justify-center shadow-lg`}
                                            title="Notifications"
                                        >
                                            {item.badge > 99 ? '99+' : item.badge}
                                        </motion.span>
                                    )}
                                    {item.secondaryBadge > 0 && (
                                        <motion.span
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            className="bg-primary text-white text-[10px] font-black min-w-5 h-5 px-1 rounded-full flex items-center justify-center shadow-lg shadow-primary/20"
                                            title="Awaiting Payment"
                                        >
                                            {item.secondaryBadge > 99 ? '99+' : item.secondaryBadge}
                                        </motion.span>
                                    )}
                                    {/* Badge for teacher pending (ungraded) submissions (red) */}
                                    {item.submissionBadge > 0 && (
                                        <motion.span
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            className="bg-red-500 text-white text-[10px] font-black min-w-5 h-5 px-1 rounded-full flex items-center justify-center shadow-lg shadow-red-500/20"
                                            title="Pending Submissions to Grade"
                                        >
                                            {item.submissionBadge > 99 ? '99+' : item.submissionBadge}
                                        </motion.span>
                                    )}
                                </NavLink>
                            </li>
                        ))}
                    </ul>
                </nav>

                {/* Bottom Section */}
                <div className="p-4 border-t border-[var(--border-sidebar)] space-y-3">
                    <SocialLinks className="px-1" />

                    <NavLink
                        to={`/${role}/settings`}
                        onClick={() => setIsOpen(false)}
                        className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${isActive
                            ? 'bg-[var(--bg-sidebar-light)] text-[var(--text-sidebar)] border-l-4 border-primary shadow-lg shadow-black/20'
                            : 'text-[var(--text-sidebar-muted)] hover:text-[var(--text-sidebar)] hover:bg-[var(--bg-sidebar-light)]/50'
                            }`}
                    >
                        <Settings className="w-5 h-5" />
                        <span className="font-medium">{t('layout.settings')}</span>
                    </NavLink>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400/80 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 mt-1"
                    >
                        <LogOut className="w-5 h-5" />
                        <span className="font-medium">{t('layout.logout')}</span>
                    </button>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;


