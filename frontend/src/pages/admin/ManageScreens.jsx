import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Trash2, UserPlus, Monitor, Users } from 'lucide-react';
import { teacherScreenAssignmentAPI } from '../../services/api';
import Loader from '../../components/ui/Loader';
import AssignScreenModal from '../../components/admin/AssignScreenModal';
import toast from 'react-hot-toast';

const SCREEN_LABELS = {
    student_directory: 'Directory', teacher_directory: 'Teacher Directory',
    attendance_settings: 'Attendance Settings', course_management: 'Course Management',
    student_management: 'Student Management', teacher_management: 'Teacher Management',
    intern_management: 'Intern Management', fee_verification: 'Fee Verification',
    certificate_management: 'Certificate Management', notification_management: 'Notification Management',
    expense_management: 'Expense Management', project_management: 'Project Management',
    paid_tasks: 'Paid Tasks',
    registration_pages: 'Registration Pages'
};

const ManageScreens = () => {
    const navigate = useNavigate();
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedScreen, setSelectedScreen] = useState(null);

    useEffect(() => { fetchAssignments(); }, []);

    const fetchAssignments = async () => {
        setLoading(true);
        try {
            const res = await teacherScreenAssignmentAPI.getAll();
            setAssignments(res.data.data || []);
        } catch (error) {
            toast.error('Failed to load assignments');
        } finally {
            setLoading(false);
        }
    };

    const grouped = {};
    assignments.forEach(a => {
        if (!grouped[a.screenId]) grouped[a.screenId] = [];
        grouped[a.screenId].push(a);
    });

    const handleRemove = async (screenId, teacherId) => {
        try {
            await teacherScreenAssignmentAPI.remove(screenId, teacherId);
            toast.success('Access removed');
            fetchAssignments();
        } catch {
            toast.error('Failed to remove');
        }
    };

    const openManage = (screenId) => {
        setSelectedScreen(screenId);
        setModalOpen(true);
    };

    if (loading) return <Loader message="Loading screens..." />;

    return (
        <div className="space-y-6 min-h-screen p-4 sm:p-6 lg:p-8">
            <div className="flex items-center gap-4">
                <button onClick={() => navigate('/admin/dashboard')} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                    <ChevronLeft className="w-5 h-5 text-gray-500" />
                </button>
                <div>
                    <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Manage Screens</h1>
                    <p className="text-gray-500 text-sm">View and manage all screen assignments to teachers</p>
                </div>
            </div>

            {Object.keys(grouped).length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 bg-white rounded-2xl border border-gray-100">
                    <Monitor className="w-16 h-16 text-gray-300 mb-4" />
                    <p className="text-gray-500 font-medium">No screens assigned yet</p>
                    <p className="text-gray-400 text-sm">Use "Assign to Teacher" button on any admin page</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {Object.entries(grouped).map(([screenId, list]) => (
                        <motion.div
                            key={screenId}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
                        >
                            <div className="flex items-center justify-between p-4 border-b border-gray-50">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                                        <Monitor className="w-4 h-4 text-primary" />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-gray-900 text-sm">{SCREEN_LABELS[screenId] || screenId}</h3>
                                        <p className="text-[10px] text-gray-500">{list.length} teacher(s) assigned</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => openManage(screenId)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-[10px] font-bold hover:bg-primary/20 transition-colors"
                                >
                                    <UserPlus className="w-3 h-3" />
                                    Manage
                                </button>
                            </div>
                            <div className="divide-y divide-gray-50">
                                {list.map((a) => (
                                    <div key={a._id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                                        {a.teacher?.photo ? (
                                            <img src={a.teacher.photo} alt="" className="w-8 h-8 rounded-lg object-cover" />
                                        ) : (
                                            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-xs">
                                                {a.teacher?.name?.charAt(0)}
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-gray-900 text-sm">{a.teacher?.name}</p>
                                            <p className="text-[10px] text-gray-500">{a.teacher?.email} {a.teacher?.rollNo ? `• ${a.teacher.rollNo}` : ''}</p>
                                        </div>
                                        <span className="text-[10px] text-gray-400">{new Date(a.createdAt).toLocaleDateString()}</span>
                                        <button
                                            onClick={() => handleRemove(screenId, a.teacher?._id)}
                                            className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {selectedScreen && (
                <AssignScreenModal
                    isOpen={modalOpen}
                    onClose={() => { setModalOpen(false); setSelectedScreen(null); fetchAssignments(); }}
                    screenId={selectedScreen}
                    screenName={SCREEN_LABELS[selectedScreen] || selectedScreen}
                />
            )}
        </div>
    );
};

export default ManageScreens;
