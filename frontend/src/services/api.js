import axios from 'axios';
import { getApiBaseUrl } from '../config/apiBaseUrl';

// Create axios instance
const api = axios.create({
    timeout: 15000,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Resolve API URL on every request (live site uses /api → Vercel proxy → Render)
api.interceptors.request.use((config) => {
    config.baseURL = getApiBaseUrl();
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        if (import.meta.env.DEV) console.log(`🔐 [API] Request: ${config.method.toUpperCase()} ${config.url} with token`);
    } else {
        if (import.meta.env.DEV) console.warn(`⚠️ [API] Request: ${config.method.toUpperCase()} ${config.url} WITHOUT token`);
    }
    // Let the browser set multipart boundary (manual Content-Type breaks file uploads)
    if (config.data instanceof FormData) {
        delete config.headers['Content-Type'];
    }
    return config;
});

// Handle response errors
api.interceptors.response.use(
    (response) => {
        if (import.meta.env.DEV) console.log(`✅ [API] Response: ${response.config.method.toUpperCase()} ${response.config.url} - Status: ${response.status}`);
        return response;
    },
    (error) => {
        if (import.meta.env.DEV) console.error(`❌ [API] Error: ${error.config?.method?.toUpperCase()} ${error.config?.url}`);
        if (import.meta.env.DEV) console.error(`❌ [API] Status: ${error.response?.status}`);
        if (import.meta.env.DEV) console.error(`❌ [API] Message: ${error.response?.data?.message || error.message}`);
        if (import.meta.env.DEV) console.error(`❌ [API] Full Error:`, error.response?.data || error);

        const isLoginRequest = error.config?.url === '/auth/login' || error.config?.url?.endsWith('/auth/login');
        if (error.response?.status === 401 && !isLoginRequest) {
            if (import.meta.env.DEV) console.warn('🚪 [API] 401 Unauthorized - Clearing session and redirecting to login');
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            sessionStorage.removeItem('token');
            sessionStorage.removeItem('user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// Auth APIs
export const authAPI = {
    register: (formData) => api.post('/auth/register', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
    login: (credentials) => api.post('/auth/login', credentials),
    getMe: () => api.get('/auth/me'),
    updateProfile: (data) => api.put('/auth/profile', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
    forgotPassword: (data) => api.post('/auth/forgot-password', data),
    resetPassword: (token, data) => api.post(`/auth/reset-password/${token}`, data),
    getAvailableRoles: () => api.get('/auth/available-roles'),
    switchRole: (data) => api.post('/auth/switch-role', data),
    updateThemePreference: (colorTheme, customTheme) => api.put('/auth/preferences/theme', { colorTheme, customTheme }),
    changePassword: (data) => api.put('/auth/change-password', data)
};

// User APIs (for admin)
export const userAPI = {
    getByRole: (role) => api.get(`/users/role/${role}`),
    getVerifiedByRole: (role) => api.get(`/users/role/${role}/verified`),
    getAll: () => api.get('/users'),
    getPendingCounts: () => api.get('/users/pending-counts'),
    verify: (id) => api.put(`/users/${id}/verify`),
      unverify: (id) => api.put(`/users/${id}/unverify`),
      setActiveStatus: (id, isActive) => api.put(`/users/${id}/active-status`, { isActive }),
    updateClassTime: (id, classTime) => api.put(`/users/${id}/class-time`, { classTime }),
    delete: (id) => api.delete(`/users/${id}`),
    update: (id, data) => {
        const config = data instanceof FormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : {};
        return api.put(`/users/${id}`, data, config);
    },
    changePasswordByEmail: (data) => api.put('/users/change-password-by-email', data),
};

// Course APIs
export const courseAPI = {
    getAll: (params) => api.get('/courses', { params }),
    getOne: (id) => api.get(`/courses/${id}`),
    addView: (id) => api.post(`/courses/${id}/view`),
    addLike: (id) => api.post(`/courses/${id}/like`),
    create: (data) => {
        const config = data instanceof FormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : {};
        return api.post('/courses', data, config);
    },
    update: (id, data) => {
        const config = data instanceof FormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : {};
        return api.put(`/courses/${id}`, data, config);
    },
    delete: (id) => api.delete(`/courses/${id}`),
    getStudents: (id) => api.get(`/courses/${id}/students`),
    getTeacherDashboard: () => api.get('/courses/teacher/dashboard'),
    pauseTeacher: (courseId, teacherId) => api.put(`/courses/${courseId}/pause-teacher/${teacherId}`),
    resumeTeacher: (courseId, teacherId) => api.put(`/courses/${courseId}/resume-teacher/${teacherId}`)
};

// Enrollment APIs
export const enrollmentAPI = {
    getMy: () => api.get('/enrollments/my'),
    enroll: (courseId, data = {}) => api.post('/enrollments', { courseId, ...data }),
    complete: (id, data) => api.put(`/enrollments/${id}/complete`, data),
    withdraw: (id) => api.delete(`/enrollments/${id}`),
    getAll: () => api.get('/enrollments/all'),
    getUserEnrollments: (userId) => api.get(`/enrollments/user/${userId}`),
    pause: (enrollmentId) => api.put(`/enrollments/${enrollmentId}/pause`),
    resume: (enrollmentId) => api.put(`/enrollments/${enrollmentId}/resume`)
};

// Fee APIs
export const feeAPI = {
    getMy: () => api.get('/fees/my'),
    getPending: () => api.get('/fees/pending'),
    getAll: () => api.get('/fees/all'),
    getUserFees: (userId) => api.get(`/fees/user/${userId}`),
    checkStatus: (courseId) => api.get(`/fees/check-status/${courseId}`),
    pay: (feeId, formData) => api.post(`/fees/${feeId}/pay`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
    verify: (feeId, installmentId) => api.put(`/fees/${feeId}/installments/${installmentId}/verify`),
    reject: (feeId, installmentId) => api.put(`/fees/${feeId}/installments/${installmentId}/reject`),
    setInstallments: (feeId, installments) => api.post(`/fees/${feeId}/installments`, { installments }),
    deleteInstallment: (feeId, installmentId) => api.delete(`/fees/${feeId}/installments/${installmentId}`),
    delete: (id) => api.delete(`/fees/${id}`)
};

// Attendance APIs
export const attendanceAPI = {
    get: (courseId, date) => api.get(`/attendance/${courseId}/${date}`),
    getRange: (courseIds, startDate, endDate) => api.post('/attendance/range-report', { courseIds, startDate, endDate }),
    mark: (data) => api.post('/attendance', data),
    getReport: (courseId) => api.get(`/attendance/report/${courseId}`),
    getMy: (courseId) => api.get(`/attendance/my/${courseId}`),
    // Global holiday management (admin only for updates)
    getGlobalHolidays: () => api.get('/attendance/global-holidays'),
    updateGlobalHolidays: (holidayDays) => api.put('/attendance/global-holidays', { holidayDays }),
    getStats: (courseId) => api.get(`/attendance/stats/${courseId}`),
    getStudentAttendance: (userId) => api.get(`/attendance/student/${userId}`)
};

// Assignment APIs
export const assignmentAPI = {
    getByCourse: (courseId) => api.get(`/assignments/course/${courseId}`),
    getUserAssignments: (userId) => api.get(`/assignments/user/${userId}`),
    getMy: () => api.get('/assignments/my'),
    create: (data) => api.post('/assignments', data),
    submit: (id, formData) => api.post(`/assignments/${id}/submit`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
    grade: (assignmentId, submissionId, marks, feedback, status) =>
        api.put(`/assignments/${assignmentId}/grade/${submissionId}`, { marks, feedback, status }),
    update: (id, data) => api.put(`/assignments/${id}`, data),
    delete: (id) => api.delete(`/assignments/${id}`),
    deleteSubmission: (assignmentId, submissionId) => api.delete(`/assignments/${assignmentId}/submissions/${submissionId}`)
};

export const googleDriveAPI = {
    getStatus: () => api.get('/google-drive/status'),
    getAuthUrl: () => api.get('/google-drive/auth-url'),
    upload: (formData, onUploadProgress) => api.post('/google-drive/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 180000,
        onUploadProgress
    }),
    deleteFile: (fileId) => api.delete(`/google-drive/files/${fileId}`),
    listFolderFiles: (folderId) => api.get(`/google-drive/folders/${folderId}/files`),
    disconnect: () => api.delete('/google-drive/disconnect')
};

// Certificate APIs
export const certificateAPI = {
    getMy: () => api.get('/certificates/my'),
    getCourses: () => api.get('/certificates/courses'),
    issue: (data) => api.post('/certificates/issue', data),
    update: (id, data) => api.put(`/certificates/${id}`, data),
    getRequests: () => api.get('/certificates/requests'),
    request: (data) => api.post('/certificates/request', data),
    approveRequest: (id, data) => api.put(`/certificates/requests/${id}/approve`, data),
    rejectRequest: (id) => api.put(`/certificates/requests/${id}/reject`),
    delete: (id) => api.delete(`/certificates/${id}`),
    verify: (rollNo) => api.get(`/certificates/verify/${rollNo}`),
    // Teacher certificate methods
    getTeachers: () => api.get('/certificates/teachers'),
    issueTeacher: (data) => api.post('/certificates/issue-teacher', data),
    backfillTeacherIds: () => api.post('/certificates/backfill-teacher-ids')
};

// Paid Tasks APIs
export const taskAPI = {
    getAll: (params) => api.get('/tasks', { params }),
    getCounts: () => api.get('/tasks/counts'),
    getMy: () => api.get('/tasks/my'),
    getCompletedShowcase: () => api.get('/tasks/completed-showcase'),
    create: (data) => {
        const config = data instanceof FormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : {};
        return api.post('/tasks', data, config);
    },
    update: (id, data) => {
        const config = data instanceof FormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : {};
        return api.put(`/tasks/${id}`, data, config);
    },
    apply: (id, message) => api.post(`/tasks/${id}/apply`, { message }),
    assign: (id, userId) => api.put(`/tasks/${id}/assign`, { userId }),
    unassign: (id, userId) => api.put(`/tasks/${id}/unassign`, { userId }),
    deleteApplicant: (id, userId) => api.delete(`/tasks/${id}/applicants/${userId}`),
    submit: (id, formData) => api.post(`/tasks/${id}/submit`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
    complete: (id) => api.put(`/tasks/${id}/complete`),
    adminComplete: (id, payments, paymentProof = '') => api.put(`/tasks/${id}/admin-complete`, { payments, paymentProof }),
    reopen: (id) => api.put(`/tasks/${id}/reopen`),
    addFeedback: (id, data) => api.post(`/tasks/${id}/feedback`, data),
    editFeedback: (taskId, feedbackId, data) => api.put(`/tasks/${taskId}/feedback/${feedbackId}`, data),
    deleteFeedback: (taskId, feedbackId) => api.delete(`/tasks/${taskId}/feedback/${feedbackId}`),
    cancel: (id) => api.post(`/tasks/${id}/cancel`),
    delete: (id) => api.delete(`/tasks/${id}`)
};

// Daily Task APIs
export const dailyTaskAPI = {
    submit: (data) => api.post('/daily-tasks', data),
    getByCourse: (courseId) => api.get(`/daily-tasks/course/${courseId}`),
    getMy: (courseId) => api.get(`/daily-tasks/my/${courseId}`),
    grade: (id, data) => api.put(`/daily-tasks/${id}/grade`, data),
    edit: (id, data) => api.put(`/daily-tasks/${id}`, data),
    delete: (id) => api.delete(`/daily-tasks/${id}`),
    getUserDailyTasks: (userId) => api.get(`/daily-tasks/user/${userId}`)
};

// Test APIs
export const testAPI = {
    getByCourse: (courseId) => api.get(`/tests/course/${courseId}`),
    create: (data) => api.post('/tests', data),
    submit: (id, answers) => api.post(`/tests/${id}/submit`, { answers }),
    update: (id, data) => api.put(`/tests/${id}`, data),
    delete: (id) => api.delete(`/tests/${id}`),
    deleteSubmission: (testId, submissionId) => api.delete(`/tests/${testId}/submissions/${submissionId}`)
};

// Notification APIs
export const notificationAPI = {
    getActive: () => api.get('/notifications/active'),
    getAll: () => api.get('/notifications'),
    create: (data) => api.post('/notifications', data),
    update: (id, data) => api.put(`/notifications/${id}`, data),
    delete: (id) => api.delete(`/notifications/${id}`)
};

// User Notification APIs
export const userNotificationAPI = {
    getAll: () => api.get('/user-notifications'),
    getUnreadCount: () => api.get('/user-notifications/unread-count'),
    markAsRead: (id) => api.put(`/user-notifications/${id}/read`),
    markAllAsRead: () => api.put('/user-notifications/mark-all-read'),
    delete: (id) => api.delete(`/user-notifications/${id}`)
};

// Chat APIs
export const chatAPI = {
    getMessages: (otherUserId) => api.get(`/chat/messages/${otherUserId}`),
    sendMessage: (recipientId, text, media = []) => api.post('/chat/messages', { recipientId, text, media }),
    sendBotReply: (recipientId, text, options) => api.post('/chat/bot-reply', { recipientId, text, options }),
    getConversations: () => api.get('/chat/conversations'),
    markAsRead: (senderId) => api.put(`/chat/read/${senderId}`),
    getUnread: () => api.get('/chat/unread'),
    clearChatHistory: (userId) => {
        if (import.meta.env.DEV) console.log(`[API] Requesting to CLEAR CHAT HISTORY for user ${userId} via POST /chat/action/clear-messages/`);
        return api.post(`/chat/action/clear-messages/${userId}`);
    },
    // Course-based chat APIs
    getCourseMessages: (courseId, userId) => api.get(`/chat/course/${courseId}/messages/${userId}`),
    sendCourseMessage: (courseId, recipientId, text, media = []) => api.post(`/chat/course/${courseId}/send`, { recipientId, text, media }),
    getTeacherCourses: () => api.get('/chat/teacher/courses'),
    getStudentCourses: () => api.get('/chat/student/courses'),
    searchByEmail: (email, courseId = null) => {
        const params = courseId ? `?email=${email}&courseId=${courseId}` : `?email=${email}`;
        return api.get(`/chat/search${params}`);
    },
    markCourseAsRead: (courseId, senderId) => api.put(`/chat/course/${courseId}/read/${senderId}`),
    clearCourseChat: (courseId, userId) => api.post(`/chat/course/${courseId}/clear/${userId}`),
    getJobChats: () => api.get('/chat/job/tasks'),
    getJobMessages: (taskId, userId) => api.get(`/chat/job/${taskId}/messages/${userId}`),
    sendJobMessage: (taskId, recipientId, text, media = []) => api.post(`/chat/job/${taskId}/send`, { recipientId, text, media }),
    markJobChatRead: (taskId, senderId) => api.put(`/chat/job/${taskId}/read/${senderId}`),
    clearJobChat: (taskId, userId) => api.delete(`/chat/job/${taskId}/messages/${userId}`),
    getDiscussionMessages: () => api.get('/chat/discussion'),
    getDiscussionOnlineCount: () => api.get('/chat/discussion/online-count'),
    getDiscussionUnread: () => api.get('/chat/discussion/unread'),
    markDiscussionRead: () => api.put('/chat/discussion/read'),
    sendDiscussionMessage: (text, media = []) => api.post('/chat/discussion', { text, media }),
    createDiscussionPoll: (question, options) => api.post('/chat/discussion/poll', { question, options }),
    voteDiscussionPoll: (messageId, optionIndex) => api.put(`/chat/discussion/${messageId}/poll-vote`, { optionIndex }),
    toggleDiscussionReaction: (messageId, emoji) => api.put(`/chat/discussion/${messageId}/reaction`, { emoji }),
    deleteDiscussionMessage: (messageId) => api.delete(`/chat/discussion/${messageId}`),
    clearDiscussion: () => api.delete('/chat/discussion')
};

export const financeAPI = {
    getAll: (params = {}) => api.get('/finance', { params }),
    create: (data) => api.post('/finance', data),
    update: (id, data) => api.put(`/finance/${id}`, data),
    delete: (id) => api.delete(`/finance/${id}`),
    getProjects: () => api.get('/finance/projects'),
    createProject: (data) => api.post('/finance/projects', data),
    updateProject: (id, data) => api.put(`/finance/projects/${id}`, data),
    deleteProject: (id) => api.delete(`/finance/projects/${id}`)
};

export const teacherFinanceAPI = {
    getAssignedProjects: () => api.get('/teacher/finance/projects'),
    updateProject: (id, data) => api.put(`/teacher/finance/projects/${id}`, data)
};

export const reportAPI = {
    uploadInternReport: (internId, formData) => api.post(`/reports/intern/${internId}/upload`, formData),
    uploadStudentReport: (studentId, formData) => api.post(`/reports/student/${studentId}/upload`, formData)
};

// Stats APIs
export const statsAPI = {
    getAdminDashboard: (params) => api.get('/stats/admin-dashboard', { params })
};

// Settings API
export const settingsAPI = {
    getAll: () => api.get('/settings'),
    update: (key, value) => api.put(`/settings/${key}`, { value })
};

// Registration Pages API
export const registrationPageAPI = {
    getAll: () => api.get('/registration-pages'),
    getByType: (formType) => api.get(`/registration-pages/${formType}`),
    update: (formType, data) => api.put(`/registration-pages/${formType}`, data),
    updateAll: (pages) => api.put('/registration-pages', { pages })
};

// Live Class API
export const liveClassAPI = {
    create: (data) => api.post('/live-class', data),
    getAll: () => api.get('/live-class'),
    getActive: () => api.get('/live-class/active'),
    update: (id, data) => api.put(`/live-class/${id}`, data),
    end: (id) => api.put(`/live-class/${id}/end`),
    delete: (id) => api.delete(`/live-class/${id}`),
    cleanupExpired: () => api.delete('/live-class/cleanup-expired')
};

// Directory API
export const directoryAPI = {
    getAll: (filter, type) => api.get('/directory', { params: { filter, type } })
};

// Payment Methods API
export const paymentMethodAPI = {
    getPublic: () => api.get('/payment-methods/public'),
    getAll: () => api.get('/payment-methods'),
    create: (data) => api.post('/payment-methods', data),
    update: (id, data) => api.put(`/payment-methods/${id}`, data),
    delete: (id) => api.delete(`/payment-methods/${id}`)
};

export default api;

