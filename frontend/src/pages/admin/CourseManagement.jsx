import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
    Search,
    Edit,
    Trash2,
    Users,
    BookOpen,
    Calendar,
    Clock,
    AlertCircle,
    Filter,
    X,
    RefreshCw
} from 'lucide-react';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { courseAPI, userAPI, enrollmentAPI } from '../../services/api';
import { getCourseIcon, getCourseColor, getCourseStyle } from '../../utils/courseIcons';
import Loader, { ButtonLoader } from '../../components/ui/Loader';

const CourseManagement = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isFetching, setIsFetching] = useState(true);
    const [editingCourse, setEditingCourse] = useState(null);
    const [courses, setCourses] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [enrollments, setEnrollments] = useState([]);
    const [selectedStatus, setSelectedStatus] = useState('all'); // 'all', 'active', 'completed'
    const [error, setError] = useState('');
    const [imagePreview, setImagePreview] = useState(null);
    const descRef = useRef(null);

    useEffect(() => {
        if (isModalOpen && descRef.current) {
            descRef.current.style.height = 'auto';
            descRef.current.style.height = descRef.current.scrollHeight + 'px';
        }
    }, [isModalOpen]);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        fee: '',
        originalPrice: '',
        durationMonths: '',
        teachers: [],
        targetAudience: '',
        city: '',
        category: '', // Added category
        bookLink: '',
        image: null,
    });

    // Filters State
    const [selectedRoles, setSelectedRoles] = useState([]); // 'students', 'interns'
    const [selectedCities, setSelectedCities] = useState([]); // 'Bahawalpur', 'Islamabad'

    // Fetch courses and users on component mount
    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setIsFetching(true);
        setError('');
        try {
            const [coursesRes, teachersRes, enrollsRes] = await Promise.all([
                courseAPI.getAll(),
                userAPI.getVerifiedByRole('teacher'),
                enrollmentAPI.getAll().catch(() => ({ data: { data: [] } }))
            ]);
            setCourses(coursesRes.data.data || []);
            setTeachers(teachersRes.data.data || []);
            setEnrollments(enrollsRes.data.data || []);
        } catch (err) {
            console.error('Error fetching data:', err);
            setError('Failed to load data. Please try again.');
        } finally {
            setIsFetching(false);
        }
    };

    const filteredCourses = courses.filter((course) => {
        const matchesSearch = (course.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (course.teachers || []).some(t => (t.name || '').toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesRole = selectedRoles.length === 0 || selectedRoles.includes(course.targetAudience);
        const matchesCity = selectedCities.length === 0 || selectedCities.includes(course.city);
        
        let matchesStatus = true;
        if (selectedStatus !== 'all') {
            const courseEnrolls = enrollments.filter(e => String(e.course?._id || e.course) === String(course._id));
            if (selectedStatus === 'active') {
                matchesStatus = courseEnrolls.some(e => e.status === 'enrolled' || e.status === 'pending');
            } else if (selectedStatus === 'completed') {
                matchesStatus = courseEnrolls.some(e => e.status === 'completed');
            }
        }

        return matchesSearch && matchesRole && matchesCity && matchesStatus;
    });

    const toggleFilter = (type, value) => {
        if (type === 'role') {
            setSelectedRoles(prev =>
                prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
            );
        } else {
            setSelectedCities(prev =>
                prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
            );
        }
    };

    const clearFilters = () => {
        setSelectedRoles([]);
        setSelectedCities([]);
        setSearchQuery('');
    };

    const handleOpenModal = (course = null) => {
        if (course) {
            setEditingCourse(course);
            setFormData({
                title: course.title,
                description: course.description,
                fee: course.fee?.toString() || '',
                originalPrice: course.originalPrice?.toString() || '',
                durationMonths: course.durationMonths?.toString() || '',
                teachers: course.teachers?.map(t => t._id?.toString()) || [],
                targetAudience: course.targetAudience || 'students',
                city: course.city || '',
                category: course.category || '',
                bookLink: course.bookLink || '',
                image: null,
            });
            setImagePreview(course.image || null);
        } else {
            setEditingCourse(null);
            setFormData({
                title: '',
                description: '',
                fee: '',
                originalPrice: '',
                durationMonths: '',
                teachers: [],
                targetAudience: '',
                city: '',
                category: '',
                bookLink: '',
                image: null,
            });
            setImagePreview(null);
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingCourse(null);
        setImagePreview(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const submitData = new FormData();
            submitData.append('title', formData.title);
            submitData.append('description', formData.description);
            submitData.append('fee', formData.fee);
            if (formData.originalPrice) submitData.append('originalPrice', formData.originalPrice);
            if (formData.durationMonths) submitData.append('durationMonths', formData.durationMonths);
            submitData.append('targetAudience', formData.targetAudience);
            submitData.append('location', formData.city.toLowerCase());
            if (editingCourse && formData.category) submitData.append('category', formData.category);
            submitData.append('city', formData.city);
            if (formData.bookLink) submitData.append('bookLink', formData.bookLink);
            
            formData.teachers.forEach(t => submitData.append('teachers', t));

            if (formData.image instanceof File) {
                submitData.append('image', formData.image);
            } else if (imagePreview && typeof imagePreview === 'string' && !imagePreview.startsWith('blob:')) {
                submitData.append('existingImage', imagePreview);
            }

            if (editingCourse) {
                await courseAPI.update(editingCourse._id, submitData);
            } else {
                await courseAPI.create(submitData);
            }

            handleCloseModal();
            fetchData(); // Refresh the list
        } catch (err) {
            console.error('Error saving course:', err);
            setError(err.response?.data?.message || 'Failed to save course. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (courseId) => {
        if (window.confirm('Are you sure you want to delete this course?')) {
            try {
                await courseAPI.delete(courseId);
                fetchData(); // Refresh the list
            } catch (err) {
                console.error('Error deleting course:', err);
                alert(err.response?.data?.message || 'Failed to delete course');
            }
        }
    };

    const getEnrolledCount = (course) => {
        // This will be populated from the enrollments count
        return course.enrolledCount || 0;
    };

    if (isFetching && courses.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader message="Loading Courses..." size="lg" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Course Management</h1>
                    <p className="text-gray-500 text-sm">Create and manage all courses</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchData}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 hover:bg-gray-100 rounded-xl text-gray-500 transition-all active:scale-95 border border-gray-200 bg-white"
                    >
                        <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
                        <span className="text-xs font-black uppercase tracking-wider">Refresh</span>
                    </button>
                    <button
                        onClick={() => handleOpenModal()}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-primary-dark hover:bg-primary text-white rounded-xl transition-all duration-300 font-bold text-xs uppercase tracking-widest"
                    >
                        <BookOpen className="w-5 h-5" />
                        Add Course
                    </button>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    <span className="text-red-600">{error}</span>
                </div>
            )}

            {/* Filters and Search */}
            <div className="bg-white rounded-3xl p-4 sm:p-6 border border-gray-100 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                    {/* Search */}
                    <div className="flex-1 relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search courses or teachers..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-3.5 !bg-gray-50/50 dark:!bg-white/5 border border-transparent focus:border-primary focus:!bg-white dark:focus:!bg-white/10 rounded-2xl transition-all outline-none text-sm font-medium dark:text-white"
                        />
                    </div>

                    {/* Clear Button */}
                    {(selectedRoles.length > 0 || selectedCities.length > 0 || searchQuery) && (
                        <button
                            onClick={clearFilters}
                            className="flex items-center justify-center gap-2 px-4 py-3 text-rose-500 hover:bg-rose-50 rounded-xl transition-all text-sm font-bold uppercase tracking-widest"
                        >
                            <X className="w-4 h-4" />
                            Clear
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Role Filters */}
                    <div className="space-y-2">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Audience</p>
                        <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-2xl">
                            {[
                                { id: 'students', label: 'Students' },
                                { id: 'interns', label: 'Interns' }
                            ].map((type) => (
                                <button
                                    key={type.id}
                                    onClick={() => toggleFilter('role', type.id)}
                                    className={`flex-1 px-3 py-2 rounded-xl font-bold text-xs transition-all ${selectedRoles.includes(type.id)
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
                    

                </div>
            </div>

            {/* No Courses Message */}
            {filteredCourses.length === 0 && (
                <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
                    <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-600">No courses found</h3>
                    <p className="text-gray-400">Create your first course to get started</p>
                </div>
            )}

            {/* Courses Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCourses.map((course, index) => (
                    <motion.div
                        key={course._id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="bg-white rounded-2xl p-6 border border-gray-100 hover:shadow-lg transition-all duration-300"
                    >
                        {(() => {
                            const style = getCourseStyle(course.category, course.title);
                            const Icon = style.icon;
                            return (
                                <div className={`mb-4 aspect-video rounded-xl overflow-hidden relative bg-gray-100`}>
                                    {course.image ? (
                                        <img src={course.image} alt={course.title} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className={`absolute inset-0 flex items-center justify-center bg-gradient-to-br ${course.targetAudience === 'interns' ? 'from-purple-600 via-indigo-600 to-violet-700' : style.gradient}`}>
                                            
                                        </div>
                                    )}

                                    {/* Location badge - top left */}
                                    <div className="absolute top-2 left-2">
                                        <Badge variant="info" size="sm">
                                            {course.city || 'N/A'}
                                        </Badge>
                                    </div>
                                    {/* Audience badge - top right */}
                                    <div className="absolute top-2 right-2">
                                        <Badge variant={course.targetAudience === 'students' ? 'success' : 'purple'} size="sm">
                                            {course.targetAudience}
                                        </Badge>
                                    </div>
                                </div>
                            );
                        })()}

                        <h3 className="font-bold text-gray-900 mb-2">{course.title}</h3>
                        <p className="text-sm text-gray-500 mb-4 line-clamp-2">{course.description}</p>

                        {/* Teachers */}
                        <div className="mb-3">
                            {course.teachers && course.teachers.length > 0 ? (
                                <div className="flex flex-wrap gap-1.5">
                                    {course.teachers.map((teacher, idx) => (
                                        <div key={idx} className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-lg">
                                            {teacher?.photo ? (
                                                <img src={teacher.photo} alt={teacher.name} className="w-6 h-6 rounded-full object-cover" />
                                            ) : (
                                                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-primary flex items-center justify-center text-white text-xs font-medium">
                                                    {teacher?.name?.charAt(0) || 'T'}
                                                </div>
                                            )}
                                            <span className="text-xs text-gray-600">{teacher?.name || 'Teacher'}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <span className="text-sm text-gray-400">No teachers assigned</span>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
                            <div className="flex items-center gap-1.5 text-gray-500">
                                <Clock className="w-4 h-4" />
                                {course.durationMonths
                                    ? `${course.durationMonths} ${course.durationMonths === 1 ? 'month' : 'months'}`
                                    : 'Flexible duration'}
                            </div>
                            <div className="flex items-center gap-1.5 text-gray-500">
                                <Calendar className="w-4 h-4" />
                                {course.isActive ? 'Active' : 'Inactive'}
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-1.5">
                                    <Users className="w-4 h-4 text-gray-400" />
                                    <span className="text-sm font-medium text-gray-600">
                                        {enrollments.filter(e => String(e.course?._id || e.course) === String(course._id)).length} Students
                                    </span>
                                </div>
                                <div className="flex gap-2 text-[10px] font-bold text-gray-400">
                                    <span className="text-primary">{enrollments.filter(e => String(e.course?._id || e.course) === String(course._id) && (e.status === 'enrolled' || e.status === 'pending')).length} Active</span>
                                    <span className="text-indigo-500">{enrollments.filter(e => String(e.course?._id || e.course) === String(course._id) && e.status === 'completed').length} Certified</span>
                                </div>
                            </div>
                            <div className="flex flex-col items-end">
                                {course.originalPrice && !isNaN(parseFloat(course.originalPrice)) && parseFloat(course.originalPrice) > parseFloat(course.fee) && (
                                    <span className="text-[10px] text-red-500 line-through font-medium">
                                        Rs {Number(course.originalPrice).toLocaleString()}
                                    </span>
                                )}
                                <div className="flex items-center gap-1 font-semibold text-primary">
                                    <span>{isNaN(Number(course.fee)) ? course.fee : `Rs ${Number(course.fee).toLocaleString()}`}</span>
                                    <span className="text-xs font-normal text-gray-500">/month</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 mt-4">
                            <button
                                onClick={() => handleOpenModal(course)}
                                className="flex-1 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors flex items-center justify-center gap-1"
                            >
                                <Edit className="w-4 h-4" />
                                Edit
                            </button>
                            <button
                                onClick={() => handleDelete(course._id)}
                                className="flex-1 py-2.5 text-sm font-medium text-red-500 hover:bg-red-50 rounded-xl transition-colors flex items-center justify-center gap-1"
                            >
                                <Trash2 className="w-4 h-4" />
                                Delete
                            </button>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Create/Edit Course Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                title={editingCourse ? 'Edit Course' : 'Create New Course'}
                size="lg"
            >
                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Error in modal */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-red-500" />
                            <span className="text-red-600 text-sm">{error}</span>
                        </div>
                    )}

                    {/* Course Title */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Course Title <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            placeholder="e.g., Web Development Bootcamp"
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                            required
                        />
                    </div>

                    {/* Course Image */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Course Cover Image <span className="text-xs text-gray-400 font-normal">(16:9 ratio recommended)</span>
                        </label>
                        <div className="flex flex-wrap items-center gap-4">
                            {imagePreview && (
                                <div className="relative mt-2">
                                    <img src={imagePreview} alt="Course preview" className="w-28 h-16 rounded-xl object-cover border border-gray-200" />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setFormData({ ...formData, image: null });
                                            setImagePreview(null);
                                        }}
                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                                        title="Remove image"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            )}
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file && file.type.startsWith('image/')) {
                                        setFormData({ ...formData, image: file });
                                        setImagePreview(URL.createObjectURL(file));
                                    }
                                    e.target.value = '';
                                }}
                                className="w-full mt-2 text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-primary/5 file:text-primary hover:file:bg-primary/10 transition-colors"
                            />
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Description <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            ref={descRef}
                            value={formData.description}
                            onChange={(e) => {
                                setFormData({ ...formData, description: e.target.value });
                                e.target.style.height = 'auto';
                                e.target.style.height = e.target.scrollHeight + 'px';
                            }}
                            onInput={(e) => {
                                e.target.style.height = 'auto';
                                e.target.style.height = e.target.scrollHeight + 'px';
                            }}
                            placeholder="Detailed course description..."
                            rows={4}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none overflow-hidden"
                            required
                        />
                    </div>

                    {/* Assign Teachers (Checkboxes) */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Assign Teachers <span className="text-red-500">*</span>
                        </label>
                        <div className="border border-gray-200 dark:border-slate-700 rounded-xl p-4 max-h-48 overflow-y-auto bg-gray-50 dark:bg-slate-800">
                            {teachers.length === 0 ? (
                                <p className="text-sm text-gray-400">No teachers available</p>
                            ) : (
                                <div className="space-y-2">
                                    {teachers.map((teacher) => (
                                        <label key={teacher._id} className="flex items-center gap-3 p-2 hover:bg-white dark:hover:bg-slate-700 rounded-lg cursor-pointer transition-colors">
                                            <input
                                                type="checkbox"
                                                checked={formData.teachers.some(id => id.toString() === teacher._id.toString())}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setFormData({ ...formData, teachers: [...formData.teachers, teacher._id.toString()] });
                                                    } else {
                                                        setFormData({ ...formData, teachers: formData.teachers.filter(id => id.toString() !== teacher._id.toString()) });
                                                    }
                                                }}
                                                className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                                            />
                                            {teacher.photo ? (
                                                <img src={teacher.photo} alt={teacher.name} className="w-8 h-8 rounded-full object-cover mr-2" />
                                            ) : (
                                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold mr-2">
                                                    {teacher.name.charAt(0)}
                                                </div>
                                            )}
                                            <div className="flex-1">
                                                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{teacher.name}</span>
                                                <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">({teacher.specialization || teacher.email})</span>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            {formData.teachers.length} teacher(s) selected
                        </p>
                    </div>

                    {/* Fee and Duration Row */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Fee / Text <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.fee}
                                onChange={(e) => setFormData({ ...formData, fee: e.target.value })}
                                placeholder="15000 or Coming Soon"
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Original Price / Text <span className="text-xs text-gray-400 font-normal">(Optional)</span>
                            </label>
                            <input
                                type="text"
                                value={formData.originalPrice}
                                onChange={(e) => setFormData({ ...formData, originalPrice: e.target.value })}
                                placeholder="20000"
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-gray-50/50"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Duration (Months) <span className="text-xs text-gray-400 font-normal">(Optional)</span>
                            </label>
                            <select
                                value={formData.durationMonths}
                                onChange={(e) => setFormData({ ...formData, durationMonths: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-white"
                            >
                                <option value="">Select duration</option>
                                <option value="1">1 month</option>
                                <option value="2">2 months</option>
                                <option value="3">3 months</option>
                                <option value="4">4 months</option>
                                <option value="5">5 months</option>
                                <option value="6">6 months</option>
                                <option value="7">7 months</option>
                                <option value="8">8 months</option>
                                <option value="9">9 months</option>
                                <option value="10">10 months</option>
                            </select>
                        </div>
                    </div>

                    {/* User */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            User <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={formData.targetAudience}
                            onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-white"
                            required
                        >
                            <option value="">Select audience</option>
                            <option value="students">For Students</option>
                            <option value="interns">For Interns</option>
                        </select>
                    </div>

                    {/* Campus */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Campus <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={formData.city}
                            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-white"
                            required
                        >
                            <option value="">Select campus</option>
                            <option value="Bahawalpur">Bahawalpur</option>
                            <option value="Islamabad">Islamabad</option>
                        </select>
                    </div>

                    {/* Book Link */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Book / Resource Link
                        </label>
                        <input
                            type="url"
                            value={formData.bookLink}
                            onChange={(e) => setFormData({ ...formData, bookLink: e.target.value })}
                            placeholder="https://example.com/course-book.pdf"
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-mono text-xs"
                        />
                        <p className="text-[10px] text-gray-400 mt-1 italic uppercase tracking-widest font-black">Direct link to course materials</p>
                    </div>


                    {/* Buttons */}
                    <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={handleCloseModal}
                            className="flex-1 py-3 text-gray-600 font-medium hover:bg-gray-100 rounded-xl transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="flex-1 py-3 bg-primary-dark hover:bg-primary text-white font-medium rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                        >
                            {isLoading ? (
                                <>
                                    <ButtonLoader />
                                    {editingCourse ? 'Updating...' : 'Creating...'}
                                </>
                            ) : (
                                editingCourse ? 'Update Course' : 'Create Course'
                            )}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default CourseManagement;



