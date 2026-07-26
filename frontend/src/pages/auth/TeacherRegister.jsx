import GuestChatWidget from '../../components/shared/GuestChatWidget';
import RegistrationLeftPanel from '../../components/auth/RegistrationLeftPanel';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Eye, EyeOff, Mail, Lock, User, ArrowLeft, GraduationCap, MapPin, ChevronDown,
    CreditCard, BookOpen, Phone, Briefcase, Calendar, Camera, Upload, X
} from 'lucide-react';
import { authAPI } from '../../services/api';
import ImageCropper from '../../components/ui/ImageCropper';
import { ButtonLoader } from '../../components/ui/Loader';
import { PAKISTAN_CITIES, COUNTRIES } from '../../utils/locations';

const CITIES = PAKISTAN_CITIES;
const QUALIFICATIONS = [
    'Bachelor\'s Degree',
    'Master\'s Degree',
    'Ph.D.',
    'Diploma',
    'Certificate Course',
    'Other'
];
const HEARD_OPTIONS = [
    'Poster & Panaflex', 'Facebook', 'Instagram', 'WhatsApp Group', 'Website',
    'YouTube', 'Friends & Family', 'Twitter', 'LinkedIn', 'Other'
];

const SKILLS = [
    'LMS Dev',
    'Website Dev',
    'App Dev',
    'Software Dev',
    'WordPress',
    'Html',
    'Css',
    'Java',
    'Python',
    'PHP',
    'Flutter',
    'Android Studio',
    'Firebase',
    'MongoDB',
    'MySQL',
    'JavaScript',
    'Bootstrap',
    'Git & GitHub',
    'Visual Studio Code',
    'Vercel',
    'Wix',
    'Elementor',
    'Webflow',
    'Graphic Designer',
    'UI/UX Designer',
    'Video Editor',
    'Motion Graphics',
    'Photoshop',
    'Illustrator',
    'Premiere Pro',
    'After Effects',
    'Canva',
    'Digital Marketing',
    'SEO',
    'Social Media Marketing',
    'Google Ads',
    'Meta Ads',
    'Content Writer',
    'AI',
    'Machine Learning',
    'IoT',
    'Robotics',
    'Cyber Security',
    'Ethical Hacking',
    'Network Security',
    'Office Work (IT)',
    'Basic Computer',
    'Word',
    'Excel',
    'PowerPoint',
    'Publisher',
    'Data Entry',
    'Team Manager',
    'HR',
    'Freelancing',
    'E-Commerce',
    'Trading',
    'Taxation',
    'Truck Dispatching',
    'Home Architecture',
    'AutoCAD',
    'Chief Architect',
    'YouTube',
    'Social Media Management',
    'Content Writing',
    'Other'
];

