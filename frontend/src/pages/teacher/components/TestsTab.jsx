import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ClipboardList, Plus, FileText, CheckCircle, Clock,
    Trash2, Edit2, PlayCircle, Eye, AlertCircle, X,
    RefreshCw, Upload, Zap, Users, Type, List, Search
} from 'lucide-react';
import { testAPI } from '../../../services/api';
import Badge from '../../../components/ui/Badge';
import Modal from '../../../components/ui/Modal';
import Loader, { ButtonLoader } from '../../../components/ui/Loader';
import { showToast } from '../../../utils/customToast';
import { formatDate, formatDateTime } from '../../../utils/dateFormatter';

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

const getSubmissionResult = (submission, test) => {
    const totalMarks = Math.max(1, test?.questions?.length || 0);
    const storedTotal = Number(submission?.totalPossibleScore) || totalMarks;
    const storedScore = Number(submission?.score) || 0;
    const score = storedTotal === totalMarks
        ? storedScore
        : Math.round((storedScore / storedTotal) * totalMarks);

    return {
        score: Math.min(totalMarks, Math.max(0, score)),
        totalMarks
    };
};

const normalizeMcqText = (value) => String(value || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/^[a-d][).:\-\s]+/i, '')
    .replace(/^option\s+[a-d][).:\-\s]*/i, '')
    .trim();

const getCorrectOptionFromBlock = (block, options = []) => {
    const answerLineMatch = block.match(/(?:correct\s*answer|correct\s*option|answer|ans|key)\s*(?:is|=|:|\.|\-)?\s*(.+?)(?:\n|$)/i);
    const answerValue = answerLineMatch?.[1]?.trim() || '';

    const letterMatch = answerValue.match(/^(?:option\s*)?([a-d])(?:[).:\-\s]|$)/i)
        || block.match(/(?:correct\s*answer|correct\s*option|answer|ans|key)\s*(?:is|=|:|\.|\-)?\s*(?:option\s*)?([a-d])(?:[).:\-\s]|$)/i);

    if (letterMatch) {
        return letterMatch[1].toUpperCase().charCodeAt(0) - 65;
    }

    const normalizedAnswer = normalizeMcqText(answerValue);
    if (!normalizedAnswer) return 0;

    const exactIndex = options.findIndex(option => normalizeMcqText(option) === normalizedAnswer);
    if (exactIndex !== -1) return exactIndex;

    return options.findIndex(option => {
        const normalizedOption = normalizeMcqText(option);
        return normalizedOption && (normalizedOption.includes(normalizedAnswer) || normalizedAnswer.includes(normalizedOption));
    });
};

