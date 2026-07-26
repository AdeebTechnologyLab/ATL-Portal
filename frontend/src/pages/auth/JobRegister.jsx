import GuestChatWidget from '../../components/shared/GuestChatWidget';
import RegistrationLeftPanel from '../../components/auth/RegistrationLeftPanel';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    ArrowLeft, User, Mail, Phone, CreditCard,
    MapPin, Briefcase, FileText, Camera, ChevronDown, AlertCircle, Eye, EyeOff, Calendar, X, Users, Lock, BookOpen
} from 'lucide-react';
import { authAPI } from '../../services/api';
import ImageCropper from '../../components/ui/ImageCropper';
import { ButtonLoader } from '../../components/ui/Loader';
import { PAKISTAN_CITIES, COUNTRIES } from '../../utils/locations';

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

const CITIES = PAKISTAN_CITIES;
const HEARD_OPTIONS = [
    'Poster & Panaflex', 'Facebook', 'Instagram', 'WhatsApp Group', 'Website',
    'YouTube', 'Friends & Family', 'Twitter', 'LinkedIn', 'Other'
];

const GUARDIAN_RELATIONS = ['Father', 'Mother', 'Brother', 'Sister', 'Uncle', 'Aunt', 'Grandfather', 'Grandmother', 'Other'];

