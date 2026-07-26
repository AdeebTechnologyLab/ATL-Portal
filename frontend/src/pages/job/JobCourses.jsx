import { useState } from 'react';
import { motion } from 'framer-motion';
import {
    BookOpen, Users, Calendar, ArrowRight, ChevronLeft,
    FileText, ClipboardList, CheckCircle, Clock, Upload, Award, Star
} from 'lucide-react';
import Badge from '../../components/ui/Badge';

const JobCourses = () => {
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [activeTab, setActiveTab] = useState('assignments');
    const [selectedAssignment, setSelectedAssignment] = useState(null);

    // Mock courses assigned to this jober (for intern management)
    const myCourses = [
        {
            id: 1,
            name: 'Mobile App Development',
            internCount: 15,
            startDate: '2024-03-01',
            endDate: '2024-06-01',
            status: 'active'
        },
        {
            id: 2,
            name: 'Data Analytics Program',
            internCount: 12,
            startDate: '2024-02-15',
            endDate: '2024-05-15',
            status: 'active'
        },
    ];

    // Mock interns for selected course
    const courseInterns = {
        1: [
            { id: 1, name: 'Ali Hassan', rollNo: 'INT-001', email: 'ali@email.com' },
            { id: 2, name: 'Sara Khan', rollNo: 'INT-002', email: 'sara@email.com' },
            { id: 3, name: 'Usman Malik', rollNo: 'INT-003', email: 'usman@email.com' },
            { id: 4, name: 'Fatima Ahmed', rollNo: 'INT-004', email: 'fatima@email.com' },
        ],
        2: [
            { id: 5, name: 'Bilal Raza', rollNo: 'INT-005', email: 'bilal@email.com' },
            { id: 6, name: 'Ayesha Siddiqui', rollNo: 'INT-006', email: 'ayesha@email.com' },
        ]
    };

    // Mock assignments
    const [assignments, setAssignments] = useState({
        1: [
            {
                id: 1,
                title: 'Build a ToDo App',
                description: 'Create a basic todo app with React Native',
                dueDate: '2024-03-15',
                totalMarks: 100,
                submissions: [
                    { internId: 1, submittedAt: '2024-03-14', fileUrl: 'file1.pdf', marks: 85 },
                    { internId: 2, submittedAt: '2024-03-15', fileUrl: 'file2.pdf', marks: null },
                ]
            },
            {
                id: 2,
                title: 'API Integration',
                description: 'Integrate REST API with the app',
                dueDate: '2024-03-25',
                totalMarks: 100,
                submissions: []
            }
        ],
        2: []
    });

    // Mock daily work
    const [dailyWork, setDailyWork] = useState({
        1: [
            { id: 1, date: '2024-03-14', internId: 1, description: 'Worked on UI design', totalMarks: 10, obtainedMarks: 8 },
            { id: 2, date: '2024-03-14', internId: 2, description: 'Completed login screen', totalMarks: 10, obtainedMarks: 9 },
        ],
        2: []
    });

    const [newAssignment, setNewAssignment] = useState({
        title: '',
        description: '',
        dueDate: '',
        totalMarks: 100,
        assignTo: 'all', // 'all' or 'selected'
        selectedInterns: []
    });
    const [showNewAssignment, setShowNewAssignment] = useState(false);

    const toggleInternSelection = (internId) => {
        setNewAssignment(prev => ({
            ...prev,
            selectedInterns: prev.selectedInterns.includes(internId)
                ? prev.selectedInterns.filter(id => id !== internId)
                : [...prev.selectedInterns, internId]
        }));
    };

    const handleCreateAssignment = () => {
        if (!newAssignment.title || !newAssignment.dueDate) return;
        if (newAssignment.assignTo === 'selected' && newAssignment.selectedInterns.length === 0) {
            alert('Please select at least one intern');
            return;
        }

        const assignment = {
            id: Date.now(),
            title: newAssignment.title,
            description: newAssignment.description,
            dueDate: newAssignment.dueDate,
            totalMarks: parseInt(newAssignment.totalMarks),
            assignTo: newAssignment.assignTo,
            assignedInterns: newAssignment.assignTo === 'all'
                ? (courseInterns[selectedCourse.id] || []).map(i => i.id)
                : newAssignment.selectedInterns,
            submissions: []
        };

        setAssignments(prev => ({
            ...prev,
            [selectedCourse.id]: [...(prev[selectedCourse.id] || []), assignment]
        }));

        setNewAssignment({
            title: '',
            description: '',
            dueDate: '',
            totalMarks: 100,
            assignTo: 'all',
            selectedInterns: []
        });
        setShowNewAssignment(false);
    };

    const handleMarkAssignment = (assignmentId, internId, marks) => {
        setAssignments(prev => ({
            ...prev,
            [selectedCourse.id]: prev[selectedCourse.id].map(a =>
                a.id === assignmentId
                    ? {
                        ...a,
                        submissions: a.submissions.map(s =>
                            s.internId === internId ? { ...s, marks: parseInt(marks) } : s
                        )
                    }
                    : a
            )
        }));
    };

    const handleMarkDailyWork = (workId, totalMarks, obtainedMarks) => {
        setDailyWork(prev => ({
            ...prev,
            [selectedCourse.id]: prev[selectedCourse.id].map(w =>
                w.id === workId
                    ? { ...w, totalMarks: parseInt(totalMarks), obtainedMarks: parseInt(obtainedMarks) }
                    : w
            )
        }));
    };

    if (!selectedCourse) {
        // Course Selection
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">My Courses</h1>
                    <p className="text-gray-500">Select a course to manage assignments and daily work</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {myCourses.map((course, index) => (
                        <motion.div
                            key={course.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            onClick={() => setSelectedCourse(course)}
                            className="bg-white rounded-2xl p-6 border border-gray-100 cursor-pointer hover:shadow-lg hover:border-purple-200 transition-all"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="w-14 h-14 bg-gradient-to-br from-purple-400 to-pink-500 rounded-xl flex items-center justify-center">
                                    <BookOpen className="w-7 h-7 text-white" />
                                </div>
                                <Badge variant={course.status === 'active' ? 'success' : 'warning'}>
                                    {course.status}
                                </Badge>
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">{course.title || course.name}</h3>
                            <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                                <span className="flex items-center gap-1">
                                    <Users className="w-4 h-4" />
                                    {course.internCount} Interns
                                </span>
                                <span className="flex items-center gap-1">
                                    <Calendar className="w-4 h-4" />
                                    {new Date(course.startDate).toLocaleDateString()}
                                </span>
                            </div>
                            <div className="flex items-center text-primary font-medium">
                                <span>Manage Course</span>
                                <ArrowRight className="w-4 h-4 ml-2" />
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        );
    }

    const interns = courseInterns[selectedCourse.id] || [];
    const courseAssignments = assignments[selectedCourse.id] || [];
    const courseDailyWork = dailyWork[selectedCourse.id] || [];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <button
                        onClick={() => { setSelectedCourse(null); setSelectedAssignment(null); }}
                        className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-2"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        Back to Courses
                    </button>
                    <h1 className="text-2xl font-bold text-gray-900">{selectedCourse.name}</h1>
                    <p className="text-gray-500">{interns.length} interns enrolled</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 bg-gray-100 p-1 rounded-xl w-fit">
                <button
                    onClick={() => { setActiveTab('assignments'); setSelectedAssignment(null); }}
                    className={`px-6 py-2.5 rounded-lg font-medium transition-all ${activeTab === 'assignments'
                        ? 'bg-white text-primary shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                        }`}
                >
                    <ClipboardList className="w-4 h-4 inline mr-2" />
                    Assignments
                </button>
                <button
                    onClick={() => { setActiveTab('dailywork'); setSelectedAssignment(null); }}
                    className={`px-6 py-2.5 rounded-lg font-medium transition-all ${activeTab === 'dailywork'
                        ? 'bg-white text-primary shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                        }`}
                >
                    <FileText className="w-4 h-4 inline mr-2" />
                    Daily Work
                </button>
            </div>

            {/* Assignments Tab */}
            {activeTab === 'assignments' && !selectedAssignment && (
                <div className="space-y-4">
                    <div className="flex justify-end">
                        <button
                            onClick={() => setShowNewAssignment(true)}
                            className="px-5 py-2.5 bg-primary hover:bg-purple-700 text-white rounded-xl font-medium flex items-center gap-2"
                        >
                            <ClipboardList className="w-4 h-4" />
                            Create Assignment
                        </button>
                    </div>

                    {/* New Assignment Form */}
                    {showNewAssignment && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white rounded-2xl p-6 border border-gray-100"
                        >
                            <h3 className="font-semibold text-gray-900 mb-4">New Assignment</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <input
                                    type="text"
                                    placeholder="Assignment Title"
                                    value={newAssignment.title}
                                    onChange={(e) => setNewAssignment({ ...newAssignment, title: e.target.value })}
                                    className="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                />
                                <input
                                    type="date"
                                    value={newAssignment.dueDate}
                                    onChange={(e) => setNewAssignment({ ...newAssignment, dueDate: e.target.value })}
                                    className="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                />
                                <textarea
                                    placeholder="Description"
                                    value={newAssignment.description}
                                    onChange={(e) => setNewAssignment({ ...newAssignment, description: e.target.value })}
                                    className="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary md:col-span-2"
                                    rows={2}
                                />
                                <input
                                    type="number"
                                    placeholder="Total Marks"
                                    value={newAssignment.totalMarks}
                                    onChange={(e) => setNewAssignment({ ...newAssignment, totalMarks: e.target.value })}
                                    className="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                />
                            </div>

                            {/* Assign To Selection */}
                            <div className="mt-4">
                                <label className="block text-sm font-medium text-gray-700 mb-3">Assign To</label>
                                <div className="flex gap-4 mb-3">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="assignTo"
                                            value="all"
                                            checked={newAssignment.assignTo === 'all'}
                                            onChange={() => setNewAssignment({ ...newAssignment, assignTo: 'all', selectedInterns: [] })}
                                            className="w-4 h-4 text-primary"
                                        />
                                        <span className="text-gray-700">All Interns ({interns.length})</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="assignTo"
                                            value="selected"
                                            checked={newAssignment.assignTo === 'selected'}
                                            onChange={() => setNewAssignment({ ...newAssignment, assignTo: 'selected' })}
                                            className="w-4 h-4 text-primary"
                                        />
                                        <span className="text-gray-700">Selected Interns</span>
                                    </label>
                                </div>

                                {/* Intern Selection Grid */}
                                {newAssignment.assignTo === 'selected' && (
                                    <div className="bg-gray-50 rounded-xl p-4 max-h-48 overflow-y-auto">
                                        <div className="grid grid-cols-2 gap-2">
                                            {interns.map((intern) => (
                                                <label
                                                    key={intern.id}
                                                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${newAssignment.selectedInterns.includes(intern.id)
                                                            ? 'bg-primary/10 border-2 border-purple-400'
                                                            : 'bg-white border border-gray-200 hover:border-purple-200'
                                                        }`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={newAssignment.selectedInterns.includes(intern.id)}
                                                        onChange={() => toggleInternSelection(intern.id)}
                                                        className="w-4 h-4 text-primary rounded"
                                                    />
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-900">{intern.name}</p>
                                                        <p className="text-xs text-gray-500">{intern.rollNo}</p>
                                                    </div>
                                                </label>
                                            ))}
                                        </div>
                                        {newAssignment.selectedInterns.length > 0 && (
                                            <p className="text-xs text-primary mt-2">
                                                {newAssignment.selectedInterns.length} intern(s) selected
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-3 mt-4">
                                <button
                                    onClick={() => setShowNewAssignment(false)}
                                    className="px-5 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCreateAssignment}
                                    className="px-5 py-2.5 bg-primary hover:bg-purple-700 text-white rounded-xl font-medium"
                                >
                                    Create
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* Assignments List */}
                    <div className="grid gap-4">
                        {courseAssignments.map((assignment) => (
                            <motion.div
                                key={assignment.id}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                onClick={() => setSelectedAssignment(assignment)}
                                className="bg-white rounded-2xl p-6 border border-gray-100 cursor-pointer hover:shadow-lg hover:border-purple-200 transition-all"
                            >
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h3 className="font-semibold text-gray-900 mb-1">{assignment.title}</h3>
                                        <p className="text-sm text-gray-500 mb-2">{assignment.description}</p>
                                        <div className="flex gap-4 text-sm">
                                            <span className="flex items-center gap-1 text-gray-500">
                                                <Calendar className="w-4 h-4" />
                                                Due: {new Date(assignment.dueDate).toLocaleDateString()}
                                            </span>
                                            <span className="flex items-center gap-1 text-gray-500">
                                                <Award className="w-4 h-4" />
                                                {assignment.totalMarks} marks
                                            </span>
                                        </div>
                                    </div>
                                    <Badge variant="info">
                                        {assignment.submissions.length} submissions
                                    </Badge>
                                </div>
                            </motion.div>
                        ))}

                        {courseAssignments.length === 0 && (
                            <div className="text-center py-12 text-gray-500">
                                No assignments yet. Create one to get started.
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Assignment Detail - Grade Submissions */}
            {activeTab === 'assignments' && selectedAssignment && (
                <div className="space-y-4">
                    <button
                        onClick={() => setSelectedAssignment(null)}
                        className="flex items-center gap-2 text-gray-500 hover:text-gray-700"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        Back to Assignments
                    </button>

                    <div className="bg-white rounded-2xl p-6 border border-gray-100">
                        <h2 className="text-xl font-semibold text-gray-900 mb-2">{selectedAssignment.title}</h2>
                        <p className="text-gray-500 mb-4">{selectedAssignment.description}</p>
                        <div className="flex gap-4 text-sm text-gray-500 mb-6">
                            <span>Due: {new Date(selectedAssignment.dueDate).toLocaleDateString()}</span>
                            <span>Total Marks: {selectedAssignment.totalMarks}</span>
                        </div>

                        <h3 className="font-semibold text-gray-900 mb-4">Submissions & Grading</h3>
                        <div className="space-y-3">
                            {interns.map((intern) => {
                                const submission = selectedAssignment.submissions.find(s => s.internId === intern.id);
                                return (
                                    <div key={intern.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                                                {intern.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-900">{intern.name}</p>
                                                <p className="text-sm text-gray-500">{intern.rollNo}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            {submission ? (
                                                <>
                                                    <Badge variant="success">
                                                        <CheckCircle className="w-3 h-3 mr-1" />
                                                        Submitted
                                                    </Badge>
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            max={selectedAssignment.totalMarks}
                                                            value={submission.marks || ''}
                                                            onChange={(e) => handleMarkAssignment(selectedAssignment.id, intern.id, e.target.value)}
                                                            placeholder="Marks"
                                                            className="w-20 px-3 py-2 border border-gray-200 rounded-lg text-center"
                                                        />
                                                        <span className="text-gray-500">/ {selectedAssignment.totalMarks}</span>
                                                    </div>
                                                </>
                                            ) : (
                                                <Badge variant="warning">
                                                    <Clock className="w-3 h-3 mr-1" />
                                                    Pending
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Daily Work Tab */}
            {activeTab === 'dailywork' && (
                <div className="bg-white rounded-2xl p-6 border border-gray-100">
                    <h2 className="text-xl font-semibold text-gray-900 mb-6">Daily Work Submissions</h2>

                    <div className="space-y-4">
                        {interns.map((intern) => {
                            const internWork = courseDailyWork.filter(w => w.internId === intern.id);
                            return (
                                <div key={intern.id} className="border border-gray-100 rounded-xl p-4">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                                            {intern.name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900">{intern.name}</p>
                                            <p className="text-sm text-gray-500">{intern.rollNo}</p>
                                        </div>
                                    </div>

                                    {internWork.length > 0 ? (
                                        <div className="space-y-2">
                                            {internWork.map((work) => (
                                                <div key={work.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-700">{work.description}</p>
                                                        <p className="text-xs text-gray-400">{new Date(work.date).toLocaleDateString()}</p>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            value={work.obtainedMarks}
                                                            onChange={(e) => handleMarkDailyWork(work.id, work.totalMarks, e.target.value)}
                                                            className="w-16 px-2 py-1 border border-gray-200 rounded text-center text-sm"
                                                        />
                                                        <span className="text-gray-400">/</span>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            value={work.totalMarks}
                                                            onChange={(e) => handleMarkDailyWork(work.id, e.target.value, work.obtainedMarks)}
                                                            className="w-16 px-2 py-1 border border-gray-200 rounded text-center text-sm"
                                                        />
                                                        <Star className="w-4 h-4 text-amber-500" />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-gray-400 italic">No daily work submitted yet</p>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default JobCourses;