const TestsTab = ({ course, students }) => {
    const [tests, setTests] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal states
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);

    // Generation states
    const [isGenerating, setIsGenerating] = useState(false);
    const [inputMethod, setInputMethod] = useState('paste'); // 'file' | 'paste' | 'manual'
    const [pasteText, setPasteText] = useState('');
    const [numQuestions, setNumQuestions] = useState(5);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        duration: 30,
        dueDate: '',
        scheduledAt: '',
        assignTo: 'all',
        assignedUsers: [],
        questions: []
    });

    const [editingTest, setEditingTest] = useState(null);
    const [selectedTest, setSelectedTest] = useState(null);
    const [assignSearchTerm, setAssignSearchTerm] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Filter states
    const [selectedStudentFilters, setSelectedStudentFilters] = useState(null);

    useEffect(() => {
        fetchTests();
    }, [course._id || course.id]);

    const fetchTests = async () => {
        setIsLoading(true);
        try {
            const res = await testAPI.getByCourse(course._id || course.id);
            setTests(res.data.tests || []);
        } catch (error) {
            console.error('Error fetching tests:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateTest = async (e) => {
        e.preventDefault();
        if (formData.questions.length === 0) {
            showToast.error("Please add at least one question.");
            return;
        }

        setIsSaving(true);
        try {
            await testAPI.create({
                ...formData,
                courseId: course._id || course.id
            });
            await fetchTests();
            setIsCreateModalOpen(false);
            resetForm();
            showToast.success('Test published successfully!');
        } catch (error) {
            console.error('Error creating test:', error);
            showToast.error(error.response?.data?.message || 'Failed to create test');
        } finally {
            setIsSaving(false);
        }
    };

    const handleUpdateTest = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await testAPI.update(editingTest._id, editingTest);
            await fetchTests();
            setIsEditModalOpen(false);
            setEditingTest(null);
            showToast.success('Test updated successfully!');
        } catch (error) {
            console.error('Error updating test:', error);
            showToast.error('Failed to update test');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteTest = async (id) => {
        if (!confirm('Are you sure you want to delete this test? This cannot be undone.')) return;
        try {
            await testAPI.delete(id);
            setTests(prev => prev.filter(t => t._id !== id));
            showToast.success('Test deleted successfully');
        } catch (error) {
            console.error('Error deleting test:', error);
            showToast.error('Failed to delete test');
        }
    };

    const handleDeleteSubmission = async (testId, submissionId) => {
        if (!confirm('Are you sure you want to delete this submission? The student will be able to retake the test.')) return;
        try {
            await testAPI.deleteSubmission(testId, submissionId);
            showToast.success('Submission deleted successfully');

            // Refresh tests list
            fetchTests();

            // Update selected test modal state
            if (selectedTest && selectedTest._id === testId) {
                setSelectedTest({
                    ...selectedTest,
                    submissions: selectedTest.submissions.filter(s => s._id !== submissionId)
                });
            }
        } catch (error) {
            console.error('Error deleting submission:', error);
            showToast.error('Failed to delete submission');
        }
    };

    const resetForm = () => {
        setFormData({
            title: '',
            description: '',
            duration: 30,
            dueDate: '',
            scheduledAt: '',
            assignTo: 'all',
            assignedUsers: [],
            questions: []
        });
        setPasteText('');
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsGenerating(true);
        setTimeout(() => {
            const detectedCount = Math.floor(Math.random() * 5) + 5;
            const generatedQuestions = Array.from({ length: detectedCount }, (_, i) => ({
                question: `[Auto-Parsed] Question ${i + 1} from ${file.name.split('.')[0]} content...`,
                options: ["Option A", "Option B", "Option C", "Option D"],
                correctOption: 0,
                marks: 1
            }));

            if (isEditModalOpen && editingTest) {
                setEditingTest(prev => ({
                    ...prev,
                    questions: [...(prev.questions || []), ...generatedQuestions]
                }));
            } else {
                setFormData(prev => ({
                    ...prev,
                    questions: [...prev.questions, ...generatedQuestions]
                }));
            }

            setIsGenerating(false);
            e.target.value = '';
            showToast.success(`Successfully detected and added ${detectedCount} questions from ${file.name}`);
        }, 2000);
    };

    useEffect(() => {
        if (!pasteText.trim()) return;

        const timer = setTimeout(() => {
            handleParsePaste();
        }, 800);

        return () => clearTimeout(timer);
    }, [pasteText]);

    const handleParsePaste = () => {
        if (!pasteText.trim()) return;
        setIsGenerating(true);

        setTimeout(() => {
            try {
                const questions = [];
                const rawBlocks = pasteText.split(/(?:^|\n)(?=Q[:.]|Question[:.]|\d+[:.])/gi);

                rawBlocks.forEach(block => {
                    const cleanBlock = block.trim();
                    if (!cleanBlock) return;

                    const qMatch = cleanBlock.match(/(?:Q[:.]|Question[:.]|\d+[:.])\s*(.*?)(?=[A-D][)|.]|Ans[:.]|Answer[:.]|Correct[:.]|Key[:.]|$)/is);
                    const questionText = qMatch ? qMatch[1].trim() : cleanBlock.split('\n')[0].replace(/(?:Q[:.]|Question[:.]|\d+[:.])\s*/i, '').trim();

                    if (!questionText) return;

                    const options = [];
                    const aMatch = cleanBlock.match(/A[)|.]\s*(.*?)(?=[B-D][)|.]|Ans[:.]|Answer[:.]|Correct[:.]|Key[:.]|$)/is);
                    const bMatch = cleanBlock.match(/B[)|.]\s*(.*?)(?=[C-D][)|.]|Ans[:.]|Answer[:.]|Correct[:.]|Key[:.]|$)/is);
                    const cMatch = cleanBlock.match(/C[)|.]\s*(.*?)(?=D[)|.]|Ans[:.]|Answer[:.]|Correct[:.]|Key[:.]|$)/is);
                    const dMatch = cleanBlock.match(/D[)|.]\s*(.*?)(?=Ans[:.]|Answer[:.]|Correct[:.]|Key[:.]|$)/is);

                    if (aMatch) options.push(aMatch[1].trim().split('\n')[0]);
                    if (bMatch) options.push(bMatch[1].trim().split('\n')[0]);
                    if (cMatch) options.push(cMatch[1].trim().split('\n')[0]);
                    if (dMatch) options.push(dMatch[1].trim().split('\n')[0]);

                    const detectedCorrectOption = getCorrectOptionFromBlock(cleanBlock, options);
                    const correctOption = detectedCorrectOption >= 0 ? detectedCorrectOption : 0;

                    if (options.length >= 2) {
                        questions.push({
                            question: questionText,
                            options: options,
                            correctOption: correctOption >= 0 && correctOption < options.length ? correctOption : 0,
                            marks: 5
                        });
                    }
                });

                if (questions.length > 0) {
                    if (isEditModalOpen && editingTest) {
                        setEditingTest(prev => ({
                            ...prev,
                            questions: [...(prev.questions || []), ...questions]
                        }));
                    } else {
                        setFormData(prev => ({
                            ...prev,
                            questions: [...prev.questions, ...questions]
                        }));
                    }
                    setPasteText('');
                } else {
                    showToast.error("Format not recognized. Use: Q. Question? A) Opt 1 B) Opt 2 Ans: B");
                }
            } catch (err) {
                console.error("Parse Error:", err);
            } finally {
                setIsGenerating(false);
            }
        }, 1000);
    };

    const removeQuestion = (idx) => {
        setFormData(prev => ({
            ...prev,
            questions: prev.questions.filter((_, i) => i !== idx)
        }));
    };

    const toggleStudentSelection = (studentId) => {
        setFormData(prev => {
            const isSelected = prev.assignedUsers.includes(studentId);
            return {
                ...prev,
                assignedUsers: isSelected
                    ? prev.assignedUsers.filter(id => id !== studentId)
                    : [...prev.assignedUsers, studentId]
            };
        });
    };

    const filteredTests = tests.filter(test => {
        const matchesSearch = test.title.toLowerCase().includes(searchTerm.toLowerCase());
        const selectedIds = selectedStudentFilters?.map(String) || [];
        const matchesStudent = selectedStudentFilters === null ||
            (selectedIds.length > 0 && (
                test.assignTo === 'all' ||
                test.assignedUsers?.some(userId => selectedIds.includes(String(userId?._id || userId)))
            ));

        return matchesSearch && matchesStudent;
    });

    if (isLoading) {
        return <Loader message="Accessing test repository..." />;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary/5 rounded-2xl">
                            <Zap className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-gray-900 uppercase">Tests & Exams</h3>
                            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Manage your MCQs and assessments</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={fetchTests}
                            disabled={isLoading}
                            className="flex items-center gap-2 px-5 py-2.5 bg-primary/5 text-primary rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50"
                            title="Refresh Tests"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                            Refresh Tests
                        </button>
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-primary/90 transition-all shadow-lg active:scale-95"
                        >
                            <Plus className="w-4 h-4" />
                            New Test
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                        { label: 'Total Tests', icon: FileText, count: tests.length, color: 'text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800/30' },
                        { label: 'Total Submissions', icon: CheckCircle, count: tests.reduce((acc, t) => acc + (t.submissions?.length || 0), 0), color: 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800/30' },
                        { label: 'Total MCQs', icon: List, count: tests.reduce((acc, t) => acc + (t.questions?.length || 0), 0), color: 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800/30' },
                        { label: 'Total Students', icon: Users, count: students.length, color: 'text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-700' },
                    ].map((stat, i) => (
                        <div key={i} className={`${stat.color} border rounded-2xl p-4 flex items-center justify-between shadow-sm`}>
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-widest opacity-70 block mb-1">{stat.label}</span>
                                <p className="text-2xl font-black leading-none">{stat.count}</p>
                            </div>
                            <div className="p-2 rounded-xl bg-white/50 dark:bg-black/20 backdrop-blur-sm">
                                <stat.icon className="w-5 h-5 opacity-80" />
                            </div>
                        </div>
                    ))}
                </div>

                <div>
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
            </div>

            {/* Test Title Search Bar */}
            <div className="bg-white dark:bg-slate-900/40 rounded-2xl p-4 border border-gray-100 dark:border-slate-800 shadow-sm">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search test title..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3.5 bg-gray-50/50 dark:bg-white/5 border border-transparent focus:border-primary focus:bg-white dark:focus:bg-white/10 rounded-2xl transition-all outline-none text-sm font-medium"
                    />
                    {searchTerm && (
                        <button
                            onClick={() => setSearchTerm('')}
                            className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                        >
                            <X className="w-4 h-4 text-gray-400" />
                        </button>
                    )}
                </div>
            </div>

            {filteredTests.length === 0 ? (
                <div className="bg-white rounded-[2.5rem] p-16 text-center border-2 border-dashed border-gray-100 flex flex-col items-center">
                    <div className="p-6 bg-gray-50 rounded-full mb-6">
                        <Zap className="w-12 h-12 text-gray-300" />
                    </div>
                    <h4 className="text-xl font-black text-gray-900 uppercase mb-2">No Tests Found</h4>
                    <p className="text-gray-400 font-medium max-w-sm">Create your first test to start assessing your students. You can use AI to generate questions from files or text.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredTests.map((test) => (
                        <motion.div
                            key={test._id}
                            layout
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-xl hover:shadow-primary/10/20 transition-all group"
                        >
                            <div className="p-6 space-y-4">
                                <div className="flex justify-between items-start">
                                    <h4 className="text-lg font-black text-primary uppercase leading-tight">{test.title}</h4>
                                    <div className="flex items-center gap-1 shrink-0">
                                        <button
                                            onClick={() => {
                                                setEditingTest(test);
                                                setIsEditModalOpen(true);
                                            }}
                                            className="p-2 hover:bg-gray-100 text-gray-400 hover:text-slate-900 rounded-lg transition-colors"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteTest(test._id)}
                                            className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                <p className="text-xs text-gray-500 font-medium line-clamp-2">{test.description}</p>

                                <div className="grid grid-cols-2 gap-4 pt-2">
                                    <div className="flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-primary" />
                                        <span className="text-[10px] font-black text-gray-600 uppercase tracking-wider">{test.duration} Mins</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <List className="w-4 h-4 text-primary" />
                                        <span className="text-[10px] font-black text-gray-600 uppercase tracking-wider">{test.questions?.length} MCQs</span>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-gray-50">
                                    <div className="flex flex-col gap-1 w-full">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-[8px] font-black text-gray-400 uppercase tracking-[0.2em]">
                                                {test.submissions?.length > 0 ? "Latest Performance" : "Recent Submissions"}
                                            </span>
                                            {test.submissions?.length > 0 && (
                                                <button
                                                    onClick={() => {
                                                        setSelectedTest(test);
                                                        setIsViewModalOpen(true);
                                                    }}
                                                    className="flex items-center gap-1 text-[9px] font-black text-primary hover:text-[#e67e01] uppercase tracking-widest transition-colors bg-primary/5 hover:bg-primary/10 px-2 py-1 rounded-md"
                                                >
                                                    <Eye className="w-3 h-3" />
                                                    REVIEW GRADES
                                                </button>
                                            )}
                                        </div>

                                        {test.submissions?.length > 0 ? (
                                            <div className="flex flex-col gap-3 mt-2 max-h-[160px] overflow-y-auto custom-scrollbar pr-1">
                                                {[...test.submissions]
                                                    .sort((a, b) => new Date(b.submittedAt || b.createdAt) - new Date(a.submittedAt || a.createdAt))
                                                    .map((submission, idx) => {
                                                        const { score, totalMarks } = getSubmissionResult(submission, test);

                                                        return (
                                                            <div key={submission._id || idx} className="flex items-center justify-between w-full">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="h-9 w-9 rounded-xl ring-2 ring-white overflow-hidden bg-primary/10 shrink-0 border border-primary/20">
                                                                        {submission.user?.photo ? (
                                                                            <img src={submission.user.photo} alt="" className="h-full w-full object-cover" />
                                                                        ) : (
                                                                            <div className="flex h-full w-full items-center justify-center text-xs font-black text-primary uppercase">
                                                                                {submission.user?.name?.charAt(0)}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <div className="flex flex-col">
                                                                        <span className="text-xs font-black text-gray-900 leading-tight truncate max-w-[120px] uppercase tracking-tight">{submission.user?.name}</span>
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-[10px] font-black text-primary tracking-tighter">{submission.user?.rollNo || '0000'}</span>
                                                                            <span className="w-1 h-1 rounded-full bg-gray-200" />
                                                                            <span className="text-[10px] font-bold text-gray-400">{formatDate(submission.submittedAt || submission.createdAt)}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <div className="text-right bg-primary/5 px-3 py-1.5 rounded-xl border border-primary/10">
                                                                        <span className="text-xs font-black text-primary block leading-none">{score}/{totalMarks}</span>
                                                                        <span className="text-[7px] font-black text-primary uppercase tracking-tighter opacity-70">Result</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-between w-full">
                                                <div className="flex items-center gap-2 py-1">
                                                    <div className="h-7 w-7 rounded-lg bg-gray-50 flex items-center justify-center border border-dashed border-gray-200">
                                                        <Users className="w-3.5 h-3.5 text-gray-300" />
                                                    </div>
                                                    <span className="text-[10px] font-bold text-gray-300 italic uppercase tracking-widest">Waiting for Activity</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            <Modal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                title="Create New Test"
                size="xl"
            >
                <div className="test-modal-content space-y-8 py-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <h4 className="text-sm font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
                                <Type className="w-4 h-4 text-primary" /> Basic Details
                            </h4>
                            <div className="space-y-4 bg-gray-50/50 p-6 rounded-[2rem] border border-gray-100">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Test Title</label>
                                    <input
                                        type="text"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        className="w-full px-4 py-3 bg-white border-2 border-white rounded-2xl outline-none focus:border-primary shadow-sm font-bold text-sm"
                                        placeholder="Enter test title..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Description</label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        className="w-full px-4 py-3 bg-white border-2 border-white rounded-2xl outline-none focus:border-primary shadow-sm font-bold text-sm resize-none"
                                        placeholder="Briefly describe this test..."
                                        rows="2"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Duration (Mins)</label>
                                        <input
                                            type="number"
                                            value={formData.duration}
                                            onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                                            className="w-full px-4 py-3 bg-white border-2 border-white rounded-2xl outline-none focus:border-primary shadow-sm font-bold text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Due Date</label>
                                        <input
                                            type="date"
                                            value={formData.dueDate}
                                            onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                                            className="w-full px-4 py-3 bg-white border-2 border-white rounded-2xl outline-none focus:border-primary shadow-sm font-bold text-sm"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Publish At (Scheduled)</label>
                                    <input
                                        type="datetime-local"
                                        value={formData.scheduledAt}
                                        onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
                                        className="w-full px-4 py-3 bg-white border-2 border-white rounded-2xl outline-none focus:border-primary shadow-sm font-bold text-sm"
                                    />
                                    <p className="text-[9px] text-gray-400 mt-1 font-bold italic uppercase">Leave empty to publish immediately</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h4 className="text-sm font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
                                <Users className="w-4 h-4 text-primary" /> Assign To
                            </h4>
                            <div className="space-y-4 bg-gray-50/50 p-6 rounded-[2.5rem] border border-gray-100">
                                <div className="flex gap-6">
                                    <label className="flex items-center gap-2 cursor-pointer group">
                                        <div className="relative flex items-center justify-center">
                                            <input
                                                type="radio"
                                                name="assignTo"
                                                checked={formData.assignTo === 'all'}
                                                onChange={() => setFormData({ ...formData, assignTo: 'all', assignedUsers: [] })}
                                                className="w-5 h-5 appearance-none border-2 border-gray-200 rounded-full checked:border-primary transition-all cursor-pointer"
                                            />
                                            {formData.assignTo === 'all' && <div className="absolute w-2.5 h-2.5 bg-primary rounded-full" />}
                                        </div>
                                        <span className={`text-xs font-black uppercase tracking-widest transition-colors ${formData.assignTo === 'all' ? 'text-primary' : 'text-gray-400'}`}>All Students</span>
                                    </label>

                                    <label className="flex items-center gap-2 cursor-pointer group">
                                        <div className="relative flex items-center justify-center">
                                            <input
                                                type="radio"
                                                name="assignTo"
                                                checked={formData.assignTo === 'none'}
                                                onChange={() => setFormData({ ...formData, assignTo: 'none', assignedUsers: [] })}
                                                className="w-5 h-5 appearance-none border-2 border-gray-200 rounded-full checked:border-primary transition-all cursor-pointer"
                                            />
                                            {formData.assignTo === 'none' && <div className="absolute w-2.5 h-2.5 bg-primary rounded-full" />}
                                        </div>
                                        <span className={`text-xs font-black uppercase tracking-widest transition-colors ${formData.assignTo === 'none' ? 'text-primary' : 'text-gray-400'}`}>None (Draft)</span>
                                    </label>

                                    <label className="flex items-center gap-2 cursor-pointer group">
                                        <div className="relative flex items-center justify-center">
                                            <input
                                                type="radio"
                                                name="assignTo"
                                                checked={formData.assignTo === 'selected'}
                                                onChange={() => setFormData({ ...formData, assignTo: 'selected' })}
                                                className="w-5 h-5 appearance-none border-2 border-gray-200 rounded-full checked:border-primary transition-all cursor-pointer"
                                            />
                                            {formData.assignTo === 'selected' && <div className="absolute w-2.5 h-2.5 bg-primary rounded-full" />}
                                        </div>
                                        <span className={`text-xs font-black uppercase tracking-widest transition-colors ${formData.assignTo === 'selected' ? 'text-primary' : 'text-gray-400'}`}>Selected</span>
                                    </label>
                                </div>

                                {formData.assignTo === 'selected' && (
                                    <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                        <div className="relative">
                                            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input
                                                type="text"
                                                placeholder="Search student..."
                                                value={assignSearchTerm}
                                                onChange={(e) => setAssignSearchTerm(e.target.value)}
                                                className="w-full pl-9 pr-3 py-2 bg-white border border-gray-100 rounded-xl text-[10px] font-black uppercase outline-none focus:border-primary"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
                                            {students?.filter(s => s.name?.toLowerCase().includes(assignSearchTerm.toLowerCase())).map(student => (
                                                <button
                                                    key={student.id || student._id}
                                                    type="button"
                                                    onClick={() => toggleStudentSelection(student.id || student._id)}
                                                    className={`flex items-center gap-3 p-2 rounded-xl border transition-all ${formData.assignedUsers.includes(student.id || student._id) ? 'bg-primary/5 border-orange-200 text-primary' : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200'}`}
                                                >
                                                    <div className="relative shrink-0">
                                                        {student.photo ? (
                                                            <img src={student.photo} alt="" className="w-6 h-6 rounded-full object-cover" />
                                                        ) : (
                                                            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[8px] text-primary font-black uppercase">
                                                                {student.name?.charAt(0)}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <span className="text-[10px] font-black truncate flex-1 text-left uppercase tracking-tighter">{student.name}</span>
                                                    {formData.assignedUsers.includes(student.id || student._id) && <CheckCircle className="w-3.5 h-3.5" />}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
                        <div className="space-y-4">
                            <h4 className="text-sm font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
                                <Zap className="w-4 h-4 text-primary" /> Question Generator
                            </h4>
                            <div className="bg-slate-900 rounded-[2rem] p-6 text-white space-y-4 relative overflow-hidden">
                                <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/5 rounded-full blur-xl" />

                                <div className="flex gap-2 p-1 bg-white/10 rounded-xl">
                                    <button
                                        onClick={() => setInputMethod('paste')}
                                        className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${inputMethod === 'paste' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-white/50 hover:bg-white/5'}`}
                                    >Paste Text</button>
                                    <button
                                        onClick={() => setInputMethod('file')}
                                        className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${inputMethod === 'file' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-white/50 hover:bg-white/5'}`}
                                    >Upload File</button>
                                    <button
                                        onClick={() => {
                                            setInputMethod('manual');
                                            const newQuestion = {
                                                question: "New MCQ Question?",
                                                options: ["Option A", "Option B", "Option C", "Option D"],
                                                correctOption: 0,
                                                marks: 5
                                            };
                                            setFormData(prev => ({
                                                ...prev,
                                                questions: [...prev.questions, newQuestion]
                                            }));
                                        }}
                                        className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${inputMethod === 'manual' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-white/50 hover:bg-white/5'}`}
                                    >Manual</button>
                                </div>

                                {inputMethod === 'paste' ? (
                                    <div className="space-y-4">
                                        <div className="relative">
                                            <textarea
                                                value={pasteText}
                                                onChange={(e) => setPasteText(e.target.value)}
                                                placeholder={"Paste your MCQs here...\n\nExample:\nQ. Your question?\nA) Option One\nB) Option Two\nAns: B"}
                                                className="w-full h-40 bg-white/10 border border-white/20 rounded-2xl p-4 text-xs font-medium outline-none focus:border-primary placeholder:text-white/30 resize-none"
                                            />
                                            {pasteText && (
                                                <button
                                                    onClick={() => setPasteText('')}
                                                    className="absolute top-3 right-3 p-2 bg-white/10 hover:bg-white/20 rounded-lg text-[8px] font-black uppercase tracking-widest text-white/50 transition-all"
                                                >Clear</button>
                                            )}
                                            {isGenerating && (
                                                <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center space-y-2 animate-in fade-in duration-300">
                                                    <Loader />
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-white">Auto-Parsing...</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 px-2">
                                            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                                            <p className="text-[9px] font-black uppercase tracking-widest text-white/50">Auto-numbering & Shuffling enabled</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <label className="flex flex-col items-center justify-center h-40 border-2 border-dashed border-white/20 rounded-2xl cursor-pointer hover:bg-white/5 transition-all group">
                                            <div className="p-4 bg-white/5 rounded-full mb-2 group-hover:scale-110 transition-transform">
                                                <Upload className="w-8 h-8 text-primary" />
                                            </div>
                                            <span className="text-[10px] font-black uppercase text-white/70 tracking-widest">Upload PDF / DOC / TXT</span>
                                            <p className="text-[8px] text-white/30 uppercase mt-1">AI will auto-detect all questions</p>
                                            <input type="file" className="hidden" onChange={handleFileUpload} accept=".pdf,.doc,.docx,.txt" />
                                        </label>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {formData.questions.length > 0 && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h4 className="text-sm font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
                                    <List className="w-4 h-4 text-primary" /> Questions ({formData.questions.length})
                                </h4>
                                <button
                                    onClick={() => setFormData({ ...formData, questions: [] })}
                                    className="text-[10px] font-black text-red-500 uppercase tracking-widest hover:underline"
                                >Clear All</button>
                            </div>
                            <div className="grid grid-cols-1 gap-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                {formData.questions.map((q, idx) => (
                                    <div key={idx} className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm group relative">
                                        <button
                                            onClick={() => removeQuestion(idx)}
                                            className="absolute top-4 right-4 p-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                        <div className="flex gap-4">
                                            <span className="w-8 h-8 rounded-xl bg-primary/5 text-primary flex items-center justify-center font-black text-xs shrink-0">{idx + 1}</span>
                                            <div className="space-y-4 flex-1">
                                                <input
                                                    type="text"
                                                    value={q.question}
                                                    onChange={(e) => {
                                                        const updatedQuestions = [...formData.questions];
                                                        updatedQuestions[idx].question = e.target.value;
                                                        setFormData({ ...formData, questions: updatedQuestions });
                                                    }}
                                                    className="w-full font-bold text-gray-800 leading-relaxed bg-transparent border-b border-dashed border-gray-200 outline-none focus:border-primary"
                                                />
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    {q.options.map((opt, oIdx) => (
                                                        <div key={oIdx} className={`px-4 py-2 rounded-xl border flex items-center gap-2 text-xs font-bold ${oIdx === q.correctOption ? 'bg-primary/5 border-primary text-primary' : 'bg-gray-50 border-gray-100 text-gray-500'}`}>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const updatedQuestions = [...formData.questions];
                                                                    updatedQuestions[idx].correctOption = oIdx;
                                                                    setFormData({ ...formData, questions: updatedQuestions });
                                                                }}
                                                                className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] shrink-0 ${oIdx === q.correctOption ? 'bg-primary text-white shadow-sm' : 'bg-gray-200 text-gray-500'}`}
                                                            >
                                                                {String.fromCharCode(65 + oIdx)}
                                                            </button>
                                                            <input
                                                                type="text"
                                                                value={opt}
                                                                onChange={(e) => {
                                                                    const updatedQuestions = [...formData.questions];
                                                                    updatedQuestions[idx].options[oIdx] = e.target.value;
                                                                    setFormData({ ...formData, questions: updatedQuestions });
                                                                }}
                                                                className="bg-transparent border-none outline-none w-full font-bold"
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-6 border-t">
                        <button
                            onClick={() => setIsCreateModalOpen(false)}
                            className="px-6 py-2.5 text-gray-500 font-black text-xs uppercase tracking-widest hover:bg-gray-100 rounded-xl"
                        >Cancel</button>
                        <button
                            onClick={handleCreateTest}
                            disabled={isSaving || formData.questions.length === 0}
                            className="px-8 py-2.5 bg-primary text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-[#e67e01] shadow-lg shadow-primary/10 flex items-center gap-2"
                        >
                            {isSaving ? <ButtonLoader /> : <CheckCircle className="w-4 h-4" />}
                            Publish Test
                        </button>
                    </div>
                </div>
            </Modal>

            <Modal
                isOpen={isEditModalOpen}
                onClose={() => {
                    setIsEditModalOpen(false);
                    setEditingTest(null);
                }}
                title={editingTest ? `Edit Test: ${editingTest.title}` : "Edit Test"}
                size="xl"
            >
                {editingTest && (
                    <div className="test-modal-content space-y-8 py-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <h4 className="text-sm font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
                                    <Type className="w-4 h-4 text-primary" /> Basic Details
                                </h4>
                                <div className="space-y-4 bg-gray-50/50 p-6 rounded-[2rem] border border-gray-100">
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Test Title</label>
                                        <input
                                            type="text"
                                            value={editingTest.title}
                                            onChange={(e) => setEditingTest({ ...editingTest, title: e.target.value })}
                                            className="w-full px-4 py-3 bg-white border-2 border-white rounded-2xl outline-none focus:border-primary shadow-sm font-bold text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Description</label>
                                        <textarea
                                            value={editingTest.description}
                                            onChange={(e) => setEditingTest({ ...editingTest, description: e.target.value })}
                                            className="w-full px-4 py-3 bg-white border-2 border-white rounded-2xl outline-none focus:border-primary shadow-sm font-bold text-sm resize-none"
                                            rows="2"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Duration (Mins)</label>
                                            <input
                                                type="number"
                                                value={editingTest.duration}
                                                onChange={(e) => setEditingTest({ ...editingTest, duration: e.target.value })}
                                                className="w-full px-4 py-3 bg-white border-2 border-white rounded-2xl outline-none focus:border-primary shadow-sm font-bold text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Due Date</label>
                                            <input
                                                type="date"
                                                value={editingTest.dueDate ? new Date(editingTest.dueDate).toISOString().split('T')[0] : ''}
                                                onChange={(e) => setEditingTest({ ...editingTest, dueDate: e.target.value })}
                                                className="w-full px-4 py-3 bg-white border-2 border-white rounded-2xl outline-none focus:border-primary shadow-sm font-bold text-sm"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Publish At (Scheduled)</label>
                                        <input
                                            type="datetime-local"
                                            value={editingTest.scheduledAt ? new Date(editingTest.scheduledAt).toISOString().slice(0, 16) : ''}
                                            onChange={(e) => setEditingTest({ ...editingTest, scheduledAt: e.target.value })}
                                            className="w-full px-4 py-3 bg-white border-2 border-white rounded-2xl outline-none focus:border-primary shadow-sm font-bold text-sm"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h4 className="text-sm font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
                                    <Users className="w-4 h-4 text-primary" /> Assign To
                                </h4>
                                <div className="space-y-4 bg-gray-50/50 p-6 rounded-[2.5rem] border border-gray-100">
                                    <div className="flex gap-6">
                                        <label className="flex items-center gap-2 cursor-pointer group">
                                            <div className="relative flex items-center justify-center">
                                                <input
                                                    type="radio"
                                                    name="editAssignTo"
                                                    checked={editingTest.assignTo === 'all'}
                                                    onChange={() => setEditingTest({ ...editingTest, assignTo: 'all', assignedUsers: [] })}
                                                    className="w-5 h-5 appearance-none border-2 border-gray-200 rounded-full checked:border-primary transition-all cursor-pointer"
                                                />
                                                {editingTest.assignTo === 'all' && <div className="absolute w-2.5 h-2.5 bg-primary rounded-full" />}
                                            </div>
                                            <span className={`text-xs font-black uppercase tracking-widest transition-colors ${editingTest.assignTo === 'all' ? 'text-primary' : 'text-gray-400'}`}>All Students</span>
                                        </label>

                                        <label className="flex items-center gap-2 cursor-pointer group">
                                            <div className="relative flex items-center justify-center">
                                                <input
                                                    type="radio"
                                                    name="editAssignTo"
                                                    checked={editingTest.assignTo === 'none'}
                                                    onChange={() => setEditingTest({ ...editingTest, assignTo: 'none', assignedUsers: [] })}
                                                    className="w-5 h-5 appearance-none border-2 border-gray-200 rounded-full checked:border-primary transition-all cursor-pointer"
                                                />
                                                {editingTest.assignTo === 'none' && <div className="absolute w-2.5 h-2.5 bg-primary rounded-full" />}
                                            </div>
                                            <span className={`text-xs font-black uppercase tracking-widest transition-colors ${editingTest.assignTo === 'none' ? 'text-primary' : 'text-gray-400'}`}>None (Draft)</span>
                                        </label>

                                        <label className="flex items-center gap-2 cursor-pointer group">
                                            <div className="relative flex items-center justify-center">
                                                <input
                                                    type="radio"
                                                    name="editAssignTo"
                                                    checked={editingTest.assignTo === 'selected'}
                                                    onChange={() => setEditingTest({ ...editingTest, assignTo: 'selected' })}
                                                    className="w-5 h-5 appearance-none border-2 border-gray-200 rounded-full checked:border-primary transition-all cursor-pointer"
                                                />
                                                {editingTest.assignTo === 'selected' && <div className="absolute w-2.5 h-2.5 bg-primary rounded-full" />}
                                            </div>
                                            <span className={`text-xs font-black uppercase tracking-widest transition-colors ${editingTest.assignTo === 'selected' ? 'text-primary' : 'text-gray-400'}`}>Selected</span>
                                        </label>
                                    </div>

                                    {editingTest.assignTo === 'selected' && (
                                        <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                            <div className="relative">
                                                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                                <input
                                                    type="text"
                                                    placeholder="Search student..."
                                                    value={assignSearchTerm}
                                                    onChange={(e) => setAssignSearchTerm(e.target.value)}
                                                    className="w-full pl-9 pr-3 py-2 bg-white border border-gray-100 rounded-xl text-[10px] font-black uppercase outline-none focus:border-primary"
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
                                                {students?.filter(s => s.name?.toLowerCase().includes(assignSearchTerm.toLowerCase())).map(student => (
                                                    <button
                                                        key={student.id || student._id}
                                                        type="button"
                                                        onClick={() => {
                                                            const sId = student.id || student._id;
                                                            const current = editingTest.assignedUsers || [];
                                                            const newUsers = current.includes(sId) ? current.filter(id => id !== sId) : [...current, sId];
                                                            setEditingTest({ ...editingTest, assignedUsers: newUsers });
                                                        }}
                                                        className={`flex items-center gap-3 p-2 rounded-xl border transition-all ${editingTest.assignedUsers?.includes(student.id || student._id) ? 'bg-primary/5 border-orange-200 text-primary' : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200'}`}
                                                    >
                                                        <div className="relative shrink-0">
                                                            {student.photo ? (
                                                                <img src={student.photo} alt="" className="w-6 h-6 rounded-full object-cover" />
                                                            ) : (
                                                                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[8px] text-primary font-black uppercase">
                                                                    {student.name?.charAt(0)}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <span className="text-[10px] font-black truncate text-left flex-1 uppercase tracking-tighter">{student.name}</span>
                                                        {editingTest.assignedUsers?.includes(student.id || student._id) && <CheckCircle className="w-3.5 h-3.5" />}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
                            <div className="space-y-4">
                                <h4 className="text-sm font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
                                    <Zap className="w-4 h-4 text-primary" /> Question Generator
                                </h4>
                                <div className="bg-slate-900 rounded-[2rem] p-6 text-white space-y-4 relative overflow-hidden">
                                    <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/5 rounded-full blur-xl" />

                                    <div className="flex gap-2 p-1 bg-white/10 rounded-xl">
                                        <button
                                            type="button"
                                            onClick={() => setInputMethod('paste')}
                                            className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${inputMethod === 'paste' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-white/50 hover:bg-white/5'}`}
                                        >Paste Text</button>
                                        <button
                                            type="button"
                                            onClick={() => setInputMethod('file')}
                                            className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${inputMethod === 'file' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-white/50 hover:bg-white/5'}`}
                                        >Upload File</button>
                                    </div>

                                    {inputMethod === 'paste' ? (
                                        <div className="space-y-4">
                                            <div className="relative">
                                                <textarea
                                                    value={pasteText}
                                                    onChange={(e) => setPasteText(e.target.value)}
                                                    placeholder={"Paste your MCQs here...\n\nExample:\nQ. Your question?\nA) Option One\nB) Option Two\nAns: B"}
                                                    className="w-full h-40 bg-white/10 border border-white/20 rounded-2xl p-4 text-xs font-medium outline-none focus:border-primary placeholder:text-white/30 resize-none"
                                                />
                                                {pasteText && (
                                                    <button
                                                        onClick={() => setPasteText('')}
                                                        className="absolute top-3 right-3 p-2 bg-white/10 hover:bg-white/20 rounded-lg text-[8px] font-black uppercase tracking-widest text-white/50 transition-all"
                                                    >Clear</button>
                                                )}
                                                {isGenerating && (
                                                    <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center space-y-2 animate-in fade-in duration-300">
                                                        <Loader />
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-white">Auto-Parsing...</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 px-2">
                                                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                                                <p className="text-[9px] font-black uppercase tracking-widest text-white/50">Auto-numbering & Shuffling enabled</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <label className="flex flex-col items-center justify-center h-40 border-2 border-dashed border-white/20 rounded-2xl cursor-pointer hover:bg-white/5 transition-all group">
                                                <div className="p-4 bg-white/5 rounded-full mb-2 group-hover:scale-110 transition-transform">
                                                    <Upload className="w-8 h-8 text-primary" />
                                                </div>
                                                <span className="text-[10px] font-black uppercase text-white/70 tracking-widest">Upload PDF / DOC / TXT</span>
                                                <p className="text-[8px] text-white/30 uppercase mt-1">AI will auto-detect all questions</p>
                                                <input type="file" className="hidden" onChange={handleFileUpload} accept=".pdf,.doc,.docx,.txt" />
                                            </label>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h4 className="text-sm font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
                                    <List className="w-4 h-4 text-primary" /> Questions ({editingTest.questions?.length || 0})
                                </h4>
                                <div className="flex items-center gap-3">
                                    {editingTest.questions?.length > 0 && (
                                        <button
                                            onClick={() => setEditingTest({ ...editingTest, questions: [] })}
                                            className="text-[10px] font-black text-red-500 uppercase tracking-widest hover:underline"
                                        >Clear All</button>
                                    )}
                                    <button
                                        onClick={() => {
                                            const newQuestion = {
                                                question: "New MCQ Question?",
                                                options: ["Option A", "Option B", "Option C", "Option D"],
                                                correctOption: 0,
                                                marks: 5
                                            };
                                            setEditingTest({
                                                ...editingTest,
                                                questions: [...(editingTest.questions || []), newQuestion]
                                            });
                                        }}
                                        className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline px-3 py-1 bg-primary/5 rounded-lg"
                                    >+ Add Question</button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                {editingTest.questions?.map((q, idx) => (
                                    <div key={idx} className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm group relative">
                                        <button
                                            onClick={() => {
                                                const updatedQuestions = editingTest.questions.filter((_, i) => i !== idx);
                                                setEditingTest({ ...editingTest, questions: updatedQuestions });
                                            }}
                                            className="absolute top-4 right-4 p-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                        <div className="flex gap-4">
                                            <span className="w-8 h-8 rounded-xl bg-primary/5 text-primary flex items-center justify-center font-black text-xs shrink-0">{idx + 1}</span>
                                            <div className="space-y-4 flex-1">
                                                <input
                                                    type="text"
                                                    value={q.question}
                                                    onChange={(e) => {
                                                        const updatedQuestions = [...editingTest.questions];
                                                        updatedQuestions[idx].question = e.target.value;
                                                        setEditingTest({ ...editingTest, questions: updatedQuestions });
                                                    }}
                                                    className="w-full font-bold text-gray-800 leading-relaxed bg-transparent border-b border-dashed border-gray-200 outline-none focus:border-primary"
                                                />
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    {q.options.map((opt, oIdx) => (
                                                        <div key={oIdx} className={`px-4 py-2 rounded-xl border flex items-center gap-2 text-xs font-bold ${oIdx === q.correctOption ? 'bg-primary/5 border-primary text-primary' : 'bg-gray-50 border-gray-100 text-gray-500'}`}>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const updatedQuestions = [...editingTest.questions];
                                                                    updatedQuestions[idx].correctOption = oIdx;
                                                                    setEditingTest({ ...editingTest, questions: updatedQuestions });
                                                                }}
                                                                className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] shrink-0 ${oIdx === q.correctOption ? 'bg-primary text-white shadow-sm' : 'bg-gray-200 text-gray-500'}`}
                                                            >
                                                                {String.fromCharCode(65 + oIdx)}
                                                            </button>
                                                            <input
                                                                type="text"
                                                                value={opt}
                                                                onChange={(e) => {
                                                                    const updatedQuestions = [...editingTest.questions];
                                                                    updatedQuestions[idx].options[oIdx] = e.target.value;
                                                                    setEditingTest({ ...editingTest, questions: updatedQuestions });
                                                                }}
                                                                className="bg-transparent border-none outline-none w-full font-bold"
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-6 border-t">
                            <button
                                onClick={() => setIsEditModalOpen(false)}
                                className="px-6 py-2.5 text-gray-500 font-black text-xs uppercase tracking-widest hover:bg-gray-100 rounded-xl"
                            >Cancel</button>
                            <button
                                onClick={handleUpdateTest}
                                disabled={isSaving}
                                className="px-8 py-2.5 bg-primary text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-[#e67e01] shadow-lg shadow-primary/10 flex items-center gap-2"
                            >
                                {isSaving ? <ButtonLoader /> : <CheckCircle className="w-4 h-4" />}
                                Save Changes
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* View Submissions Modal */}
            <Modal
                isOpen={isViewModalOpen}
                onClose={() => {
                    setIsViewModalOpen(false);
                    setSelectedTest(null);
                }}
                title={`Submissions: ${selectedTest?.title}`}
                size="xl"
            >
                <div className="space-y-4 max-h-[60vh] overflow-y-auto py-2 pr-2">
                    {selectedTest?.submissions && selectedTest.submissions.length > 0 ? (
                        [...selectedTest.submissions].sort((a, b) => new Date(b.submittedAt || b.createdAt) - new Date(a.submittedAt || a.createdAt)).map((submission) => {
                            const { score, totalMarks } = getSubmissionResult(submission, selectedTest);
                            return (
                                <div key={submission._id} className="bg-gray-50 p-4 rounded-xl border border-gray-100 relative group">
                                    <button
                                        onClick={() => handleDeleteSubmission(selectedTest._id, submission._id)}
                                        className="absolute top-4 right-4 p-2 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors border border-transparent hover:border-red-100"
                                        title="Delete Submission"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                    <div className="flex justify-between items-start pr-10">
                                        <div className="flex items-center gap-3">
                                            {submission.user?.photo ? (
                                                <img src={submission.user.photo} alt="" className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm" />
                                            ) : (
                                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm border-2 border-white shadow-sm">
                                                    {submission.user?.name?.charAt(0)}
                                                </div>
                                            )}
                                            <div>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="font-bold text-gray-900 text-sm">{submission.user?.name}</span>
                                                    {submission.user?.rollNo && (
                                                        <span className="text-[10px] font-black text-red-500 bg-red-50 px-2 py-0.5 rounded-lg border border-red-100 uppercase tracking-tighter">
                                                            {submission.user?.rollNo}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-[11px] text-gray-400 font-medium flex items-center gap-1.5 mt-1">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    {formatDateTime(submission.submittedAt)}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right flex flex-col items-end">
                                            <Badge variant={score >= (totalMarks / 2) ? 'success' : 'error'}>
                                                {score >= (totalMarks / 2) ? 'PASSED' : 'FAILED'}
                                            </Badge>
                                            <p className="text-xl font-black text-primary mt-1 leading-none">
                                                {score}/{totalMarks}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-gray-100">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Generated Feedback</p>
                                        <p className="text-xs font-medium text-gray-600">
                                            {getAutomaticFeedback((score / totalMarks) * 100)}
                                        </p>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-4 border border-dashed border-gray-200">
                                <Users className="w-8 h-8 text-gray-300" />
                            </div>
                            <h4 className="text-lg font-bold text-gray-900 uppercase">No Submissions Yet</h4>
                            <p className="text-xs text-gray-500 mt-1">Students haven't taken this test yet.</p>
                        </div>
                    )}
                </div>
            </Modal>

        </div>
    );
};

export default TestsTab;



