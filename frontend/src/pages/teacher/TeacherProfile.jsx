import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSelector, useDispatch } from 'react-redux';
import {
    User, Mail, Phone, MapPin, CreditCard,
    Edit2, Save, X, Camera, BookOpen, GraduationCap, Briefcase, Calendar, Users
} from 'lucide-react';
import { authAPI, courseAPI, settingsAPI } from '../../services/api';
import { updateUser } from '../../features/auth/authSlice';
import { getCourseIcon } from '../../utils/courseIcons';
import ProfileAvatar from '../../components/ui/ProfileAvatar';
import Loader, { ButtonLoader } from '../../components/ui/Loader';
import { formatDate } from '../../utils/dateFormatter';
import { COUNTRIES } from '../../utils/locations';

const HEARD_ABOUT_OPTIONS = [
    'Poster & Panaflex', 'Facebook', 'Instagram', 'WhatsApp Group', 'Website',
    'YouTube', 'Friends & Family', 'Twitter', 'LinkedIn', 'Other'
];

const asSelectOptions = (values, placeholder) => [
    { value: '', label: placeholder },
    ...values.map(value => ({ value, label: value }))
];

const normalizeCampusCity = (city = '') => {
    const campus = ['Bahawalpur', 'Islamabad'].find(
        option => option.toLowerCase() === String(city).trim().toLowerCase()
    );
    return campus || '';
};

const InfoField = ({ icon: Icon, label, value, name, type = 'text', editable = true, isEditing, editForm, onChange }) => (
    <div className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-50 dark:bg-slate-800/70 rounded-xl border border-transparent dark:border-slate-700">
        <div className="w-9 h-9 sm:w-10 sm:h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <Icon className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
            <p className="text-[11px] sm:text-sm text-gray-500 dark:text-slate-400 mb-1">{label}</p>
            {isEditing && editable ? (
                <div className="relative">
                    <input
                        type={type}
                        name={name}
                        value={editForm[name] || ''}
                        onChange={onChange}
                        className={`w-full px-3 py-2 bg-white dark:bg-slate-900 text-gray-900 dark:text-white border border-gray-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary ${type === 'date' ? 'profile-date-input pr-11' : ''}`}
                    />
                    {type === 'date' && (
                        <button
                            type="button"
                            onClick={(event) => event.currentTarget.parentElement.querySelector('input')?.showPicker?.()}
                            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-lg text-primary hover:bg-primary/10 transition-colors"
                            aria-label="Open date calendar"
                        >
                            <Calendar className="w-4 h-4" />
                        </button>
                    )}
                </div>
            ) : (
                <p className="text-sm sm:text-base font-medium text-gray-900 dark:text-white break-words">{value || 'Not provided'}</p>
            )}
        </div>
    </div>
);

