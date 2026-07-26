
// ... imports
import StudentCourseView from './pages/student/StudentCourseView';

// ... Inside AppRoutes return:

// Student Routes
<Route
    path="/student"
    element={<ProtectedRoute allowedRoles={['student']}><DashboardLayout /></ProtectedRoute>}
>
    {/* ... existing routes */}
    <Route path="course/:id" element={<StudentCourseView />} />
</Route>

// Intern Routes
<Route
    path="/intern"
    element={<ProtectedRoute allowedRoles={['intern']}><DashboardLayout /></ProtectedRoute>}
>
    {/* ... existing routes */}
    <Route path="course/:id" element={<StudentCourseView />} />
</Route>

