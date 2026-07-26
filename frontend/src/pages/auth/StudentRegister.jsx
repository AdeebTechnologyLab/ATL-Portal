import GuestChatWidget from '../../components/shared/GuestChatWidget';
import RegistrationLeftPanel from '../../components/auth/RegistrationLeftPanel';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    ArrowLeft, User, Mail, Phone, CreditCard, Calendar,
    MapPin, BookOpen, Users, Camera, Receipt, ChevronDown, GraduationCap, Eye, EyeOff, X, Briefcase, Lock
} from 'lucide-react';
import { authAPI } from '../../services/api';
import ImageCropper from '../../components/ui/ImageCropper';
import { ButtonLoader } from '../../components/ui/Loader';
import { PAKISTAN_CITIES, COUNTRIES } from '../../utils/locations';

const COURSES = [
    'Trading', 'Taxation', 'Freelancing', 'Video Editing', 'E-Commerce',
    'Programming', 'Office Work [IT]', 'Cyber Security', 'Machine Learning',
    'Truck Dispatching', 'UX/UI Designing', 'Youtuber Course', 'Graphic Designer',
    'Home Architecture', 'Internet of Thing [IOT]', 'Digital Marketing, Ads',
    'Web Development', 'App Development', 'Software Development',
    'App Dev Without Coding', 'Web Dev Without Coding', 'Other'
];

const ATTEND_CITIES = ['Bahawalpur', 'Islamabad'];
const HEARD_OPTIONS = [
    'Poster & Panaflex', 'Facebook', 'Instagram', 'WhatsApp Group', 'Website',
    'YouTube', 'Friends & Family', 'Twitter', 'LinkedIn', 'Other'
];

const GUARDIAN_RELATIONS = ['Father', 'Mother', 'Brother', 'Sister', 'Uncle', 'Aunt', 'Grandfather', 'Grandmother', 'Other'];

