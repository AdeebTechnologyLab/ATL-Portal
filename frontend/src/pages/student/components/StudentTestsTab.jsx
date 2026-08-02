import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Zap, Clock, CheckCircle, FileText, XCircle,
    ChevronRight, AlertCircle, PlayCircle, Award, X
} from 'lucide-react';
import Loader, { ButtonLoader } from '../../../components/ui/Loader';
import { testAPI } from '../../../services/api';
import Badge from '../../../components/ui/Badge';
import { formatDate } from '../../../utils/dateFormatter';
import { isDueDateOverdue } from '../../../utils/dueDate';

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

const StudentTestsTab = ({ courseId, isRestricted }) => {
    const [tests, setTests] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedTest, setSelectedTest] = useState(null);
    const [isTakingTest, setIsTakingTest] = useState(false);
    const [answers, setAnswers] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [timeLeft, setTimeLeft] = useState(0);
    const [shuffledQuestions, setShuffledQuestions] = useState([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [testResult, setTestResult] = useState(null);
    const [showReview, setShowReview] = useState(false);
    const [direction, setDirection] = useState(0); // 1 for next, -1 for previous
    const [termsTest, setTermsTest] = useState(null);

    const submitTestRef = useRef();
    const isPromptActiveRef = useRef(false);

    const enterFullscreen = () => {
        const element = document.documentElement;
        if (element.requestFullscreen) {
            element.requestFullscreen().catch(err => console.log("Fullscreen error:", err));
        } else if (element.mozRequestFullScreen) {
            element.mozRequestFullScreen();
        } else if (element.webkitRequestFullscreen) {
            element.webkitRequestFullscreen();
        } else if (element.msRequestFullscreen) {
            element.msRequestFullscreen();
        }
    };

    const exitFullscreen = () => {
        if (document.exitFullscreen) {
            document.exitFullscreen().catch(err => console.log("Exit fullscreen error:", err));
        } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
    };

    // Prevent navigation/refresh during test
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (isTakingTest && !testResult) {
                e.preventDefault();
                e.returnValue = '';
            }
        };

        const handleContextMenu = (e) => {
            if (isTakingTest && !testResult) {
                e.preventDefault();
            }
        };

        const handleKeyDown = (e) => {
            if (isTakingTest && !testResult) {
                // Intercept F11
                if (e.key === 'F11' || e.keyCode === 122) {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    if (isPromptActiveRef.current) return;
                    isPromptActiveRef.current = true;

                    const confirmClose = window.confirm("Warning: Pressing F11 will close the test. Are you sure you want to finish the test now? Selected answers will be submitted, and unanswered questions will get 0 marks.");
                    
                    isPromptActiveRef.current = false;

                    if (confirmClose) {
                        exitFullscreen();
                        if (submitTestRef.current) {
                            submitTestRef.current(true);
                        }
                    } else {
                        // Keep fullscreen active
                        enterFullscreen();
                    }
                }

                // Disable Ctrl+C, Ctrl+V, Ctrl+U, Ctrl+S, F12
                if (
                    (e.ctrlKey && (e.key === 'c' || e.key === 'v' || e.key === 'u' || e.key === 's')) ||
                    e.key === 'F12' || e.keyCode === 123
                ) {
                    e.preventDefault();
                    e.stopPropagation();
                }
            }
        };

        const handleFullscreenChange = () => {
            const isFullscreen = document.fullscreenElement || 
                                 document.webkitFullscreenElement || 
                                 document.mozFullScreenElement || 
                                 document.msFullscreenElement;
            
            if (!isFullscreen && isTakingTest && !testResult) {
                if (isPromptActiveRef.current) return;
                isPromptActiveRef.current = true;

                const confirmClose = window.confirm("Warning: Exiting full-screen mode is not allowed during the test. Do you want to submit the test now? Unanswered questions will receive 0 marks.");
                
                isPromptActiveRef.current = false;

                if (confirmClose) {
                    if (submitTestRef.current) {
                        submitTestRef.current(true);
                    }
                } else {
                    // Try to re-enter fullscreen
                    enterFullscreen();
                }
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        window.addEventListener('contextmenu', handleContextMenu);
        window.addEventListener('keydown', handleKeyDown, true);
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
        document.addEventListener('mozfullscreenchange', handleFullscreenChange);
        document.addEventListener('MSFullscreenChange', handleFullscreenChange);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            window.removeEventListener('contextmenu', handleContextMenu);
            window.removeEventListener('keydown', handleKeyDown, true);
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
            document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
            document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
        };
    }, [isTakingTest, testResult]);

    useEffect(() => {
        fetchTests();
    }, [courseId]);

    useEffect(() => {
        let timer;
        if (isTakingTest && timeLeft > 0) {
            timer = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        handleSubmitTest();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [isTakingTest, timeLeft]);

    const fetchTests = async () => {
        try {
            const res = await testAPI.getByCourse(courseId);
            setTests(res.data.tests || []);
        } catch (error) {
            console.error('Error fetching tests:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleStartTest = (test) => {
        if (isRestricted) {
            alert("You cannot take tests while your account is restricted.");
            return;
        }

        enterFullscreen();

        setIsLoading(true); // Show loader while shuffling/preparing
        
        setTimeout(() => {
            // 1. Shuffle Questions
            const qList = [...(test.questions || [])];
            for (let i = qList.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [qList[i], qList[j]] = [qList[j], qList[i]];
            }

            // 2. Shuffle Options for each question
            const processedQuestions = qList.map(q => {
                const optionsWithOriginalIndex = (q.options || []).map((opt, idx) => ({
                    text: opt,
                    originalIndex: idx
                }));

                // Fisher-Yates shuffle for options
                for (let i = optionsWithOriginalIndex.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [optionsWithOriginalIndex[i], optionsWithOriginalIndex[j]] = [optionsWithOriginalIndex[j], optionsWithOriginalIndex[i]];
                }

                return {
                    ...q,
                    shuffledOptions: optionsWithOriginalIndex
                };
            });

            setShuffledQuestions(processedQuestions);
            setSelectedTest(test);
            setIsTakingTest(true);
            document.body.setAttribute('data-taking-test', 'true');
            setTimeLeft((test.duration || 30) * 60);
            setAnswers({});
            setCurrentQuestionIndex(0);
            setIsLoading(false);
        }, 800); // Small delay to show "Preparing Test"
    };

    const handleRequestStartTest = (test) => {
        if (isRestricted) {
            alert("You cannot take tests while your account is restricted.");
            return;
        }
        setTermsTest(test);
    };

    const handleAgreeTerms = () => {
        if (!termsTest) return;
        const testToStart = termsTest;
        setTermsTest(null);
        handleStartTest(testToStart);
    };

    const handleSelectAnswer = (questionId, selectedOption) => {
        setAnswers((previousAnswers) => ({
            ...previousAnswers,
            [questionId]: selectedOption
        }));

        if (currentQuestionIndex < shuffledQuestions.length - 1) {
            setDirection(1);
            setCurrentQuestionIndex((currentIndex) => currentIndex + 1);
        }
    };

    const handleSubmitTest = async (forceSubmit = false) => {
        if (isSubmitting) return;

        const answeredCount = Object.keys(answers).length;
        if (!forceSubmit && answeredCount < shuffledQuestions.length) {
            alert(`Please answer all questions before finishing. (${answeredCount}/${shuffledQuestions.length} answered)`);
            return;
        }

        setIsSubmitting(true);
        try {
            const formattedAnswers = shuffledQuestions.map(q => ({
                questionId: q._id,
                selectedOption: answers[q._id] !== undefined ? answers[q._id] : -1
            }));

            const res = await testAPI.submit(selectedTest._id, formattedAnswers);
            const submittedQuestionIds = new Set(formattedAnswers.map(answer => String(answer.questionId)));
            const serverQuestionsById = new Map((res.data.questions || []).map(question => [String(question._id), question]));
            const currentAttemptQuestions = shuffledQuestions
                .filter(question => submittedQuestionIds.has(String(question._id)))
                .map(question => ({
                    ...(serverQuestionsById.get(String(question._id)) || question),
                    shuffledOptions: question.shuffledOptions
                }));
            setTestResult({
                score: res.data.score,
                totalMarks: res.data.totalMarks,
                questions: currentAttemptQuestions,
                userAnswers: answers
            });
            setShowReview(true); // Automatically show review after result
            fetchTests();
        } catch (error) {
            console.error('Error submitting test:', error);
            alert(error.response?.data?.message || "Failed to submit test");
        } finally {
            setIsSubmitting(false);
        }
    };

    useEffect(() => {
        submitTestRef.current = handleSubmitTest;
    }, [handleSubmitTest]);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (isLoading) {
        return (
            <Loader message={isTakingTest ? 'Preparing your test...' : 'Loading Tests...'} />
        );
    }

    if (isTakingTest && selectedTest) {
        const currentQuestion = shuffledQuestions[currentQuestionIndex];
        const answeredCount = Object.keys(answers).length;
        const progress = (answeredCount / shuffledQuestions.length) * 100;

        return (
            <div className="fixed inset-0 z-[3000] bg-[#f8fafc] dark:bg-[#0f1117] flex flex-col h-[100dvh] w-screen overflow-hidden font-sans select-none overscroll-none">
                {/* Header with Title and Timer */}
                <div className="shrink-0 p-4 sm:p-5 bg-white/80 dark:bg-[#1a1f2e]/80 backdrop-blur-md border-b border-primary/5 dark:border-white/5 flex items-center justify-between sticky top-0 z-[100] shadow-sm">
                    <div className="flex items-center gap-5">
                        <div className="relative group">
                            <div className="absolute inset-0 bg-primary rounded-2xl blur-lg opacity-10" />
                            <div className="relative p-2.5 rounded-2xl bg-gradient-to-br from-primary to-[#ffa534] shadow-md">
                                <Zap className="w-5 h-5 text-white" />
                            </div>
                        </div>
                        <div className="flex flex-col">
                            <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none mb-1">{selectedTest.title}</h3>
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Session</span>
                            </div>
                        </div>
                    </div>

                    {/* Centered Premium Timer (No Card) */}
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                        <div className={`flex flex-col items-center transition-all duration-500 text-red-600`}>
                            <span className={`text-[8px] font-black uppercase tracking-[0.2em] mb-0.5 text-red-400 dark:text-red-400/80`}>Time Left</span>
                            <div className="flex items-center gap-2">
                                <Clock className={`w-4 h-4 ${timeLeft < 60 ? 'animate-pulse' : 'text-red-600'}`} />
                                <span className="text-2xl font-black tabular-nums tracking-wider leading-none">{formatTime(timeLeft)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Only Finish Button - always visible */}
                        <button
                            onClick={handleSubmitTest}
                            disabled={isSubmitting || Object.keys(answers).length < shuffledQuestions.length}
                            className={`px-5 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 ${
                                Object.keys(answers).length < shuffledQuestions.length
                                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                : 'bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20'
                            }`}
                        >
                            <ButtonLoader isLoading={isSubmitting} icon={<CheckCircle className="w-3.5 h-3.5" />}>
                                Finish Test
                            </ButtonLoader>
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-hidden flex flex-row">

                    {/* Left Sidebar: Question Numbers */}
                    <div className="w-16 sm:w-20 shrink-0 overflow-y-auto no-scrollbar bg-slate-50 dark:bg-[#1a1f2e] border-r-2 border-slate-200 dark:border-white/5 py-4 flex flex-col items-center gap-2">
                        <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Q#</span>
                        {shuffledQuestions.map((_, i) => (
                            <button
                                key={i}
                                onClick={() => {
                                    setDirection(i > currentQuestionIndex ? 1 : -1);
                                    setCurrentQuestionIndex(i);
                                }}
                                className={`w-10 h-10 rounded-xl font-black text-sm transition-all border-2 ${
                                    currentQuestionIndex === i
                                    ? 'bg-primary border-primary text-white shadow-xl shadow-primary/30 scale-110 z-10'
                                    : answers[shuffledQuestions[i]._id] !== undefined
                                    ? 'bg-primary/10 border-primary/30 text-primary font-black'
                                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-white/5 text-slate-500 dark:text-slate-600 hover:border-primary/30 hover:text-primary dark:hover:border-white/10'
                                }`}
                            >
                                {i + 1}
                            </button>
                        ))}
                    </div>

                    {/* Right: Progress + Question Content */}
                    <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col no-scrollbar">

                        {/* Progress Bar - Full Width */}
                        <div className="flex flex-col space-y-1.5 mb-6 w-full">
                            <div className="flex items-center justify-between">
                                <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em]">Progress</span>
                                <span className="text-[10px] font-black text-slate-800 dark:text-slate-200 tabular-nums">{Math.round(progress)}%</span>
                            </div>
                            <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800/50 rounded-full overflow-hidden border border-white dark:border-white/5 shadow-inner">
                                <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progress}%` }}
                                    className="h-full bg-gradient-to-r from-primary to-[#ffa534] rounded-full shadow-lg"
                                />
                            </div>
                        </div>

                        <AnimatePresence mode="wait" custom={direction}>
                            <motion.div
                                key={currentQuestionIndex}
                                custom={direction}
                                initial={{ opacity: 0, x: direction === 1 ? 150 : -150 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: direction === 1 ? -150 : 150 }}
                                transition={{ 
                                    x: { type: "spring", stiffness: 100, damping: 20 },
                                    opacity: { duration: 0.5 }
                                }}
                                className="bg-white dark:bg-[#1a1f2e] p-6 sm:p-10 rounded-[2.5rem] border-2 border-primary/10 dark:border-white/5 shadow-xl shadow-primary/10/20 space-y-8 relative overflow-hidden"
                            >
                                {/* Background Accent */}
                                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 dark:bg-primary/10 rounded-bl-[5rem] -mr-10 -mt-10" />

                                <div className="space-y-4 relative">
                                    <span className="px-4 py-1.5 rounded-full bg-slate-900 dark:bg-primary text-white text-[9px] font-black uppercase tracking-[0.2em]">
                                        Question {currentQuestionIndex + 1}
                                    </span>
                                    <h2 className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-white leading-tight">
                                        {currentQuestion.question}
                                    </h2>
                                </div>

                                <div className="grid grid-cols-1 gap-4">
                                    {currentQuestion.shuffledOptions.map((opt, oIdx) => (
                                        <button
                                            key={oIdx}
                                            onClick={() => handleSelectAnswer(currentQuestion._id, opt.originalIndex)}
                                            className={`group p-5 rounded-2xl text-left border-2 transition-all flex items-center gap-6 ${
                                                answers[currentQuestion._id] === opt.originalIndex
                                                ? 'border-primary bg-primary/5 dark:bg-slate-800 shadow-xl shadow-primary/20 translate-x-2'
                                                : 'border-slate-200 dark:border-white/5 bg-white dark:bg-white/5 hover:border-primary/40 hover:bg-primary/5 dark:hover:bg-slate-800 hover:translate-x-1 hover:shadow-md'
                                            }`}
                                        >
                                            <div className={`w-10 h-10 shrink-0 rounded-xl border-2 flex items-center justify-center font-black text-base transition-all ${
                                                answers[currentQuestion._id] === opt.originalIndex
                                                ? 'bg-primary border-primary text-white shadow-lg shadow-orange-200'
                                                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-white/10 text-slate-600 group-hover:border-primary/40 group-hover:text-primary group-hover:bg-primary/5'
                                            }`}>
                                                {String.fromCharCode(65 + oIdx)}
                                            </div>
                                            <span className={`text-lg font-bold transition-colors ${
                                                answers[currentQuestion._id] === opt.originalIndex ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white'
                                            }`}>{opt.text}</span>
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>

                {/* Detailed Review Overlay */}
                <AnimatePresence>
                    {showReview && testResult && (
                        <motion.div 
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            className="absolute inset-0 z-[5000] bg-white dark:bg-[#0f1117] flex flex-col overflow-hidden"
                        >
                            <div className="p-6 sm:p-8 border-b dark:border-white/5 bg-white dark:bg-[#1a1f2e] flex items-center justify-between sticky top-0 z-20 shadow-sm">
                                <div className="flex-1">
                                    <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight leading-none mb-1">{selectedTest?.title}</h2>
                                    <p className="text-[10px] text-gray-400 dark:text-slate-500 font-black uppercase tracking-[0.2em]">Test Review Session</p>
                                </div>

                                <div className="flex-1 flex justify-end">
                                    <div className="px-4 py-2 bg-primary/5 rounded-xl flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                        <span className="text-[10px] font-black text-primary uppercase tracking-widest">Test Completed</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 sm:p-12 space-y-8 bg-slate-50/50 dark:bg-[#0f1117]">
                                <div className="max-w-5xl mx-auto space-y-8 pb-12">
                                    {/* Final Score Card at Top */}
                                    <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-8 sm:p-10 rounded-[3rem] text-center shadow-2xl shadow-slate-200 relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent" />
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] block mb-6">Final Performance</span>

                                        <div className="grid grid-cols-2 sm:grid-cols-4 items-stretch border-y border-slate-700/50 mb-6">
                                            <div className="text-center">
                                                <div className="h-full py-6 flex flex-col items-center justify-center">
                                                    <span className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Total Marks</span>
                                                    <span className="text-3xl sm:text-4xl font-black text-white">{testResult.totalMarks}</span>
                                                </div>
                                            </div>
                                            <div className="text-center py-6 border-l border-slate-700/50">
                                                <span className="text-[9px] sm:text-[10px] font-black text-primary uppercase tracking-widest block mb-2">Obtained Marks</span>
                                                <span className="text-3xl sm:text-4xl font-black text-white">{testResult.score}</span>
                                            </div>
                                            <div className="text-center py-6 border-t sm:border-t-0 sm:border-l border-slate-700/50">
                                                <span className="text-[9px] sm:text-[10px] font-black text-red-400 uppercase tracking-widest block mb-2">Wrong Answers</span>
                                                <span className="text-3xl sm:text-4xl font-black text-white">
                                                    {(testResult?.questions || []).filter(q => testResult.userAnswers?.[q._id] !== q.correctOption).length}
                                                </span>
                                            </div>
                                            <div className="text-center py-6 border-t border-l sm:border-t-0 border-slate-700/50">
                                                <span className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Grade</span>
                                                {(() => {
                                                    const grade = getTestGrade(testResult.score, testResult.totalMarks);
                                                    return <span className={`text-3xl sm:text-4xl font-black ${grade.color}`}>{grade.label}</span>;
                                                })()}
                                            </div>
                                        </div>

                                        <button 
                                            onClick={() => {
                                                exitFullscreen();
                                                setIsTakingTest(false);
                                                document.body.removeAttribute('data-taking-test');
                                                setSelectedTest(null);
                                                setTestResult(null);
                                                setShowReview(false);
                                            }}
                                            className="w-full py-4 bg-primary text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-orange-900/20 hover:bg-[#e67e01] transition-all"
                                        >
                                            Return to Dashboard
                                        </button>
                                    </div>
                                    {(testResult?.questions || []).map((q, idx) => {
                                        const userChoice = testResult.userAnswers?.[q._id];
                                        const isCorrect = userChoice === q.correctOption;

                                        return (
                                            <div key={q._id} className="bg-white dark:bg-[#1a1f2e] rounded-[2.5rem] p-8 border-2 border-slate-200 dark:border-white/5 shadow-sm space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${idx * 0.1}s` }}>
                                                <div className="flex items-center gap-6">
                                                    <div className="relative shrink-0">
                                                        <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center shadow-lg bg-white dark:bg-slate-800 border-2 ${
                                                            isCorrect ? 'border-primary/10 dark:border-primary/20' : 'border-red-100 dark:border-red-900/30'
                                                        }`}>
                                                            <span className={`text-2xl font-black ${isCorrect ? 'text-primary' : 'text-red-500'}`}>
                                                                {idx + 1}
                                                            </span>
                                                        </div>
                                                        <div className={`absolute -top-2 -right-2 w-8 h-8 rounded-full border-2 border-white flex items-center justify-center shadow-sm ${
                                                            isCorrect ? 'bg-primary' : 'bg-red-500'
                                                        }`}>
                                                            {isCorrect ? (
                                                                <CheckCircle className="w-4 h-4 text-white" />
                                                            ) : (
                                                                <X className="w-4 h-4 text-white" />
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex-1">
                                                        <h4 className="text-xl font-bold text-gray-800 dark:text-white leading-relaxed">{q.question}</h4>
                                                        {!isCorrect && userChoice === undefined && (
                                                            <span className="text-[10px] font-black text-red-500 uppercase mt-1 block tracking-widest">Question Skipped</span>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 gap-3 sm:ml-14">
                                                    {q.options.map((opt, oIdx) => {
                                                        const isUserSelection = userChoice === oIdx;
                                                        const isCorrectOption = q.correctOption === oIdx;
                                                        
                                                        let bgColor = 'bg-slate-50 dark:bg-slate-800 border-transparent dark:border-white/5';
                                                        let textColor = 'text-slate-600 dark:text-slate-400';
                                                        let iconColor = 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500';

                                                        if (isCorrectOption) {
                                                            bgColor = 'bg-primary/5 dark:bg-primary/10 border-primary';
                                                            textColor = 'text-primary';
                                                            iconColor = 'bg-primary text-white';
                                                        } else if (isUserSelection && !isCorrect) {
                                                            bgColor = 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900/30';
                                                            textColor = 'text-red-700 dark:text-red-400';
                                                            iconColor = 'bg-red-500 text-white';
                                                        }

                                                        return (
                                                            <div 
                                                                key={oIdx}
                                                                className={`p-4 rounded-2xl border-2 flex items-center gap-4 transition-all ${bgColor}`}
                                                            >
                                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs ${iconColor}`}>
                                                                    {String.fromCharCode(65 + oIdx)}
                                                                </div>
                                                                <span className={`font-bold ${textColor}`}>{opt}</span>
                                                                {isCorrectOption && (
                                                                    <CheckCircle className="w-5 h-5 text-primary ml-auto" />
                                                                )}
                                                                {isUserSelection && !isCorrect && (
                                                                    <AlertCircle className="w-5 h-5 text-red-500 ml-auto" />
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}

                                    <div className="h-12" />
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        );
    }

    return (
        <div className="space-y-4 sm:space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white uppercase">My Tests</h3>
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">View and take tests for your course</p>
                </div>
            </div>

            {/* Stats Row */}
            {tests.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 overflow-hidden rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 shadow-sm">
                    {[
                        { label: 'Total Tests', icon: FileText, count: tests.length, accent: 'text-blue-600', iconBg: 'bg-blue-50 dark:bg-blue-500/10' },
                        { label: 'Completed', icon: CheckCircle, count: tests.filter(t => t.submissions?.[0]).length, accent: 'text-emerald-600', iconBg: 'bg-emerald-50 dark:bg-emerald-500/10' },
                        { label: 'Pending', icon: Clock, count: tests.filter(t => !t.submissions?.[0]).length, accent: 'text-amber-600', iconBg: 'bg-amber-50 dark:bg-amber-500/10' },
                        { label: 'Passed', icon: Award, count: tests.filter(t => { const s = t.submissions?.[0]; if (!s) return false; const total = s.totalPossibleScore || t.totalMarks || t.questions?.length || 1; return (s.score / total) >= 0.5; }).length, accent: 'text-purple-600', iconBg: 'bg-purple-50 dark:bg-purple-500/10' },
                    ].map((stat, i) => (
                        <div
                            key={stat.label}
                            className={`min-w-0 p-3 sm:p-4 flex items-center gap-3
                                ${i < 2 ? 'border-b' : ''} ${i % 2 === 0 ? 'border-r' : ''} border-gray-200 dark:border-slate-700
                                sm:border-b-0 ${i < 3 ? 'sm:border-r' : 'sm:border-r-0'}`}
                        >
                            <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl ${stat.iconBg} ${stat.accent} flex items-center justify-center shrink-0`}>
                                <stat.icon className="w-4 h-4 sm:w-5 sm:h-5" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xl sm:text-2xl font-black leading-none text-gray-900 dark:text-white">{stat.count}</p>
                                <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-wide text-gray-400 dark:text-slate-400 block mt-1 leading-tight">
                                    {stat.label}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {tests.length === 0 ? (
                <div className="bg-gray-50 rounded-3xl p-12 text-center border-2 border-dashed border-gray-200">
                    <Zap className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 font-bold italic">No tests are currently available for this course.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {tests.map((test) => {
                        const submission = test.submissions?.[0];
                        const isCompleted = !!submission;

                        return (
                            <div 
                                key={test._id}
                                className="bg-white border-2 border-gray-100 rounded-3xl p-6 transition-all group"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="p-3 rounded-2xl bg-primary/5">
                                        <Zap className="w-6 h-6 text-primary" />
                                    </div>
                                    <Badge variant={isCompleted ? 'success' : 'warning'}>
                                        {isCompleted ? 'Completed' : 'Pending'}
                                    </Badge>
                                </div>
                                
                                <h4 className="text-lg font-black text-gray-900 mb-1 uppercase tracking-tight">{test.title}</h4>
                                <div className="flex items-center gap-4 mb-6">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{test.duration} MINS</span>
                                    {test.dueDate && (
                                        <span className="text-[10px] font-black text-red-500 uppercase tracking-widest flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            DUE: {formatDate(test.dueDate)}
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-gray-500 mb-6 line-clamp-2">{test.description || 'No instructions provided'}</p>
                                
                                {isCompleted ? (
                                <div className="space-y-3">
                                    <div className="bg-primary/5 rounded-2xl p-4 border border-primary/10 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-white rounded-xl">
                                                <Award className="w-5 h-5 text-primary" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-primary uppercase tracking-widest">Your Score</p>
                                                <p className="text-xl font-black text-primary leading-none">{submission.score}/{submission.totalPossibleScore || test.totalMarks}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-black text-primary uppercase tracking-widest">Percentage</p>
                                            <p className="text-xl font-black text-primary leading-none">
                                                {Math.round((submission.score / (submission.totalPossibleScore || test.totalMarks)) * 100)}%
                                            </p>
                                        </div>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-gray-100 dark:border-slate-700">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Teacher Feedback</p>
                                        <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                                            {getAutomaticFeedback((submission.score / (submission.totalPossibleScore || test.totalMarks)) * 100)}
                                        </p>
                                    </div>
                                </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="flex items-center gap-2 text-xs font-bold text-gray-600 bg-gray-50 p-2 rounded-xl">
                                                <Clock className="w-3.5 h-3.5 text-primary" />
                                                {test.duration} Mins
                                            </div>
                                            <div className="flex items-center gap-2 text-xs font-bold text-gray-600 bg-gray-50 p-2 rounded-xl">
                                                <FileText className="w-3.5 h-3.5 text-blue-500" />
                                                {test.questions?.length || 0} MCQs
                                            </div>
                                        </div>
                                        
                                        {test.dueDate && isDueDateOverdue(test.dueDate) ? (
                                            <div className="w-full py-4 bg-red-50 text-red-500 border border-red-100 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 cursor-not-allowed">
                                                <AlertCircle className="w-4 h-4" />
                                                Test Expired
                                            </div>
                                        ) : (
                                            <button 
                                                onClick={() => handleRequestStartTest(test)}
                                                className="w-full py-4 bg-primary text-white rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-[#e67e01] transition-all shadow-lg shadow-primary/10"
                                            >
                                                <ButtonLoader isLoading={false}>
                                                    Start Test
                                                </ButtonLoader>
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            <AnimatePresence>
                {termsTest && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.96, y: 16 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.96, y: 16 }}
                            className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-700 overflow-hidden"
                        >
                            <div className="p-5 bg-primary text-white flex items-start justify-between gap-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <AlertCircle className="w-5 h-5" />
                                        <h3 className="text-lg font-black uppercase tracking-tight">Test Terms & Conditions</h3>
                                    </div>
                                    <p className="text-white/80 text-sm font-medium">{termsTest.title}</p>
                                </div>
                                <button
                                    onClick={() => setTermsTest(null)}
                                    className="w-9 h-9 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="p-5 max-h-[60vh] overflow-y-auto space-y-5">
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="rounded-2xl border border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 p-4">
                                        <h4 className="font-black text-gray-900 dark:text-white mb-3">English Rules</h4>
                                        <ul className="space-y-2 text-sm text-gray-700 dark:text-slate-300 font-medium">
                                            <li>• You are not allowed to use ChatGPT, AI tools, Google, or any external help during the test.</li>
                                            <li>• Do not open any other software, browser tab, mobile app, or file while taking the test.</li>
                                            <li>• Do not minimize, switch windows, refresh, go back, or exit fullscreen mode.</li>
                                            <li>• Do not share questions, screenshots, or answers with anyone.</li>
                                            <li>• The test must be completed by yourself only. Any cheating attempt may result in zero marks.</li>
                                            <li>• If you exit or violate test rules, the test may be submitted automatically with unanswered questions marked as 0.</li>
                                        </ul>
                                    </div>

                                    <div className="rounded-2xl border border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 p-4" dir="rtl">
                                        <h4 className="font-black text-gray-900 dark:text-white mb-3">اردو ہدایات</h4>
                                        <ul className="space-y-2 text-sm text-gray-700 dark:text-slate-300 font-medium">
                                            <li>• ٹیسٹ کے دوران ChatGPT، AI tools، Google یا کسی بھی بیرونی مدد کا استعمال منع ہے۔</li>
                                            <li>• ٹیسٹ کے دوران کوئی دوسرا software، browser tab، mobile app یا file open نہ کریں۔</li>
                                            <li>• ٹیسٹ کو minimize، window switch، refresh، back یا fullscreen سے exit نہ کریں۔</li>
                                            <li>• سوالات، screenshots یا answers کسی کے ساتھ share نہ کریں۔</li>
                                            <li>• ٹیسٹ صرف آپ نے خود حل کرنا ہے۔ cheating کی صورت میں marks zero ہو سکتے ہیں۔</li>
                                            <li>• rules violate کرنے یا test exit کرنے پر test خود submit ہو سکتا ہے اور unanswered questions پر 0 marks ملیں گے۔</li>
                                        </ul>
                                    </div>
                                </div>

                                <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-4 text-sm text-amber-800 dark:text-amber-200 font-bold">
                                    By clicking “I Agree”, you confirm that you understand these rules and will attempt the test honestly.
                                </div>
                            </div>

                            <div className="p-5 border-t border-gray-100 dark:border-slate-700 flex flex-col sm:flex-row gap-3 sm:justify-end">
                                <button
                                    onClick={() => setTermsTest(null)}
                                    className="px-5 py-3 rounded-2xl bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-200 font-black uppercase tracking-widest text-xs"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleAgreeTerms}
                                    className="px-6 py-3 rounded-2xl bg-primary text-white font-black uppercase tracking-widest text-xs shadow-lg shadow-primary/20"
                                >
                                    I Agree - Start Test
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const getTestGrade = (score, totalMarks) => {
    const percentage = totalMarks > 0 ? Math.round((score / totalMarks) * 100) : 0;
    if (percentage >= 90) return { label: 'A+', color: 'text-emerald-400' };
    if (percentage >= 85) return { label: 'A', color: 'text-emerald-400' };
    if (percentage >= 80) return { label: 'B+', color: 'text-sky-400' };
    if (percentage >= 75) return { label: 'B', color: 'text-sky-400' };
    if (percentage >= 70) return { label: 'C+', color: 'text-yellow-400' };
    if (percentage >= 65) return { label: 'C', color: 'text-yellow-400' };
    if (percentage >= 60) return { label: 'D', color: 'text-red-400' };
    return { label: 'F', color: 'text-red-400' };
};

export default StudentTestsTab;
