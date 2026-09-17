const ASSIGNABLE_SCREENS = [
    { id: 'student_directory', name: 'Directory', route: '/admin/directory', icon: 'FolderOpen' },
    { id: 'teacher_directory', name: 'Teacher Directory', route: '/admin/teacher-directory', icon: 'FolderOpen' },
    { id: 'attendance_settings', name: 'Attendance Settings', route: '/admin/attendance-settings', icon: 'Settings' },
    { id: 'course_management', name: 'Course Management', route: '/admin/courses', icon: 'BookOpen' },
    { id: 'student_management', name: 'Student Management', route: '/admin/students', icon: 'Users' },
    { id: 'teacher_management', name: 'Teacher Management', route: '/admin/teachers', icon: 'Users' },
    { id: 'intern_management', name: 'Intern Management', route: '/admin/interns', icon: 'Users' },
    { id: 'fee_verification', name: 'Fee Verification', route: '/admin/fees', icon: 'CreditCard' },
    { id: 'certificate_management', name: 'Certificate Management', route: '/admin/certificates', icon: 'Award' },
    { id: 'notification_management', name: 'Notification Management', route: '/admin/notifications', icon: 'Bell' },
    { id: 'expense_management', name: 'Expense Management', route: '/admin/expense', icon: 'DollarSign' },
    { id: 'project_management', name: 'Project Management', route: '/admin/projects', icon: 'FolderOpen' },
    { id: 'paid_tasks', name: 'Paid Tasks', route: '/admin/paid-tasks', icon: 'Briefcase' },
    { id: 'registration_pages', name: 'Registration Pages', route: '/admin/registration-pages', icon: 'FileText' },
];

module.exports = ASSIGNABLE_SCREENS;