const TeacherRegister = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [apiError, setApiError] = useState('');
    const [photoFile, setPhotoFile] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(null);
    const [cropperSrc, setCropperSrc] = useState(null);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        cnic: '',
        qualification: '',
        specialization: [],
        otherSkills: '',
        experience: '',
        location: '',
        otherCity: '',
        attendType: '',
        city: '',
        otherAddressCity: '',
        country: '',
        otherCountry: '',
        address: '',
        fatherName: '',
        dob: '',
        age: '',
        gender: '',
        password: '',
        confirmPassword: '',
        termsAccepted: false,
        heardAbout: ''
    });

    const calculateAge = (dob) => {
        if (!dob) return '';
        const birthDate = new Date(dob);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    };

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [showMobileInfo, setShowMobileInfo] = useState(true);
    const [errors, setErrors] = useState({});

    const formatCNIC = (value) => {
        // Remove all non-digits
        const digits = value.replace(/\D/g, '');
        // Format as XXXXX-XXXXXXX-X
        if (digits.length <= 5) return digits;
        if (digits.length <= 12) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
        return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12, 13)}`;
    };

    const handleCNICChange = (e) => {
        const formatted = formatCNIC(e.target.value);
        if (formatted.replace(/-/g, '').length <= 13) {
            setFormData(prev => ({ ...prev, cnic: formatted }));
        }
        if (errors.cnic) setErrors(prev => ({ ...prev, cnic: '' }));
    };

    const validateForm = () => {
        const newErrors = {};

        if (!photoFile) {
            newErrors.photo = 'Profile photo is required';
        }

        if (!formData.name.trim()) {
            newErrors.name = 'Name is required';
        }

        if (!formData.email) {
            newErrors.email = 'Email is required';
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = 'Please enter a valid email';
        }

        if (!formData.phone) {
            newErrors.phone = 'Phone number is required';
        } else if (!/^[0-9+\-\s]{10,15}$/.test(formData.phone.replace(/\s/g, ''))) {
            newErrors.phone = 'Please enter a valid phone number';
        }

        if (!formData.cnic) {
            newErrors.cnic = 'CNIC is required';
        } else if (formData.cnic.replace(/-/g, '').length !== 13) {
            newErrors.cnic = 'CNIC must be 13 digits';
        }

        if (!formData.fatherName.trim()) {
            newErrors.fatherName = "Father's Name is required";
        }

        if (!formData.dob) {
            newErrors.dob = 'Date of Birth is required';
        }

        if (!formData.gender) {
            newErrors.gender = 'Gender is required';
        }

        if (!formData.qualification) {
            newErrors.qualification = 'Qualification is required';
        }

        if (!formData.experience.trim()) {
            newErrors.experience = 'Experience is required';
        }

        if (formData.specialization.length === 0) {
            newErrors.specialization = 'Specialization is required';
        }
        if (formData.specialization.includes('Other') && !formData.otherSkills.trim()) {
            newErrors.otherSkills = 'Please specify your other skills';
        }

        if (!formData.password) {
            newErrors.password = 'Password is required';
        } else if (formData.password.length < 4) {
            newErrors.password = 'Password must be at least 4 characters';
        }

        if (!formData.heardAbout) {
            newErrors.heardAbout = 'This field is required';
        }

        if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = 'Passwords do not match';
        }

        if (!formData.location) {
            newErrors.location = 'Please select a campus city';
        }

        if (!formData.attendType) {
            newErrors.attendType = 'Please select class type';
        }

        if (!formData.country) {
            newErrors.country = 'Please select a country';
        }

        if (!formData.city) {
            newErrors.city = 'Please select a city';
        }

        if (!formData.address.trim()) {
            newErrors.address = 'Address is required';
        }

        if (!formData.termsAccepted) {
            newErrors.termsAccepted = 'You must agree to the terms';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;

        if (name === 'dob') {
            const age = calculateAge(value);
            setFormData(prev => ({
                ...prev,
                dob: value,
                age: age.toString()
            }));
            if (errors.age) setErrors(prev => ({ ...prev, age: '' }));
        } else {
            setFormData((prev) => ({
                ...prev,
                [name]: type === 'checkbox' ? checked : value,
            }));
        }

        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: '' }));
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

    const handleSkillChange = (skill) => {
        setFormData(prev => ({
            ...prev,
            specialization: prev.specialization.includes(skill)
                ? prev.specialization.filter(item => item !== skill)
                : [...prev.specialization, skill]
        }));
        if (errors.specialization) setErrors(prev => ({ ...prev, specialization: '' }));
    };

    const handleCropDone = (croppedFile, croppedDataUrl) => {
        if (croppedFile.size > 1 * 1024 * 1024) {
            setErrors(prev => ({ ...prev, photo: 'Cropped image is still over 1MB. Try zooming out.' }));
            setCropperSrc(null);
            return;
        }
        setPhotoFile(croppedFile);
        setPhotoPreview(croppedDataUrl);
        setCropperSrc(null);
        if (errors.photo) setErrors(prev => ({ ...prev, photo: '' }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        setIsLoading(true);
        setApiError('');

        try {
            const submitData = new FormData();
            submitData.append('name', formData.name);
            submitData.append('email', formData.email);
            submitData.append('password', formData.password);
            submitData.append('role', 'teacher');
            submitData.append('phone', formData.phone);
            submitData.append('cnic', formData.cnic);
            submitData.append('qualification', formData.qualification);
            let finalSkills = formData.specialization.filter(skill => skill !== 'Other');
            if (formData.specialization.includes('Other') && formData.otherSkills.trim()) {
                finalSkills = [
                    ...finalSkills,
                    ...formData.otherSkills.split(',').map(skill => skill.trim()).filter(Boolean)
                ];
            }
            submitData.append('specialization', finalSkills.join(', '));
            submitData.append('experience', formData.experience);
            submitData.append('attendType', formData.attendType);
            submitData.append('location', formData.location === 'Other' ? formData.otherCity : formData.location);
            submitData.append('city', formData.city === 'Other' ? formData.otherAddressCity : formData.city);
            submitData.append('country', formData.country === 'Other' ? formData.otherCountry : formData.country);
            submitData.append('fatherName', formData.fatherName);
            submitData.append('dob', formData.dob);
            submitData.append('age', formData.age);
            submitData.append('gender', formData.gender);
            submitData.append('address', formData.address);
            submitData.append('heardAbout', formData.heardAbout);

            if (photoFile) {
                submitData.append('photo', photoFile);
            }

            await authAPI.register(submitData);
            navigate('/login', {
                state: {
                    message: 'Registration successful! You can now login with your credentials.',
                    isPending: false
                }
            });
        } catch (err) {
            const message = err.response?.data?.message || 'Registration failed. Please try again.';
            setApiError(message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="h-screen flex overflow-hidden">
            {cropperSrc && (
                <ImageCropper
                    imageSrc={cropperSrc}
                    onCrop={handleCropDone}
                    onCancel={() => setCropperSrc(null)}
                    accentColor="orange"
                />
            )}
            {/* Left Side - Dynamic Content */}
            <RegistrationLeftPanel
                formType="teacher"
                mobileOpen={showMobileInfo}
                onMobileClose={() => setShowMobileInfo(false)}
            />

            {/* Right Side - Register Form - Scrollable */}
            <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                className="w-full lg:w-1/2 h-screen overflow-y-auto p-6 bg-white"
            >
                <div className="w-full max-w-2xl mx-auto py-8">
                    {/* Back Button and Branding */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="mb-8"
                    >
                        <Link
                            to="/register"
                            className="inline-flex items-center text-gray-600 hover:text-primary transition-colors font-medium"
                        >
                            ← Back
                        </Link>
                    </motion.div>

                    {/* Header */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="mb-6"
                    >
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">Teacher Registration</h1>
                        <p className="text-gray-500">
                            Already have an account?{' '}
                            <Link
                                to="/login"
                                className="text-primary font-semibold underline hover:text-orange-700 transition-colors"
                            >
                                Log in
                            </Link>
                        </p>
                    </motion.div>

                    {/* API Error */}
                    {apiError && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600">
                            {apiError}
                        </div>
                    )}

                    {/* Registration Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Photo Upload */}
                            <div className="flex flex-col items-center mb-6">
                            <div className="relative group">
                                <div className="w-24 h-24 rounded-2xl bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden transition-all group-hover:border-primary">
                                    {photoPreview ? (
                                        <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="text-center">
                                            <Camera className="w-8 h-8 text-gray-400 mx-auto mb-1" />
                                            <span className="text-[10px] text-gray-500 font-medium">Photo *</span>
                                        </div>
                                    )}
                                </div>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handlePhotoChange}
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                    id="photo-upload"
                                />
                                {photoPreview && (
                                    <button
                                        type="button"
                                        onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                                        className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-colors"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                )}
                            </div>
                            <p className="mt-2 text-xs text-gray-500">Upload profile picture (Max 2MB)</p>
                            {errors.photo && <p className="mt-1 text-xs text-red-500">{errors.photo}</p>}
                        </div>

                        {/* Personal Information */}
                        <h2 className="text-xl font-semibold text-gray-900 mb-6 pb-2 border-b flex items-center gap-2">
                            <User className="w-5 h-5 text-blue-600" /> Personal Information
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name *</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        placeholder="Enter your full name"
                                        className={`w-full px-4 py-3 pl-11 border ${errors.name ? 'border-red-400' : 'border-gray-200'} rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-gray-50/50`}
                                    />
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                </div>
                                {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Father Name *</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        name="fatherName"
                                        value={formData.fatherName}
                                        onChange={handleChange}
                                        placeholder="Father's full name"
                                        className={`w-full px-4 py-3 pl-11 border ${errors.fatherName ? 'border-red-400' : 'border-gray-200'} rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-gray-50/50`}
                                    />
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                </div>
                                {errors.fatherName && <p className="mt-1 text-sm text-red-500">{errors.fatherName}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">WhatsApp Number *</label>
                                <div className="relative">
                                    <input
                                        type="tel"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        placeholder="+92 300 1234567"
                                        className={`w-full px-4 py-3 pl-11 border ${errors.phone ? 'border-red-400' : 'border-gray-200'} rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-gray-50/50`}
                                    />
                                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                </div>
                                {errors.phone && <p className="mt-1 text-sm text-red-500">{errors.phone}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">CNIC / B-Form *</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        name="cnic"
                                        value={formData.cnic}
                                        onChange={handleCNICChange}
                                        placeholder="XXXXX-XXXXXXX-X"
                                        className={`w-full px-4 py-3 pl-11 border ${errors.cnic ? 'border-red-400' : 'border-gray-200'} rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-gray-50/50`}
                                    />
                                    <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                </div>
                                {errors.cnic && <p className="mt-1 text-sm text-red-500">{errors.cnic}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Date of Birth *</label>
                                <div className="relative">
                                    <input
                                        type="date"
                                        name="dob"
                                        value={formData.dob}
                                        onChange={handleChange}
                                        className={`w-full px-4 py-3 pl-11 border ${errors.dob ? 'border-red-400' : 'border-gray-200'} rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-gray-50/50`}
                                    />
                                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                </div>
                                {errors.dob && <p className="mt-1 text-sm text-red-500">{errors.dob}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Gender *</label>
                                <div className="relative">
                                    <select
                                        name="gender"
                                        value={formData.gender}
                                        onChange={handleChange}
                                        className={`w-full px-4 py-3 pl-11 border ${errors.gender ? 'border-red-400' : 'border-gray-200'} rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-gray-50/50 appearance-none cursor-pointer`}
                                    >
                                        <option value="">Select Gender</option>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                    </select>
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                                </div>
                                {errors.gender && <p className="mt-1 text-sm text-red-500">{errors.gender}</p>}
                            </div>
                        </div>

                        {/* Qualification */}
                        <h2 className="text-xl font-semibold text-gray-900 mb-6 pb-2 border-b flex items-center gap-2">
                            <GraduationCap className="w-5 h-5 text-blue-600" /> Qualification
                        </h2>
                        <div className="grid grid-cols-1 gap-5 mb-8">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Qualification *</label>
                                <div className="relative">
                                    <select
                                        name="qualification"
                                        value={formData.qualification}
                                        onChange={handleChange}
                                        className={`w-full px-4 py-3 pl-11 border ${errors.qualification ? 'border-red-400' : 'border-gray-200'} rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-gray-50/50 appearance-none cursor-pointer`}
                                    >
                                        <option value="">Select Qualification</option>
                                        {QUALIFICATIONS.map(q => <option key={q} value={q}>{q}</option>)}
                                    </select>
                                    <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                                </div>
                                {errors.qualification && <p className="mt-1 text-sm text-red-500">{errors.qualification}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Experience *</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        name="experience"
                                        value={formData.experience}
                                        onChange={handleChange}
                                        placeholder="e.g., 5 Years"
                                        className={`w-full px-4 py-3 pl-11 border ${errors.experience ? 'border-red-400' : 'border-gray-200'} rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-gray-50/50`}
                                    />
                                    <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                </div>
                                {errors.experience && <p className="mt-1 text-sm text-red-500">{errors.experience}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-3">Specialization / Skills * (select multiple)</label>
                                <div className="flex flex-wrap gap-2.5 min-w-0">
                                {SKILLS.map(skill => {
                                    const selected = formData.specialization.includes(skill);
                                    return (
                                        <button
                                            type="button"
                                            key={skill}
                                            onClick={() => handleSkillChange(skill)}
                                            className={`group inline-flex max-w-full min-w-0 items-center justify-center gap-2 px-3.5 py-2.5 text-left rounded-full border cursor-pointer transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary/30 ${
                                                selected
                                                    ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20'
                                                    : 'bg-white border-gray-200 text-gray-700 hover:border-primary/40 hover:bg-primary/5'
                                            }`}
                                        >
                                            <span className="min-w-0 break-words text-sm font-bold leading-snug">{skill}</span>
                                            <span className={`w-4 h-4 shrink-0 rounded-full flex items-center justify-center text-[10px] font-black border transition-all ${
                                                selected
                                                    ? 'bg-white text-primary border-white'
                                                    : 'bg-gray-50 text-transparent border-gray-300 group-hover:border-primary/40'
                                            }`}>
                                                ✓
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                                {formData.specialization.includes('Other') && (
                                    <div id="field-otherSkills" className="mt-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Other Skills (comma separated) *</label>
                                        <input
                                            type="text"
                                            name="otherSkills"
                                            value={formData.otherSkills}
                                            onChange={handleChange}
                                            placeholder="e.g., Data Entry, SEO, Content Writing"
                                            className={`w-full px-4 py-3 border ${errors.otherSkills ? 'border-red-400' : 'border-gray-200'} rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-gray-50/50`}
                                        />
                                        {errors.otherSkills && <p className="mt-1 text-sm text-red-500">{errors.otherSkills}</p>}
                                    </div>
                                )}
                                {errors.specialization && <p className="mt-1 text-sm text-red-500">{errors.specialization}</p>}
                            </div>
                        </div>

                        {/* Address Details */}
                        <h2 className="text-xl font-semibold text-gray-900 mb-6 pb-2 border-b flex items-center gap-2">
                            <MapPin className="w-5 h-5 text-blue-600" /> Address Details
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">City *</label>
                                <div className="relative">
                                    <select
                                        name="city"
                                        value={formData.city || ''}
                                        onChange={handleChange}
                                        className={`w-full px-4 py-3 pl-11 border ${errors.city ? 'border-red-400' : 'border-gray-200'} rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-gray-50/50 appearance-none cursor-pointer`}
                                    >
                                        <option value="">Select City</option>
                                        {PAKISTAN_CITIES.map(city => <option key={city} value={city}>{city}</option>)}
                                    </select>
                                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                                </div>
                                {errors.city && <p className="mt-1 text-sm text-red-500">{errors.city}</p>}

                                {formData.city === 'Other' && (
                                    <div className="mt-2 relative">
                                        <input
                                            type="text"
                                            name="otherAddressCity"
                                            value={formData.otherAddressCity || ''}
                                            onChange={handleChange}
                                            placeholder="Specify your city"
                                            className={`w-full px-4 py-3 pl-11 border ${errors.otherAddressCity ? 'border-red-400' : 'border-gray-200'} rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-gray-50/50`}
                                        />
                                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Country *</label>
                                <div className="relative">
                                    <select
                                        name="country"
                                        value={formData.country}
                                        onChange={handleChange}
                                        className={`w-full px-4 py-3 pl-11 border ${errors.country ? 'border-red-400' : 'border-gray-200'} rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-gray-50/50 appearance-none cursor-pointer`}
                                    >
                                        <option value="">Select Country</option>
                                        {COUNTRIES.map(country => <option key={country} value={country}>{country}</option>)}
                                    </select>
                                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                                </div>
                                {errors.country && <p className="mt-1 text-sm text-red-500">{errors.country}</p>}
                                
                                {formData.country === 'Other' && (
                                    <div className="mt-2 relative">
                                        <input
                                            type="text"
                                            name="otherCountry"
                                            value={formData.otherCountry}
                                            onChange={handleChange}
                                            placeholder="Specify your country"
                                            className={`w-full px-4 py-3 pl-11 border ${errors.otherCountry ? 'border-red-400' : 'border-gray-200'} rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-gray-50/50`}
                                        />
                                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    </div>
                                )}
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Address *</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        name="address"
                                        value={formData.address}
                                        onChange={handleChange}
                                        placeholder="Complete address"
                                        className={`w-full px-4 py-3 pl-11 border ${errors.address ? 'border-red-400' : 'border-gray-200'} rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-gray-50/50`}
                                    />
                                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                </div>
                                {errors.address && <p className="mt-1 text-sm text-red-500">{errors.address}</p>}
                            </div>
                        </div>

                        {/* Campus Details */}
                        <h2 className="text-xl font-semibold text-gray-900 mb-6 pb-2 border-b flex items-center gap-2">
                            <BookOpen className="w-5 h-5 text-blue-600" /> Campus Details
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Campus City *</label>
                                <div className="relative">
                                    <select
                                        name="location"
                                        value={formData.location}
                                        onChange={handleChange}
                                        className={`w-full px-4 py-3 pl-11 border ${errors.location ? 'border-red-400' : 'border-gray-200'} rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-gray-50/50 appearance-none cursor-pointer`}
                                    >
                                        <option value="">Select Campus City</option>
                                        {['Bahawalpur', 'Islamabad'].map(city => <option key={city} value={city}>{city}</option>)}
                                    </select>
                                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                                </div>
                                {errors.location && <p className="mt-1 text-sm text-red-500">{errors.location}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Attend Classes *</label>
                                <div className="relative">
                                    <select
                                        name="attendType"
                                        value={formData.attendType}
                                        onChange={handleChange}
                                        className={`w-full px-4 py-3 pl-11 border ${errors.attendType ? 'border-red-400' : 'border-gray-200'} rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-gray-50/50 appearance-none cursor-pointer`}
                                    >
                                        <option value="">Select Type</option>
                                        <option value="Physical">Physical</option>
                                        <option value="Online">Online</option>
                                    </select>
                                    <BookOpen className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                                </div>
                                {errors.attendType && <p className="mt-1 text-sm text-red-500">{errors.attendType}</p>}
                            </div>
                        </div>

                        {/* Account Setup */}
                        <h2 className="text-xl font-semibold text-gray-900 mb-6 pb-2 border-b flex items-center gap-2">
                            <Lock className="w-5 h-5 text-primary" /> Account Setup
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address *</label>
                                <div className="relative">
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        placeholder="ahmad@example.com"
                                        className={`w-full px-4 py-3 pl-11 border ${errors.email ? 'border-red-400' : 'border-gray-200'} rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-gray-50/50`}
                                    />
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                </div>
                                {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Password *</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        name="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        placeholder="••••••••"
                                        className={`w-full px-4 py-3 pl-11 pr-11 border ${errors.password ? 'border-red-400' : 'border-gray-200'} rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-gray-50/50`}
                                    />
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                                {errors.password && <p className="mt-1 text-sm text-red-500">{errors.password}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm Password *</label>
                                <div className="relative">
                                    <input
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        name="confirmPassword"
                                        value={formData.confirmPassword}
                                        onChange={handleChange}
                                        placeholder="••••••••"
                                        className={`w-full px-4 py-3 pl-11 pr-11 border ${errors.confirmPassword ? 'border-red-400' : 'border-gray-200'} rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-gray-50/50`}
                                    />
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                                {errors.confirmPassword && <p className="mt-1 text-sm text-red-500">{errors.confirmPassword}</p>}
                            </div>

                            <div id="field-heardAbout" className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">How did you hear about us? *</label>
                                <div className="relative">
                                    <select
                                        name="heardAbout"
                                        value={formData.heardAbout}
                                        onChange={handleChange}
                                        className={`w-full px-4 py-3 border ${errors.heardAbout ? 'border-red-400' : 'border-gray-200'} rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-gray-50/50 appearance-none cursor-pointer`}
                                    >
                                        <option value="">Select Option</option>
                                        {HEARD_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                                </div>
                                {errors.heardAbout && <p className="mt-1 text-sm text-red-500">{errors.heardAbout}</p>}
                            </div>
                            
                            {/* Terms Checkbox */}
                            <div className="md:col-span-2">
                                <label htmlFor="termsAccepted" className={`flex items-start gap-3 p-4 rounded-xl border ${errors.termsAccepted ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'} cursor-pointer hover:bg-gray-100 transition-colors`}>
                                    <input
                                        type="checkbox"
                                        name="termsAccepted"
                                        id="termsAccepted"
                                        checked={formData.termsAccepted}
                                        onChange={handleChange}
                                        className="w-5 h-5 mt-0.5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                                    />
                                    <span className="text-sm text-gray-700">I Accept All Terms and Conditions</span>
                                </label>
                                {errors.termsAccepted && <p className="mt-2 text-sm text-red-500">{errors.termsAccepted}</p>}
                            </div>
                        </div>

                        {/* Submit Button */}
                        <motion.button
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.65 }}
                            type="submit"
                            disabled={isLoading || !formData.termsAccepted}
                            className="w-full py-4 mt-4 bg-primary hover:bg-orange-700 text-white font-bold rounded-xl transition-all duration-300 flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:scale-95 disabled:opacity-70"
                        >
                            <ButtonLoader isLoading={isLoading}>
                                {isLoading ? 'Creating Account...' : 'Create Account'}
                            </ButtonLoader>
                        </motion.button>
                    </form>
                </div>
            </motion.div>
            <GuestChatWidget />
        </div>
    );
};

export default TeacherRegister;



