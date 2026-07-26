import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSelector, useDispatch } from 'react-redux';
import {
    User, Mail, Phone, MapPin, Briefcase,
    Edit2, Save, X, Camera, FileText, Award, Star
} from 'lucide-react';
import { ButtonLoader } from '../../components/ui/Loader';
import { authAPI, taskAPI, settingsAPI } from '../../services/api';
import { updateUser } from '../../features/auth/authSlice';

const InfoField = ({ icon: Icon, label, value, name, type = 'text', editable = true, isEditing, editForm, onChange, multiline = false }) => (
    <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <Icon className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-500 mb-1">{label}</p>
            {isEditing && editable ? (
                multiline ? (
                    <textarea
                        name={name}
                        value={editForm[name] || ''}
                        onChange={onChange}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                ) : (
                    <input
                        type={type}
                        name={name}
                        value={editForm[name] || ''}
                        onChange={onChange}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                )
            ) : (
                <p className="font-medium text-gray-900 truncate">{value || 'Not provided'}</p>
            )}
        </div>
    </div>
);

const JobProfile = () => {
    const { user } = useSelector((state) => state.auth);
    const dispatch = useDispatch();
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [myTasks, setMyTasks] = useState([]);

    const [profileData, setProfileData] = useState({
        fullName: user?.name || '',
        email: user?.email || '',
        phone: user?.phone || '',
        skills: user?.skills || '',
        experience: user?.experience || '',
        portfolio: user?.portfolio || '',
        city: user?.location || '',
        joinedAt: user?.createdAt || new Date().toISOString(),
        status: user?.isVerified ? 'Verified' : 'Pending',
        completedTasks: user?.completedTasks || 0,
        rating: user?.rating || 0,
        totalEarnings: user?.totalEarnings || 0
    });

    const [editForm, setEditForm] = useState({ ...profileData });

    useEffect(() => {
        fetchMyTasks();
        fetchSettings();
    }, []);

    const [allowBioEditing, setAllowBioEditing] = useState(true);

    // Check if user has bio data - if no data, allow editing regardless of setting
    const hasNoData = !user?.phone && !user?.city && !user?.skills;

    const fetchSettings = async () => {
        try {
            const res = await settingsAPI.getAll();
            setAllowBioEditing(res.data.data.allowBioEditing_job ?? false);
        } catch (error) {
            console.error('Error fetching settings:', error);
        }
    };

    // Final check: allow editing if setting is on OR if user has no data
    const canEditBio = allowBioEditing || hasNoData;

    const fetchMyTasks = async () => {
        try {
            const response = await taskAPI.getAll();
            const allTasks = response.data.data || [];
            // Filter tasks where this user is an applicant or has submissions
            const userTasks = allTasks.filter(t =>
                t.applicants?.some(a => a.user?._id === user?._id || a.user === user?._id) ||
                t.submissions?.some(s => s.user?._id === user?._id || s.user === user?._id)
            );
            setMyTasks(userTasks);
            const userId = String(user?.id || user?._id);
            const calculatedEarnings = userTasks.reduce((total, task) => total + (task.paymentHistory || []).reduce((sum, payment) => {
                return String(payment.user?._id || payment.user) === userId ? sum + Number(payment.amount || 0) : sum;
            }, 0), 0);
            setProfileData(prev => ({ ...prev, totalEarnings: calculatedEarnings }));
        } catch (error) {
            console.error('Error fetching tasks:', error);
        }
    };

    const handleEdit = () => {
        setEditForm({ ...profileData });
        setIsEditing(true);
    };

    const handleCancel = () => {
        setEditForm({ ...profileData });
        setIsEditing(false);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const response = await authAPI.updateProfile({
                email: editForm.email,
                name: editForm.fullName,
                phone: editForm.phone,
                city: editForm.city,
                skills: editForm.skills,
                experience: editForm.experience,
                portfolio: editForm.portfolio
            });

            setProfileData({ ...editForm });
            setIsEditing(false);

            if (response.data.user) {
                dispatch(updateUser(response.data.user));
            }
        } catch (error) {
            console.error('Error saving profile:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setEditForm(prev => ({ ...prev, [name]: value }));
    };



    const stats = [
        { label: 'Tasks Applied', value: myTasks.length.toString(), icon: FileText, color: 'bg-blue-100 text-blue-600' },
        { label: 'Completed Tasks', value: profileData.completedTasks.toString(), icon: Award, color: 'bg-primary/10 text-primary' },
        { label: 'Rating', value: profileData.rating > 0 ? profileData.rating.toFixed(1) : 'N/A', icon: Star, color: 'bg-amber-100 text-amber-600' },
        { label: 'Total Earnings', value: `Rs ${Number(profileData.totalEarnings || 0).toLocaleString()}`, icon: Briefcase, color: 'bg-emerald-100 text-emerald-600' },
    ];

    return (
        <div className="space-y-6">
            {/* Header Card */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-primary to-primary-dark rounded-2xl p-8 text-white relative overflow-hidden"
            >
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />

                <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
                    {/* Profile Picture */}
                    <div className="relative">
                        <div className="w-28 h-28 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-4xl font-bold border-4 border-white/30 overflow-hidden">
                            {user?.photo ? (
                                <img src={user.photo} alt={user.name} className="w-full h-full object-cover" />
                            ) : (
                                (profileData.fullName || 'J').charAt(0).toUpperCase()
                            )}
                        </div>
                        <button className="absolute -bottom-2 -right-2 w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg hover:bg-gray-50 transition-colors">
                            <Camera className="w-5 h-5 text-primary" />
                        </button>
                    </div>

                    {/* Basic Info */}
                    <div className="flex-1 text-center md:text-left">
                        <h1 className="text-3xl font-bold mb-2">{profileData.fullName || user?.name}</h1>
                        <p className="text-primary/10 text-lg mb-3">
                            <Briefcase className="w-5 h-5 inline mr-2" />
                            Job Seeker
                        </p>
                        <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                            <span className={`px-3 py-1 rounded-full text-sm ${profileData.status === 'Verified' ? 'bg-green-500/20' : 'bg-white/20'}`}>
                                {profileData.status}
                            </span>
                            <span className="px-3 py-1 bg-white/20 rounded-full text-sm capitalize">
                                {profileData.city || user?.location || 'Location not set'}
                            </span>
                        </div>
                    </div>

                    {/* Edit Button */}
                    <div>
                        {!isEditing ? (
                            <button
                                onClick={handleEdit}
                                className="px-6 py-3 bg-white text-primary font-semibold rounded-xl hover:bg-gray-50 transition-colors flex items-center gap-2"
                            >
                                <Edit2 className="w-4 h-4" />
                                Edit Profile
                            </button>
                        ) : (
                            <div className="flex gap-2">
                                <ButtonLoader isLoading={isSaving} icon={<Save className="w-4 h-4" />} onClick={handleSave}>
                                    Save
                                </ButtonLoader>
                                <button
                                    onClick={handleCancel}
                                    className="px-5 py-3 bg-white/20 text-white font-semibold rounded-xl hover:bg-white/30 transition-colors flex items-center gap-2"
                                >
                                    <X className="w-4 h-4" />
                                    Cancel
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {stats.map((stat, index) => (
                    <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={`bg-white rounded-xl p-4 sm:p-6 border border-primary/20 shadow-sm ${index === 2 ? 'col-span-2 lg:col-span-1' : ''}`}
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[10px] sm:text-sm font-black text-gray-500 uppercase tracking-widest mb-1">{stat.label}</p>
                                <p className="text-lg sm:text-2xl font-black text-gray-900 leading-none">{stat.value}</p>
                            </div>
                            <div className={`w-9 h-9 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${stat.color}`}>
                                <stat.icon className="w-5 h-5 sm:w-6 h-6" />
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Profile Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Personal Information */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white rounded-2xl p-6 border border-gray-100"
                >
                    <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
                        <User className="w-5 h-5 text-primary" />
                        Personal Information
                    </h2>
                    <div className="space-y-4">
                        <InfoField isEditing={isEditing} editForm={editForm} onChange={handleChange} icon={User} label="Full Name" value={profileData.fullName} name="fullName" editable={canEditBio} />
                        <InfoField isEditing={isEditing} editForm={editForm} onChange={handleChange} icon={Mail} label="Email" value={profileData.email} name="email" type="email" editable />
                        <InfoField isEditing={isEditing} editForm={editForm} onChange={handleChange} icon={Phone} label="Phone" value={profileData.phone} name="phone" editable={canEditBio} />
                        {!canEditBio && isEditing && (
                            <p className="text-xs text-red-500 font-medium px-4">
                                * Bio editing is currently disabled by administrator.
                            </p>
                        )}
                        <InfoField isEditing={isEditing} editForm={editForm} onChange={handleChange} icon={MapPin} label="City" value={profileData.city} name="city" editable={canEditBio} />
                    </div>
                </motion.div>

                {/* Professional Information */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-white rounded-2xl p-6 border border-gray-100"
                >
                    <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
                        <Briefcase className="w-5 h-5 text-primary" />
                        Professional Information
                    </h2>
                    <div className="space-y-4">
                        <InfoField isEditing={isEditing} editForm={editForm} onChange={handleChange} icon={Briefcase} label="Skills" value={profileData.skills} name="skills" multiline editable={canEditBio} />
                        <InfoField isEditing={isEditing} editForm={editForm} onChange={handleChange} icon={FileText} label="Experience" value={profileData.experience} name="experience" multiline editable={canEditBio} />
                        <InfoField isEditing={isEditing} editForm={editForm} onChange={handleChange} icon={FileText} label="Portfolio URL" value={profileData.portfolio} name="portfolio" type="url" editable={canEditBio} />
                    </div>
                </motion.div>
            </div>

            {/* Applied Tasks */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-white rounded-2xl p-6 border border-gray-100"
            >
                <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    My Applied Tasks
                </h2>
                {myTasks.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p>No tasks applied yet</p>
                        <p className="text-sm">Browse available tasks to get started!</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {myTasks.slice(0, 5).map((task) => (
                            <div key={task._id} className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <FileText className="w-5 h-5 text-primary" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-gray-900">{task.title}</p>
                                    <p className="text-sm text-gray-500">Budget: Rs. {isNaN(Number(task.budget)) ? task.budget : Number(task.budget).toLocaleString()}</p>
                                    <p className="text-xs text-primary mt-1 capitalize">{task.status || 'open'}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </motion.div>
        </div>
    );
};

export default JobProfile;




