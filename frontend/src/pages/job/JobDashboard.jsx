import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
    Briefcase, Clock, FileText, CheckCircle, XCircle, AlertCircle
} from 'lucide-react';
import { taskAPI } from '../../services/api';

const JobDashboard = () => {
    const { user } = useSelector((state) => state.auth);
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [tasks, setTasks] = useState([]);
    const [assignedTasks, setAssignedTasks] = useState([]);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        setIsLoading(true);
        try {
            // Fetch available tasks
            const tasksRes = await taskAPI.getAll();
            setTasks(tasksRes.data.data || []);

            // Fetch my assigned tasks
            const myTasksRes = await taskAPI.getMy();
            setAssignedTasks(myTasksRes.data.data || []);
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const applicationSteps = [
        { id: 1, title: 'Account Created', status: 'completed', date: new Date(user?.createdAt).toLocaleDateString() || 'Done' },
        { id: 2, title: 'Profile Complete', status: user?.phone ? 'completed' : 'current', date: user?.phone ? 'Done' : 'In Progress' },
        { id: 3, title: 'Browse Tasks', status: tasks.length > 0 ? 'completed' : 'pending', date: tasks.length > 0 ? 'Available' : 'Pending' },
        { id: 4, title: 'Apply for Tasks', status: assignedTasks.length > 0 ? 'completed' : 'pending', date: assignedTasks.length > 0 ? 'Applied' : 'Pending' },
        { id: 5, title: 'Complete Work', status: 'pending', date: 'Pending' },
    ];

    const getStatusIcon = (status) => {
        switch (status) {
            case 'completed':
                return <CheckCircle className="w-6 h-6 text-green-500" />;
            case 'current':
                return <Clock className="w-6 h-6 text-blue-500 animate-pulse" />;
            case 'pending':
                return <AlertCircle className="w-6 h-6 text-gray-300" />;
            default:
                return <XCircle className="w-6 h-6 text-red-500" />;
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
                <img src="/loading.gif" alt="Loading" className="w-20 h-20 object-contain" />
                <span className="text-gray-600 font-medium">Loading dashboard...</span>
            </div>
        );
    }

    return (
        <div className="space-y-4 sm:space-y-6">
            {/* Welcome Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-primary to-primary-dark rounded-2xl p-4 sm:p-8 text-white relative overflow-hidden"
            >
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl sm:text-3xl font-bold mb-1 sm:mb-2 break-words">
                            Welcome, {user?.name || 'Applicant'}! 👋
                        </h1>
                        <p className="text-white/80 text-xs sm:text-lg">
                            Browse available tasks and track your work!
                        </p>
                    </div>
                </div>
            </motion.div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl p-3.5 sm:p-6 shadow-sm border border-gray-100 dark:border-slate-700"
                >
                    <h2 className="text-base sm:text-xl font-semibold text-gray-900 dark:text-white mb-3 sm:mb-6 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-primary" />
                        Task Overview
                    </h2>

                    <div className="grid grid-cols-2 gap-2.5 sm:gap-6">
                        <div className="p-3 sm:p-4 bg-purple-50 dark:bg-purple-950/20 rounded-xl border border-purple-100 dark:border-purple-900">
                            <p className="text-[10px] sm:text-sm text-gray-500 dark:text-slate-400 mb-1">Available Tasks</p>
                            <p className="text-xl sm:text-2xl font-bold text-purple-900 dark:text-purple-300">{tasks.length}</p>
                        </div>
                        <div className="p-3 sm:p-4 bg-green-50 dark:bg-emerald-950/20 rounded-xl border border-green-100 dark:border-emerald-900">
                            <p className="text-[10px] sm:text-sm text-gray-500 dark:text-slate-400 mb-1">My Assigned Tasks</p>
                            <p className="text-xl sm:text-2xl font-bold text-green-900 dark:text-emerald-300">{assignedTasks.length}</p>
                        </div>
                        <div className="p-3 sm:p-4 bg-blue-50 dark:bg-blue-950/20 rounded-xl border border-blue-100 dark:border-blue-900 min-w-0">
                            <p className="text-[10px] sm:text-sm text-gray-500 dark:text-slate-400 mb-1">Location</p>
                            <p className="text-sm sm:text-base font-semibold text-blue-900 dark:text-blue-300 capitalize break-words">{user?.location || 'Not set'}</p>
                        </div>
                        <div className="p-3 sm:p-4 bg-primary/5 dark:bg-orange-950/20 rounded-xl border border-primary/10 dark:border-orange-900">
                            <p className="text-[10px] sm:text-sm text-gray-500 dark:text-slate-400 mb-1">Account Status</p>
                            <p className="text-sm sm:text-base font-semibold text-orange-900 dark:text-orange-300">{user?.isActive ? 'Active' : 'Pending'}</p>
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white dark:bg-slate-900 rounded-2xl p-3.5 sm:p-6 shadow-sm border border-gray-100 dark:border-slate-700"
                >
                    <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">Quick Actions</h2>
                    <div className="grid grid-cols-2 lg:grid-cols-1 gap-2.5 sm:gap-3">
                        <button
                            onClick={() => navigate('/job/tasks')}
                            className="w-full flex flex-col sm:flex-row items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-purple-50 dark:bg-purple-950/20 rounded-xl hover:bg-primary/10 transition-colors"
                        >
                            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                                <Briefcase className="w-5 h-5 text-primary" />
                            </div>
                            <div className="text-center sm:text-left">
                                <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">Job Posting</h3>
                                <p className="hidden sm:block text-sm text-primary">Find available job postings</p>
                            </div>
                        </button>
                        <button
                            onClick={() => navigate('/job/profile')}
                            className="w-full flex flex-col sm:flex-row items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-gray-50 dark:bg-slate-800 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                        >
                            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                                <FileText className="w-5 h-5 text-gray-600" />
                            </div>
                            <div className="text-center sm:text-left">
                                <p className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">My Profile</p>
                                <p className="hidden sm:block text-sm text-gray-600 dark:text-slate-400">Update your information</p>
                            </div>
                        </button>
                    </div>
                </motion.div>
            </div>

            {/* Progress Steps */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white dark:bg-slate-900 rounded-2xl p-3.5 sm:p-6 shadow-sm border border-gray-100 dark:border-slate-700"
            >
                <h2 className="text-base sm:text-xl font-semibold text-gray-900 dark:text-white mb-3 sm:mb-6 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-primary" />
                    Getting Started
                </h2>

                <div className="space-y-1 sm:space-y-4">
                    {applicationSteps.map((step, index) => (
                        <div key={step.id} className="flex items-start gap-3 sm:gap-4">
                            <div className="flex flex-col items-center">
                                {getStatusIcon(step.status)}
                                {index < applicationSteps.length - 1 && (
                                    <div className={`w-0.5 h-9 sm:h-12 ${step.status === 'completed' ? 'bg-green-300' : 'bg-gray-200 dark:bg-slate-700'
                                        }`} />
                                )}
                            </div>
                            <div className={`flex-1 pb-3 sm:pb-4 ${step.status === 'current' ? 'bg-blue-50 dark:bg-blue-950/20 -mx-2 sm:-mx-4 px-2 sm:px-4 py-2 sm:py-3 rounded-xl' : ''}`}>
                                <h3 className={`font-medium ${step.status === 'pending' ? 'text-gray-400' : 'text-gray-900'
                                    } dark:text-white text-sm sm:text-base`}>
                                    {step.title}
                                </h3>
                                <p className={`text-sm ${step.status === 'pending' ? 'text-gray-300' : 'text-gray-500'
                                    }`}>
                                    {step.date}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </motion.div>

            {/* Info Box */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-slate-800 dark:to-slate-900 rounded-2xl p-3.5 sm:p-6 border border-gray-200 dark:border-slate-700 shadow-sm dark:shadow-black/20"
            >
                <div className="flex items-start gap-3 sm:gap-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/10 dark:bg-primary/20 rounded-xl flex items-center justify-center flex-shrink-0">
                        <AlertCircle className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Need Help?</h3>
                        <p className="text-gray-600 dark:text-slate-300 text-sm leading-relaxed">
                            If you have any questions about available tasks or payments,
                            please contact our support team at{' '}
                            <a
                                href="https://mail.google.com/mail/?view=cm&fs=1&to=info.AdeebtechLab%40gmail.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-semibold text-gray-900 dark:text-primary hover:text-primary underline underline-offset-2 transition-colors"
                            >
                                info.AdeebtechLab@gmail.com
                            </a>{' '}
                            or WhatsApp{' '}
                            <a
                                href="https://wa.me/923092333121?text=Ye%20message%20Adeeb%20Tech%20Lab%20Job%20Portal%20se%20aaya%20hai."
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-semibold text-gray-900 dark:text-primary hover:text-primary underline underline-offset-2 transition-colors"
                            >
                                +923092333121
                            </a>.
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default JobDashboard;



