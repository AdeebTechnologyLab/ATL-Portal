import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    Users, Search, ChevronLeft,
    Award, BookOpen, Phone, CreditCard, Mail, GraduationCap,
    CheckCircle, XCircle
} from 'lucide-react';
import { directoryAPI } from '../../services/api';
import ProfileAvatar from '../../components/ui/ProfileAvatar';
import Loader from '../../components/ui/Loader';

const FILTER_OPTIONS = [
    { value: 'all', label: 'All', icon: Users },
    { value: 'active', label: 'Active', icon: CheckCircle },
    { value: 'certified', label: 'Certified', icon: Award },
];

const TeacherDirectory = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [users, setUsers] = useState([]);
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [activeFilter, setActiveFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchDirectory();
    }, [activeFilter]);

    useEffect(() => {
        if (!searchQuery.trim()) {
            setFilteredUsers(users);
        } else {
            const query = searchQuery.toLowerCase();
            setFilteredUsers(users.filter(u =>
                u.name?.toLowerCase().includes(query) ||
                u.rollNo?.toLowerCase().includes(query) ||
                u.email?.toLowerCase().includes(query) ||
                u.phone?.includes(query) ||
                u.cnic?.includes(query)
            ));
        }
    }, [searchQuery, users]);

    const fetchDirectory = async () => {
        setIsLoading(true);
        try {
            const res = await directoryAPI.getAll(activeFilter, 'teachers');
            setUsers(res.data.data || []);
            setFilteredUsers(res.data.data || []);
        } catch (error) {
            console.error('Error fetching directory:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const getStatusBadge = (user) => {
        if (user.isCertified) {
            return (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded-lg text-xs font-bold dark:bg-transparent dark:text-amber-400">
                    <Award className="w-3 h-3" />
                    Certified
                </span>
            );
        }
        if (user.hasActiveEnrollment) {
            return (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-lg text-xs font-bold dark:bg-transparent dark:text-primary">
                    <CheckCircle className="w-3 h-3" />
                    Active
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs font-bold dark:bg-transparent dark:text-gray-400">
                Inactive
            </span>
        );
    };

    const getRoleBadge = (role) => {
        const config = {
            student: 'bg-blue-100 text-blue-700 dark:bg-transparent dark:text-blue-400',
            intern: 'bg-primary/10 text-purple-700 dark:bg-transparent dark:text-purple-400',
            teacher: 'bg-amber-100 text-amber-700 dark:bg-transparent dark:text-amber-400'
        };
        return (
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${config[role] || 'bg-gray-100 text-gray-700 dark:bg-transparent dark:text-gray-400'}`}>
                {role}
            </span>
        );
    };

    return (
        <div className="space-y-6 min-h-screen">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/admin/dashboard')}
                        className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5 text-gray-500" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tight">
                            Teacher Directory ({filteredUsers.length})
                        </h1>
                        <p className="text-gray-500 text-sm">All instructors and teachers - sorted by roll number</p>
                    </div>
                </div>
            </div>

            {/* Filters & Search */}
            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                <div className="flex flex-col gap-4">
                    {/* Search */}
                    <div className="flex-1 relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by name, roll no, CNIC, phone..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#ff8e01] focus:border-transparent transition-all text-sm"
                        />
                    </div>

                    {/* Filter Buttons */}
                    <div className="flex flex-wrap gap-2">
                        {FILTER_OPTIONS.map((option) => {
                            const Icon = option.icon;
                            const isActive = activeFilter === option.value;
                            return (
                                <button
                                    key={option.value}
                                    onClick={() => setActiveFilter(option.value)}
                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wide transition-all ${
                                        isActive
                                            ? 'bg-primary text-white shadow-lg shadow-orange-200'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                                >
                                    <Icon className="w-4 h-4" />
                                    <span>{option.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Loading */}
            {isLoading ? (
                <Loader message="Loading directory..." />
            ) : filteredUsers.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 bg-white rounded-2xl border border-gray-100">
                    <Users className="w-16 h-16 text-gray-300 mb-4" />
                    <p className="text-gray-500 font-medium">No users found</p>
                    <p className="text-gray-400 text-sm">Try adjusting your filters</p>
                </div>
            ) : (
                /* Table */
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
                >
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100">
                                    <th className="px-4 py-4 text-left text-[10px] font-black uppercase tracking-widest text-gray-500">#</th>
                                    <th className="px-4 py-4 text-left text-[10px] font-black uppercase tracking-widest text-gray-500">Roll No</th>
                                    <th className="px-4 py-4 text-left text-[10px] font-black uppercase tracking-widest text-gray-500">Name</th>
                                    <th className="px-4 py-4 text-left text-[10px] font-black uppercase tracking-widest text-gray-500">Role</th>
                                    <th className="px-4 py-4 text-left text-[10px] font-black uppercase tracking-widest text-gray-500">CNIC</th>
                                    <th className="px-4 py-4 text-left text-[10px] font-black uppercase tracking-widest text-gray-500">Phone</th>
                                    <th className="px-4 py-4 text-left text-[10px] font-black uppercase tracking-widest text-gray-500">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredUsers.map((user, index) => (
                                    <motion.tr
                                        key={user._id}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: index * 0.02 }}
                                        className="hover:bg-primary/5/50 transition-colors group"
                                    >
                                        {/* Serial Number */}
                                        <td className="px-4 py-3">
                                            <span className="text-xs font-bold text-gray-400">{index + 1}</span>
                                        </td>

                                        {/* Roll Number */}
                                        <td className="px-4 py-3">
                                            <span className="px-3 py-1.5 bg-gradient-to-r from-primary to-primary text-white rounded-lg font-black text-xs shadow-sm">
                                                {user.rollNo || 'N/A'}
                                            </span>
                                        </td>

                                        {/* Name */}
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <ProfileAvatar src={user.photo} name={user.name} size="sm" shape="rounded-lg" />
                                                <div>
                                                    <p className="font-bold text-gray-900 text-sm group-hover:text-primary transition-colors">
                                                        {user.name}
                                                    </p>
                                                    <p className="text-[10px] text-gray-400">{user.email}</p>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Role */}
                                        <td className="px-4 py-3">
                                            {getRoleBadge(user.role)}
                                        </td>

                                        {/* CNIC */}
                                        <td className="px-4 py-3">
                                            <span className="text-sm text-gray-600 font-medium">{user.cnic}</span>
                                        </td>

                                        {/* Phone */}
                                        <td className="px-4 py-3">
                                            <span className="text-sm text-gray-600 font-medium">{user.phone}</span>
                                        </td>

                                        {/* Status */}
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                {getStatusBadge(user)}
                                                {user.certificatesCount > 0 && (
                                                    <span className="flex items-center gap-1 text-[10px] text-amber-600 font-bold">
                                                        <GraduationCap className="w-3 h-3" />
                                                        {user.certificatesCount}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Footer */}
                    <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                        <span className="text-xs text-gray-500 font-medium">
                            Showing {filteredUsers.length} of {users.length} users
                        </span>
                        <span className="text-xs text-gray-400">
                            Sorted by Roll Number
                        </span>
                    </div>
                </motion.div>
            )}
        </div>
    );
};

export default TeacherDirectory;