// Reusable Input Component - defined outside to prevent re-creation
const InputField = ({ id, label, name, type = 'text', icon: Icon, placeholder, value, onChange, error, ...props }) => (
    <div id={id || `field-${name}`} className="form-group">
        <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
        <div className="relative">
            {Icon && <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />}
            <input
                type={type}
                name={name}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                className={`w-full px-4 py-3 ${Icon ? 'pl-11' : 'px-4'} border ${error ? 'border-red-400' : 'border-gray-200'
                    } rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-gray-50/50`}
                {...props}
            />
        </div>
        {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
);

// Reusable Select Component - defined outside to prevent re-creation
const SelectField = ({ id, label, name, options, placeholder, value, onChange, error }) => (
    <div id={id || `field-${name}`} className="form-group">
        <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
        <div className="relative">
            <select
                name={name}
                value={value}
                onChange={onChange}
                className={`w-full px-4 py-3 border ${error ? 'border-red-400' : 'border-gray-200'
                    } rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-gray-50/50 appearance-none cursor-pointer`}
            >
                <option value="">{placeholder}</option>
                {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
        </div>
        {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
);

const StudentRegister = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [photoFile, setPhotoFile] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(null);
    const [cropperSrc, setCropperSrc] = useState(null);
    const [apiError, setApiError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [showMobileInfo, setShowMobileInfo] = useState(true);

    const [formData, setFormData] = useState({
        fullName: '',
        phone: '',
        email: '',
        cnic: '',
        dob: '',
        age: '',
        gender: '',
        fatherName: '',
        cityToAttend: '',
        attendClasses: '',
        education: '',
        guardianName: '',
        guardianRelation: '',
        guardianPhone: '',
        guardianOccupation: '',
        address: '',
        city: '',
        otherCity: '',
        country: '',
        otherCountry: '',
        pictureUrl: '',
        feeScreenshotUrl: '',
        heardAbout: '',
        termsAccepted: false,
        password: '',
        confirmPassword: ''
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

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;

        if (name === 'dob') {
            const age = calculateAge(value);
            setFormData(prev => ({
                ...prev,
                dob: value,
                age: age.toString()
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: type === 'checkbox' ? checked : value
            }));
        }

        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const handlePhotoChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        // Open cropper — size limit checked after crop
        const reader = new FileReader();
        reader.onloadend = () => setCropperSrc(reader.result);
        reader.readAsDataURL(file);
        // Reset so same file can be re-selected
        e.target.value = '';
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

    const formatCNIC = (value) => {
        const numbers = value.replace(/\D/g, '');
        if (numbers.length <= 5) return numbers;
        if (numbers.length <= 12) return `${numbers.slice(0, 5)}-${numbers.slice(5)}`;
        return `${numbers.slice(0, 5)}-${numbers.slice(5, 12)}-${numbers.slice(12, 13)}`;
    };

    const handleCNICChange = (e) => {
        const formatted = formatCNIC(e.target.value);
        if (formatted.length <= 15) {
            setFormData(prev => ({ ...prev, cnic: formatted }));
        }
    };

    const validateForm = () => {
        const newErrors = {};
        if (!photoFile) newErrors.photo = 'Profile photo is required';
        if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required';
        if (!formData.fatherName.trim()) newErrors.fatherName = "Father's name is required";
        if (!formData.phone) newErrors.phone = 'WhatsApp Number is required';
        if (!formData.email) newErrors.email = 'Email is required';
        else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Invalid email format';
        if (!formData.cnic) newErrors.cnic = 'CNIC/BForm is required';
        if (!formData.dob) newErrors.dob = 'Date of birth is required';
        if (!formData.gender) newErrors.gender = 'Gender is required';
        if (!formData.cityToAttend) newErrors.cityToAttend = 'City to attend is required';
        if (!formData.attendClasses) newErrors.attendClasses = 'Class type is required';
        if (!formData.education) newErrors.education = 'Education is required';
        if (!formData.guardianName) newErrors.guardianName = 'Guardian name is required';
        if (!formData.guardianRelation) newErrors.guardianRelation = 'Guardian relationship is required';
        if (!formData.guardianPhone) newErrors.guardianPhone = 'Guardian WhatsApp Number is required';
        if (!formData.guardianOccupation) newErrors.guardianOccupation = 'Guardian occupation is required';
        if (!formData.address) newErrors.address = 'Address is required';
        if (!formData.city) newErrors.city = 'City is required';
        if (!formData.country) newErrors.country = 'Country is required';
        if (!formData.heardAbout) newErrors.heardAbout = 'This field is required';
        if (!formData.password) newErrors.password = 'Password is required';
        else if (formData.password.length < 4) newErrors.password = 'Password must be at least 4 characters';
        if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
        if (!formData.termsAccepted) newErrors.termsAccepted = 'You must accept terms';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const scrollToFirstError = (newErrors) => {
        // Priority order of fields to scroll to
        const fieldOrder = [
            'photo', 'fullName', 'fatherName', 'phone', 'email', 'cnic', 'dob',
            'gender', 'cityToAttend', 'attendClasses', 'education',
            'guardianName', 'guardianRelation', 'guardianPhone', 'guardianOccupation',
            'city', 'country', 'address', 'heardAbout', 'password', 'confirmPassword',
            'termsAccepted'
        ];
        for (const field of fieldOrder) {
            if (newErrors[field]) {
                const el = document.getElementById(`field-${field}`);
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    // Focus first input/select inside
                    const input = el.querySelector('input, select, textarea');
                    if (input) setTimeout(() => input.focus(), 400);
                }
                break;
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) {
            // Get the current errors
            const currentErrors = {};
            if (!photoFile) currentErrors.photo = true;
            if (!formData.fullName.trim()) currentErrors.fullName = true;
            if (!formData.fatherName.trim()) currentErrors.fatherName = true;
            if (!formData.phone) currentErrors.phone = true;
            if (!formData.email) currentErrors.email = true;
            if (!formData.cnic) currentErrors.cnic = true;
            if (!formData.dob) currentErrors.dob = true;
            if (!formData.gender) currentErrors.gender = true;
            if (!formData.cityToAttend) currentErrors.cityToAttend = true;
            if (!formData.attendClasses) currentErrors.attendClasses = true;
            if (!formData.education) currentErrors.education = true;
            if (!formData.guardianName) currentErrors.guardianName = true;
            if (!formData.guardianRelation) currentErrors.guardianRelation = true;
            if (!formData.guardianPhone) currentErrors.guardianPhone = true;
            if (!formData.guardianOccupation) currentErrors.guardianOccupation = true;
            if (!formData.address) currentErrors.address = true;
            if (!formData.city) currentErrors.city = true;
            if (!formData.country) currentErrors.country = true;
            if (!formData.heardAbout) currentErrors.heardAbout = true;
            if (!formData.password) currentErrors.password = true;
            if (formData.password !== formData.confirmPassword) currentErrors.confirmPassword = true;
            if (!formData.termsAccepted) currentErrors.termsAccepted = true;
            scrollToFirstError(currentErrors);
            return;
        }

        setIsLoading(true);
        setApiError('');

        try {
            // Create FormData for multipart upload
            const submitData = new FormData();
            submitData.append('name', formData.fullName);
            submitData.append('email', formData.email);
            submitData.append('password', formData.password);
            submitData.append('phone', formData.phone);
            submitData.append('role', 'student');
            submitData.append('location', formData.cityToAttend.toLowerCase());
            // Student-specific fields
            submitData.append('cnic', formData.cnic);
            submitData.append('dob', formData.dob);
            submitData.append('age', formData.age);
            submitData.append('gender', formData.gender);
            submitData.append('education', formData.education);
            submitData.append('guardianName', formData.guardianName);
            submitData.append('guardianRelation', formData.guardianRelation);
            submitData.append('guardianPhone', formData.guardianPhone);
            submitData.append('guardianOccupation', formData.guardianOccupation);
            submitData.append('address', formData.address);
            submitData.append('city', formData.city === 'Other' ? formData.otherCity : formData.city);
            submitData.append('country', formData.country === 'Other' ? formData.otherCountry : formData.country);
            submitData.append('attendType', formData.attendClasses);
            submitData.append('heardAbout', formData.heardAbout);
            submitData.append('fatherName', formData.fatherName);

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
            {/* Image Cropper Modal */}
            {cropperSrc && (
                <ImageCropper
                    imageSrc={cropperSrc}
                    onCrop={handleCropDone}
                    onCancel={() => setCropperSrc(null)}
                />
            )}
            {/* Left Side - Dynamic Content */}
            <RegistrationLeftPanel
                formType="student"
                mobileOpen={showMobileInfo}
                onMobileClose={() => setShowMobileInfo(false)}
            />

            {/* Right Side - Registration Form - Scrollable */}
            <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                className="w-full lg:w-1/2 h-screen overflow-y-auto p-6 bg-white"
            >
                <div className="w-full max-w-2xl mx-auto py-8">
                    {/* Header */}
                    <div className="mb-8">
                        <div className="mb-6">
                            <Link
                                to="/register"
                                className="inline-flex items-center text-gray-600 hover:text-primary transition-colors font-medium"
                            >
                                ← Back
                            </Link>
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">Student Registration</h1>
                        <p className="text-gray-500">
                            Already have an account?{' '}
                            <Link
                                to="/login"
                                className="text-primary font-semibold underline hover:text-primary transition-colors"
                            >
                                Log in
                            </Link>
                        </p>
                    </div>

                    {/* Form */}
                    <form
                        onSubmit={handleSubmit}
                        className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8"
                    >
                        {/* Photo Upload */}
                        <div id="field-photo" className="flex flex-col items-center mb-6">
                            <div className="relative group">
                                <div className="w-24 h-24 rounded-2xl bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden transition-all group-hover:border-primary">
                                    {photoPreview ? (
                                        <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="text-center">
                                            <Camera className="w-8 h-8 text-gray-400 mx-auto mb-1" />
                                            <span className="text-[10px] text-gray-500 font-medium">Photo</span>
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
                            <InputField label="Full Name *" name="fullName" icon={User} placeholder="Enter your full name" value={formData.fullName} onChange={handleChange} error={errors.fullName} />
                            <InputField label="Father Name *" name="fatherName" icon={User} placeholder="Father's full name" value={formData.fatherName} onChange={handleChange} error={errors.fatherName} />
                            <InputField label="WhatsApp Number *" name="phone" type="tel" icon={Phone} placeholder="+92 300 1234567" value={formData.phone} onChange={handleChange} error={errors.phone} />
                            <InputField label="CNIC/BForm *" name="cnic" icon={CreditCard} placeholder="XXXXX-XXXXXXX-X" value={formData.cnic} onChange={handleCNICChange} error={errors.cnic} />
                            <InputField label="Date of Birth *" name="dob" type="date" icon={Calendar} value={formData.dob} onChange={handleChange} error={errors.dob} />
                            
                            <SelectField label="Gender *" name="gender" options={['Male', 'Female']} placeholder="Select Gender" value={formData.gender} onChange={handleChange} error={errors.gender} />
                        </div>

                        {/* Campus Details */}
                        <h2 className="text-xl font-semibold text-gray-900 mb-6 pb-2 border-b flex items-center gap-2">
                            <BookOpen className="w-5 h-5 text-blue-600" /> Campus Details
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
                             <SelectField label="Campus City *" name="cityToAttend" options={ATTEND_CITIES} placeholder="Select Campus City" value={formData.cityToAttend} onChange={handleChange} error={errors.cityToAttend} />
                            <SelectField label="Attend Classes *" name="attendClasses" options={['Online', 'Physical']} placeholder="Select Type" value={formData.attendClasses} onChange={handleChange} error={errors.attendClasses} />
                        </div>

                        {/* Educational Details */}
                        <h2 className="text-xl font-semibold text-gray-900 mb-6 pb-2 border-b flex items-center gap-2">
                            <Briefcase className="w-5 h-5 text-blue-600" /> Educational Details
                        </h2>
                        <div className="grid grid-cols-1 gap-5 mb-8">
                            <InputField label="Education *" name="education" icon={BookOpen} placeholder="Your highest education" value={formData.education} onChange={handleChange} error={errors.education} />
                        </div>

                        {/* Guardian Information */}
                        <h2 className="text-xl font-semibold text-gray-900 mb-6 pb-2 border-b flex items-center gap-2">
                            <Users className="w-5 h-5 text-blue-600" /> Guardian Information
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
                            <InputField label="Guardian Name *" name="guardianName" icon={Users} placeholder="Guardian's full name" value={formData.guardianName} onChange={handleChange} error={errors.guardianName} />
                            <SelectField label="Relationship with Guardian *" name="guardianRelation" options={GUARDIAN_RELATIONS} placeholder="Select Relationship" value={formData.guardianRelation} onChange={handleChange} error={errors.guardianRelation} />
                            <InputField label="Guardian WhatsApp Number *" name="guardianPhone" type="tel" icon={Phone} placeholder="Guardian's WhatsApp number" value={formData.guardianPhone} onChange={handleChange} error={errors.guardianPhone} />
                            <InputField label="Guardian Occupation *" name="guardianOccupation" placeholder="Guardian's occupation" value={formData.guardianOccupation} onChange={handleChange} error={errors.guardianOccupation} />
                        </div>

                        {/* Address Details */}
                        <h2 className="text-xl font-semibold text-gray-900 mb-6 pb-2 border-b flex items-center gap-2">
                            <MapPin className="w-5 h-5 text-blue-600" /> Address Details
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
                            <SelectField label="City *" name="city" options={PAKISTAN_CITIES} placeholder="Select City" value={formData.city} onChange={handleChange} error={errors.city} />
                            {formData.city === 'Other' && (
                                <InputField label="Specify City *" name="otherCity" placeholder="Enter your city" value={formData.otherCity} onChange={handleChange} error={errors.otherCity} />
                            )}
                            
                            <SelectField label="Country *" name="country" options={COUNTRIES} placeholder="Select Country" value={formData.country} onChange={handleChange} error={errors.country} />
                            {formData.country === 'Other' && (
                                <InputField label="Specify Country *" name="otherCountry" placeholder="Enter your country" value={formData.otherCountry} onChange={handleChange} error={errors.otherCountry} />
                            )}

                            <div id="field-address" className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Address *</label>
                                <textarea
                                    name="address"
                                    value={formData.address}
                                    onChange={handleChange}
                                    rows={2}
                                    placeholder="Enter your complete address"
                                    className={`w-full px-4 py-3 border ${errors.address ? 'border-red-400' : 'border-gray-200'
                                        } rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-gray-50/50`}
                                />
                                {errors.address && <p className="mt-1 text-sm text-red-500">{errors.address}</p>}
                            </div>
                        </div>



                        {apiError && (
                            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600">
                                {apiError}
                            </div>
                        )}

                        {/* Additional Info */}
                        <h2 className="text-xl font-semibold text-gray-900 mb-6 pb-2 border-b flex items-center gap-2">
                            <Lock className="w-5 h-5 text-primary" /> Account Setup
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
                            <div className="md:col-span-2">
                                <InputField label="Email *" name="email" type="email" icon={Mail} placeholder="your@email.com" value={formData.email} onChange={handleChange} error={errors.email} />
                            </div>
                            <div id="field-password">
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Password *</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        name="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        placeholder="Create a password"
                                        className={`w-full px-4 py-3 border ${errors.password ? 'border-red-400' : 'border-gray-200'} rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-gray-50/50`}
                                    />
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
                            <div id="field-confirmPassword">
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm Password *</label>
                                <div className="relative">
                                    <input
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        name="confirmPassword"
                                        value={formData.confirmPassword}
                                        onChange={handleChange}
                                        placeholder="Confirm your password"
                                        className={`w-full px-4 py-3 border ${errors.confirmPassword ? 'border-red-400' : 'border-gray-200'} rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-gray-50/50`}
                                    />
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
                                <SelectField label="How did you hear about us? *" name="heardAbout" options={HEARD_OPTIONS} placeholder="Select Option" value={formData.heardAbout} onChange={handleChange} error={errors.heardAbout} />
                            </div>
                            <div className="md:col-span-2">
                                <label id="field-termsAccepted" className={`flex items-start gap-3 p-4 rounded-xl border ${errors.termsAccepted ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'} cursor-pointer hover:bg-gray-100 transition-colors`}>
                                    <input
                                        type="checkbox"
                                        name="termsAccepted"
                                        checked={formData.termsAccepted}
                                        onChange={handleChange}
                                        className="w-5 h-5 mt-0.5 rounded border-gray-300 text-primary focus:ring-primary"
                                    />
                                    <span className="text-sm text-gray-700">I Accept All Terms and Conditions</span>
                                </label>
                            </div>
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={isLoading || !formData.termsAccepted}
                            className="w-full py-4 bg-primary hover:bg-primary disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:scale-95"
                        >
                            <ButtonLoader isLoading={isLoading}>
                                {isLoading ? 'Registering...' : 'Register Now'}
                            </ButtonLoader>
                        </button>
                    </form>
                </div>
            </motion.div>


            <GuestChatWidget />
        </div>
    );
};

export default StudentRegister;



