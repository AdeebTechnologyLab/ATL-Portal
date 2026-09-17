import { useState } from 'react';
import { useSelector } from 'react-redux';
import { UserPlus } from 'lucide-react';
import AssignScreenModal from './AssignScreenModal';

const ASSIGNABLE_SCREENS = {
    'student_directory': 'Directory',
    'teacher_directory': 'Teacher Directory',
    'attendance_settings': 'Attendance Settings',
    'course_management': 'Course Management',
    'student_management': 'Student Management',
    'teacher_management': 'Teacher Management',
    'intern_management': 'Intern Management',
    'fee_verification': 'Fee Verification',
    'certificate_management': 'Certificate Management',
    'notification_management': 'Notification Management',
    'expense_management': 'Expense Management',
    'project_management': 'Project Management',
    'paid_tasks': 'Paid Tasks',
    'registration_pages': 'Registration Pages'
};

const AssignScreenButton = ({ screenId }) => {
    const { user } = useSelector((state) => state.auth);
    const [open, setOpen] = useState(false);
    const screenName = ASSIGNABLE_SCREENS[screenId] || screenId;

    if (user?.role !== 'admin') return null;

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-primary/10 text-primary rounded-xl font-bold text-xs uppercase tracking-wide hover:bg-primary/20 transition-colors border border-primary/20"
            >
                <UserPlus className="w-4 h-4" />
                Assign to Teacher
            </button>
            <AssignScreenModal
                isOpen={open}
                onClose={() => setOpen(false)}
                screenId={screenId}
                screenName={screenName}
            />
        </>
    );
};

export default AssignScreenButton;
