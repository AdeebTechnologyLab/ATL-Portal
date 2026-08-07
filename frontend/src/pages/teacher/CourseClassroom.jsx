import { useState } from 'react';
import { motion } from 'framer-motion';
import {
    BookOpen,
    Users,
    Bell,
    FileText,
    Plus,
    MoreHorizontal,
    Send,
    Paperclip,
    Calendar,
    Clock,
} from 'lucide-react';
import Badge from '../../components/ui/Badge';
import { formatDate } from '../../utils/dateFormatter';

const CourseClassroom = () => {
    const [activeTab, setActiveTab] = useState('announcements');
    const [newAnnouncement, setNewAnnouncement] = useState('');

    const course = {
        id: 1,
        title: 'Web Development Bootcamp',
        students: 45,
        assignments: 12,
    };

    const tabs = [
        { id: 'announcements', label: 'Announcements', icon: Bell },
        { id: 'assignments', label: 'Assignments', icon: FileText },
        { id: 'students', label: 'Students', icon: Users },
    ];

    const announcements = [
        {
            id: 1,
            content: 'Welcome to the Web Development Bootcamp! Please make sure to complete the pre-course setup by installing Node.js and VS Code.',
            createdAt: '2026-01-12T10:00:00',
            attachments: [],
        },
        {
            id: 2,
            content: 'Assignment 3 has been posted. Deadline is January 20th. Please review the requirements carefully.',
            createdAt: '2026-01-11T14:30:00',
            attachments: ['assignment_3.pdf'],
        },
    ];

    const assignments = [
        {
            id: 1,
            title: 'Build a Portfolio Website',
            description: 'Create a personal portfolio website using HTML, CSS, and JavaScript',
            deadline: '2026-01-20T23:59:00',
            submissions: 32,
            totalStudents: 45,
        },
        {
            id: 2,
            title: 'React Components Practice',
            description: 'Build 5 reusable React components with proper props handling',
            deadline: '2026-01-25T23:59:00',
            submissions: 15,
            totalStudents: 45,
        },
        {
            id: 3,
            title: 'API Integration Project',
            description: 'Integrate a public API and display data in your React app',
            deadline: '2026-01-30T23:59:00',
            submissions: 5,
            totalStudents: 45,
        },
    ];

    const students = [
        { id: 1, name: 'Ahmed Khan', email: 'ahmed@student.edu', submitted: 10, pending: 2, grade: 'A' },
        { id: 2, name: 'Sara Ali', email: 'sara@student.edu', submitted: 11, pending: 1, grade: 'A+' },
        { id: 3, name: 'Usman Malik', email: 'usman@student.edu', submitted: 9, pending: 3, grade: 'B+' },
        { id: 4, name: 'Fatima Zahra', email: 'fatima@student.edu', submitted: 12, pending: 0, grade: 'A' },
        { id: 5, name: 'Ali Raza', email: 'ali@student.edu', submitted: 8, pending: 4, grade: 'B' },
    ];


    const handlePostAnnouncement = () => {
        if (!newAnnouncement.trim()) return;
        console.log('Posting:', newAnnouncement);
        setNewAnnouncement('');
    };

    return (
        <div className="space-y-6">
            {/* Course Header */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-primary-darkest to-primary-dark rounded-2xl p-4 sm:p-6 text-white"
            >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold mb-2">{course.title}</h1>
                        <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-white/70 text-sm">
                            <span className="flex items-center gap-1">
                                <Users className="w-4 h-4" /> {course.students} students
                            </span>
                            <span className="flex items-center gap-1">
                                <FileText className="w-4 h-4" /> {course.assignments} assignments
                            </span>
                        </div>
                    </div>
                    <button className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all border border-white/20 text-sm whitespace-nowrap self-start">
                        Course Settings
                    </button>
                </div>
            </motion.div>

            {/* Tabs */}
            <div className="flex items-center gap-1 sm:gap-2 bg-white rounded-xl p-1 border border-gray-100 overflow-x-auto">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 min-w-0 flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 sm:py-3 px-2 sm:px-4 rounded-lg font-medium transition-all text-xs sm:text-sm whitespace-nowrap ${activeTab === tab.id
                                ? 'bg-primary text-white'
                                : 'text-gray-500 hover:bg-gray-100'
                            }`}
                    >
                        <tab.icon className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                        <span className="truncate">{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
            >
                {activeTab === 'announcements' && (
                    <div className="space-y-4">
                        {/* Post Announcement */}
                        <div className="bg-white rounded-2xl p-4 sm:p-6 border border-gray-100">
                            <h3 className="font-semibold text-gray-900 mb-4">Post Announcement</h3>
                            <div className="space-y-4">
                                <textarea
                                    value={newAnnouncement}
                                    onChange={(e) => setNewAnnouncement(e.target.value)}
                                    placeholder="Write an announcement for your students..."
                                    rows={4}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none text-sm"
                                />
                                <div className="flex items-center justify-between">
                                    <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                                        <Paperclip className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={handlePostAnnouncement}
                                        className="px-4 sm:px-5 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl font-medium transition-all flex items-center gap-2 text-sm"
                                    >
                                        <Send className="w-4 h-4" />
                                        Post
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Announcements List */}
                        {announcements.map((announcement, index) => (
                            <motion.div
                                key={announcement.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className="bg-white rounded-2xl p-4 sm:p-6 border border-gray-100"
                            >
                                <div className="flex items-start gap-3 sm:gap-4">
                                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-primary to-primary flex items-center justify-center text-white font-medium shrink-0">
                                        T
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                                            <span className="font-medium text-gray-900 text-sm">Teacher</span>
                                            <span className="text-sm text-gray-400">•</span>
                                            <span className="text-xs sm:text-sm text-gray-500">{formatDate(announcement.createdAt)}</span>
                                        </div>
                                        <p className="text-gray-700 text-sm">{announcement.content}</p>
                                        {announcement.attachments.length > 0 && (
                                            <div className="mt-3 flex items-center gap-2 flex-wrap">
                                                {announcement.attachments.map((file) => (
                                                    <button
                                                        key={file}
                                                        className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs sm:text-sm text-gray-600 transition-colors"
                                                    >
                                                        <Paperclip className="w-4 h-4" />
                                                        {file}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}

                {activeTab === 'assignments' && (
                    <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <h3 className="font-semibold text-gray-900">All Assignments</h3>
                            <button className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-xl font-medium transition-all flex items-center gap-2 text-sm self-start">
                                <Plus className="w-4 h-4" />
                                Create Assignment
                            </button>
                        </div>

                        {assignments.map((assignment, index) => (
                            <motion.div
                                key={assignment.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className="bg-white rounded-2xl p-4 sm:p-6 border border-gray-100 hover:shadow-lg transition-all cursor-pointer"
                            >
                                <div className="flex items-start justify-between mb-4 gap-3">
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-semibold text-gray-900 mb-1 text-sm sm:text-base">{assignment.title}</h4>
                                        <p className="text-xs sm:text-sm text-gray-500 line-clamp-2">{assignment.description}</p>
                                    </div>
                                    <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors shrink-0">
                                        <MoreHorizontal className="w-5 h-5 text-gray-400" />
                                    </button>
                                </div>

                                <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-4 border-t border-gray-100 gap-3">
                                    <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm">
                                        <span className="flex items-center gap-1.5 text-gray-500">
                                            <Calendar className="w-4 h-4" />
                                            Due: {formatDate(assignment.deadline)}
                                        </span>
                                        <span className="flex items-center gap-1.5 text-gray-500">
                                            <FileText className="w-4 h-4" />
                                            {assignment.submissions}/{assignment.totalStudents} submitted
                                        </span>
                                    </div>
                                    <button className="px-4 py-2 text-primary hover:bg-primary/5 rounded-lg font-medium transition-colors text-sm self-start">
                                        View Submissions
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}

                {activeTab === 'students' && (
                    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                        {/* Desktop Table */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-100">
                                        <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase">Student</th>
                                        <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase">Submitted</th>
                                        <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase">Pending</th>
                                        <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase">Grade</th>
                                        <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {students.map((student, index) => (
                                        <motion.tr
                                            key={student.id}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: index * 0.05 }}
                                            className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                                        >
                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary flex items-center justify-center text-white font-medium">
                                                        {student.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-gray-900">{student.name}</p>
                                                        <p className="text-sm text-gray-500">{student.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <Badge variant="success">{student.submitted}</Badge>
                                            </td>
                                            <td className="py-4 px-6">
                                                <Badge variant={student.pending > 0 ? 'warning' : 'success'}>{student.pending}</Badge>
                                            </td>
                                            <td className="py-4 px-6">
                                                <span className="font-semibold text-gray-900">{student.grade}</span>
                                            </td>
                                            <td className="py-4 px-6">
                                                <button className="px-4 py-2 text-primary hover:bg-primary/5 rounded-lg font-medium transition-colors">
                                                    View Details
                                                </button>
                                            </td>
                                        </motion.tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Card View */}
                        <div className="md:hidden divide-y divide-gray-50">
                            {students.map((student, index) => (
                                <motion.div
                                    key={student.id}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: index * 0.05 }}
                                    className="p-4 hover:bg-gray-50 transition-colors"
                                >
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary flex items-center justify-center text-white font-medium shrink-0">
                                            {student.name.charAt(0)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-gray-900 text-sm">{student.name}</p>
                                            <p className="text-xs text-gray-500 truncate">{student.email}</p>
                                        </div>
                                        <span className="font-semibold text-gray-900 text-sm">{student.grade}</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-2 ml-13">
                                        <div className="flex items-center gap-2">
                                            <Badge variant="success">{student.submitted} submitted</Badge>
                                            <Badge variant={student.pending > 0 ? 'warning' : 'success'}>{student.pending} pending</Badge>
                                        </div>
                                        <button className="px-3 py-1.5 text-primary hover:bg-primary/5 rounded-lg font-medium transition-colors text-xs">
                                            View
                                        </button>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                )}
            </motion.div>
        </div>
    );
};

export default CourseClassroom;