// Define components OUTSIDE to prevent re-creation and focus loss
const InputField = ({ label, name, type = 'text', icon: Icon, placeholder, value, onChange, error, ...props }) => (
    <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
        <div className="relative">
            <input
                type={type}
                name={name}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                className={`w-full px-4 py-3 ${Icon ? 'pl-11' : ''} border ${error ? 'border-red-400' : 'border-gray-200'
                    } rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-gray-50/50`}
                {...props}
            />
            {Icon && <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />}
        </div>
        {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
);

const SelectField = ({ label, name, options, placeholder, value, onChange, error }) => (
    <div>
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

const JobRegister = () => {
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
        email: '',
        gender: '',
        phone: '',
        cnic: '',
        address: '',
        city: '',
        otherCity: '',
        country: '',
        otherCountry: '',
        guardianName: '',
        guardianRelation: '',
        guardianPhone: '',
        guardianOccupation: '',
        qualification: '',
        teachingExp: '',
        experienceDetails: '',
        skills: [],
        otherSkills: '',
        cvUrl: '',
        heardAbout: '',
        password: '',
        confirmPassword: '',
        dob: '',
        age: '',
        termsAccepted: false
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
            setFormData(prev => ({
                ...prev,
                [name]: type === 'checkbox' ? checked : value
            }));
        }

        if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
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

    const validateForm = () => {
        const newErrors = {};
        if (!photoFile) newErrors.photo = 'Profile photo is required';
        if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required';
        if (!formData.fatherName.trim()) newErrors.fatherName = 'Father name is required';
        if (!formData.email) newErrors.email = 'Email is required';
        else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Invalid email format';
        if (!formData.phone) newErrors.phone = 'Phone is required';
        if (!formData.cnic) newErrors.cnic = 'CNIC is required';
        if (!formData.dob) newErrors.dob = 'Date of Birth is required';
        if (!formData.gender) newErrors.gender = 'Gender is required';
        if (!formData.address) newErrors.address = 'Address is required';
        if (!formData.city) newErrors.city = 'City is required';
        if (!formData.guardianName.trim()) newErrors.guardianName = 'Guardian name is required';
        if (!formData.guardianRelation) newErrors.guardianRelation = 'Relationship with guardian is required';
        if (!formData.guardianPhone) newErrors.guardianPhone = 'Guardian phone is required';
        if (!formData.guardianOccupation) newErrors.guardianOccupation = 'Guardian occupation is required';
        if (!formData.country) newErrors.country = 'Country is required';
        if (!formData.qualification) newErrors.qualification = 'Qualification is required';
        if (!formData.teachingExp) newErrors.teachingExp = 'This field is required';
        if (!formData.experienceDetails.trim()) newErrors.experienceDetails = 'Experience details are required';
        if (formData.skills.length === 0) newErrors.skills = 'Select at least one skill';
        if (formData.skills.includes('Other') && !formData.otherSkills.trim()) {
            newErrors.otherSkills = 'Please specify your other skills';
        }
        if (!formData.heardAbout) newErrors.heardAbout = 'This field is required';
        if (!formData.password) newErrors.password = 'Password is required';
        else if (formData.password.length < 4) newErrors.password = 'Minimum 4 characters';
        if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
        if (!formData.termsAccepted) newErrors.termsAccepted = 'You must accept terms';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    
    const scrollToFirstError = (newErrors) => {
        const fieldOrder = [
            'photo', 'fullName', 'fatherName', 'email', 'phone', 'cnic', 'dob',
            'gender',
            'guardianName', 'guardianRelation', 'guardianPhone', 'guardianOccupation',
            'address', 'city', 'country',
            'qualification', 'teachingExp', 'experienceDetails', 'skills', 'otherSkills',
            'cvUrl', 'heardAbout', 'password', 'confirmPassword', 'termsAccepted'
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
            if (!formData.email) errs.email = true;
            if (!formData.phone) errs.phone = true;
            if (!formData.cnic) errs.cnic = true;
            if (!formData.dob) errs.dob = true;
            if (!formData.gender) errs.gender = true;
            if (!formData.guardianName.trim()) errs.guardianName = true;
            if (!formData.guardianRelation) errs.guardianRelation = true;
            if (!formData.guardianPhone) errs.guardianPhone = true;
            if (!formData.guardianOccupation) errs.guardianOccupation = true;
            if (!formData.address) errs.address = true;
            if (!formData.city) errs.city = true;
            if (!formData.country) errs.country = true;
            if (!formData.qualification) errs.qualification = true;
            if (!formData.teachingExp) errs.teachingExp = true;
            if (!formData.experienceDetails.trim()) errs.experienceDetails = true;
            if (formData.skills.length === 0) errs.skills = true;
            if (formData.skills.includes('Other') && !formData.otherSkills.trim()) errs.otherSkills = true;
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
            submitData.append('phone', formData.phone);
            submitData.append('role', 'job');
            submitData.append('location', formData.city === 'Other' ? formData.otherCity : formData.city);
            submitData.append('country', formData.country === 'Other' ? formData.otherCountry : formData.country);
            submitData.append('address', formData.address);
            submitData.append('guardianName', formData.guardianName);
            submitData.append('guardianRelation', formData.guardianRelation);
            submitData.append('guardianPhone', formData.guardianPhone);
            submitData.append('guardianOccupation', formData.guardianOccupation);
            submitData.append('cnic', formData.cnic);
            submitData.append('dob', formData.dob);
            submitData.append('gender', formData.gender);
            submitData.append('age', formData.age);
            let finalSkills = formData.skills.filter(s => s !== 'Other');
            if (formData.skills.includes('Other') && formData.otherSkills.trim()) {
                finalSkills = [...finalSkills, ...formData.otherSkills.split(',').map(s => s.trim()).filter(Boolean)];
            }
            submitData.append('skills', finalSkills.join(', '));
            submitData.append('experience', formData.experienceDetails);
            submitData.append('portfolio', formData.cvUrl);

            if (photoFile) {
                submitData.append('photo', photoFile);
            }

            await authAPI.register(submitData);
            navigate('/login', {
                state: {
                    message: 'Application submitted! You can now login with your credentials.',
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
        <div className="min-h-screen flex">
            {cropperSrc && (
                <ImageCropper
                    imageSrc={cropperSrc}
                    onCrop={handleCropDone}
                    onCancel={() => setCropperSrc(null)}
                    accentColor="purple"
                />
            )}
            {/* Left Side - Dynamic Content */}
            <RegistrationLeftPanel
                formType="job"
                mobileOpen={showMobileInfo}
                onMobileClose={() => setShowMobileInfo(false)}
            />

            {/* Right Side - Registration Form - Scrollable */}
            <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                className="w-full lg:w-1/2 h-screen overflow-y-auto p-8 bg-white"
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
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">Job Application</h1>
                        <p className="text-gray-500">
                            Already have an account?{' '}
                            <Link
                                to="/login"
                                className="text-primary font-semibold underline hover:text-purple-700 transition-colors"
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
                        {apiError && (
                            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600">
                                {apiError}
                            </div>
                        )}

                        {/* Photo Upload */}
                        <div className="flex flex-col items-center mb-6">
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
                            <User className="w-5 h-5 text-primary" /> Personal Information
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
                            <InputField label="Full Name *" name="fullName" icon={User} placeholder="Your full name" value={formData.fullName} onChange={handleChange} error={errors.fullName} />
                            <InputField label="Father Name *" name="fatherName" icon={User} placeholder="Father's name" value={formData.fatherName} onChange={handleChange} error={errors.fatherName} />
                            
                            <InputField label="WhatsApp Number *" name="phone" type="tel" icon={Phone} placeholder="+92 300 1234567" value={formData.phone} onChange={handleChange} error={errors.phone} />
                            <InputField label="CNIC Number *" name="cnic" icon={CreditCard} placeholder="XXXXX-XXXXXXX-X" value={formData.cnic} onChange={handleCNICChange} error={errors.cnic} />
                            <InputField label="Date of Birth *" name="dob" type="date" icon={Calendar} value={formData.dob} onChange={handleChange} error={errors.dob} />
                            <div id="field-gender">
                                <SelectField label="Gender *" name="gender" options={['Male','Female']} placeholder="Select Gender" value={formData.gender} onChange={handleChange} error={errors.gender} />
                            </div>
                        </div>

                        {/* Guardian Information */}
                        <h2 className="text-xl font-semibold text-gray-900 mb-6 pb-2 border-b flex items-center gap-2">
                            <Users className="w-5 h-5 text-primary" /> Guardian Information
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
                            <div id="field-guardianName">
                                <InputField label="Guardian Name *" name="guardianName" icon={Users} placeholder="Guardian's Full Name" value={formData.guardianName} onChange={handleChange} error={errors.guardianName} />
                            </div>
                            <div id="field-guardianRelation">
                                <SelectField label="Relationship with Guardian *" name="guardianRelation" options={GUARDIAN_RELATIONS} placeholder="Select Relationship" value={formData.guardianRelation} onChange={handleChange} error={errors.guardianRelation} />
                            </div>
                            <InputField label="Guardian WhatsApp Number *" name="guardianPhone" icon={Phone} placeholder="Guardian's Phone" value={formData.guardianPhone} onChange={handleChange} error={errors.guardianPhone} />
                            <InputField label="Guardian Occupation *" name="guardianOccupation" icon={Briefcase} placeholder="Guardian's Occupation" value={formData.guardianOccupation} onChange={handleChange} error={errors.guardianOccupation} />
                        </div>

                        {/* Address Details */}
                        <h2 className="text-xl font-semibold text-gray-900 mb-6 pb-2 border-b flex items-center gap-2">
                            <MapPin className="w-5 h-5 text-primary" /> Address Details
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
                                <InputField label="Home Address *" name="address" icon={MapPin} placeholder="Complete address" value={formData.address} onChange={handleChange} error={errors.address} />
                            </div>
                        </div>

                        {/* Professional & Educational Details */}
                        <h2 className="text-xl font-semibold text-gray-900 mb-6 pb-2 border-b flex items-center gap-2">
                            <Briefcase className="w-5 h-5 text-primary" /> Professional Details
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
                            <InputField label="Highest Qualification *" name="qualification" icon={BookOpen} placeholder="e.g. BSCS, MSC" value={formData.qualification} onChange={handleChange} error={errors.qualification} />
                            <SelectField label="Teaching Experience *" name="teachingExp" options={['None', 'Less than 1 Year', '1-3 Years', '3-5 Years', '5+ Years']} placeholder="Select Experience" value={formData.teachingExp} onChange={handleChange} error={errors.teachingExp} />
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Experience Details *</label>
                                <textarea name="experienceDetails" value={formData.experienceDetails} onChange={handleChange} rows={3} placeholder="Briefly describe your experience" className={`w-full px-4 py-3 border ${errors.experienceDetails ? 'border-red-400' : 'border-gray-200'} rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-gray-50/50`} />
                                {errors.experienceDetails && <p className="mt-1 text-sm text-red-500">{errors.experienceDetails}</p>}
                            </div>
                        </div>

                        {/* Skills */}
                        <h2 className="text-xl font-semibold text-gray-900 mb-6 pb-2 border-b flex items-center gap-2">
                            <Briefcase className="w-5 h-5 text-primary" /> Skills
                        </h2>
                        <div id="field-skills" className="mb-8">
                            <label className="block text-sm font-medium text-gray-700 mb-3">Skills or Fields you specialize in * (select multiple)</label>
                            <div className="flex flex-wrap gap-2.5 mb-4 min-w-0">
                                {SKILLS.map(prog => {
                                    const selected = formData.skills.includes(prog);
                                    return (
                                        <button
                                            type="button"
                                            key={prog}
                                            onClick={() => {
                                                const updated = selected
                                                    ? formData.skills.filter(s => s !== prog)
                                                    : [...formData.skills, prog];
                                                setFormData({ ...formData, skills: updated });
                                                if (errors.skills) setErrors(prev => ({ ...prev, skills: '' }));
                                            }}
                                            className={`group inline-flex max-w-full min-w-0 items-center justify-center gap-2 px-3.5 py-2.5 text-left rounded-full border cursor-pointer transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary/30 ${
                                                selected
                                                    ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20'
                                                    : 'bg-white border-gray-200 text-gray-700 hover:border-primary/40 hover:bg-primary/5'
                                            }`}
                                        >
                                            <span className="min-w-0 break-words text-sm font-bold leading-snug">{prog}</span>
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
                            {formData.skills.includes('Other') && (
                                <div id="field-otherSkills" className="mt-4">
                                    <InputField
                                        label="Please specify other skills (comma separated) *"
                                        name="otherSkills"
                                        placeholder="e.g., Data Entry, SEO, Content Writing"
                                        value={formData.otherSkills}
                                        onChange={handleChange}
                                        error={errors.otherSkills}
                                    />
                                </div>
                            )}
                            {errors.skills && <p className="mt-1 text-sm text-red-500">{errors.skills}</p>}
                        </div>

                        {/* Preferences & Attachments */}
                        <h2 className="text-xl font-semibold text-gray-900 mb-6 pb-2 border-b flex items-center gap-2">
                            <FileText className="w-5 h-5 text-primary" /> Preferences & Attachments
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
                            <div id="field-cvUrl" className="md:col-span-2">
                                <InputField label="CV/Resume URL (Drive/Dropbox)" name="cvUrl" type="url" icon={FileText} placeholder="https://drive.google.com/..." value={formData.cvUrl} onChange={handleChange} error={errors.cvUrl} />
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
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm Password *</label>
                                <div className="relative">
                                    <input
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        name="confirmPassword"
                                        value={formData.confirmPassword}
                                        onChange={handleChange}
                                        placeholder="Confirm password"
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
                                <label className={`flex items-start gap-3 p-4 rounded-xl border ${errors.termsAccepted ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'} cursor-pointer hover:bg-gray-100 transition-colors`}>
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
                            className="w-full py-4 bg-primary hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:scale-95"
                        >
                            <ButtonLoader isLoading={isLoading}>
                                {isLoading ? 'Submitting...' : 'Register Now'}
                            </ButtonLoader>
                        </button>
                    </form>
                </div>
            </motion.div>


            <GuestChatWidget />
        </div>
    );
};

export default JobRegister;




