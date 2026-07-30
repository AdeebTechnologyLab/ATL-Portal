import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Calendar, GraduationCap, CheckCircle, XCircle, Clock, Shield, Edit2, Save, Download,
    FileText, Users, PauseCircle, PlayCircle, BookOpen,
    Search, UserCheck, UserX, Trash2, User, Mail, MapPin, Phone, Briefcase, Camera, Upload, Plus
} from 'lucide-react';
import Loader, { ButtonLoader } from '../../components/ui/Loader';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { userAPI, settingsAPI, courseAPI } from '../../services/api';
import ImageCropper from '../../components/ui/ImageCropper';

const TeachersManagement = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [teachers, setTeachers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('enrolled');
    const [confirmModal, setConfirmModal] = useState({ open: false, action: null, teacher: null });
    const [editModal, setEditModal] = useState({ open: false, user: null });
    const [editForm, setEditForm] = useState({});
    const [selectedFile, setSelectedFile] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [togglingActiveId, setTogglingActiveId] = useState(null);
    const [showExportOptions, setShowExportOptions] = useState(false);
    // Pause from Course state
    const [pauseModal, setPauseModal] = useState({ open: false, teacher: null });
    const [teacherCourses, setTeacherCourses] = useState([]);
    const [loadingCourses, setLoadingCourses] = useState(false);
    const [pausingCourseId, setPausingCourseId] = useState(null);
    const [cropperSrc, setCropperSrc] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(null);

    useEffect(() => {
        fetchTeachers();
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await settingsAPI.getAll();
            setAllowBioEditing(res.data.data.allowBioEditing_teacher ?? false);
        } catch (error) {
            console.error('Error fetching settings:', error);
        }
    };

    const [allowBioEditing, setAllowBioEditing] = useState(false);

    const toggleBioEditing = async () => {
        try {
            const newValue = !allowBioEditing;
            await settingsAPI.update('allowBioEditing_teacher', newValue);
            setAllowBioEditing(newValue);
        } catch (error) {
            console.error('Error updating setting:', error);
        }
    };

    const fetchTeachers = async () => {
        setIsLoading(true);
        try {
            const res = await userAPI.getByRole('teacher');
            setTeachers(res.data.data || []);
        } catch (error) {
            console.error('Error fetching teachers:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerify = async () => {
        if (!confirmModal.teacher) return;
        setIsProcessing(true);
        try {
            await userAPI.verify(confirmModal.teacher._id);
            setTeachers(prev => prev.map(t =>
                t._id === confirmModal.teacher._id ? { ...t, isVerified: true } : t
            ));
        } catch (error) {
            console.error('Error verifying teacher:', error);
        } finally {
            setIsProcessing(false);
            setConfirmModal({ open: false, action: null, teacher: null });
        }
    };

    const handleUnverify = async () => {
        if (!confirmModal.teacher) return;
        setIsProcessing(true);
        try {
            await userAPI.unverify(confirmModal.teacher._id);
            setTeachers(prev => prev.map(t =>
                t._id === confirmModal.teacher._id ? { ...t, isVerified: false } : t
            ));
        } catch (error) {
            console.error('Error unverifying teacher:', error);
        } finally {
            setIsProcessing(false);
            setConfirmModal({ open: false, action: null, teacher: null });
        }
    };

    const handlePhotoChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => setCropperSrc(reader.result);
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    const handleCropDone = (croppedFile, croppedDataUrl) => {
        setSelectedFile(croppedFile);
        setPhotoPreview(croppedDataUrl);
        setCropperSrc(null);
    };

    const handleDelete = async () => {
        if (!confirmModal.teacher) return;
        setIsProcessing(true);
        try {
            await userAPI.delete(confirmModal.teacher._id);
            setTeachers(prev => prev.filter(t => t._id !== confirmModal.teacher._id));
        } catch (error) {
            console.error('Error deleting teacher:', error);
        } finally {
            setIsProcessing(false);
            setConfirmModal({ open: false, action: null, teacher: null });
        }
    };

    const handleEditClick = (teacher) => {
        setEditModal({ open: true, user: teacher });
        setSelectedFile(null);
        setPhotoPreview(teacher.photo || null);
        setEditForm({
            rollNo: teacher.rollNo || '',
            name: teacher.name || '',
            email: teacher.email || '',
            phone: teacher.phone || '',
            cnic: teacher.cnic || '',
            dob: teacher.dob ? new Date(teacher.dob).toISOString().split('T')[0] : '',
            gender: teacher.gender || '',
            qualification: teacher.qualification || '',
            specialization: teacher.specialization || '',
            department: teacher.department || '',
            experience: teacher.experience || '',
            location: teacher.location || '',
            attendType: teacher.attendType || '',
            address: teacher.address || '',
            password: teacher.password || '',
            fatherName: teacher.fatherName || '',
            city: teacher.city || '',
            country: teacher.country || '',
            heardAbout: teacher.heardAbout || ''
        });
    };

    const downloadPDF = (type = 'full') => {
        const doc = new jsPDF('l', 'mm', 'a4');
        const title = type === 'phone' ? 'AdeebTechLab - Teachers Phone Directory' :
            type === 'email' ? 'AdeebTechLab - Teachers Email List' :
                type === 'academic' ? 'AdeebTechLab - Teachers Academic Profile' :
                    type === 'address' ? 'AdeebTechLab - Teachers Address List' :
                        'AdeebTechLab - Teachers Complete Report';

        doc.setFontSize(20);
        doc.text(title, 14, 22);
        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);
        doc.text(`Total Records: ${filteredTeachers.length}`, 14, 37);

        let headers, body;

        if (type === 'phone') {
            headers = [['Name', 'Phone', 'Identity']];
            body = filteredTeachers.map(t => [t.name || 'N/A', t.phone || 'N/A', 'Teacher']);
        } else if (type === 'email') {
            headers = [['Name', 'Email', 'Identity']];
            body = filteredTeachers.map(t => [t.name || 'N/A', t.email || 'N/A', 'Teacher']);
        } else if (type === 'academic') {
            headers = [['Name', 'Qualification', 'Specialization', 'Experience', 'Department']];
            body = filteredTeachers.map(t => [
                t.name || 'N/A',
                t.qualification || 'N/A',
                t.specialization || 'N/A',
                t.experience || 'N/A',
                t.department || 'N/A'
            ]);
        } else if (type === 'address') {
            headers = [['Name', 'Address', 'Location']];
            body = filteredTeachers.map(t => [
                t.name || 'N/A',
                t.address || 'N/A',
                t.location || 'N/A'
            ]);
        } else {
            headers = [['Name', 'Email', 'Phone', 'CNIC', 'Qualification', 'Specialization', 'Experience', 'Department', 'Location', 'Address', 'Status']];
            body = filteredTeachers.map(t => [
                t.name || 'N/A',
                t.email || 'N/A',
                t.phone || 'N/A',
                t.cnic || 'N/A',
                t.qualification || 'N/A',
                t.specialization || 'N/A',
                t.experience || 'N/A',
                t.department || 'N/A',
                t.location || 'N/A',
                t.address || 'N/A',
                t.isVerified ? 'Verified' : 'Pending'
            ]);
        }

        autoTable(doc, {
            startY: 45,
            head: headers,
            body: body,
            theme: 'grid',
            headStyles: { fillColor: [13, 40, 24] },
            styles: { fontSize: 8, overflow: 'linebreak' }
        });

        const fileName = `Teachers_${type.charAt(0).toUpperCase() + type.slice(1)}_${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(fileName);
        setShowExportOptions(false);
    };

    const downloadTeacherPDF = async (t) => {
        let assignedCourses = [];
        try {
            const res = await courseAPI.getAll();
            const allCourses = res.data.data || [];
            assignedCourses = allCourses.filter(c => 
                c.teachers?.some(teacher => (teacher._id || teacher).toString() === t._id.toString())
            ).map(c => c.title);
        } catch (e) {
            console.error('Error fetching courses', e);
        }

        const doc = new jsPDF();

        doc.setFillColor(13, 40, 24);
        doc.rect(0, 0, 210, 40, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.text('TEACHER PROFILE', 14, 25);

        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        doc.text(`Status: ${t.isVerified ? 'VERIFIED' : 'PENDING'}`, 140, 26);

        let y = 50;

        const addFieldsAndSave = () => {
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('Professional Information', 14, y);
            doc.line(14, y + 2, 200, y + 2);

            y += 10;
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            const fields = [
                ['Name', t.name],
                ['Email', t.email],
                ['Phone', t.phone],
                ['CNIC', t.cnic],
                ['Qualification', t.qualification],
                ['Specialization', t.specialization],
                ['Department', t.department],
                ['Experience', t.experience],
                ['Location', t.location],
                ['Address', t.address],
                ['Joining Date', t.createdAt ? new Date(t.createdAt).toLocaleDateString() : 'N/A']
            ];
            fields.forEach(([label, value]) => {
                doc.setFont('helvetica', 'bold');
                doc.text(`${label}:`, 14, y);
                doc.setFont('helvetica', 'normal');
                doc.text(`${value || 'N/A'}`, 50, y);
                y += 7;
            });
            
            y += 5; // Extra spacing
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('Assigned Courses', 14, y);
            doc.line(14, y + 2, 200, y + 2);
            y += 10;
            
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            
            if (assignedCourses.length === 0) {
                doc.text('No courses assigned currently.', 14, y);
            } else {
                assignedCourses.forEach((courseStr, idx) => {
                    const lines = doc.splitTextToSize(`• ${courseStr}`, 180);
                    doc.text(lines, 14, y);
                    y += (lines.length * 5) + 2; 
                    
                    if (y > 270) {
                        doc.addPage();
                        y = 20;
                    }
                });
            }

            doc.save(`Teacher_${t.name?.replace(/\s+/g, '_')}.pdf`);
        };

        if (t.photo) {
            // Load image as base64 to avoid CORS issues in PDF rendering
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.onload = function () {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                const dataURL = canvas.toDataURL('image/jpeg');

                // Draw profile picture at top right below header
                doc.addImage(dataURL, 'JPEG', 160, 45, 35, 35);
                y = Math.max(y, 85); // Adjust Y to ensure fields don't overlap image
                addFieldsAndSave();
            };
            img.onerror = function () {
                // If image fails to load, just render text
                addFieldsAndSave();
            };
            img.src = t.photo;
        } else {
            addFieldsAndSave();
        }
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        setIsProcessing(true);
        try {
            let data = editForm;
            // If file selected, use FormData
            if (selectedFile) {
                const formData = new FormData();
                Object.keys(editForm).forEach(key => {
                    if (editForm[key] !== undefined && editForm[key] !== null) {
                        formData.append(key, editForm[key]);
                    }
                });
                formData.append('photo', selectedFile);
                data = formData;
            }

            const res = await userAPI.update(editModal.user._id, data);
            setTeachers(prev => prev.map(t => t._id === editModal.user._id ? res.data.data : t));
            setEditModal({ open: false, user: null });
        } catch (error) {
            console.error('Error updating teacher:', error);
        } finally {
            setIsProcessing(false);
        }
    };

    const openPauseModal = async (teacher) => {
        setPauseModal({ open: true, teacher });
        setLoadingCourses(true);
        try {
            const res = await courseAPI.getAll();
            const allCourses = (res.data.data || []).filter(c =>
                c.teachers?.some(t => (t._id || t) === teacher._id || (t._id || t).toString() === teacher._id.toString())
            );
            setTeacherCourses(allCourses);
        } catch (e) {
            console.error('Error fetching courses:', e);
        } finally {
            setLoadingCourses(false);
        }
    };

    const handlePauseTeacher = async (courseId) => {
        if (!pauseModal.teacher) return;
        setPausingCourseId(courseId);
        try {
            await courseAPI.pauseTeacher(courseId, pauseModal.teacher._id);
            setTeacherCourses(prev => prev.map(c =>
                c._id === courseId
                    ? { ...c, pausedTeachers: [...(c.pausedTeachers || []), pauseModal.teacher._id] }
                    : c
            ));
            await fetchTeachers();
        } catch (e) {
            console.error('Error pausing teacher:', e);
        } finally {
            setPausingCourseId(null);
        }
    };

    const handleResumeTeacher = async (courseId) => {
        if (!pauseModal.teacher) return;
        setPausingCourseId(courseId);
        try {
            await courseAPI.resumeTeacher(courseId, pauseModal.teacher._id);
            setTeacherCourses(prev => prev.map(c =>
                c._id === courseId
                    ? { ...c, pausedTeachers: (c.pausedTeachers || []).filter(t => (t._id || t).toString() !== pauseModal.teacher._id.toString()) }
                    : c
            ));
            await fetchTeachers();
        } catch (e) {
            console.error('Error resuming teacher:', e);
        } finally {
            setPausingCourseId(null);
        }
    };

    const handleMoveToOld = async (teacher) => {
        try {
            const res = await userAPI.update(teacher._id, { registeredOld: !teacher.registeredOld });
            setTeachers(prev => prev.map(t => t._id === teacher._id ? res.data.data : t));
        } catch (error) {
            console.error('Error toggling old status:', error);
        }
    };

    const handleActiveStatus = async (teacher) => {
        const nextStatus = teacher.isActive === false;
        if (!nextStatus && !window.confirm(`Deactivate ${teacher.name}? Their course and paid-task assignments will be stopped.`)) {
            return;
        }

        setTogglingActiveId(teacher._id);
        try {
            const res = await userAPI.setActiveStatus(teacher._id, nextStatus);
            setTeachers(prev => prev.map(item => item._id === teacher._id
                ? {
                    ...item,
                    ...res.data.data,
                    totalEnrollments: nextStatus ? (item.totalEnrollments || 0) : 0,
                    activeEnrollments: nextStatus ? (item.activeEnrollments || 0) : 0,
                    pausedEnrollments: nextStatus ? (item.pausedEnrollments || 0) : 0,
                    assignedJobCount: nextStatus ? (item.assignedJobCount || 0) : 0,
                    ...(nextStatus ? {} : { courseData: [], paidTaskData: [] })
                }
                : item
            ));
        } catch (error) {
            console.error('Error changing teacher active status:', error);
            window.alert(error.response?.data?.message || 'Unable to update teacher status');
        } finally {
            setTogglingActiveId(null);
        }
    };

    const getActiveAssignmentCount = (teacher) =>
        (teacher.activeEnrollments || 0) + (teacher.assignedJobCount || 0);

    const getTotalAssignmentCount = (teacher) =>
        (teacher.totalEnrollments || 0) + (teacher.assignedJobCount || 0);

    const isEnrolledActive = (teacher) =>
        teacher.isActive !== false && (teacher.courseData || []).length > 0;

    const isEnrolledInactive = (teacher) =>
        teacher.isActive === false ||
        ((teacher.pausedEnrollments || 0) > 0 && getActiveAssignmentCount(teacher) === 0);

    const isUnassignedTeacher = (teacher) =>
        teacher.isActive !== false &&
        getTotalAssignmentCount(teacher) === 0 &&
        (teacher.pausedEnrollments || 0) === 0;

    const filteredTeachers = teachers.filter(t => {
        const matchesSearch = (t.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (t.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (t.cnic || '').includes(searchQuery) ||
            (t.rollNo || '').toLowerCase().includes(searchQuery.toLowerCase());

        if (!matchesSearch) return false;

        const hasCert = (t.certificateCount || 0) > 0;

        if (filterStatus === 'enrolled') return isEnrolledActive(t);
        if (filterStatus === 'enrolledInactive') return isEnrolledInactive(t);
        if (filterStatus === 'completed') return hasCert;
        if (filterStatus === 'registered') return isUnassignedTeacher(t) && !t.registeredOld;
        if (filterStatus === 'registeredOld') return isUnassignedTeacher(t) && t.registeredOld;
        
        if (filterStatus === 'verified') return t.isVerified;
        if (filterStatus === 'pending') return !t.isVerified;
        return true;
    });

    const verifiedCount = teachers.filter(t => t.isVerified).length;
    const pendingCount = teachers.filter(t => !t.isVerified).length;

    if (isLoading && teachers.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader message="Loading Teacher Profiles..." size="lg" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Teachers Management</h1>
                    <p className="text-gray-500 text-sm">Verify and manage teacher accounts</p>
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <button
                        onClick={toggleBioEditing}
                        className={`flex-1 md:flex-none px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all border flex items-center justify-center gap-2 ${allowBioEditing
                                ? 'bg-amber-50 border-amber-200 text-amber-700'
                                : 'bg-gray-50 border-gray-200 text-gray-500'
                            }`}
                    >
                        <Shield className={`w-4 h-4 ${allowBioEditing ? 'animate-pulse' : ''}`} />
                        {allowBioEditing ? 'EDITS ON' : 'EDITS OFF'}
                    </button>

                    <div className="relative flex-1 md:flex-none">
                        <button
                            onClick={() => setShowExportOptions(!showExportOptions)}
                            className="w-full px-4 py-2.5 bg-white border border-primary/10 rounded-xl font-black text-[10px] uppercase tracking-widest text-primary hover:bg-primary/5 transition-all flex items-center justify-center gap-2 shadow-sm"
                        >
                            <Download className="w-4 h-4 text-primary" />
                            EXPORT DATA
                        </button>

                        {showExportOptions && (
                            <>
                                <div className="fixed inset-0 z-10" onClick={() => setShowExportOptions(false)}></div>
                                <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-100 rounded-2xl shadow-2xl z-20 py-2 overflow-hidden animate-in fade-in zoom-in duration-200">
                                    <div className="px-4 py-2 border-b border-gray-50 mb-1">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Select Format</p>
                                    </div>
                                    {[
                                        { id: 'full', label: 'Complete Report', icon: FileText },
                                        { id: 'phone', label: 'Phone Directory', icon: Phone },
                                        { id: 'email', label: 'Email List', icon: Mail },
                                        { id: 'academic', label: 'Academic Info', icon: GraduationCap },
                                        { id: 'address', label: 'Address List', icon: MapPin }
                                    ].map((opt) => (
                                        <button
                                            key={opt.id}
                                            onClick={() => downloadPDF(opt.id)}
                                            className="w-full px-4 py-2.5 text-left text-[11px] font-bold text-gray-700 hover:bg-primary/5 hover:text-primary flex items-center gap-3 transition-colors"
                                        >
                                            <opt.icon className="w-4 h-4" />
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Search & Filter */}
            <div className="bg-white rounded-3xl p-4 sm:p-5 border border-gray-100 shadow-sm space-y-4">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by name, email, or CNIC..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-transparent focus:border-primary focus:bg-white rounded-2xl transition-all outline-none text-sm font-medium"
                    />
                </div>

                <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
                    {[
                        { id: 'all', label: 'All', count: teachers.length },
                        {
                            id: 'registered',
                            label: 'New',
                            count: teachers.filter(t => isUnassignedTeacher(t) && !t.registeredOld).length
                        },
                        {
                            id: 'registeredOld',
                            label: 'Old',
                            count: teachers.filter(t => isUnassignedTeacher(t) && t.registeredOld).length
                        },
                        {
                            id: 'enrolled',
                            label: 'Active',
                            count: teachers.filter(isEnrolledActive).length
                        },
                        {
                            id: 'enrolledInactive',
                            label: 'Inactive',
                            count: teachers.filter(isEnrolledInactive).length
                        },
                        {
                            id: 'completed',
                            label: 'Completed',
                            count: teachers.filter(t => (t.certificateCount || 0) > 0).length
                        }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setFilterStatus(tab.id)}
                            className={`px-3 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all flex items-center justify-between gap-2 border ${filterStatus === tab.id
                                ? 'bg-primary text-white border-primary shadow-lg shadow-primary/10'
                                : 'bg-gray-50 text-gray-500 border-gray-100 hover:bg-gray-100'
                                }`}
                        >
                            <span className="truncate">{tab.label}</span>
                            <span className={`text-[9px] px-2 py-0.5 rounded-full font-black shrink-0 ${filterStatus === tab.id
                                ? 'bg-white/20 text-white'
                                : 'bg-gray-200 text-gray-500'
                                }`}>
                                {tab.count}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Teachers List */}
            {filteredTeachers.length === 0 ? (
                <div className="bg-white dark:bg-slate-900/70 rounded-2xl p-12 border border-gray-100 dark:border-slate-700 text-center">
                    <User className="w-12 h-12 text-gray-300 dark:text-slate-600 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-slate-400">No teachers found</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {filteredTeachers.map((teacher, index) => (
                        <motion.div
                            key={teacher._id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="bg-white dark:bg-slate-900/70 rounded-2xl p-4 sm:p-6 border border-gray-100 dark:border-slate-700 shadow-sm dark:shadow-none"
                        >
                            <div className="flex flex-col 2xl:flex-row 2xl:items-center gap-5 2xl:gap-6">
                                {/* Photo & Basic Info */}
                                <div className="flex items-center gap-4 min-w-0">
                                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center overflow-hidden shrink-0 shadow-lg shadow-orange-900/10">
                                        {teacher.photo ? (
                                            <img src={teacher.photo} alt={teacher.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-white text-2xl font-black">{teacher.name?.charAt(0)}</span>
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                                            <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tighter truncate">{teacher.name}</h3>
                                            {teacher.rollNo && (
                                                <Badge variant="primary" size="xxs">#{teacher.rollNo}</Badge>
                                            )}
                                        </div>
                                        <p className="text-xs font-medium text-gray-500 dark:text-slate-400 flex items-center gap-1.5 truncate">
                                            <Mail className="w-3.5 h-3.5 text-gray-400 dark:text-slate-500" /> {teacher.email}
                                        </p>
                                    </div>
                                </div>

                                {/* Details Grid */}
                                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-5 w-full 2xl:flex-[2] bg-gray-50/80 dark:bg-slate-800/80 p-4 rounded-2xl border border-gray-100 dark:border-slate-600">
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-black text-gray-400 dark:text-slate-400 uppercase tracking-widest">Teacher ID</p>
                                        <p className="text-xs font-bold text-blue-600 dark:text-blue-300 font-mono tracking-tighter">{teacher.rollNo || 'N/A'}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-black text-gray-400 dark:text-slate-400 uppercase tracking-widest">Phone</p>
                                        <p className="text-xs font-bold text-gray-700 dark:text-slate-100 break-all">{teacher.phone || 'N/A'}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-black text-gray-400 dark:text-slate-400 uppercase tracking-widest">CNIC</p>
                                        <p className="text-xs font-bold text-gray-700 dark:text-slate-100 font-mono tracking-tighter break-all">{teacher.cnic || 'N/A'}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-black text-gray-400 dark:text-slate-400 uppercase tracking-widest">Gender</p>
                                        <p className="text-xs font-bold text-gray-700 dark:text-slate-100">{teacher.gender || 'N/A'}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-black text-gray-400 dark:text-slate-400 uppercase tracking-widest">Qualification</p>
                                        <p className="text-xs font-bold text-gray-700 dark:text-slate-100 truncate">{teacher.qualification || 'N/A'}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-black text-gray-400 dark:text-slate-400 uppercase tracking-widest">Campus</p>
                                        <p className="text-xs font-bold text-gray-700 dark:text-slate-100 capitalize">{teacher.campusCity || teacher.location || teacher.city || 'N/A'}</p>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex flex-wrap items-center justify-end gap-2 shrink-0 border-t border-gray-100 dark:border-slate-700 2xl:border-t-0 pt-4 2xl:pt-0">
                                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 2xl:pb-0">
                                        <button
                                            type="button"
                                            onClick={() => handleActiveStatus(teacher)}
                                            disabled={togglingActiveId === teacher._id}
                                            className={`px-3 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all border disabled:opacity-60 ${teacher.isActive === false
                                                ? 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-400/20 text-red-700 dark:text-red-300'
                                                : 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-400/20 text-emerald-700 dark:text-emerald-300'
                                                }`}
                                            title={teacher.isActive === false ? 'Activate teacher' : 'Deactivate teacher'}
                                        >
                                            {togglingActiveId === teacher._id
                                                ? 'Updating...'
                                                : teacher.isActive === false ? 'Inactive' : 'Active'}
                                        </button>
                                        {isUnassignedTeacher(teacher) && (
                                            <button
                                                onClick={() => handleMoveToOld(teacher)}
                                                className={`px-3 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all border ${teacher.registeredOld
                                                    ? 'bg-purple-50 dark:bg-purple-500/10 border-purple-200 dark:border-purple-400/20 text-purple-700 dark:text-purple-300'
                                                    : 'bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-600 text-gray-500 dark:text-slate-300 hover:text-purple-700'
                                                    }`}
                                                title={teacher.registeredOld ? 'Move to New' : 'Move to Old'}
                                            >
                                                {teacher.registeredOld ? 'New' : 'Old'}
                                            </button>
                                        )}
                                        <button
                                            onClick={() => downloadTeacherPDF(teacher)}
                                            className="p-2.5 bg-primary/5 dark:bg-primary/10 hover:bg-primary/10 dark:hover:bg-primary/20 text-primary dark:text-orange-300 rounded-xl border border-primary/10 dark:border-primary/20 transition-all"
                                            title="PDF"
                                        >
                                            <Download className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={() => openPauseModal(teacher)}
                                            className="p-2.5 bg-primary/5 dark:bg-primary/10 hover:bg-primary/10 dark:hover:bg-primary/20 text-primary dark:text-orange-300 rounded-xl border border-primary/10 dark:border-primary/20 transition-all"
                                            title="Pause"
                                        >
                                            <PauseCircle className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={() => handleEditClick(teacher)}
                                            className="p-2.5 bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 text-blue-600 dark:text-blue-300 rounded-xl border border-blue-100 dark:border-blue-400/20 transition-all"
                                            title="Edit"
                                        >
                                            <Edit2 className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={() => setConfirmModal({ open: true, action: 'delete', teacher })}
                                            className="p-2.5 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 text-red-600 dark:text-red-300 rounded-xl border border-red-100 dark:border-red-400/20 transition-all"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>

                                    <div className="h-8 w-px bg-gray-100 dark:bg-slate-700 hidden 2xl:block mx-1" />

                                    <button
                                        onClick={() => setConfirmModal({ open: true, action: teacher.isVerified ? 'unverify' : 'verify', teacher })}
                                        className={`px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg ${teacher.isVerified
                                            ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-900/10'
                                            : 'bg-primary hover:bg-primary text-white shadow-primary/10'
                                            } flex items-center justify-center gap-2 min-w-[120px] active:scale-95`}
                                    >
                                        {teacher.isVerified ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                                        {teacher.isVerified ? 'Revoke' : 'Verify'}
                                    </button>
                                </div>
                            </div>

                            {/* Extra Info */}
                            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                                {teacher.specialization && (
                                    <div className="flex items-center gap-2.5 min-w-0 px-3 py-3 bg-gray-50/80 dark:bg-slate-800/80 rounded-xl border border-gray-100 dark:border-slate-600">
                                        <GraduationCap className="w-4 h-4 text-primary" />
                                        <div>
                                            <p className="text-[9px] font-black text-gray-400 dark:text-slate-400 uppercase tracking-widest leading-none mb-1">Skills</p>
                                            <p className="text-[11px] font-bold text-gray-700 dark:text-slate-100 truncate">{teacher.specialization}</p>
                                        </div>
                                    </div>
                                )}
                                {teacher.experience && (
                                    <div className="flex items-center gap-2.5 min-w-0 px-3 py-3 bg-gray-50/80 dark:bg-slate-800/80 rounded-xl border border-gray-100 dark:border-slate-600">
                                        <Calendar className="w-4 h-4 text-primary" />
                                        <div>
                                            <p className="text-[9px] font-black text-gray-400 dark:text-slate-400 uppercase tracking-widest leading-none mb-1">Experience</p>
                                            <p className="text-[11px] font-bold text-gray-700 dark:text-slate-100 truncate">{teacher.experience} Years</p>
                                        </div>
                                    </div>
                                )}
                                <div className="flex items-center gap-2.5 min-w-0 px-3 py-3 bg-gray-50/80 dark:bg-slate-800/80 rounded-xl border border-gray-100 dark:border-slate-600">
                                    <MapPin className="w-4 h-4 text-blue-500" />
                                    <div>
                                        <p className="text-[9px] font-black text-gray-400 dark:text-slate-400 uppercase tracking-widest leading-none mb-1">Address</p>
                                        <p className="text-[11px] font-bold text-gray-700 dark:text-slate-100 truncate">
                                            {[teacher.address, teacher.city, teacher.country].filter(Boolean).join(', ') || 'N/A'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2.5 min-w-0 px-3 py-3 bg-gray-50/80 dark:bg-slate-800/80 rounded-xl border border-gray-100 dark:border-slate-600">
                                    <BookOpen className="w-4 h-4 text-blue-500" />
                                    <div>
                                        <p className="text-[9px] font-black text-gray-400 dark:text-slate-400 uppercase tracking-widest leading-none mb-1">Attend Classes</p>
                                        <p className="text-[11px] font-bold text-gray-700 dark:text-slate-100 truncate">{teacher.attendType || 'N/A'}</p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Confirm Modal */}
            <Modal
                isOpen={confirmModal.open}
                onClose={() => setConfirmModal({ open: false, action: null, teacher: null })}
                title={
                    confirmModal.action === 'verify' ? 'Verify Teacher' :
                        confirmModal.action === 'unverify' ? 'Revoke Verification' : 'Delete Teacher'
                }
                size="md"
            >
                {confirmModal.teacher && (
                    <div className="space-y-4">
                        <div className={`p-4 rounded-xl text-center ${confirmModal.action === 'delete' ? 'bg-red-50' :
                            confirmModal.action === 'verify' ? 'bg-primary/5' : 'bg-amber-50'
                            }`}>
                            {confirmModal.action === 'verify' && <UserCheck className="w-12 h-12 text-primary mx-auto mb-2" />}
                            {confirmModal.action === 'unverify' && <UserX className="w-12 h-12 text-amber-600 mx-auto mb-2" />}
                            {confirmModal.action === 'delete' && <Trash2 className="w-12 h-12 text-red-600 mx-auto mb-2" />}

                            <p className="text-gray-700">
                                {confirmModal.action === 'verify' && 'You are about to verify:'}
                                {confirmModal.action === 'unverify' && 'You are about to revoke verification for:'}
                                {confirmModal.action === 'delete' && 'You are about to permanently delete:'}
                            </p>
                            <p className="text-xl font-bold text-gray-900 mt-2">{confirmModal.teacher.name}</p>
                            <p className="text-sm text-gray-500">{confirmModal.teacher.email}</p>
                        </div>

                        {confirmModal.action === 'verify' && (
                            <p className="text-sm text-gray-500 text-center">
                                Once verified, this teacher can be assigned to courses.
                            </p>
                        )}
                        {confirmModal.action === 'delete' && (
                            <p className="text-sm text-red-500 text-center">
                                This action cannot be undone. All data associated with this teacher will be removed.
                            </p>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={() => setConfirmModal({ open: false, action: null, teacher: null })}
                                className="flex-1 py-3 text-gray-600 hover:bg-gray-100 rounded-xl font-medium"
                            >
                                Cancel
                            </button>
                                <button
                                    onClick={
                                        confirmModal.action === 'verify' ? handleVerify :
                                            confirmModal.action === 'unverify' ? handleUnverify : handleDelete
                                    }
                                    disabled={isProcessing}
                                    className={`flex-1 py-3 rounded-xl font-medium flex items-center justify-center gap-2 ${confirmModal.action === 'delete'
                                        ? 'bg-red-600 hover:bg-red-700 text-white'
                                        : confirmModal.action === 'verify'
                                            ? 'bg-primary hover:bg-primary text-white'
                                            : 'bg-amber-500 hover:bg-amber-600 text-white'
                                        }`}
                                >
                                    <ButtonLoader
                                        isLoading={isProcessing}
                                        icon={
                                            confirmModal.action === 'verify' ? <UserCheck className="w-5 h-5" /> :
                                                confirmModal.action === 'unverify' ? <UserX className="w-5 h-5" /> : <Trash2 className="w-5 h-5" />
                                        }
                                    >
                                        Confirm
                                    </ButtonLoader>
                                </button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Pause from Course Modal */}
            <Modal
                isOpen={pauseModal.open}
                onClose={() => { setPauseModal({ open: false, teacher: null }); setTeacherCourses([]); }}
                title={`Pause "${pauseModal.teacher?.name || ''}" from Course`}
                size="md"
            >
                <div className="space-y-4">
                    <p className="text-sm text-gray-500">Select a course to pause or resume this teacher's access.</p>
                    {loadingCourses ? (
                        <div className="flex items-center justify-center py-10">
                            <Loader message="Loading courses..." />
                        </div>
                    ) : teacherCourses.length === 0 ? (
                        <div className="text-center py-10">
                            <BookOpen className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                            <p className="text-gray-400 font-medium">This teacher is not assigned to any courses.</p>
                        </div>
                    ) : (
                        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                            {teacherCourses.map(course => {
                                const teacherId = pauseModal.teacher?._id;
                                const isPaused = (course.pausedTeachers || []).some(
                                    t => (t._id || t).toString() === (teacherId || '').toString()
                                );
                                const isBusy = pausingCourseId === course._id;
                                return (
                                    <div
                                        key={course._id}
                                        className={`flex items-center justify-between p-3 rounded-xl border transition-all ${isPaused
                                            ? 'bg-primary/5 border-orange-200'
                                            : 'bg-gray-50 border-gray-100'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isPaused ? 'bg-primary/10' : 'bg-primary/10'
                                                }`}>
                                                <BookOpen className={`w-4 h-4 ${isPaused ? 'text-primary' : 'text-primary'
                                                    }`} />
                                            </div>
                                            <div>
                                                <p className="font-bold text-sm text-gray-900 truncate max-w-[180px]">{course.title}</p>
                                                <p className="text-[10px] text-gray-400 uppercase font-black tracking-wider">
                                                    {course.targetAudience} • {course.city}
                                                    {isPaused && <span className="ml-2 text-primary">⏸ PAUSED</span>}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => isPaused ? handleResumeTeacher(course._id) : handlePauseTeacher(course._id)}
                                            disabled={isBusy}
                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs uppercase tracking-wide transition-all disabled:opacity-50 ${isPaused
                                                ? 'bg-primary hover:bg-primary text-white'
                                                : 'bg-primary hover:bg-primary text-white'
                                                }`}
                                        >
                                            <ButtonLoader isLoading={isBusy} icon={isPaused ? <PlayCircle className="w-3.5 h-3.5" /> : <PauseCircle className="w-3.5 h-3.5" />}>
                                                {isPaused ? 'Resume' : 'Pause'}
                                            </ButtonLoader>
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    <button
                        onClick={() => { setPauseModal({ open: false, teacher: null }); setTeacherCourses([]); }}
                        className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors"
                    >
                        Close
                    </button>
                </div>
            </Modal>

            {/* Edit Modal */}
            <Modal
                isOpen={editModal.open}
                onClose={() => setEditModal({ open: false, user: null })}
                title="Edit Teacher Bio"
                size="lg"
            >
                <form onSubmit={handleUpdate} className="space-y-4">
                    {/* Profile Picture Section */}
                    <div className="flex flex-col items-center justify-center pb-6 border-b border-gray-100 mb-6">
                        <div className="relative group">
                            <div className="w-24 h-24 rounded-2xl bg-gray-100 flex items-center justify-center overflow-hidden border-2 border-dashed border-gray-200 group-hover:border-primary transition-all">
                                {photoPreview ? (
                                    <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                                ) : (
                                    <Camera className="w-8 h-8 text-gray-400" />
                                )}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <Upload className="w-6 h-6 text-white" />
                                </div>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handlePhotoChange}
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                />
                            </div>
                            <div className="absolute -bottom-2 -right-2 bg-primary text-white p-1.5 rounded-lg shadow-lg">
                                <Plus className="w-3.5 h-3.5" />
                            </div>
                        </div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-3">Click to update profile photo</p>
                    </div>

                    {/* Personal Information */}
                    <h3 className="font-semibold text-gray-900 pb-2 border-b">Personal Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Full Name *</label>
                            <input
                                type="text"
                                value={editForm.name}
                                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Father's Name</label>
                            <input
                                type="text"
                                value={editForm.fatherName}
                                onChange={(e) => setEditForm({ ...editForm, fatherName: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">WhatsApp Number</label>
                            <input
                                type="text"
                                value={editForm.phone}
                                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">CNIC / B-Form</label>
                            <input
                                type="text"
                                value={editForm.cnic}
                                onChange={(e) => setEditForm({ ...editForm, cnic: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Date of Birth</label>
                            <input
                                type="date"
                                value={editForm.dob}
                                onChange={(e) => setEditForm({ ...editForm, dob: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Gender</label>
                            <select
                                value={editForm.gender}
                                onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                            >
                                <option value="">Select Gender</option>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Highest Qualification</label>
                            <input
                                type="text"
                                value={editForm.qualification}
                                onChange={(e) => setEditForm({ ...editForm, qualification: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Specialization</label>
                            <input
                                type="text"
                                value={editForm.specialization}
                                onChange={(e) => setEditForm({ ...editForm, specialization: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Years of Experience</label>
                            <input
                                type="text"
                                value={editForm.experience}
                                onChange={(e) => setEditForm({ ...editForm, experience: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">City</label>
                            <input
                                type="text"
                                value={editForm.city || ''}
                                onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                            />
                        </div>
                    </div>

                    {/* Address Details */}
                    <h3 className="font-semibold text-gray-900 pb-2 border-b mt-6">Address Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Country</label>
                            <input
                                type="text"
                                value={editForm.country || ''}
                                onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                            />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <label className="text-sm font-medium text-gray-700">Address</label>
                            <textarea
                                value={editForm.address}
                                onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                                rows={2}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                            />
                        </div>
                    </div>

                    {/* Campus Details */}
                    <h3 className="font-semibold text-gray-900 pb-2 border-b mt-6">Campus Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Campus Location</label>
                            <select
                                value={editForm.location}
                                onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                            >
                                <option value="">Select Location</option>
                                <option value="Islamabad">Islamabad</option>
                                <option value="Bahawalpur">Bahawalpur</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Attend Classes</label>
                            <select
                                value={editForm.attendType || ''}
                                onChange={(e) => setEditForm({ ...editForm, attendType: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                            >
                                <option value="">Select Type</option>
                                <option value="Physical">Physical</option>
                                <option value="Online">Online</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Roll Number</label>
                            <input
                                type="text"
                                value={editForm.rollNo}
                                onChange={(e) => setEditForm({ ...editForm, rollNo: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Department</label>
                            <input
                                type="text"
                                value={editForm.department}
                                onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                            />
                        </div>
                    </div>

                    {/* Account Setup */}
                    <h3 className="font-semibold text-gray-900 pb-2 border-b mt-6">Account Setup</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Email Address *</label>
                            <input
                                type="email"
                                value={editForm.email}
                                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Password</label>
                            <input
                                type="text"
                                value={editForm.password}
                                onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none font-mono"
                            />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <label className="text-sm font-medium text-gray-700">How did you hear about us?</label>
                            <input
                                type="text"
                                value={editForm.heardAbout || ''}
                                onChange={(e) => setEditForm({ ...editForm, heardAbout: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                            />
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={() => setEditModal({ open: false, user: null })}
                            className="flex-1 py-3 text-gray-600 hover:bg-gray-100 rounded-xl font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isProcessing}
                            className="flex-1 py-3 bg-primary hover:bg-primary text-white rounded-xl font-medium flex items-center justify-center gap-2"
                        >
                            <ButtonLoader isLoading={isProcessing} icon={<Save className="w-5 h-5" />}>
                                Update Bio
                            </ButtonLoader>
                        </button>
                    </div>
                </form>
            </Modal>

            {cropperSrc && (
                <ImageCropper
                    imageSrc={cropperSrc}
                    onCrop={handleCropDone}
                    onCancel={() => setCropperSrc(null)}
                    accentColor="emerald"
                />
            )}
        </div>
    );
};

export default TeachersManagement;



