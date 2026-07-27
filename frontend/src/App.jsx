import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { useSelector } from 'react-redux';
import { useEffect, lazy, Suspense } from 'react';
import store from './store/store';
import { subscribeToPushNotifications } from './utils/pushNotifications';

// Layout (keep eagerly loaded - used on every authenticated page)
import DashboardLayout from './components/layout/DashboardLayout';

// Loading fallback for lazy-loaded pages
const PageLoader = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}>
    <div style={{ width: '40px', height: '40px', border: '3px solid rgba(99,102,241,0.3)', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

// Auth Pages (lazy loaded)
const Login = lazy(() => import('./pages/auth/Login'));
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/auth/ResetPassword'));
const RoleSelection = lazy(() => import('./pages/auth/RoleSelection'));
const StudentRegister = lazy(() => import('./pages/auth/StudentRegister'));
const InternshipRegister = lazy(() => import('./pages/auth/InternshipRegister'));
const JobRegister = lazy(() => import('./pages/auth/JobRegister'));
const TeacherRegister = lazy(() => import('./pages/auth/TeacherRegister'));

// Student Pages (lazy loaded)
const StudentDashboard = lazy(() => import('./pages/student/StudentDashboard'));
const AssignmentSubmission = lazy(() => import('./pages/student/AssignmentSubmission'));
const MarksSheet = lazy(() => import('./pages/student/MarksSheet'));
const StudentProfile = lazy(() => import('./pages/student/StudentProfile'));
const BrowseCourses = lazy(() => import('./pages/student/BrowseCourses'));
const FeeManagement = lazy(() => import('./pages/student/FeeManagement'));

// Admin Pages (lazy loaded)
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const CourseManagement = lazy(() => import('./pages/admin/CourseManagement'));
const FeeVerification = lazy(() => import('./pages/admin/FeeVerification'));
const PaidTasksManagement = lazy(() => import('./pages/admin/PaidTasksManagement'));
const CertificateManagement = lazy(() => import('./pages/admin/CertificateManagement'));
const TeachersManagement = lazy(() => import('./pages/admin/TeachersManagement'));
const StudentsManagement = lazy(() => import('./pages/admin/StudentsManagement'));
const InternsManagement = lazy(() => import('./pages/admin/InternsManagement'));
const JobsManagement = lazy(() => import('./pages/admin/JobsManagement'));
const NotificationManagement = lazy(() => import('./pages/admin/NotificationManagement'));
const StudentDirectory = lazy(() => import('./pages/admin/StudentDirectory'));
const TeacherDirectory = lazy(() => import('./pages/admin/TeacherDirectory'));
const AttendanceSettings = lazy(() => import('./pages/admin/AttendanceSettings'));
const ExpenseManagement = lazy(() => import('./pages/admin/ExpenseManagement'));
const RegistrationPages = lazy(() => import('./pages/admin/RegistrationPages'));

// Shared Pages (lazy loaded)
const JobChat = lazy(() => import('./pages/shared/JobChat'));
const DiscussionRoom = lazy(() => import('./pages/shared/DiscussionRoom'));

// Teacher Pages (lazy loaded)
const TeacherProfile = lazy(() => import('./pages/teacher/TeacherProfile'));
const AttendanceSheet = lazy(() => import('./pages/teacher/AttendanceSheet'));
const TeacherCourses = lazy(() => import('./pages/teacher/TeacherCourses'));
const QuickAttendance = lazy(() => import('./pages/teacher/QuickAttendance'));
const TeacherCertificates = lazy(() => import('./pages/teacher/TeacherCertificates'));

// Job Pages (lazy loaded)
const JobDashboard = lazy(() => import('./pages/job/JobDashboard'));
const BrowseTasks = lazy(() => import('./pages/job/BrowseTasks'));
const JobProfile = lazy(() => import('./pages/job/JobProfile'));

// Public Pages (lazy loaded)
const CertificateVerification = lazy(() => import('./pages/public/CertificateVerification'));

// Settings & Support (lazy loaded)
const Settings = lazy(() => import('./pages/settings/Settings'));
const HelpSupport = lazy(() => import('./pages/support/HelpSupport'));

// Live Class (lazy loaded)
const AdeebMeet = lazy(() => import('./pages/live/AdeebMeet'));

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, role } = useSelector((state) => state.auth);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    if (role === 'admin') return <Navigate to="/admin/dashboard" replace />;
    if (role === 'teacher') return <Navigate to="/teacher/dashboard" replace />;
    if (role === 'job') return <Navigate to="/job/dashboard" replace />;
    if (role === 'intern') return <Navigate to="/intern/dashboard" replace />;
    return <Navigate to="/student/dashboard" replace />;
  }

  return children;
};

