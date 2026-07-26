import GuestChatWidget from '../../components/shared/GuestChatWidget';
import RegistrationLeftPanel from '../../components/auth/RegistrationLeftPanel';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    ArrowLeft, User, Mail, Phone, CreditCard, Calendar,
    MapPin, BookOpen, Building, GraduationCap, FileText, Camera, Receipt, ChevronDown, Eye, EyeOff, Users, Briefcase, X, Lock
} from 'lucide-react';
import { authAPI } from '../../services/api';
import ImageCropper from '../../components/ui/ImageCropper';
import { ButtonLoader } from '../../components/ui/Loader';
import { PAKISTAN_CITIES, COUNTRIES } from '../../utils/locations';

const PROGRAMS = [
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

const INTERN_CITIES = ['Bahawalpur', 'Islamabad'];
const CITIES = PAKISTAN_CITIES;
const DURATIONS = ['3 Month', '6 Month', '1 Year'];
const HEARD_OPTIONS = [
    'Poster & Panaflex', 'Facebook', 'Instagram', 'WhatsApp', 'Website',
    'YouTube', 'Event / Seminar', 'Friends & Family', 'Other'
];

const GUARDIAN_RELATIONS = ['Father', 'Mother', 'Brother', 'Sister', 'Uncle', 'Aunt', 'Grandfather', 'Grandmother', 'Other'];

const InputField = ({ id, label, name, type = 'text', icon: Icon, placeholder, value, onChange, error, ...props }) => (
    <div id={id || `field-${name}`}>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
        <div className="relative">
            <input
                type={type}
                name={name}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                className={`w-full px-4 py-3 ${Icon ? 'pl-11' : ''} border ${error ? 'border-red-400' : 'border-gray-200'
                    } rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-gray-50/50`}
                {...props}
            />
            {Icon && <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />}
        </div>
        {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
);

const SelectField = ({ id, label, name, options, placeholder, value, onChange, error }) => (
    <div id={id || `field-${name}`}>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
        <div className="relative">
            <select
                name={name}
                value={value}
                onChange={onChange}
                className={`w-full px-4 py-3 border ${error ? 'border-red-400' : 'border-gray-200'
                    } rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-gray-50/50 appearance-none cursor-pointer`}
            >
                <option value="">{placeholder}</option>
                {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
        </div>
        {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
);

const InternshipRegister = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [apiError, setApiError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [showMobileInfo, setShowMobileInfo] = useState(true);

    const [photoFile, setPhotoFile] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(null);
    const [cropperSrc, setCropperSrc] = useState(null);
    const [formData, setFormData] = useState({
        fullName: '',
        fatherName: '',
        dob: '',
        gender: '',
        cnic: '',
        contact: '',
        email: '',
        homeAddress: '',
        city: '',
        otherCity: '',
        country: '',
        otherCountry: '',
        degree: '',
        university: '',
        semester: '',
        rollNumber: '',
        cgpa: '',
        majorSubjects: '',
        internCity: '',
        internType: '',
        requirements: [],
        skills: [],
        otherSkills: '',
        resumeUrl: '',
        guardianName: '',
        guardianRelation: '',
        guardianPhone: '',
        guardianOccupation: '',
        feeUrl: '',
        reason: '',
        heardAbout: '',
        age: '',
        password: '',
        confirmPassword: '',
        termsAccepted: false,
        
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
            if (errors.age) setErrors(prev => ({ ...prev, age: '' }));
        } else {
            let finalValue = type === 'checkbox' ? checked : value;
            setFormData(prev => ({
                ...prev,
                [name]: finalValue
            }));
        }
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
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

    const handleRequirementChange = (value) => {
        setFormData(prev => ({
            ...prev,
            requirements: prev.requirements.includes(value)
                ? prev.requirements.filter(r => r !== value)
                : [...prev.requirements, value]
        }));
    };

    const handleSkillChange = (value) => {
        setFormData(prev => ({
            ...prev,
            skills: prev.skills.includes(value)
                ? prev.skills.filter(skill => skill !== value)
                : [...prev.skills, value]
        }));
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
        if (!formData.dob) newErrors.dob = 'Date of birth is required';
        if (!formData.gender) newErrors.gender = 'Gender is required';
        if (!formData.cnic) newErrors.cnic = 'CNIC is required';
        if (!formData.contact) newErrors.contact = 'Contact is required';
        if (!formData.email) newErrors.email = 'Email is required';
        else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Invalid email format';
        if (!formData.homeAddress) newErrors.homeAddress = 'Address is required';
        if (!formData.city) newErrors.city = 'City is required';
        if (!formData.degree) newErrors.degree = 'Degree is required';
        if (!formData.university) newErrors.university = 'University is required';
        if (!formData.semester) newErrors.semester = 'Semester is required';
        if (!formData.rollNumber) newErrors.rollNumber = 'University roll number is required';
        if (!formData.cgpa) newErrors.cgpa = 'CGPA is required';
        if (!formData.majorSubjects) newErrors.majorSubjects = 'Major subjects are required';
        if (!formData.internCity) newErrors.internCity = 'City is required';
        if (!formData.internType) newErrors.internType = 'Type is required';
        if (formData.requirements.length === 0) newErrors.requirements = 'Requirements selection is required';
        if (!formData.guardianName.trim()) newErrors.guardianName = "Guardian's name is required";
        if (!formData.guardianRelation) newErrors.guardianRelation = 'Guardian relationship is required';
        if (!formData.guardianPhone) newErrors.guardianPhone = 'Guardian WhatsApp number is required';
        if (!formData.guardianOccupation) newErrors.guardianOccupation = 'Guardian occupation is required';
        if (!formData.reason) newErrors.reason = 'Reason is required';
        if (!formData.heardAbout) newErrors.heardAbout = 'This field is required';
        if (!formData.password) newErrors.password = 'Password is required';
        else if (formData.password.length < 4) newErrors.password = 'Minimum 4 characters';
        if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
        if (!formData.termsAccepted) newErrors.termsAccepted = 'Required';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const scrollToFirstError = (newErrors) => {
        const fieldOrder = [
            'photo', 'fullName', 'fatherName', 'cnic', 'contact', 'dob', 'gender', 'email',
            'homeAddress', 'city', 'degree', 'university', 'semester',
            'rollNumber', 'cgpa', 'majorSubjects', 'internCity', 'internType',
            'requirements', 'guardianName', 'guardianRelation', 'guardianPhone', 'guardianOccupation', 'reason', 'heardAbout',
            'password', 'confirmPassword', 'termsAccepted'
        ];
        for (const field of fieldOrder) {
            if (newErrors[field]) {
                const el = document.getElementById(`field-${field}`);
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
            const errs = {};
            if (!photoFile) errs.photo = true;
            if (!formData.fullName.trim()) errs.fullName = true;
            if (!formData.fatherName.trim()) errs.fatherName = true;
            if (!formData.dob) errs.dob = true;
            if (!formData.gender) errs.gender = true;
            if (!formData.cnic) errs.cnic = true;
            if (!formData.contact) errs.contact = true;
            if (!formData.email) errs.email = true;
            if (!formData.homeAddress) errs.homeAddress = true;
            if (!formData.city) errs.city = true;
            if (!formData.degree) errs.degree = true;
            if (!formData.university) errs.university = true;
            if (!formData.semester) errs.semester = true;
            if (!formData.rollNumber) errs.rollNumber = true;
            if (!formData.cgpa) errs.cgpa = true;
            if (!formData.majorSubjects) errs.majorSubjects = true;
            if (!formData.internCity) errs.internCity = true;
            if (!formData.internType) errs.internType = true;
            if (formData.requirements.length === 0) errs.requirements = true;
            if (!formData.guardianName.trim()) errs.guardianName = true;
            if (!formData.guardianRelation) errs.guardianRelation = true;
            if (!formData.guardianPhone) errs.guardianPhone = true;
            if (!formData.guardianOccupation) errs.guardianOccupation = true;
            if (!formData.reason) errs.reason = true;
            if (!formData.heardAbout) errs.heardAbout = true;
            if (!formData.password) errs.password = true;
            if (formData.password !== formData.confirmPassword) errs.confirmPassword = true;
            if (!formData.termsAccepted) errs.termsAccepted = true;
            
            scrollToFirstError(errs);
            return;
        }

        setIsLoading(true);
        setApiError('');
        try {
            const submitData = new FormData();
            submitData.append('name', formData.fullName);
            submitData.append('email', formData.email);
            submitData.append('password', formData.password);
            submitData.append('phone', formData.contact);
            submitData.append('role', 'intern');
            submitData.append('location', formData.internCity.toLowerCase());
            // Intern-specific fields
            submitData.append('cnic', formData.cnic);
            submitData.append('dob', formData.dob);
            submitData.append('age', formData.age);
            submitData.append('gender', formData.gender);
            submitData.append('fatherName', formData.fatherName);
            submitData.append('guardianName', formData.guardianName);
            submitData.append('address', formData.homeAddress);
            submitData.append('city', formData.city === 'Other' ? formData.otherCity : formData.city);
            submitData.append('country', formData.country === 'Other' ? formData.otherCountry : formData.country);
            submitData.append('education', `${formData.degree} - ${formData.university}`);
            submitData.append('degree', formData.degree);
            submitData.append('university', formData.university);
            submitData.append('semester', formData.semester);
            submitData.append('rollNumber', formData.rollNumber);
            submitData.append('cgpa', formData.cgpa);
            submitData.append('majorSubjects', formData.majorSubjects);
            submitData.append('attendType', formData.internType);
            submitData.append('heardAbout', formData.heardAbout);
            submitData.append('guardianRelation', formData.guardianRelation);
            submitData.append('guardianPhone', formData.guardianPhone);
            submitData.append('guardianOccupation', formData.guardianOccupation);
            submitData.append('resumeUrl', formData.resumeUrl);
            submitData.append('requirements', formData.requirements.join(', '));
            submitData.append('reason', formData.reason);
            let finalSkills = formData.skills.filter(skill => skill !== 'Other');
            if (formData.skills.includes('Other') && formData.otherSkills.trim()) {
                finalSkills = [
                    ...finalSkills,
                    ...formData.otherSkills.split(',').map(skill => skill.trim()).filter(Boolean)
                ];
            }
            submitData.append('skills', finalSkills.join(', '));

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

    const requirementOptions = ['Home WiFi', 'Personal Laptop', 'No Laptop', 'No WiFi'];

    return (
        <div className="h-screen flex overflow-hidden overflow-x-hidden">
            {cropperSrc && (
                <ImageCropper
                    imageSrc={cropperSrc}
                    onCrop={handleCropDone}
                    onCancel={() => setCropperSrc(null)}
                    accentColor="blue"
                />
            )}
            {/* Left Side - Dynamic Content */}
            <RegistrationLeftPanel
                formType="intern"
                mobileOpen={showMobileInfo}
                onMobileClose={() => setShowMobileInfo(false)}
            />

            {/* Right Side - Registration Form - Scrollable */}
            <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                className="w-full lg:w-1/2 h-screen overflow-y-auto overflow-x-hidden p-4 sm:p-6 bg-white"
            >
                <div className="w-full max-w-2xl mx-auto py-8 overflow-x-hidden">
                    {/* Header */}
                    <div className="mb-8">
                        <div className="mb-6">
                            <Link
                                to="/register"
                                className="inline-flex items-center text-gray-600 hover:text-blue-600 transition-colors font-medium"
                            >
                                ← Back
                            </Link>
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">Internship Registration</h1>
                        <p className="text-gray-500">
                            Already have an account?{' '}
                            <Link
                                to="/login"
                                className="text-blue-600 font-semibold underline hover:text-blue-700 transition-colors"
                            >
                                Log in
                            </Link>
                        </p>
                    </div>

                    {/* Form */}
                    <form
                        onSubmit={handleSubmit}
                        className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-8 overflow-hidden"
                    >
                        {apiError && (
                            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600">
                                {apiError}
                            </div>
                        )}

                        {/* Photo Upload */}
                        <div id="field-photo" className="flex flex-col items-center mb-6">
                            <div className="relative group">
                                <div className="w-24 h-24 rounded-2xl bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden transition-all group-hover:border-blue-500">
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
                            <InputField label="Full Name *" name="fullName" icon={User} placeholder="Your full name" value={formData.fullName} onChange={handleChange} error={errors.fullName} />
                            <InputField label="Father's Name *" name="fatherName" icon={User} placeholder="Father's name" value={formData.fatherName} onChange={handleChange} error={errors.fatherName} />
                            <InputField label="CNIC / B-Form *" name="cnic" icon={CreditCard} placeholder="XXXXX-XXXXXXX-X" value={formData.cnic} onChange={handleCNICChange} error={errors.cnic} />
                            <InputField label="WhatsApp Number *" name="contact" type="tel" icon={Phone} placeholder="+92 300 1234567" value={formData.contact} onChange={handleChange} error={errors.contact} />
                            <InputField label="Date of Birth *" name="dob" type="date" icon={Calendar} value={formData.dob} onChange={handleChange} error={errors.dob} />
                            <SelectField label="Gender *" name="gender" options={[ 'Male', 'Female' ]} placeholder="Select Gender" value={formData.gender} onChange={handleChange} error={errors.gender} />
                            
                        </div>

                        {/* Guardian Information */}
                        <h2 className="text-xl font-semibold text-gray-900 mb-6 pb-2 border-b flex items-center gap-2">
                            <Users className="w-5 h-5 text-blue-600" /> Guardian Information
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
                            <InputField label="Guardian Name *" name="guardianName" icon={Users} placeholder="Guardian's Full Name" value={formData.guardianName} onChange={handleChange} error={errors.guardianName} />
                            <SelectField label="Relationship with Guardian *" name="guardianRelation" options={GUARDIAN_RELATIONS} placeholder="Select Relationship" value={formData.guardianRelation} onChange={handleChange} error={errors.guardianRelation} />
                            <InputField label="Guardian WhatsApp Number *" name="guardianPhone" icon={Phone} placeholder="Guardian's Phone" value={formData.guardianPhone} onChange={handleChange} error={errors.guardianPhone} />
                            <InputField label="Guardian Occupation *" name="guardianOccupation" icon={Briefcase} placeholder="Guardian's Occupation" value={formData.guardianOccupation} onChange={handleChange} error={errors.guardianOccupation} />
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

                            <div id="field-homeAddress" className="md:col-span-2">
                                <InputField label="Home Address *" name="homeAddress" icon={MapPin} placeholder="Complete address" value={formData.homeAddress} onChange={handleChange} error={errors.homeAddress} />
                            </div>
                        </div>

                        {/* Educational Details */}
                        <h2 className="text-xl font-semibold text-gray-900 mb-6 pb-2 border-b flex items-center gap-2">
                            <GraduationCap className="w-5 h-5 text-blue-600" /> Educational Details
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
                            <InputField label="Degree/Program *" name="degree" icon={GraduationCap} placeholder="e.g. BS Computer Science" value={formData.degree} onChange={handleChange} error={errors.degree} />
                            <InputField label="College/University *" name="university" icon={Building} placeholder="University name" value={formData.university} onChange={handleChange} error={errors.university} />
                            <InputField label="Semester *" name="semester" placeholder="e.g. 6th Semester" value={formData.semester} onChange={handleChange} error={errors.semester} />
                            <InputField label="University Roll Number *" name="rollNumber" placeholder="Your university roll number" value={formData.rollNumber} onChange={handleChange} error={errors.rollNumber} />
                            <InputField label="CGPA *" name="cgpa" placeholder="e.g. 3.5 or 85%" value={formData.cgpa} onChange={handleChange} error={errors.cgpa} />
                            <InputField label="Major Subjects / Courses *" name="majorSubjects" placeholder="List your major subjects" value={formData.majorSubjects} onChange={handleChange} error={errors.majorSubjects} />
                        </div>

                        {/* Campus Details */}
                        <h2 className="text-xl font-semibold text-gray-900 mb-6 pb-2 border-b flex items-center gap-2">
                            <BookOpen className="w-5 h-5 text-blue-600" /> Campus Details
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
                            <SelectField label="City for Internship *" name="internCity" options={INTERN_CITIES} placeholder="Select City" value={formData.internCity} onChange={handleChange} error={errors.internCity} />
                            <SelectField label="Internship Type *" name="internType" options={['Physical', 'Online']} placeholder="Select Type" value={formData.internType} onChange={handleChange} error={errors.internType} />
                        </div>

                        {/* Attachments */}
                        <h2 className="text-xl font-semibold text-gray-900 mb-6 pb-2 border-b flex items-center gap-2">
                            <FileText className="w-5 h-5 text-blue-600" /> Attachments
                        </h2>
                        <div className="grid grid-cols-1 gap-5 mb-8">
                            <InputField label="Resume / CV (Google Drive Link)" name="resumeUrl" type="url" icon={FileText} placeholder="https://drive.google.com/..." value={formData.resumeUrl} onChange={handleChange} error={errors.resumeUrl} />
                            
                            <div id="field-requirements">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Requirements</label>
                                <div className="flex flex-wrap gap-3">
                                    {requirementOptions.map(req => (
                                        <label
                                            key={req}
                                            className={`px-4 py-2 rounded-full border cursor-pointer transition-all ${formData.requirements.includes(req)
                                                ? 'bg-blue-100 border-blue-500 text-blue-700'
                                                : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300'
                                                }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={formData.requirements.includes(req)}
                                                onChange={() => handleRequirementChange(req)}
                                                className="hidden"
                                            />
                                            {req}
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div id="field-skills" className="pt-2">
                                <label className="block text-sm font-medium text-gray-700 mb-2">My Skills (select multiple)</label>
                                <div className="flex flex-wrap gap-2.5 min-w-0">
                                    {PROGRAMS.map(skill => {
                                        const selected = formData.skills.includes(skill);
                                        return (
                                            <button
                                                type="button"
                                                key={skill}
                                                onClick={() => handleSkillChange(skill)}
                                                className={`group inline-flex max-w-full min-w-0 items-center justify-center gap-2 px-3.5 py-2.5 text-left rounded-full border cursor-pointer transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-300/50 ${
                                                    selected
                                                        ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200'
                                                        : 'bg-white border-gray-200 text-gray-700 hover:border-blue-300 hover:bg-blue-50'
                                                }`}
                                            >
                                                <span className="min-w-0 break-words text-sm font-bold leading-snug">{skill}</span>
                                                <span className={`w-4 h-4 shrink-0 rounded-full flex items-center justify-center text-[10px] font-black border transition-all ${
                                                    selected
                                                        ? 'bg-white text-blue-600 border-white'
                                                        : 'bg-gray-50 text-transparent border-gray-300 group-hover:border-blue-300'
                                                }`}>
                                                    ✓
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                                {formData.skills.includes('Other') && (
                                    <div className="mt-4">
                                        <InputField
                                            label="Other Skills (comma separated)"
                                            name="otherSkills"
                                            placeholder="e.g., Data Entry, SEO, Content Writing"
                                            value={formData.otherSkills}
                                            onChange={handleChange}
                                            error={errors.otherSkills}
                                        />
                                        <p className="mt-1 text-xs text-gray-400">Comma laga kar multiple skills likhein.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Additional Info */}
                        <div className="grid grid-cols-1 gap-5 mb-8">
                            <div id="field-reason">
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Why do you want to join this internship?</label>
                                <textarea
                                    name="reason"
                                    value={formData.reason}
                                    onChange={handleChange}
                                    rows={3}
                                    placeholder="Write a short answer..."
                                    className={`w-full px-4 py-3 border ${errors.reason ? 'border-red-400' : 'border-gray-200'} rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-gray-50/50`}
                                />
                                {errors.reason && <p className="mt-1 text-sm text-red-500">{errors.reason}</p>}
                            </div>
                            
                        </div>

                        {/* Account Setup */}
                        <h2 className="text-xl font-semibold text-gray-900 mb-6 pb-2 border-b flex items-center gap-2">
                            <Lock className="w-5 h-5 text-primary" /> Account Setup
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
                            <div className="md:col-span-2">
                                <InputField label="Email *" name="email" type="email" icon={Mail} placeholder="your@email.com" value={formData.email} onChange={handleChange} error={errors.email} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Password *</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        name="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        placeholder="Create a password"
                                        className={`w-full px-4 py-3 border ${errors.password ? 'border-red-400' : 'border-gray-200'} rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-gray-50/50`}
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
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm Password *</label>
                                <div className="relative">
                                    <input
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        name="confirmPassword"
                                        value={formData.confirmPassword}
                                        onChange={handleChange}
                                        placeholder="Confirm password"
                                        className={`w-full px-4 py-3 border ${errors.confirmPassword ? 'border-red-400' : 'border-gray-200'} rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-gray-50/50`}
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
                                <label className={`flex items-start gap-3 p-4 rounded-xl border ${errors.termsAccepted ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'} cursor-pointer hover:bg-gray-100 transition-colors`}>
                                    <input
                                        type="checkbox"
                                        name="termsAccepted"
                                        checked={formData.termsAccepted}
                                        onChange={handleChange}
                                        className="w-5 h-5 mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-sm text-gray-700">I Accept All Terms and Conditions</span>
                                </label>
                            </div>
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={isLoading || !formData.termsAccepted}
                            className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:scale-95"
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

export default InternshipRegister;



