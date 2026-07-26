import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Search, UserCheck, UserX, Trash2, User, Mail, Phone, MapPin,
    Briefcase, CheckCircle, Clock, Star, FileText, Edit2, Save, Camera, Upload, Plus, Shield, Download
} from 'lucide-react';
import Loader, { ButtonLoader } from '../../components/ui/Loader';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { userAPI, settingsAPI, taskAPI } from '../../services/api';
import ImageCropper from '../../components/ui/ImageCropper';

const JobsManagement = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [jobUsers, setJobUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('all');
    const [confirmModal, setConfirmModal] = useState({ open: false, action: null, user: null });
    const [editModal, setEditModal] = useState({ open: false, user: null });
    const [editForm, setEditForm] = useState({});
    const [isProcessing, setIsProcessing] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(null);
    const [cropperSrc, setCropperSrc] = useState(null);

    useEffect(() => {
        fetchJobUsers();
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await settingsAPI.getAll();
            setAllowBioEditing(res.data.data.allowBioEditing_job ?? false);
        } catch (error) {
            console.error('Error fetching settings:', error);
        }
    };

    const [allowBioEditing, setAllowBioEditing] = useState(false);

    const toggleBioEditing = async () => {
        try {
            const newValue = !allowBioEditing;
            await settingsAPI.update('allowBioEditing_job', newValue);
            setAllowBioEditing(newValue);
        } catch (error) {
            console.error('Error updating setting:', error);
        }
    };

    const fetchJobUsers = async () => {
        setIsLoading(true);
        try {
            const res = await userAPI.getByRole('job');
            setJobUsers(res.data.data || []);
        } catch (error) {
            console.error('Error fetching job users:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerify = async () => {
        if (!confirmModal.user) return;
        setIsProcessing(true);
        try {
            await userAPI.verify(confirmModal.user._id);
            setJobUsers(prev => prev.map(u =>
                u._id === confirmModal.user._id ? { ...u, isVerified: true } : u
            ));
        } catch (error) {
            console.error('Error verifying user:', error);
        } finally {
            setIsProcessing(false);
            setConfirmModal({ open: false, action: null, user: null });
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

    const handleUnverify = async () => {
        if (!confirmModal.user) return;
        setIsProcessing(true);
        try {
            await userAPI.unverify(confirmModal.user._id);
            setJobUsers(prev => prev.map(u =>
                u._id === confirmModal.user._id ? { ...u, isVerified: false } : u
            ));
        } catch (error) {
            console.error('Error unverifying user:', error);
        } finally {
            setIsProcessing(false);
            setConfirmModal({ open: false, action: null, user: null });
        }
    };

    const handleDelete = async () => {
        if (!confirmModal.user) return;
        setIsProcessing(true);
        try {
            await userAPI.delete(confirmModal.user._id);
            setJobUsers(prev => prev.filter(u => u._id !== confirmModal.user._id));
        } catch (error) {
            console.error('Error deleting user:', error);
        } finally {
            setIsProcessing(false);
            setConfirmModal({ open: false, action: null, user: null });
        }
    };

    const downloadUserPDF = async (user) => {
        let tasksDone = [];
        try {
            const res = await taskAPI.getAll();
            let allTasks = [];
            if (res.data && Array.isArray(res.data.data)) {
                allTasks = res.data.data;
            } else if (res.data && Array.isArray(res.data)) {
                allTasks = res.data;
            }
            
            tasksDone = allTasks.filter(task => {
                if (!task.assignedTo) return false;
                let isAssigned = false;
                if (Array.isArray(task.assignedTo)) {
                    isAssigned = task.assignedTo.some(u => String(u._id || u) === String(user._id));
                } else {
                    isAssigned = String(task.assignedTo._id || task.assignedTo) === String(user._id);
                }
                return isAssigned && task.status === 'completed';
            }).map(t => t.title);
        } catch (e) {
            console.error('Error fetching tasks', e);
        }

        const doc = new jsPDF();

        // Purple header for job matching UI
        doc.setFillColor(139, 92, 246);
        doc.rect(0, 0, 210, 40, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.text('JOB PROFILE', 14, 25);

        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        doc.text(`Status: ${user.isVerified ? 'VERIFIED' : 'PENDING'}`, 140, 26);

        let y = 50;

        const addFieldsAndSave = () => {
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('Personal & Professional Information', 14, y);
            doc.line(14, y + 2, 200, y + 2);

            y += 10;
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            const fields = [
                ['Name', user.name],
                ['Email', user.email],
                ['Phone', user.phone],
                ['CNIC', user.cnic],
                ['Location', user.location],
                ['City', user.city],
                ['Qualification', user.qualification],
                ['Teaching Experience', user.teachingExperience],
                ['Preferred Mode', user.preferredMode],
                ['Tasks Done', user.completedTasks?.toString() || tasksDone.length.toString()],
                ['Rating', user.rating?.toString() || '0'],
                ['Registration Date', user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A']
            ];
            fields.forEach(([label, value]) => {
                doc.setFont('helvetica', 'bold');
                doc.text(`${label}:`, 14, y);
                doc.setFont('helvetica', 'normal');
                doc.text(`${value || 'N/A'}`, 60, y);
                y += 7;

                if (y > 270) {
                    doc.addPage();
                    y = 20;
                }
            });
            
            y += 5; // Extra spacing
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('Completed Projects', 14, y);
            doc.line(14, y + 2, 200, y + 2);
            y += 10;
            
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            
            if (tasksDone.length === 0) {
                doc.text('No matching projects completed yet.', 14, y);
            } else {
                tasksDone.forEach((taskTitle, idx) => {
                    const lines = doc.splitTextToSize(`• ${taskTitle}`, 180);
                    doc.text(lines, 14, y);
                    y += (lines.length * 5) + 2; 
                    
                    if (y > 270) {
                        doc.addPage();
                        y = 20;
                    }
                });
            }

            doc.save(`Job_${user.name?.replace(/\s+/g, '_')}.pdf`);
        };

        if (user.photo) {
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.onload = function () {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                const dataURL = canvas.toDataURL('image/jpeg');

                doc.addImage(dataURL, 'JPEG', 160, 45, 35, 35);
                y = Math.max(y, 85);
                addFieldsAndSave();
            };
            img.onerror = function () {
                addFieldsAndSave();
            };
            img.src = user.photo;
        } else {
            addFieldsAndSave();
        }
    };

    const handleEditClick = (user) => {
        setEditModal({ open: true, user });
        setSelectedFile(null);
        setPhotoPreview(user.photo || null);
        setEditForm({
            name: user.name || '',
            email: user.email || '',
            phone: user.phone || '',
            cnic: user.cnic || '',
            fatherName: user.fatherName || user.guardianName || '',
            gender: user.gender || '',
            guardianName: user.guardianName || '',
            guardianRelation: user.guardianRelation || '',
            guardianPhone: user.guardianPhone || '',
            guardianOccupation: user.guardianOccupation || '',
            country: user.country || '',
            address: user.address || '',
            cvUrl: user.cvUrl || '',
            city: user.city || '',
            qualification: user.qualification || '',
            teachingExperience: user.teachingExperience || '',
            experienceDetails: user.experienceDetails || '',
            skills: user.skills || '',
            preferredCity: user.preferredCity || '',
            preferredMode: user.preferredMode || '',
            heardAbout: user.heardAbout || '',
            password: user.password || '',
            dob: user.dob ? new Date(user.dob).toISOString().split('T')[0] : ''
        });
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        setIsProcessing(true);
        try {
            const formData = new FormData();
            Object.keys(editForm).forEach(key => {
                if (editForm[key] !== null && editForm[key] !== undefined) {
                    formData.append(key, editForm[key]);
                }
            });

            if (selectedFile) {
                formData.append('photo', selectedFile);
            }

            const res = await userAPI.update(editModal.user._id, formData);
            setJobUsers(prev => prev.map(u => u._id === editModal.user._id ? res.data.data : u));
            setEditModal({ open: false, user: null });
            setSelectedFile(null);
            setPhotoPreview(null);
        } catch (error) {
            console.error('Error updating user:', error);
        } finally {
            setIsProcessing(false);
        }
    };

    const filteredUsers = jobUsers.filter(u => {
        const matchesSearch = (u.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (u.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (u.skills || '').toLowerCase().includes(searchQuery.toLowerCase());

        if (filterStatus === 'verified') return matchesSearch && u.isVerified;
        if (filterStatus === 'pending') return matchesSearch && !u.isVerified;
        return matchesSearch;
    });

    const verifiedCount = jobUsers.filter(u => u.isVerified).length;
    const pendingCount = jobUsers.filter(u => !u.isVerified).length;

    const [showExportOptions, setShowExportOptions] = useState(false);

    const downloadBulkPDF = (type = 'full') => {
        const doc = new jsPDF();
        doc.setFontSize(20);
        doc.setTextColor(147, 51, 234); // Purple for Job branding
        doc.text('Job Report', 14, 20);
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 28);
        doc.text(`Filter: ${filterStatus.toUpperCase()} | Total: ${filteredUsers.length}`, 14, 33);

        let headers = [];
        let data = [];

        switch (type) {
            case 'phone':
                headers = [['Name', 'Phone', 'Location', 'City']];
                data = filteredUsers.map(u => [u.name, u.phone || 'N/A', u.location || 'N/A', u.city || 'N/A']);
                break;
            case 'email':
                headers = [['Name', 'Email', 'Preferred Mode']];
                data = filteredUsers.map(u => [u.name, u.email, u.preferredMode || 'N/A']);
                break;
            case 'expertise':
                headers = [['Name', 'Skills / Expertise', 'Tasks', 'Rating']];
                data = filteredUsers.map(u => [
                    u.name,
                    u.skills || 'N/A',
                    u.completedTasks || 0,
                    u.rating > 0 ? u.rating.toFixed(1) : 'N/A'
                ]);
                break;
            case 'address':
                headers = [['Name', 'Home City', 'Preferred City', 'Location']];
                data = filteredUsers.map(u => [u.name, u.city || 'N/A', u.preferredCity || 'N/A', u.location || 'N/A']);
                break;
            default: // full
                headers = [['Name', 'Email', 'Phone', 'Skills', 'Verified']];
                data = filteredUsers.map(u => [
                    u.name,
                    u.email,
                    u.phone || 'N/A',
                    u.skills ? (u.skills.length > 30 ? u.skills.substring(0, 30) + '...' : u.skills) : 'N/A',
                    u.isVerified ? 'YES' : 'NO'
                ]);
        }

        autoTable(doc, {
            head: headers,
            body: data,
            startY: 40,
            theme: 'grid',
            headStyles: { fillColor: [147, 51, 234], textColor: 255, fontStyle: 'bold' },
            styles: { fontSize: 8, cellPadding: 3 },
            alternateRowStyles: { fillColor: [250, 245, 255] }
        });

        doc.save(`Jobs_${type}_${new Date().toLocaleDateString()}.pdf`);
        setShowExportOptions(false);
    };

    if (isLoading) {
        return (
            <Loader message="Loading job applicants..." />
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Job</h1>
                    <p className="text-gray-500 text-sm">Manage job applications and hiring</p>
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
                            className="w-full px-4 py-2.5 bg-white border border-primary/10 rounded-xl font-black text-[10px] uppercase tracking-widest text-purple-700 hover:bg-purple-50 transition-all flex items-center justify-center gap-2 shadow-sm"
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
                                        { id: 'expertise', label: 'Expertise', icon: Briefcase },
                                        { id: 'address', label: 'Address List', icon: MapPin }
                                    ].map((opt) => (
                                        <button
                                            key={opt.id}
                                            onClick={() => downloadBulkPDF(opt.id)}
                                            className="w-full px-4 py-2.5 text-left text-[11px] font-bold text-gray-700 hover:bg-purple-50 hover:text-purple-700 flex items-center gap-3 transition-colors"
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
                        placeholder="Search by name, email, or skills..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-transparent focus:border-primary focus:bg-white rounded-2xl transition-all outline-none text-sm font-medium"
                    />
                </div>

                <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
                    {[
                        { id: 'all', label: 'All', count: jobUsers.length },
                        { id: 'verified', label: 'Verified', count: verifiedCount },
                        { id: 'pending', label: 'Pending', count: pendingCount }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setFilterStatus(tab.id)}
                            className={`px-3 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-between gap-2 border ${filterStatus === tab.id
                                ? 'bg-primary text-white border-primary shadow-lg shadow-purple-900/10'
                                : 'bg-gray-50 text-gray-500 border-gray-100 hover:bg-gray-100'
                                }`}
                        >
                            <span className="truncate">{tab.label}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-black shrink-0 ${filterStatus === tab.id
                                ? 'bg-white/20 text-white'
                                : 'bg-gray-200 text-gray-500'
                                }`}>
                                {tab.count}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Job Users List */}
            {filteredUsers.length === 0 ? (
                <div className="bg-white dark:bg-slate-900/70 rounded-2xl p-12 border border-gray-100 dark:border-slate-700 text-center">
                    <Briefcase className="w-12 h-12 text-gray-300 dark:text-slate-600 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-slate-400">No job applicants found</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {filteredUsers.map((user, index) => (
                        <motion.div
                            key={user._id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="bg-white dark:bg-slate-900/70 rounded-2xl p-4 sm:p-6 border border-gray-100 dark:border-slate-700 shadow-sm dark:shadow-none"
                        >
                            <div className="flex flex-col 2xl:flex-row 2xl:items-center gap-5 2xl:gap-6">
                                {/* Photo & Basic Info */}
                                <div className="flex items-center gap-4 min-w-0">
                                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center overflow-hidden shrink-0 shadow-lg shadow-purple-900/10">
                                        {user.photo ? (
                                            <img src={user.photo} alt={user.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-white text-2xl font-black">{user.name?.charAt(0)}</span>
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tighter truncate mb-1.5">{user.name}</h3>
                                        <p className="text-xs font-medium text-gray-500 dark:text-slate-400 flex items-center gap-1.5 truncate">
                                            <Mail className="w-3.5 h-3.5 text-gray-400 dark:text-slate-500" /> {user.email}
                                        </p>
                                    </div>
                                </div>

                                {/* Stats Grid */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-6 w-full 2xl:flex-1 bg-gray-50/80 dark:bg-slate-800/80 p-4 rounded-2xl border border-gray-100 dark:border-slate-600">
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-black text-gray-400 dark:text-slate-400 uppercase tracking-widest">Phone</p>
                                        <p className="text-xs font-bold text-gray-700 dark:text-slate-100 break-all">{user.phone || 'N/A'}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-black text-gray-400 dark:text-slate-400 uppercase tracking-widest">Location</p>
                                        <p className="text-xs font-bold text-gray-700 dark:text-slate-100 capitalize truncate">{user.location || user.city || 'N/A'}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-black text-gray-400 dark:text-slate-400 uppercase tracking-widest">Tasks Done</p>
                                        <p className="text-xs font-bold text-gray-700 dark:text-slate-100">{user.completedTasks || 0}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-black text-gray-400 dark:text-slate-400 uppercase tracking-widest">Rating</p>
                                        <p className="text-xs font-bold text-gray-700 dark:text-slate-100 flex items-center gap-1">
                                            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                                            {user.rating > 0 ? user.rating.toFixed(1) : 'N/A'}
                                        </p>
                                    </div>
                                </div>

                                {/* Skills */}
                                {user.skills && (
                                    <div className="flex flex-col sm:flex-row sm:items-start gap-3 w-full 2xl:max-w-sm bg-purple-50/60 dark:bg-purple-500/10 p-4 rounded-xl border border-purple-100 dark:border-purple-400/20">
                                        <p className="text-[9px] font-black text-purple-500 dark:text-purple-300 uppercase tracking-widest shrink-0 sm:pt-1.5">Expertise</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {user.skills.split(',').map((skill, idx) => (
                                                <span key={idx} className="px-2.5 py-1 bg-white dark:bg-slate-800 text-purple-700 dark:text-purple-200 rounded-lg text-[10px] font-bold border border-purple-100 dark:border-purple-400/20 shadow-sm">
                                                    {skill.trim()}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="flex flex-wrap items-center justify-end gap-2 shrink-0 border-t border-gray-100 dark:border-slate-700 2xl:border-t-0 pt-4 2xl:pt-0">
                                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 2xl:pb-0">
                                        <button
                                            onClick={() => downloadUserPDF(user)}
                                            className="p-2.5 bg-primary/5 dark:bg-primary/10 hover:bg-primary/10 dark:hover:bg-primary/20 text-primary dark:text-orange-300 rounded-xl border border-primary/10 dark:border-primary/20 transition-all"
                                            title="Download Profile"
                                        >
                                            <Download className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={() => handleEditClick(user)}
                                            className="p-2.5 bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 text-blue-600 dark:text-blue-300 rounded-xl border border-blue-100 dark:border-blue-400/20 transition-all"
                                            title="Edit Bio"
                                        >
                                            <Edit2 className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={() => setConfirmModal({ open: true, action: 'delete', user })}
                                            className="p-2.5 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 text-red-600 dark:text-red-300 rounded-xl border border-red-100 dark:border-red-400/20 transition-all"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>

                                    <div className="h-8 w-px bg-gray-100 dark:bg-slate-700 hidden 2xl:block mx-1" />

                                    <button
                                        onClick={() => setConfirmModal({ open: true, action: user.isVerified ? 'unverify' : 'verify', user })}
                                        className={`px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg ${user.isVerified
                                                ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-900/10'
                                                : 'bg-primary hover:bg-purple-700 text-white shadow-purple-900/10'
                                            } flex items-center justify-center gap-2 min-w-[120px] active:scale-95`}
                                    >
                                        {user.isVerified ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                                        {user.isVerified ? 'Revoke' : 'Verify'}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Confirm Modal */}
            <Modal
                isOpen={confirmModal.open}
                onClose={() => setConfirmModal({ open: false, action: null, user: null })}
                title={
                    confirmModal.action === 'verify' ? 'Verify User' :
                        confirmModal.action === 'unverify' ? 'Revoke Verification' : 'Delete User'
                }
                size="md"
            >
                {confirmModal.user && (
                    <div className="space-y-4">
                        <div className={`p-4 rounded-xl text-center ${confirmModal.action === 'delete' ? 'bg-red-50' :
                            confirmModal.action === 'verify' ? 'bg-purple-50' : 'bg-amber-50'
                            }`}>
                            {confirmModal.action === 'verify' && <UserCheck className="w-12 h-12 text-primary mx-auto mb-2" />}
                            {confirmModal.action === 'unverify' && <UserX className="w-12 h-12 text-amber-600 mx-auto mb-2" />}
                            {confirmModal.action === 'delete' && <Trash2 className="w-12 h-12 text-red-600 mx-auto mb-2" />}

                            <p className="text-gray-700">
                                {confirmModal.action === 'verify' && 'You are about to verify:'}
                                {confirmModal.action === 'unverify' && 'You are about to revoke verification for:'}
                                {confirmModal.action === 'delete' && 'You are about to permanently delete:'}
                            </p>
                            <p className="text-xl font-bold text-gray-900 mt-2">{confirmModal.user.name}</p>
                            <p className="text-sm text-gray-500">{confirmModal.user.email}</p>
                        </div>

                        {confirmModal.action === 'delete' && (
                            <p className="text-sm text-red-500 text-center">
                                This action cannot be undone. All data associated with this user will be removed.
                            </p>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={() => setConfirmModal({ open: false, action: null, user: null })}
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
                                        ? 'bg-primary hover:bg-purple-700 text-white'
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

            {/* Edit Modal */}
            <Modal
                isOpen={editModal.open}
                onClose={() => setEditModal({ open: false, user: null })}
                title="Edit Applicant Bio"
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
                            <label className="text-sm font-medium text-gray-700">CNIC Number</label>
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
                                value={editForm.gender || ''}
                                onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                            >
                                <option value="">Select Gender</option>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                            </select>
                        </div>
                    </div>

                    {/* Guardian Information */}
                    <h3 className="font-semibold text-gray-900 pb-2 border-b mt-6">Guardian Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Guardian Name</label>
                            <input
                                type="text"
                                value={editForm.guardianName || ''}
                                onChange={(e) => setEditForm({ ...editForm, guardianName: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Relationship with Guardian</label>
                            <select
                                value={editForm.guardianRelation || ''}
                                onChange={(e) => setEditForm({ ...editForm, guardianRelation: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                            >
                                <option value="">Select Relationship</option>
                                <option value="Father">Father</option>
                                <option value="Mother">Mother</option>
                                <option value="Brother">Brother</option>
                                <option value="Sister">Sister</option>
                                <option value="Uncle">Uncle</option>
                                <option value="Aunt">Aunt</option>
                                <option value="Grandfather">Grandfather</option>
                                <option value="Grandmother">Grandmother</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Guardian WhatsApp Number</label>
                            <input
                                type="text"
                                value={editForm.guardianPhone || ''}
                                onChange={(e) => setEditForm({ ...editForm, guardianPhone: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Guardian Occupation</label>
                            <input
                                type="text"
                                value={editForm.guardianOccupation || ''}
                                onChange={(e) => setEditForm({ ...editForm, guardianOccupation: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                            />
                        </div>
                    </div>

                    {/* Address Details */}
                    <h3 className="font-semibold text-gray-900 pb-2 border-b mt-6">Address Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">City</label>
                            <input
                                type="text"
                                value={editForm.city}
                                onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                            />
                        </div>
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
                            <label className="text-sm font-medium text-gray-700">Home Address</label>
                            <textarea
                                value={editForm.address || ''}
                                onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                                rows={2}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                            />
                        </div>
                    </div>

                    {/* Professional Details */}
                    <h3 className="font-semibold text-gray-900 pb-2 border-b mt-6">Professional Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                            <label className="text-sm font-medium text-gray-700">Teaching Experience</label>
                            <input
                                type="text"
                                value={editForm.teachingExperience}
                                onChange={(e) => setEditForm({ ...editForm, teachingExperience: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                            />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <label className="text-sm font-medium text-gray-700">Experience Details</label>
                            <textarea
                                value={editForm.experienceDetails}
                                onChange={(e) => setEditForm({ ...editForm, experienceDetails: e.target.value })}
                                rows={2}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                            />
                        </div>
                    </div>

                    {/* Skills */}
                    <h3 className="font-semibold text-gray-900 pb-2 border-b mt-6">Skills</h3>
                    <div className="grid grid-cols-1 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Other Skills (Comma separated)</label>
                            <input
                                type="text"
                                value={editForm.skills}
                                onChange={(e) => setEditForm({ ...editForm, skills: e.target.value })}
                                placeholder="e.g. Photoshop, Web Design, Data Entry"
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                            />
                        </div>
                    </div>

                    {/* Preferences & Attachments */}
                    <h3 className="font-semibold text-gray-900 pb-2 border-b mt-6">Preferences & Attachments</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Preferred City</label>
                            <select
                                value={editForm.preferredCity}
                                onChange={(e) => setEditForm({ ...editForm, preferredCity: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                            >
                                <option value="">Select City</option>
                                <option value="Bahawalpur">Bahawalpur</option>
                                <option value="Islamabad">Islamabad</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Preferred Mode</label>
                            <select
                                value={editForm.preferredMode}
                                onChange={(e) => setEditForm({ ...editForm, preferredMode: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                            >
                                <option value="">Select Mode</option>
                                <option value="Physical">Physical</option>
                                <option value="Online">Online</option>
                                <option value="Both">Both</option>
                            </select>
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <label className="text-sm font-medium text-gray-700">CV/Resume URL</label>
                            <input
                                type="url"
                                value={editForm.cvUrl || ''}
                                onChange={(e) => setEditForm({ ...editForm, cvUrl: e.target.value })}
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
                                value={editForm.heardAbout}
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
                            className="flex-1 py-3 bg-primary hover:bg-purple-700 text-white rounded-xl font-medium flex items-center justify-center gap-2"
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
                    accentColor="purple"
                />
            )}
        </div>
    );
};

export default JobsManagement;