const SelectField = ({ icon: Icon, label, value, name, options, editable = true, isEditing, editForm, onChange }) => (
    <div className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-50 dark:bg-slate-800/70 rounded-xl border border-transparent dark:border-slate-700">
        <div className="w-9 h-9 sm:w-10 sm:h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <Icon className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
            <p className="text-[11px] sm:text-sm text-gray-500 dark:text-slate-400 mb-1">{label}</p>
            {isEditing && editable ? (
                <select
                    name={name}
                    value={editForm[name] || ''}
                    onChange={onChange}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
                >
                    {options.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                </select>
            ) : (
                <p className="text-sm sm:text-base font-medium text-gray-900 dark:text-white break-words">
                    {options.find(option => option.value === value)?.label || value || 'Not provided'}
                </p>
            )}
        </div>
    </div>
);

const TeacherProfile = () => {
    const { user } = useSelector((state) => state.auth);
    const dispatch = useDispatch();
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [myCourses, setMyCourses] = useState([]);
    const [totalStudents, setTotalStudents] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    const [profileData, setProfileData] = useState({
        fullName: user?.name || '',
        email: user?.email || '',
        phone: user?.phone || '',
        cnic: user?.cnic || '',
        fatherName: user?.fatherName || '',
        dob: user?.dob ? new Date(user.dob).toISOString().split('T')[0] : '',
        age: user?.age || '',
        gender: user?.gender || '',
        qualification: user?.qualification || '',
        specialization: user?.specialization || '',
        experience: user?.experience || '',
        address: user?.address || '',
        city: user?.city || '',
        country: user?.country || 'Pakistan',
        campusCity: normalizeCampusCity(user?.location),
        attendType: user?.attendType || '',
        heardAbout: user?.heardAbout || '',
        joinedAt: user?.createdAt || new Date().toISOString(),
        status: user?.isVerified ? 'Verified' : 'Pending'
    });

    const [editForm, setEditForm] = useState({ ...profileData });

    useEffect(() => {
        const init = async () => {
            setIsLoading(true);
            await Promise.all([fetchMyCourses(), fetchSettings()]);
            setIsLoading(false);
        };
        init();
    }, []);

    const [allowBioEditing, setAllowBioEditing] = useState(true);

    // Check if user has bio data - if no data, allow editing regardless of setting
    const hasNoData = !user?.phone && !user?.city && !user?.address;

    const fetchSettings = async () => {
        try {
            const res = await settingsAPI.getAll();
            setAllowBioEditing(res.data.data.allowBioEditing_teacher ?? false);
        } catch (error) {
            console.error('Error fetching settings:', error);
        }
    };

    // Final check: allow editing if setting is on OR if user has no data
    const canEditBio = allowBioEditing || hasNoData;

    const fetchMyCourses = async () => {
        try {
            const response = await courseAPI.getAll();
            const allCourses = response.data.data || [];
            // Filter courses where this teacher is assigned (check teachers array)
            const teacherCourses = allCourses.filter(c =>
                c.teachers?.some(t => String(t._id || t) === String(user?._id))
            );
            setMyCourses(teacherCourses);
            // Calculate total students
            const students = teacherCourses.reduce((sum, c) => sum + (c.enrolledCount || 0), 0);
            setTotalStudents(students);
        } catch (error) {
            console.error('Error fetching courses:', error);
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
                cnic: editForm.cnic,
                fatherName: editForm.fatherName,
                dob: editForm.dob,
                age: editForm.age,
                gender: editForm.gender,
                qualification: editForm.qualification,
                specialization: editForm.specialization,
                experience: editForm.experience,
                address: editForm.address,
                city: editForm.city,
                country: editForm.country,
                location: editForm.campusCity,
                attendType: editForm.attendType,
                heardAbout: editForm.heardAbout
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
        { label: 'My Courses', value: myCourses.length.toString(), icon: BookOpen, color: 'bg-primary/10 text-primary' },
        { label: 'Active Students', value: totalStudents.toString(), icon: User, color: 'bg-primary/10 text-primary' },
        { label: 'Classes This Month', value: '0', icon: GraduationCap, color: 'bg-primary/10 text-primary' },
        { label: 'Campus City', value: profileData.campusCity || 'Not set', icon: MapPin, color: 'bg-blue-50 text-blue-600' },
        { label: 'Attend Classes', value: profileData.attendType || 'Not set', icon: Users, color: 'bg-emerald-50 text-emerald-600' },
        { label: 'Experience', value: profileData.experience || 'Not set', icon: Briefcase, color: 'bg-amber-50 text-amber-600' },
    ];

    if (isLoading) {
        return (
            <Loader message="Loading profile..." />
        );
    }

    return (
        <div className="space-y-4 sm:space-y-6">
            {/* Header Card */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-primary to-primary-dark rounded-2xl p-4 sm:p-8 text-white relative overflow-hidden"
            >
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />

                <div className="flex flex-col md:flex-row items-center gap-4 sm:gap-6 relative z-10">
                    {/* Profile Picture */}
                    <div className="relative">
                        <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center border-2 sm:border-4 border-white/30 overflow-hidden">
                            <ProfileAvatar src={user?.photo} name={profileData.fullName || 'T'} size="2xl" shape="rounded-none" border="" fallbackColor="bg-white/20" />
                        </div>
                        {allowBioEditing && (
                            <button className="absolute -bottom-1.5 -right-1.5 w-9 h-9 sm:w-10 sm:h-10 bg-white rounded-xl flex items-center justify-center shadow-lg hover:bg-gray-50 transition-colors">
                                <Camera className="w-5 h-5 text-primary" />
                            </button>
                        )}
                    </div>

                    {/* Basic Info */}
                    <div className="flex-1 text-center md:text-left">
                        <h1 className="text-2xl sm:text-3xl font-bold mb-1.5 sm:mb-2 break-words">{profileData.fullName || user?.name}</h1>
                        <p className="text-white/85 text-sm sm:text-lg mb-3">
                            <GraduationCap className="w-5 h-5 inline mr-2" />
                            Teacher
                        </p>
                        <div className="flex flex-wrap gap-1.5 sm:gap-3 justify-center md:justify-start">
                            <span className="px-2.5 sm:px-3 py-1 bg-white/20 rounded-full text-[11px] sm:text-sm">
                                {profileData.status}
                            </span>
                            <span className="px-2.5 sm:px-3 py-1 bg-white/20 rounded-full text-[11px] sm:text-sm capitalize">
                                {profileData.city || user?.location || 'Location not set'}
                            </span>
                            <span className="px-2.5 sm:px-3 py-1 bg-white/20 rounded-full text-[11px] sm:text-sm font-mono tracking-tight">
                                Roll No# {user?.rollNo || '—'}
                            </span>
                            <span className="px-2.5 sm:px-3 py-1 bg-white/20 rounded-full text-[11px] sm:text-sm">
                                Joined {profileData.joinedAt ? formatDate(profileData.joinedAt) : '—'}
                            </span>
                        </div>
                    </div>

                    {/* Edit Button */}
                    <div className="w-full md:w-auto">
                        {!isEditing ? (
                            <button
                                onClick={handleEdit}
                                className="w-full md:w-auto px-6 py-2.5 sm:py-3 bg-slate-900 text-white md:bg-white md:text-primary font-semibold rounded-xl hover:bg-slate-800 md:hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                            >
                                <Edit2 className="w-4 h-4" />
                                Edit Profile
                            </button>
                        ) : (
                            <div className="grid grid-cols-2 md:flex gap-2">
                                <button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="px-5 py-3 bg-white text-primary font-semibold rounded-xl hover:bg-gray-50 transition-colors flex items-center gap-2 disabled:opacity-50"
                                >
                                    {isSaving ? <ButtonLoader /> : <Save className="w-4 h-4" />}
                                    Save
                                </button>
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
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4">
                {stats.map((stat, index) => (
                    <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="bg-white dark:bg-slate-900 rounded-xl p-3 sm:p-6 border border-primary/20 dark:border-slate-800 shadow-sm"
                    >
                        <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                                <p className="text-[9px] sm:text-sm font-black text-gray-500 dark:text-slate-400 uppercase tracking-wider sm:tracking-widest mb-1 leading-tight">{stat.label}</p>
                                <p className="text-sm sm:text-2xl font-black text-gray-900 dark:text-white leading-tight break-words">{stat.value}</p>
                            </div>
                            <div className={`w-8 h-8 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0 ${stat.color}`}>
                                <stat.icon className="w-5 h-5 sm:w-6 sm:h-6" />
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Profile Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white dark:bg-slate-900 rounded-2xl p-3.5 sm:p-6 border border-primary/20 dark:border-slate-800 shadow-sm"
                >
                    <h2 className="text-base sm:text-xl font-semibold text-gray-900 dark:text-white mb-3 sm:mb-6 flex items-center gap-2">
                        <User className="w-5 h-5 text-primary" />
                        Personal Information
                    </h2>
                    <div className="space-y-2.5 sm:space-y-4">
                        <InfoField isEditing={isEditing} editForm={editForm} onChange={handleChange} icon={User} label="Full Name" value={profileData.fullName} name="fullName" editable={canEditBio} />
                        <InfoField isEditing={isEditing} editForm={editForm} onChange={handleChange} icon={Mail} label="Email" value={profileData.email} name="email" type="email" editable={allowBioEditing} />
                        <InfoField isEditing={isEditing} editForm={editForm} onChange={handleChange} icon={Phone} label="Phone" value={profileData.phone} name="phone" editable={canEditBio} />
                        {!canEditBio && isEditing && (
                            <p className="text-xs text-red-500 font-medium px-4">
                                * Bio editing is currently disabled by administrator.
                            </p>
                        )}
                        <InfoField isEditing={isEditing} editForm={editForm} onChange={handleChange} icon={CreditCard} label="CNIC" value={profileData.cnic} name="cnic" editable={canEditBio} />
                        <InfoField isEditing={isEditing} editForm={editForm} onChange={handleChange} icon={User} label="Father Name" value={profileData.fatherName} name="fatherName" editable={canEditBio} />
                        <InfoField isEditing={isEditing} editForm={editForm} onChange={handleChange} icon={Calendar} label="Date of Birth" value={profileData.dob ? formatDate(profileData.dob) : ''} name="dob" type="date" editable={canEditBio} />
                        <SelectField isEditing={isEditing} editForm={editForm} onChange={handleChange} icon={User} label="Gender" value={profileData.gender} name="gender" options={asSelectOptions(['Male', 'Female'], 'Select Gender')} editable={canEditBio} />
                        <InfoField isEditing={isEditing} editForm={editForm} onChange={handleChange} icon={GraduationCap} label="Qualification" value={profileData.qualification} name="qualification" editable={canEditBio} />
                        <InfoField isEditing={isEditing} editForm={editForm} onChange={handleChange} icon={Briefcase} label="Specialization / Skills" value={profileData.specialization} name="specialization" editable={canEditBio} />
                        <InfoField isEditing={isEditing} editForm={editForm} onChange={handleChange} icon={Briefcase} label="Experience" value={profileData.experience} name="experience" editable={canEditBio} />
                        <InfoField isEditing={isEditing} editForm={editForm} onChange={handleChange} icon={MapPin} label="City" value={profileData.city} name="city" editable={canEditBio} />
                        <SelectField isEditing={isEditing} editForm={editForm} onChange={handleChange} icon={MapPin} label="Country" value={profileData.country} name="country" options={asSelectOptions(COUNTRIES, 'Select Country')} editable={canEditBio} />
                        <InfoField isEditing={isEditing} editForm={editForm} onChange={handleChange} icon={MapPin} label="Address" value={profileData.address} name="address" editable={canEditBio} />
                        <SelectField isEditing={isEditing} editForm={editForm} onChange={handleChange} icon={BookOpen} label="Campus City" value={profileData.campusCity} name="campusCity" options={asSelectOptions(['Bahawalpur', 'Islamabad'], 'Select Campus City')} editable={canEditBio} />
                        <SelectField isEditing={isEditing} editForm={editForm} onChange={handleChange} icon={BookOpen} label="Attend Classes" value={profileData.attendType} name="attendType" options={asSelectOptions(['Physical', 'Online'], 'Select Attend Type')} editable={canEditBio} />
                        <SelectField isEditing={isEditing} editForm={editForm} onChange={handleChange} icon={Users} label="Heard About Us" value={profileData.heardAbout} name="heardAbout" options={asSelectOptions(HEARD_ABOUT_OPTIONS, 'Select Option')} editable={canEditBio} />
                    </div>
                </motion.div>

                {/* My Courses */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-white dark:bg-slate-900 rounded-2xl p-3.5 sm:p-6 border border-primary/20 dark:border-slate-800 shadow-sm"
                >
                    <h2 className="text-base sm:text-xl font-semibold text-gray-900 dark:text-white mb-3 sm:mb-6 flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-primary" />
                        My Courses
                    </h2>
                    {myCourses.length === 0 ? (
                        <div className="text-center py-6 sm:py-8 text-gray-500 dark:text-slate-400">
                            <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                            <p>No courses assigned yet</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-4">
                            {myCourses.map((course) => {
                                const CourseIcon = getCourseIcon(course.category, course.title);
                                return (
                                    <div key={course._id} className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-50 dark:bg-slate-800/70 rounded-xl border border-transparent dark:border-slate-700">
                                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                                            <CourseIcon className="w-5 h-5 text-primary" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-sm sm:text-base text-gray-900 dark:text-white line-clamp-2" title={course.title}>{course.title}</p>
                                            <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400">{course.enrolledCount || 0} students enrolled</p>
                                            <p className="text-xs text-primary mt-1 capitalize">{course.duration || 'Ongoing'}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </motion.div>
            </div>
            {/* Announcements Popup - Only on Main Profile Page */}
        </div>
    );
};

export default TeacherProfile;




