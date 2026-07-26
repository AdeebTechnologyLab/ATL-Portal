import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSelector } from 'react-redux';
import {
    Search, Award, BookOpen, Users, CheckCircle, ChevronDown, ChevronRight, User, XCircle, FileText, ClipboardList, Calendar, Edit2, Trash2, Filter, X
} from 'lucide-react';
import Loader, { ButtonLoader } from '../../components/ui/Loader';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { courseAPI, enrollmentAPI, certificateAPI } from '../../services/api';
import { formatDate } from '../../utils/dateFormatter';

const CertificateManagement = () => {
    const { user } = useSelector((state) => state.auth);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCities, setSelectedCities] = useState([]); // Array of strings
    const [selectedTypes, setSelectedTypes] = useState([]);  // Array of strings
    const [enrollmentStatusFilter, setEnrollmentStatusFilter] = useState('all'); // 'all', 'active', 'completed'
    const [certificateStartDate, setCertificateStartDate] = useState('');
    const [certificateEndDate, setCertificateEndDate] = useState('');
    const [expandedCourse, setExpandedCourse] = useState(null);

    // Helper to get local date string YYYY-MM-DD
    const getLocalDateString = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };
    const [confirmModal, setConfirmModal] = useState({ open: false, student: null, course: null, request: null });
    const [editCertModal, setEditCertModal] = useState({ open: false, certificate: null, student: null });
    const [courses, setCourses] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [requests, setRequests] = useState([]);
    const [platformCounts, setPlatformCounts] = useState({ students: 0, teachers: 0 });
    const [isLoading, setIsLoading] = useState(true);
    const [isIssuing, setIsIssuing] = useState(false);
    const [activeSection, setActiveSection] = useState('courses'); // 'courses' | 'teachers'
    const [teacherCertModal, setTeacherCertModal] = useState({ open: false, teacher: null });
    const [teacherCertData, setTeacherCertData] = useState({ rollNo: '', skills: '', duration: '', passoutDate: getLocalDateString(new Date()), certificateLink: '', selectedCourses: [] });
    const [isBackfilling, setIsBackfilling] = useState(false);

    // Modal Edit State
    const [editData, setEditData] = useState({
        rollNo: '',
        skills: '',
        duration: '',
        passoutDate: getLocalDateString(new Date()),
        certificateLink: ''
    });

    // Edit Certificate State
    const [editCertData, setEditCertData] = useState({
        rollNo: '',
        skills: '',
        duration: '',
        passoutDate: '',
        certificateLink: ''
    });

    useEffect(() => {
        fetchAllData();
    }, []);

    const fetchAllData = async () => {
        setIsLoading(true);
        try {
            console.log('🔄 [CERT] Starting to fetch data...');
            console.log('👤 [CERT] User:', user);

            const [requestsRes, coursesRes, teachersRes] = await Promise.all([
                certificateAPI.getRequests(),
                certificateAPI.getCourses(),
                certificateAPI.getTeachers()
            ]);

            console.log('✅ [CERT] Requests Response:', requestsRes);
            console.log('✅ [CERT] Courses Response:', coursesRes);

            const requestsData = requestsRes.data.requests || requestsRes.data || [];
            console.log('📋 [CERT] Requests Data:', requestsData);
            setRequests(requestsData);

            // Handle both direct array and nested structure
            const coursesData = Array.isArray(coursesRes.data)
                ? coursesRes.data
                : (coursesRes.data.courses || []);

            console.log('📚 [CERT] Courses Data:', coursesData);

            const formattedCourses = coursesData.map(course => {
                const students = (course.students || []).map(s => ({
                    _id: s._id || s.id,
                    id: s._id || s.id,
                    name: s.name,
                    rollNo: s.rollNo,
                    photo: s.photo,
                    role: s.role,
                    cnic: s.cnic,
                    type: s.role === 'intern' ? 'intern' : 'student',
                    enrollmentStatus: s.enrollmentStatus,
                    certificateIssued: s.certificateIssued || false,
                    certificate: s.certificate || null,
                    verifiedChallans: s.verifiedChallans || 0
                }));

                return {
                    id: course._id,
                    name: course.title,
                    location: course.location || course.city || 'Unknown',
                    city: course.city || course.location || 'Unknown',
                    targetAudience: course.targetAudience || 'students',
                    duration: course.duration || '12 weeks',
                    students: students
                };
            });

            console.log('✅ [CERT] Formatted Courses:', formattedCourses);
            formattedCourses.forEach(c => {
                c.students.forEach(s => {
                    console.log(`  👤 ${s.name}: verifiedChallans=${s.verifiedChallans}`);
                });
            });
            setCourses(formattedCourses);
            setTeachers(teachersRes.data.teachers || []);
            setPlatformCounts({
                students: coursesRes.data.totalPlatformStudents || 0,
                teachers: coursesRes.data.totalPlatformTeachers || teachersRes.data.teachers?.length || 0
            });
        } catch (error) {
            console.error('❌ [CERT] Error fetching data:', error);
            console.error('❌ [CERT] Error Status:', error.response?.status);
            console.error('❌ [CERT] Error Message:', error.response?.data?.message);
            console.error('❌ [CERT] Error Data:', error.response?.data);

            // More specific error messages
            if (error.response?.status === 401) {
                alert('Unauthorized: Your session has expired. Please login again.');
            } else if (error.response?.status === 403) {
                alert('Forbidden: You do not have permission to access this page. Only admins can manage certificates.');
            } else {
                alert(`Error loading certificate data: ${error.response?.data?.message || error.message || 'Unknown error'}`);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenApproveModal = (request) => {
        setConfirmModal({
            open: true,
            student: request.user,
            course: request.course,
            request: request
        });
        setEditData({
            rollNo: request.user?.rollNo || '',
            skills: request.skills || request.course?.title || '',
            duration: request.duration || request.course?.duration || '',
            passoutDate: getLocalDateString(new Date()),
            certificateLink: ''
        });
    };

    const handleIssueCertificate = async () => {
        if (!confirmModal.student || !confirmModal.course) return;

        // Add confirmation to prevent accidental issuance
        const isApprove = !!confirmModal.request;
        const confirmMessage = isApprove
            ? `Are you sure you want to APPROVE this request and issue a certificate? This will mark the course as COMPLETED for ${confirmModal.student?.name}.`
            : `Are you sure you want to ISSUE a certificate to ${confirmModal.student?.name}? This will mark their enrollment as COMPLETED.`;

        if (!window.confirm(confirmMessage)) return;

        setIsIssuing(true);
        try {
            if (confirmModal.request) {
                await certificateAPI.approveRequest(confirmModal.request._id, {
                    rollNo: editData.rollNo,
                    skills: confirmModal.course?.name || confirmModal.request.course?.title,
                    duration: confirmModal.course?.duration || '',
                    passoutDate: editData.passoutDate,
                    certificateLink: editData.certificateLink
                });
            } else {
                await certificateAPI.issue({
                    userId: confirmModal.student._id || confirmModal.student.id,
                    courseId: confirmModal.course._id || confirmModal.course.id,
                    rollNo: editData.rollNo,
                    skills: confirmModal.course.title || confirmModal.course.name,
                    passoutDate: editData.passoutDate,
                    certificateLink: editData.certificateLink
                });
            }
            alert('Certificate issued successfully!');
            fetchAllData();
        } catch (error) {
            console.error('Error issuing certificate:', error);
            alert(error.response?.data?.message || 'Failed to issue certificate');
        } finally {
            setIsIssuing(false);
            setConfirmModal({ open: false, student: null, course: null, request: null });
        }
    };

    const handleRejectRequest = async (id) => {
        if (!window.confirm('Are you sure you want to reject this request?')) return;
        try {
            await certificateAPI.rejectRequest(id);
            fetchAllData();
        } catch (error) {
            console.error('Error rejecting request:', error);
        }
    };

    const handleOpenEditCertModal = (student, course) => {
        const cert = student.certificate;
        setEditCertModal({ open: true, certificate: cert, student });
        setEditCertData({
            rollNo: cert?.rollNo || student.rollNo || '',
            skills: cert?.skills || course.title || course.name || '',
            duration: cert?.duration || course.duration || '',
            passoutDate: cert?.passoutDate ? getLocalDateString(new Date(cert.passoutDate)) : getLocalDateString(new Date()),
            certificateLink: cert?.certificateLink || ''
        });
    };

    const handleUpdateCertificate = async () => {
        if (!editCertModal.certificate?._id) return;

        setIsIssuing(true);
        try {
            await certificateAPI.update(editCertModal.certificate._id, editCertData);
            alert('Certificate updated successfully!');
            fetchAllData();
            setEditCertModal({ open: false, certificate: null, student: null });
        } catch (error) {
            console.error('Error updating certificate:', error);
            alert(error.response?.data?.message || 'Failed to update certificate');
        } finally {
            setIsIssuing(false);
        }
    };

    const handleDeleteCertificate = async (certificateId) => {
        if (!window.confirm('Are you sure you want to DELETE this certificate? Once deleted, you will be able to issue it again.')) return;

        try {
            await certificateAPI.delete(certificateId);
            alert('Certificate deleted successfully!');
            fetchAllData();
        } catch (error) {
            console.error('Error deleting certificate:', error);
            alert(error.response?.data?.message || 'Failed to delete certificate');
        }
    };

    const handleOpenTeacherCertModal = (teacher) => {
        setTeacherCertModal({ open: true, teacher });
        // Pre-select all assigned courses by default
        const allCourseNames = (teacher.assignedCourses || []).map(c => c.title);
        setTeacherCertData({
            rollNo: '',  // Admin enters the unique number manually
            skills: teacher.specialization || 'Teaching',
            duration: '',
            passoutDate: getLocalDateString(new Date()),
            certificateLink: '',
            selectedCourses: allCourseNames
        });
    };

    const handleIssueTeacherCert = async () => {
        if (!teacherCertModal.teacher) return;
        if (!window.confirm(`Issue achievement certificate to ${teacherCertModal.teacher.name}?`)) return;
        setIsIssuing(true);
        try {
            await certificateAPI.issueTeacher({
                userId: teacherCertModal.teacher._id,
                rollNo: teacherCertData.rollNo,
                skills: teacherCertData.skills,
                duration: teacherCertData.duration,
                passoutDate: teacherCertData.passoutDate,
                certificateLink: teacherCertData.certificateLink,
                selectedCourses: teacherCertData.selectedCourses
            });
            alert('Teacher certificate issued successfully!');
            fetchAllData();
            setTeacherCertModal({ open: false, teacher: null });
        } catch (error) {
            console.error('Error issuing teacher certificate:', error);
            alert(error.response?.data?.message || 'Failed to issue certificate');
        } finally {
            setIsIssuing(false);
        }
    };

    const handleBackfillTeacherIds = async () => {
        if (!window.confirm('This will assign unique t0001... IDs to all existing teachers that do not have one. Continue?')) return;
        setIsBackfilling(true);
        try {
            const res = await certificateAPI.backfillTeacherIds();
            alert(res.data.message);
            fetchAllData();
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to backfill teacher IDs');
        } finally {
            setIsBackfilling(false);
        }
    };

    const toggleFilter = (type, value) => {
        if (type === 'type') {
            setSelectedTypes(prev =>
                prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
            );
        } else {
            setSelectedCities(prev =>
                prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
            );
        }
    };

    const clearFilters = () => {
        setSelectedTypes([]);
        setSelectedCities([]);
        setSearchQuery('');
        setCertificateStartDate('');
        setCertificateEndDate('');
    };

    const isDateRangeActive = !!certificateStartDate || !!certificateEndDate;
    const isCertificateInDateRange = (certificate) => {
        if (!isDateRangeActive) return true;
        if (!certificate?.issuedAt) return false;

        const issuedTime = new Date(certificate.issuedAt).getTime();
        if (Number.isNaN(issuedTime)) return false;

        if (certificateStartDate) {
            const startTime = new Date(`${certificateStartDate}T00:00:00`).getTime();
            if (issuedTime < startTime) return false;
        }

        if (certificateEndDate) {
            const endTime = new Date(`${certificateEndDate}T23:59:59`).getTime();
            if (issuedTime > endTime) return false;
        }

        return true;
    };

    const filteredCourses = courses.filter(c => {
        const matchesSearch = (c.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.students.some(s =>
                (s.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (s.rollNo || '').includes(searchQuery) ||
                (s.cnic || '').includes(searchQuery)
            );

        const matchesCity = selectedCities.length === 0 || selectedCities.includes(c.city || c.location);
        const matchesType = selectedTypes.length === 0 || selectedTypes.includes(c.targetAudience);

        // Filter students by enrollment status
        const filteredStudents = c.students.filter(s => {
            if (!isCertificateInDateRange(s.certificate)) return false;
            if (isDateRangeActive) return s.certificateIssued;
            if (enrollmentStatusFilter === 'all') return true;
            if (enrollmentStatusFilter === 'completed') return s.enrollmentStatus === 'completed' || s.certificateIssued;
            if (enrollmentStatusFilter === 'active') return s.enrollmentStatus !== 'completed' && !s.certificateIssued;
            return true;
        });
        const hasStudents = filteredStudents.length > 0;

        return matchesSearch && matchesCity && matchesType && hasStudents;
    }).map(c => ({
        ...c,
        students: c.students.filter(s => {
            if (!isCertificateInDateRange(s.certificate)) return false;
            if (isDateRangeActive) return s.certificateIssued;
            if (enrollmentStatusFilter === 'all') return true;
            if (enrollmentStatusFilter === 'completed') return s.enrollmentStatus === 'completed' || s.certificateIssued;
            if (enrollmentStatusFilter === 'active') return s.enrollmentStatus !== 'completed' && !s.certificateIssued;
            return true;
        })
    }));

    const filteredRequests = requests.filter(r => {
        if (isDateRangeActive) return false;
        const matchesSearch = (r.user?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (r.course?.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (r.user?.cnic || '').includes(searchQuery);

        const matchesCity = selectedCities.length === 0 || selectedCities.includes(r.course?.city || r.course?.location);
        const matchesType = selectedTypes.length === 0 || selectedTypes.includes(r.course?.targetAudience || (r.user?.role === 'intern' ? 'interns' : 'students'));

        return matchesSearch && matchesCity && matchesType;
    });

    const filteredTeachers = teachers.filter(t => {
        const matchesSearch = !searchQuery ||
            t.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.rollNo?.includes(searchQuery);

        if (!matchesSearch) return false;
        if (isDateRangeActive) return t.certificateIssued && isCertificateInDateRange(t.certificate);
        return true;
    });

    // Calculate unique students and certified students
    const uniqueStudents = new Set();
    const uniqueCertifiedStudents = new Set();
    courses.forEach(c => {
        c.students.forEach(s => {
            const id = s.id || s._id;
            uniqueStudents.add(id);
            if (s.certificateIssued) uniqueCertifiedStudents.add(id);
        });
    });

    const studentsCertifiedCount = uniqueCertifiedStudents.size;
    const studentsPendingCount = uniqueStudents.size - studentsCertifiedCount;

    const teachersCertifiedCount = teachers.filter(t => t.certificateIssued).length;
    const teachersPendingCount = teachers.length - teachersCertifiedCount;

    if (isLoading) {
        return (
            <Loader message="Loading certificates data..." />
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-6 sm:p-8 text-white shadow-2xl shadow-slate-900/10">
                <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-primary/20 blur-3xl" />
                <div className="absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-blue-500/10 blur-3xl" />
                <div className="relative z-10 flex flex-col xl:flex-row xl:items-end xl:justify-between gap-8">
                    <div className="max-w-2xl">
                        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.25em] text-white/70 mb-4">
                            <Award className="w-3.5 h-3.5 text-primary" />
                            Certificate Center
                        </div>
                        <h1 className="text-3xl sm:text-4xl font-black tracking-tight">Certificate Management</h1>
                        <p className="mt-2 text-sm sm:text-base text-white/60 font-medium">Issue, edit, verify and filter student, intern and teacher certificates from one clean dashboard.</p>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 w-full xl:w-auto">
                        {[
                            { label: 'Student Assigned', value: studentsCertifiedCount, sub: `${studentsPendingCount} pending`, icon: CheckCircle, tone: 'text-primary' },
                            { label: 'Teacher Assigned', value: teachersCertifiedCount, sub: `${teachersPendingCount} pending`, icon: Users, tone: 'text-blue-300' },
                            { label: 'Requests', value: requests.length, sub: 'pending approval', icon: ClipboardList, tone: 'text-amber-300' },
                            { label: 'Total People', value: uniqueStudents.size + teachers.length, sub: 'in certificate pool', icon: User, tone: 'text-emerald-300' },
                        ].map((stat) => (
                            <div key={stat.label} className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-md shadow-lg">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <p className="text-[9px] font-black uppercase tracking-widest text-white/45">{stat.label}</p>
                                        <p className="mt-2 text-2xl font-black leading-none">{stat.value}</p>
                                    </div>
                                    <div className={`h-10 w-10 rounded-2xl bg-white/10 flex items-center justify-center ${stat.tone}`}>
                                        <stat.icon className="w-5 h-5" />
                                    </div>
                                </div>
                                <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-white/45">{stat.sub}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Section Toggle */}
            <div className="flex gap-2 bg-white p-1.5 rounded-2xl w-full sm:w-fit border border-gray-100 shadow-sm">
                <button
                    onClick={() => setActiveSection('courses')}
                    className={`flex-1 sm:flex-none px-5 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeSection === 'courses' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
                >
                    Students & Interns
                </button>
                <button
                    onClick={() => setActiveSection('teachers')}
                    className={`flex-1 sm:flex-none px-5 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeSection === 'teachers' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
                >
                    Teachers
                    {teachers.length > 0 && <span className="text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-black">{teachers.length}</span>}
                </button>
            </div>

            {/* ── STUDENTS & INTERNS SECTION ── */}
            {activeSection === 'courses' && (<>
                <div className="bg-white rounded-[2rem] p-4 sm:p-6 border border-gray-100 shadow-sm space-y-5">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="text-[10px] font-black text-primary uppercase tracking-[0.25em]">Smart Filters</p>
                            <h2 className="text-lg font-black text-gray-900">Find certificates faster</h2>
                        </div>
                        <div className="hidden sm:flex h-11 w-11 rounded-2xl bg-primary/5 text-primary items-center justify-center">
                            <Filter className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4">
                        {/* Search */}
                        <div className="flex-1 relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search by course, student, roll no, CNIC..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-transparent focus:border-primary focus:bg-white rounded-2xl transition-all outline-none text-sm font-medium"
                            />
                        </div>

                        {/* Clear Button */}
                        {(selectedTypes.length > 0 || selectedCities.length > 0 || searchQuery || isDateRangeActive) && (
                            <button
                                onClick={clearFilters}
                                className="flex items-center justify-center gap-2 px-4 py-3 text-rose-500 hover:bg-rose-50 rounded-xl transition-all text-sm font-bold uppercase tracking-widest"
                            >
                                <X className="w-4 h-4" />
                                Clear
                            </button>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {/* Audience Filters */}
                        <div className="space-y-2">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Audience</p>
                            <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-2xl">
                                {[
                                    { id: 'students', label: 'Students' },
                                    { id: 'interns', label: 'Interns' }
                                ].map((type) => (
                                    <button
                                        key={type.id}
                                        onClick={() => toggleFilter('type', type.id)}
                                        className={`flex-1 px-3 py-2 rounded-xl font-bold text-xs transition-all ${selectedTypes.includes(type.id)
                                            ? 'bg-white text-primary shadow-md border border-primary/10'
                                            : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
                                            }`}
                                    >
                                        {type.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* City Filters */}
                        <div className="space-y-2">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Location</p>
                            <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-2xl">
                                {['Bahawalpur', 'Islamabad'].map((city) => (
                                    <button
                                        key={city}
                                        onClick={() => toggleFilter('city', city)}
                                        className={`flex-1 px-3 py-2 rounded-xl font-bold text-xs transition-all ${selectedCities.includes(city)
                                            ? 'bg-white text-primary shadow-md border border-primary/10'
                                            : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
                                            }`}
                                    >
                                        {city}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Status</p>
                            <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-2xl">
                                {[
                                    { id: 'all', label: 'All' },
                                    { id: 'active', label: 'Active' },
                                    { id: 'completed', label: 'Completed' }
                                ].map((status) => (
                                    <button
                                        key={status.id}
                                        onClick={() => setEnrollmentStatusFilter(status.id)}
                                        className={`flex-1 px-3 py-2 rounded-xl font-bold text-xs transition-all ${enrollmentStatusFilter === status.id
                                            ? 'bg-white text-primary shadow-md border border-primary/10'
                                            : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
                                            }`}
                                    >
                                        {status.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Start Date</p>
                            <input
                                type="date"
                                value={certificateStartDate}
                                onChange={(e) => setCertificateStartDate(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-50 border border-transparent focus:border-primary focus:bg-white rounded-2xl transition-all outline-none text-sm font-bold text-gray-700"
                            />
                        </div>
                        <div className="space-y-2">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">End Date</p>
                            <input
                                type="date"
                                value={certificateEndDate}
                                min={certificateStartDate || undefined}
                                onChange={(e) => setCertificateEndDate(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-50 border border-transparent focus:border-primary focus:bg-white rounded-2xl transition-all outline-none text-sm font-bold text-gray-700"
                            />
                        </div>
                    </div>

                    {isDateRangeActive && (
                        <div className="rounded-2xl bg-primary/5 border border-primary/10 px-4 py-3 text-xs font-bold text-primary">
                            Showing only certificates assigned in selected date range.
                        </div>
                    )}
                </div>

                {/* Pending Requests Section */}
                {filteredRequests.length > 0 && (
                    <div className="space-y-4">
                        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <ClipboardList className="w-5 h-5 text-amber-600" />
                            Pending Requests ({filteredRequests.length})
                        </h2>
                        {filteredRequests.map((request) => (
                            <motion.div
                                key={request._id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-white rounded-3xl p-5 sm:p-6 border border-amber-100 flex flex-col md:flex-row items-center md:items-start justify-between gap-6 shadow-sm"
                            >
                                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 flex-1 text-center sm:text-left">
                                    <div className="w-20 h-20 rounded-2xl bg-gray-100 border border-gray-200 overflow-hidden shrink-0 shadow-inner">
                                        {request.user?.photo ? (
                                            <img src={request.user.photo} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
                                                <User className="w-10 h-10 text-gray-300" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-2">
                                            <h3 className="text-xl font-black text-gray-900 uppercase tracking-tighter">{request.user?.name}</h3>
                                            <Badge variant={request.user?.role === 'intern' ? 'warning' : 'info'} size="sm">
                                                {request.user?.role}
                                            </Badge>
                                        </div>
                                        <p className="text-sm text-primary font-black uppercase tracking-tight mb-2">{request.course?.title}</p>
                                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-2">
                                            <Badge variant="info" size="xs">
                                                {request.course?.city || request.course?.location || 'Unknown'}
                                            </Badge>
                                            <Badge variant={(request.course?.targetAudience || (request.user?.role === 'intern' ? 'interns' : 'students')) === 'interns' ? 'purple' : 'success'} size="xs">
                                                {(request.course?.targetAudience || (request.user?.role === 'intern' ? 'interns' : 'students')) === 'interns' ? 'Intern' : 'Student'}
                                            </Badge>
                                        </div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Recommended by: {request.teacher?.name}</p>
                                    </div>
                                </div>

                                <div className="flex flex-col w-full md:w-auto items-center md:items-end gap-3 text-center md:text-right">
                                    <div className="text-[11px] font-bold text-gray-500 italic bg-amber-50 p-3 rounded-xl border border-amber-100/50 w-full md:max-w-[250px]">
                                        "{request.notes || 'No teacher notes provided'}"
                                    </div>
                                    <div className="flex flex-col sm:flex-row gap-2 w-full">
                                        <button
                                            onClick={() => handleRejectRequest(request._id)}
                                            className="flex-1 px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2 border border-transparent hover:border-red-100"
                                        >
                                            <XCircle className="w-4 h-4" />
                                            Reject
                                        </button>
                                        <button
                                            onClick={() => handleOpenApproveModal(request)}
                                            className="flex-1 px-6 py-3 bg-primary hover:bg-primary text-white rounded-xl font-black uppercase tracking-widest text-[10px] transition-all shadow-lg shadow-primary/10 flex items-center justify-center gap-2 active:scale-95"
                                        >
                                            <Award className="w-4 h-4" />
                                            Approve & Issue
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}

                {requests.length > 0 && filteredRequests.length === 0 && (
                    <div className="bg-white rounded-2xl p-8 border border-gray-100 text-center">
                        <Filter className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">No pending requests match your filters</p>
                    </div>
                )}

                {/* Courses with Students */}
                <div className="space-y-4">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-primary" />
                        Courses & Certificates
                    </h2>

                    {courses.length === 0 ? (
                        <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 border border-gray-100 dark:border-gray-700 text-center">
                            <BookOpen className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                            <p className="text-gray-500 dark:text-gray-400 font-medium">No courses found</p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Create some courses first to manage certificates</p>
                        </div>
                    ) : (
                        <>
                            {filteredCourses.map((course) => (
                                <motion.div
                                    key={course.id}
                                    className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden"
                                >
                                    <div
                                        onClick={() => setExpandedCourse(expandedCourse === course.id ? null : course.id)}
                                        className="flex items-center justify-between p-4 sm:p-5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary/5 dark:bg-primary/10 flex items-center justify-center shrink-0 shadow-sm border border-primary/10 dark:border-primary/20">
                                                <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="font-black text-gray-900 dark:text-white line-clamp-1 uppercase tracking-tighter text-sm sm:text-base">{course.title || course.name}</h3>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <Badge variant="info" size="xs">
                                                        {course.city}
                                                    </Badge>
                                                    <Badge variant={course.targetAudience === 'interns' ? 'purple' : 'success'} size="xs">
                                                        {course.targetAudience === 'interns' ? 'Intern' : 'Student'}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </div>
                                        <ChevronDown className={`w-5 h-5 text-gray-400 dark:text-gray-500 transition-transform flex-shrink-0 ${expandedCourse === course.id ? 'rotate-180' : ''}`} />
                                    </div>

                                    {expandedCourse === course.id && (
                                        <div className="border-t border-gray-100 dark:border-gray-700 overflow-x-auto">
                                            <table className="w-full">
                                                <thead className="bg-gray-50/50 dark:bg-gray-700/50">
                                                    <tr>
                                                        <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Student</th>
                                                        <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Roll No</th>
                                                        <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Challans</th>
                                                        <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Status</th>
                                                        <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Passout Date</th>
                                                        <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Issued Date</th>
                                                        <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                                                    {course.students.map((student) => (
                                                        <tr key={student.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors">
                                                            <td className="px-6 py-4">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 border border-gray-100 dark:border-gray-600 overflow-hidden shrink-0">
                                                                        {student.photo ? (
                                                                            <img src={student.photo} alt="" className="w-full h-full object-cover" />
                                                                        ) : (
                                                                            <div className="w-full h-full flex items-center justify-center">
                                                                                <User className="w-5 h-5 text-gray-300 dark:text-gray-600" />
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <div>
                                                                        <p className="font-bold text-gray-900 dark:text-white text-sm">{student.name}</p>
                                                                        <Badge variant={student.type === 'intern' ? 'purple' : 'success'} className="text-[10px] py-0">
                                                                            {student.type === 'intern' ? 'Intern' : 'Student'}
                                                                        </Badge>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 font-mono text-xs font-bold text-gray-500 dark:text-gray-400">{student.rollNo}</td>
                                                            <td className="px-6 py-4 text-xs font-medium">
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className={`inline-flex items-center justify-center min-w-[24px] h-6 px-2 rounded-full text-[11px] font-bold ${student.verifiedChallans > 0 ? 'bg-primary/10 text-primary' : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'}`}>
                                                                        {student.verifiedChallans || 0}
                                                                    </span>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 text-xs font-medium">
                                                                {student.certificateIssued ? (
                                                                    <div className="flex items-center gap-1 text-primary">
                                                                        <CheckCircle className="w-4 h-4" />
                                                                        Certified
                                                                    </div>
                                                                ) : (
                                                                    <div className="text-gray-400 dark:text-gray-500">Not Issued</div>
                                                                )}
                                                            </td>
                                                            <td className="px-6 py-4 text-xs text-gray-600 dark:text-gray-400">
                                                                {student.certificate?.passoutDate ? formatDate(student.certificate.passoutDate) : '-'}
                                                            </td>
                                                            <td className="px-6 py-4 text-xs text-gray-600 dark:text-gray-400">
                                                                {student.certificate?.issuedAt ? formatDate(student.certificate.issuedAt) : '-'}
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <div className="flex items-center gap-2">
                                                                    {student.certificateIssued ? (
                                                                        <>
                                                                            <button
                                                                                onClick={() => handleOpenEditCertModal(student, course)}
                                                                                className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg transition-all"
                                                                                title="Edit Certificate"
                                                                            >
                                                                                <Edit2 className="w-5 h-5" />
                                                                            </button>
                                                                            <button
                                                                                onClick={() => handleDeleteCertificate(student.certificate._id)}
                                                                                className="p-2 hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg transition-all"
                                                                                title="Delete Certificate"
                                                                            >
                                                                                <Trash2 className="w-5 h-5" />
                                                                            </button>
                                                                        </>
                                                                    ) : (
                                                                        <button
                                                                            onClick={() => {
                                                                                setConfirmModal({ open: true, student, course });
                                                                                setEditData({
                                                                                    rollNo: student.rollNo || '',
                                                                                    skills: course.title || course.name || '',
                                                                                    duration: course.duration || '',
                                                                                    passoutDate: new Date().toISOString().split('T')[0],
                                                                                    certificateLink: ''
                                                                                });
                                                                            }}
                                                                            className="p-2 hover:bg-primary/5 dark:hover:bg-primary/10 text-primary rounded-lg transition-all"
                                                                            title="Issue Certificate"
                                                                        >
                                                                            <Award className="w-5 h-5" />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </motion.div>
                            ))}

                            {filteredCourses.length === 0 && (
                                <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 border border-gray-100 dark:border-gray-700 text-center">
                                    <BookOpen className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                                    <p className="text-gray-500 dark:text-gray-400">No courses match your filters</p>
                                    {(searchQuery || selectedCities.length > 0 || selectedTypes.length > 0 || isDateRangeActive) && (
                                        <button
                                            onClick={clearFilters}
                                            className="mt-2 text-primary hover:text-primary font-medium text-sm"
                                        >
                                            Clear all filters
                                        </button>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </>)}

            {/* ── TEACHERS SECTION ── */}
            {activeSection === 'teachers' && (
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <Users className="w-5 h-5 text-blue-600" />
                            Teachers & Certificates
                        </h2>
                    </div>

                    {/* Teacher Search */}
                    <div className="bg-white rounded-2xl p-4 border border-gray-100 space-y-4">
                        <div className="flex items-center bg-gray-50 rounded-xl px-4 py-3 border border-transparent focus-within:border-blue-500/20 focus-within:bg-white transition-all">
                            <Search className="w-5 h-5 text-gray-400 mr-3" />
                            <input
                                type="text"
                                placeholder="Search by teacher name or ID..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="bg-transparent border-none outline-none w-full text-gray-700 placeholder:text-gray-400"
                            />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Start Date</label>
                                <input
                                    type="date"
                                    value={certificateStartDate}
                                    onChange={(e) => setCertificateStartDate(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 border border-transparent focus:border-blue-500/20 focus:bg-white rounded-2xl transition-all outline-none text-sm font-bold text-gray-700"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">End Date</label>
                                <input
                                    type="date"
                                    value={certificateEndDate}
                                    min={certificateStartDate || undefined}
                                    onChange={(e) => setCertificateEndDate(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 border border-transparent focus:border-blue-500/20 focus:bg-white rounded-2xl transition-all outline-none text-sm font-bold text-gray-700"
                                />
                            </div>
                            {(searchQuery || isDateRangeActive) && (
                                <button
                                    onClick={clearFilters}
                                    className="self-end flex items-center justify-center gap-2 px-4 py-3 text-rose-500 hover:bg-rose-50 rounded-xl transition-all text-sm font-bold uppercase tracking-widest"
                                >
                                    <X className="w-4 h-4" />
                                    Clear
                                </button>
                            )}
                        </div>
                    </div>

                    {teachers.length === 0 ? (
                        <div className="bg-white rounded-2xl p-12 border border-gray-100 text-center">
                            <User className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500 font-medium">No teachers registered yet</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50/50">
                                        <tr>
                                            <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Teacher Details</th>
                                            <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Teacher ID</th>
                                            <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Specialization</th>
                                            <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Status</th>
                                            <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Passout Date</th>
                                            <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Issued Date</th>
                                            <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {filteredTeachers.map((teacher) => (
                                                <tr key={teacher._id} className="hover:bg-gray-50/50 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center overflow-hidden shrink-0">
                                                                {teacher.photo ? (
                                                                    <img src={teacher.photo} alt="" className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <span className="text-white text-sm font-bold">{teacher.name?.charAt(0)}</span>
                                                                )}
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-gray-900 text-sm">{teacher.name}</p>
                                                                <p className="text-xs text-gray-400">{teacher.email}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 font-mono text-xs font-bold text-blue-600">
                                                        {teacher.rollNo || <span className="text-gray-300">—</span>}
                                                    </td>
                                                    <td className="px-6 py-4 text-xs text-gray-500">{teacher.specialization || '—'}</td>
                                                    <td className="px-6 py-4 text-xs font-medium">
                                                        {teacher.certificateIssued ? (
                                                            <div className="flex items-center gap-1 text-primary">
                                                                <CheckCircle className="w-4 h-4" />
                                                                Certified
                                                            </div>
                                                        ) : (
                                                            <div className="text-gray-400">Not Issued</div>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-xs text-gray-600">
                                                        {teacher.certificate?.passoutDate ? formatDate(teacher.certificate.passoutDate) : '—'}
                                                    </td>
                                                    <td className="px-6 py-4 text-xs text-gray-600">
                                                        {teacher.certificate?.issuedAt ? formatDate(teacher.certificate.issuedAt) : '-'}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-2">
                                                            {teacher.certificateIssued ? (
                                                                <>
                                                                    <button
                                                                        onClick={() => {
                                                                            setEditCertModal({ open: true, certificate: teacher.certificate, student: teacher });
                                                                            setEditCertData({
                                                                                rollNo: teacher.certificate?.rollNo || teacher.rollNo || '',
                                                                                skills: teacher.certificate?.skills || teacher.specialization || '',
                                                                                duration: teacher.certificate?.duration || '',
                                                                                passoutDate: teacher.certificate?.passoutDate ? new Date(teacher.certificate.passoutDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                                                                                certificateLink: teacher.certificate?.certificateLink || ''
                                                                            });
                                                                        }}
                                                                        className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-all"
                                                                        title="Edit Certificate"
                                                                    >
                                                                        <Edit2 className="w-5 h-5" />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDeleteCertificate(teacher.certificate._id)}
                                                                        className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-all"
                                                                        title="Delete Certificate"
                                                                    >
                                                                        <Trash2 className="w-5 h-5" />
                                                                    </button>
                                                                </>
                                                            ) : (
                                                                <button
                                                                    onClick={() => handleOpenTeacherCertModal(teacher)}
                                                                    className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-all"
                                                                    title="Issue Certificate"
                                                                >
                                                                    <Award className="w-5 h-5" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        }
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}
            {/* Approve/Issue Modal */}
            <Modal
                isOpen={confirmModal.open}
                onClose={() => setConfirmModal({ open: false, student: null, course: null, request: null })}
                title={confirmModal.request ? "Approve Certificate Request" : "Issue Certificate"}
                size="md"
            >
                {confirmModal.student && (
                    <div className="space-y-6">
                        <div className="p-5 bg-primary/5 rounded-3xl border border-primary/10 shadow-sm">
                            <div className="flex flex-col sm:flex-row items-center gap-4 mb-4 text-center sm:text-left">
                                <div className="w-16 h-16 rounded-2xl bg-white border-2 border-primary/10 flex items-center justify-center overflow-hidden shadow-inner">
                                    {confirmModal.student.photo ? (
                                        <img src={confirmModal.student.photo} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <User className="w-10 h-10 text-primary" />
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xl font-black text-primary uppercase tracking-tighter leading-none mb-1">{confirmModal.student.name}</p>
                                    <p className="text-[10px] font-black text-primary uppercase tracking-widest">{confirmModal.course?.name || confirmModal.request?.course?.title}</p>
                                </div>
                            </div>
                            {confirmModal.request?.notes && (
                                <div className="text-[11px] text-primary italic bg-white/60 p-3 rounded-2xl border border-primary/10/50 leading-relaxed">
                                    <span className="font-black uppercase tracking-widest text-[9px] block mb-1 opacity-50">Teacher Note:</span>
                                    "{confirmModal.request.notes}"
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Roll Number / ID</label>
                                <input
                                    type="text"
                                    value={editData.rollNo}
                                    onChange={(e) => setEditData({ ...editData, rollNo: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 border border-transparent focus:border-primary focus:bg-white rounded-2xl transition-all outline-none font-bold text-sm"
                                    placeholder="Enter Roll Number"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Passout Date</label>
                                <input
                                    type="date"
                                    value={editData.passoutDate}
                                    onChange={(e) => setEditData({ ...editData, passoutDate: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 border border-transparent focus:border-primary focus:bg-white rounded-2xl transition-all outline-none font-bold text-sm"
                                />
                            </div>
                            <div className="sm:col-span-2 space-y-1.5">
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Certificate Link (Optional)</label>
                                <input
                                    type="text"
                                    placeholder="https://cloudinary.com/..."
                                    value={editData.certificateLink}
                                    onChange={(e) => setEditData({ ...editData, certificateLink: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 border border-transparent focus:border-primary focus:bg-white rounded-2xl transition-all outline-none text-sm font-medium"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => setConfirmModal({ open: false, student: null, course: null, request: null })}
                                className="flex-1 py-3 text-gray-500 font-black uppercase tracking-widest text-[10px] hover:bg-gray-100 rounded-2xl transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleIssueCertificate}
                                disabled={isIssuing || !editData.rollNo}
                                className="flex-1 py-3 bg-primary hover:bg-primary text-white font-black uppercase tracking-widest text-[10px] rounded-2xl transition-all shadow-lg shadow-primary/10 flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95"
                            >
                                <ButtonLoader isLoading={isIssuing} icon={<Award className="w-4 h-4" />}>
                                    Issue Certificate
                                </ButtonLoader>
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Edit Certificate Modal */}
            <Modal
                isOpen={editCertModal.open}
                onClose={() => setEditCertModal({ open: false, certificate: null, student: null })}
                title="Edit Certificate"
                size="md"
            >
                {editCertModal.student && (
                    <div className="space-y-6">
                        <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-white border border-blue-100 flex items-center justify-center overflow-hidden">
                                    {editCertModal.student.photo ? (
                                        <img src={editCertModal.student.photo} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <User className="w-6 h-6 text-blue-300" />
                                    )}
                                </div>
                                <div>
                                    <p className="font-bold text-blue-900">{editCertModal.student.name}</p>
                                    <p className="text-xs text-blue-600">Roll No: {editCertModal.student.rollNo}</p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Roll Number</label>
                                <input
                                    type="text"
                                    value={editCertData.rollNo}
                                    onChange={(e) => setEditCertData({ ...editCertData, rollNo: e.target.value })}
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none font-mono font-bold"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Skills/Course Title</label>
                                <input
                                    type="text"
                                    value={editCertData.skills}
                                    onChange={(e) => setEditCertData({ ...editCertData, skills: e.target.value })}
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none font-bold"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercaseTracking-widest mb-1.5 ml-1">Duration</label>
                                <input
                                    type="text"
                                    value={editCertData.duration}
                                    onChange={(e) => setEditCertData({ ...editCertData, duration: e.target.value })}
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none font-bold"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Passout Date</label>
                                <input
                                    type="date"
                                    value={editCertData.passoutDate}
                                    onChange={(e) => setEditCertData({ ...editCertData, passoutDate: e.target.value })}
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none font-bold"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Certificate Link</label>
                                <input
                                    type="text"
                                    value={editCertData.certificateLink}
                                    onChange={(e) => setEditCertData({ ...editCertData, certificateLink: e.target.value })}
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none font-medium text-sm"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => setEditCertModal({ open: false, certificate: null, student: null })}
                                className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-100 rounded-xl transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleUpdateCertificate}
                                disabled={isIssuing}
                                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-900/10 flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                <ButtonLoader isLoading={isIssuing} icon={<Calendar className="w-5 h-5" />}>
                                    Update Certificate
                                </ButtonLoader>
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Issue Teacher Certificate Modal */}
            <Modal
                isOpen={teacherCertModal.open}
                onClose={() => setTeacherCertModal({ open: false, teacher: null })}
                title="Issue Teacher Certificate"
                size="md"
            >
                {teacherCertModal.teacher && (
                    <div className="space-y-6">
                        <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center overflow-hidden">
                                    {teacherCertModal.teacher.photo ? (
                                        <img src={teacherCertModal.teacher.photo} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-white text-lg font-bold">{teacherCertModal.teacher.name?.charAt(0)}</span>
                                    )}
                                </div>
                                <div>
                                    <p className="font-bold text-blue-900">{teacherCertModal.teacher.name}</p>
                                    <p className="text-xs text-blue-600 font-mono">{teacherCertModal.teacher.rollNo || 'No ID assigned'}</p>
                                </div>
                            </div>
                            {/* Assigned courses checkboxes */}
                            {teacherCertModal.teacher.assignedCourses?.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-blue-100">
                                    <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-2">Courses to Include on Certificate</p>
                                    <div className="space-y-1.5 max-h-36 overflow-y-auto">
                                        {teacherCertModal.teacher.assignedCourses.map(c => {
                                            const isChecked = teacherCertData.selectedCourses.includes(c.title);
                                            return (
                                                <label key={c._id} className="flex items-center gap-2.5 cursor-pointer group">
                                                    <input
                                                        type="checkbox"
                                                        checked={isChecked}
                                                        onChange={() => {
                                                            setTeacherCertData(prev => ({
                                                                ...prev,
                                                                selectedCourses: isChecked
                                                                    ? prev.selectedCourses.filter(t => t !== c.title)
                                                                    : [...prev.selectedCourses, c.title]
                                                            }));
                                                        }}
                                                        className="w-4 h-4 rounded accent-blue-600"
                                                    />
                                                    <span className="text-sm font-medium text-blue-800 group-hover:text-blue-600 transition-colors">{c.title}</span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                    {teacherCertData.selectedCourses.length === 0 && (
                                        <p className="text-xs text-amber-500 mt-1">⚠ No courses selected — certificate will show skills only</p>
                                    )}
                                </div>
                            )}
                        </div>


                        <div className="grid grid-cols-1 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Unique ID / Certificate Number</label>
                                <input
                                    type="text"
                                    value={teacherCertData.rollNo}
                                    onChange={(e) => setTeacherCertData({ ...teacherCertData, rollNo: e.target.value })}
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none font-mono font-bold"
                                    placeholder="Enter any unique number (e.g. 1001, T-25, etc.)"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Skills / Course Title</label>
                                <input
                                    type="text"
                                    value={teacherCertData.skills}
                                    onChange={(e) => setTeacherCertData({ ...teacherCertData, skills: e.target.value })}
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none font-bold"
                                    placeholder="e.g. Teaching Web Development"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Duration</label>
                                <input
                                    type="text"
                                    value={teacherCertData.duration}
                                    onChange={(e) => setTeacherCertData({ ...teacherCertData, duration: e.target.value })}
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none font-bold"
                                    placeholder="e.g. Jan 2024 - Dec 2024"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Passout / Issue Date</label>
                                <input
                                    type="date"
                                    value={teacherCertData.passoutDate}
                                    onChange={(e) => setTeacherCertData({ ...teacherCertData, passoutDate: e.target.value })}
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none font-bold"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Certificate Link (Cloudinary/Drive)</label>
                                <input
                                    type="text"
                                    placeholder="https://..."
                                    value={teacherCertData.certificateLink}
                                    onChange={(e) => setTeacherCertData({ ...teacherCertData, certificateLink: e.target.value })}
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none font-medium"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => setTeacherCertModal({ open: false, teacher: null })}
                                className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-100 rounded-xl transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleIssueTeacherCert}
                                disabled={isIssuing || !teacherCertData.rollNo}
                                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-900/10 flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                <ButtonLoader isLoading={isIssuing} icon={<Award className="w-5 h-5" />}>
                                    Issue Certificate
                                </ButtonLoader>
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default CertificateManagement;



