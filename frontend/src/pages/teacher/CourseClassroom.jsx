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
                className="bg-gradient-to-r from-primary-darkest to-primary-dark rounded-2xl p-6 text-white"
            >
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-2xl font-bold mb-2">{course.title}</h1>
                        <div className="flex items-center gap-4 text-white/70">
                            <span className="flex items-center gap-1">
                                <Users className="w-4 h-4" /> {course.students} students
                            </span>
                            <span className="flex items-center gap-1">
                                <FileText className="w-4 h-4" /> {course.assignments} assignments
                            </span>
                        </div>
                    </div>
                    <button className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all border border-white/20">
                        Course Settings
                    </button>
                </div>
            </motion.div>

            {/* Tabs */}
            <div className="flex items-center gap-2 bg-white rounded-xl p-1 border border-gray-100">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-all ${activeTab === tab.id
                                ? 'bg-primary text-white'
                                : 'text-gray-500 hover:bg-gray-100'
                            }`}
                    >
                        <tab.icon className="w-5 h-5" />
                        {tab.label}
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
                        <div className="bg-white rounded-2xl p-6 border border-gray-100">
                            <h3 className="font-semibold text-gray-900 mb-4">Post Announcement</h3>
                            <div className="space-y-4">
                                <textarea
                                    value={newAnnouncement}
                                    onChange={(e) => setNewAnnouncement(e.target.value)}
                                    placeholder="Write an announcement for your students..."
                                    rows={4}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                                />
                                <div className="flex items-center justify-between">
                                    <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                                        <Paperclip className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={handlePostAnnouncement}
                                        className="px-5 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl font-medium transition-all flex items-center gap-2"
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
                                className="bg-white rounded-2xl p-6 border border-gray-100"
                            >
                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary flex items-center justify-center text-white font-medium">
                                        T
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="font-medium text-gray-900">Teacher</span>
                                            <span className="text-sm text-gray-400">•</span>
                                            <span className="text-sm text-gray-500">{formatDate(announcement.createdAt)}</span>
                                        </div>
                                        <p className="text-gray-700">{announcement.content}</p>
                                        {announcement.attachments.length > 0 && (
                                            <div className="mt-3 flex items-center gap-2">
                                                {announcement.attachments.map((file) => (
                                                    <button
                                                        key={file}
                                                        className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-600 transition-colors"
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
                        <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-gray-900">All Assignments</h3>
                            <button className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-xl font-medium transition-all flex items-center gap-2">
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
                                className="bg-white rounded-2xl p-6 border border-gray-100 hover:shadow-lg transition-all cursor-pointer"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <h4 className="font-semibold text-gray-900 mb-1">{assignment.title}</h4>
                                        <p className="text-sm text-gray-500">{assignment.description}</p>
                                    </div>
                                    <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                                        <MoreHorizontal className="w-5 h-5 text-gray-400" />
                                    </button>
                                </div>

                                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                                    <div className="flex items-center gap-4">
                                        <span className="flex items-center gap-1.5 text-sm text-gray-500">
                                            <Calendar className="w-4 h-4" />
                                            Due: {formatDate(assignment.deadline)}
                                        </span>
                                        <span className="flex items-center gap-1.5 text-sm text-gray-500">
                                            <FileText className="w-4 h-4" />
                                            {assignment.submissions}/{assignment.totalStudents} submitted
                                        </span>
                                    </div>
                                    <button className="px-4 py-2 text-primary hover:bg-primary/5 rounded-lg font-medium transition-colors">
                                        View Submissions
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}

                {activeTab === 'students' && (
                    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
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
                )}
            </motion.div>
        </div>
    );
};

export default CourseClassroom;