// App Routes Component
const AppRoutes = () => {
  const { isAuthenticated, role } = useSelector((state) => state.auth);

  useEffect(() => {
    if (isAuthenticated) {
      // Small timeout to not block rendering
      setTimeout(() => subscribeToPushNotifications(), 1000);
    }
  }, [isAuthenticated]);

  const getDefaultPage = () => {
    switch (role) {
      case 'admin': return '/admin/dashboard';
      case 'teacher': return '/teacher/dashboard';
      case 'job': return '/job/dashboard';
      case 'intern': return '/intern/dashboard';
      default: return '/student/dashboard';
    }
  };

  return (
    <Routes>
      {/* Public Routes */}
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to={getDefaultPage()} replace /> : <Login />}
      />
      <Route
        path="/forgot-password"
        element={isAuthenticated ? <Navigate to={getDefaultPage()} replace /> : <ForgotPassword />}
      />
      <Route
        path="/reset-password/:token"
        element={<ResetPassword />}
      />

      {/* Registration Routes */}
      <Route path="/register" element={isAuthenticated ? <Navigate to={getDefaultPage()} replace /> : <RoleSelection />} />
      <Route path="/register/student" element={isAuthenticated ? <Navigate to={getDefaultPage()} replace /> : <StudentRegister />} />
      <Route path="/register/internship" element={isAuthenticated ? <Navigate to={getDefaultPage()} replace /> : <InternshipRegister />} />
      <Route path="/register/job" element={isAuthenticated ? <Navigate to={getDefaultPage()} replace /> : <JobRegister />} />
      <Route path="/register/teacher" element={isAuthenticated ? <Navigate to={getDefaultPage()} replace /> : <TeacherRegister />} />

      {/* Admin Routes */}
      <Route
        path="/admin"
        element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout /></ProtectedRoute>}
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="courses" element={<CourseManagement />} />
        <Route path="paid-tasks" element={<PaidTasksManagement />} />
        <Route path="job-chat" element={<JobChat />} />
        <Route path="certificates" element={<CertificateManagement />} />
        <Route path="students" element={<StudentsManagement />} />
        <Route path="teachers" element={<TeachersManagement />} />
        <Route path="interns" element={<InternsManagement />} />
        <Route path="jobs" element={<JobsManagement />} />
        <Route path="fees" element={<FeeVerification />} />
        <Route path="notifications" element={<NotificationManagement />} />
        <Route path="directory" element={<StudentDirectory />} />
        <Route path="teacher-directory" element={<TeacherDirectory />} />
        <Route path="settings" element={<Settings />} />
        <Route path="attendance-settings" element={<AttendanceSettings />} />
        <Route path="expense" element={<ExpenseManagement />} />
        <Route path="registration-pages" element={<RegistrationPages />} />
        <Route path="discussion-room" element={<DiscussionRoom />} />
        <Route path="help-support" element={<HelpSupport />} />
      </Route>

      {/* Public Verification Route */}
      <Route path="/verify" element={<CertificateVerification />} />

      {/* Teacher Routes - handles Students AND Interns */}
      <Route
        path="/teacher"
        element={<ProtectedRoute allowedRoles={['teacher']}><DashboardLayout /></ProtectedRoute>}
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<TeacherCourses isDashboard={true} />} />
        <Route path="courses" element={<TeacherCourses isDashboard={false} />} />
        <Route path="student-search" element={<TeacherCourses isDashboard={false} initialSearchMode="students" />} />
        <Route path="profile" element={<TeacherProfile />} />
        <Route path="quick-attendance" element={<QuickAttendance />} />
        <Route path="course/:id" element={<AttendanceSheet />} />
        <Route path="certificates" element={<TeacherCertificates />} />
        <Route path="jobs" element={<PaidTasksManagement />} />
        <Route path="job-chat" element={<JobChat />} />
        <Route path="discussion-room" element={<DiscussionRoom />} />
        <Route path="settings" element={<Settings />} />
        <Route path="help-support" element={<HelpSupport />} />
      </Route>

      {/* Student Routes */}
      <Route
        path="/student"
        element={<ProtectedRoute allowedRoles={['student']}><DashboardLayout /></ProtectedRoute>}
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<StudentDashboard />} />
        <Route path="profile" element={<StudentProfile />} />
        <Route path="courses" element={<BrowseCourses />} />
        <Route path="fees" element={<FeeManagement />} />
        <Route path="assignments" element={<AssignmentSubmission />} />
        <Route path="marks" element={<MarksSheet />} />
        <Route path="discussion-room" element={<DiscussionRoom />} />
        <Route path="settings" element={<Settings />} />
        <Route path="help-support" element={<HelpSupport />} />
      </Route>

      {/* Intern Routes */}
      <Route
        path="/intern"
        element={<ProtectedRoute allowedRoles={['intern']}><DashboardLayout /></ProtectedRoute>}
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<StudentDashboard />} />
        <Route path="profile" element={<StudentProfile />} />
        <Route path="courses" element={<BrowseCourses />} />
        <Route path="fees" element={<FeeManagement />} />
        <Route path="assignments" element={<AssignmentSubmission />} />
        <Route path="marks" element={<MarksSheet />} />
        <Route path="discussion-room" element={<DiscussionRoom />} />
        <Route path="settings" element={<Settings />} />
        <Route path="help-support" element={<HelpSupport />} />
      </Route>

      {/* Job Routes - Paid Tasks System */}
      <Route
        path="/job"
        element={<ProtectedRoute allowedRoles={['job']}><DashboardLayout /></ProtectedRoute>}
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<JobDashboard />} />
        <Route path="tasks" element={<BrowseTasks />} />
        <Route path="job-chat" element={<JobChat />} />
        <Route path="profile" element={<JobProfile />} />
        <Route path="discussion-room" element={<DiscussionRoom />} />
        <Route path="settings" element={<Settings />} />
        <Route path="help-support" element={<HelpSupport />} />
      </Route>

      <Route
        path="/live-meet/:roomName"
        element={<ProtectedRoute><AdeebMeet /></ProtectedRoute>}
      />

      {/* Root redirect */}
      <Route
        path="/"
        element={isAuthenticated ? <Navigate to={getDefaultPage()} replace /> : <Navigate to="/login" replace />}
      />

      {/* 404 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <Provider store={store}>
      <Router>
        <Toaster position="top-right" reverseOrder={false} />
        <Suspense fallback={<PageLoader />}>
          <AppRoutes />
        </Suspense>
      </Router>
    </Provider>
  );
}

export default App;


