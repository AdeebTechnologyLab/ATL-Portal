import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Palette, Check, Layout, Sun, Moon, Sparkles, LogOut, HardDrive, Clock, Paintbrush, User, Mail, Phone, Shield, Lock, Bell, Eye, EyeOff, Camera, Save, X } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { APP_THEMES } from '../../constants/themes';
import LanguagePicker from '../../components/settings/LanguagePicker';
import { googleDriveAPI, authAPI } from '../../services/api';
import { updateUser } from '../../features/auth/authSlice';
import { ButtonLoader } from '../../components/ui/Loader';

function ThemePreviewCard({ theme: themeData, isActive, onSelect }) {
    return (
        <motion.button
            type="button"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={onSelect}
            className={`group relative w-full text-left rounded-xl border-2 overflow-hidden transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary ${
                isActive
                    ? 'border-transparent shadow-lg ring-2 ring-offset-2'
                    : 'border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700'
            }`}
            style={
                isActive
                    ? {
                          ringColor: themeData.primary,
                          boxShadow: `0 8px 24px -8px ${themeData.primary}40`,
                      }
                    : undefined
            }
        >
            <div
                className={`px-4 py-3 ${
                    isActive
                        ? 'bg-white dark:bg-gray-800/80'
                        : 'bg-white/90 dark:bg-[#1a1f2e]/90'
                }`}
            >
                <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase italic tracking-tight truncate">
                            {themeData.name}
                        </h4>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 font-semibold mt-0.5">
                            {themeData.tagline}
                        </p>
                    </div>
                    {isActive && (
                        <div
                            className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                            style={{ backgroundColor: themeData.primary, color: themeData.onPrimary }}
                        >
                            <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-2 mt-2.5">
                    <span className="text-[7px] font-bold uppercase tracking-wider text-gray-400 shrink-0">Brand</span>
                    <div className="flex gap-1 flex-1">
                        {[themeData.primary, themeData.sidebar, themeData.textPrimary].map((c) => (
                            <span
                                key={c}
                                className="h-4 flex-1 max-w-[2.5rem] rounded border border-black/5"
                                style={{ backgroundColor: c }}
                            />
                        ))}
                    </div>
                </div>
            </div>
            {isActive && (
                <div className="h-0.5" style={{ backgroundColor: themeData.primary }} />
            )}
        </motion.button>
    );
}

const getRoleLabel = (role) => {
    const labels = { admin: 'Administrator', teacher: 'Teacher', student: 'Student', intern: 'Intern', job: 'Freelancer' };
    return labels[role] || 'User';
};

const Settings = () => {
    const { t } = useTranslation();
    const { theme, setTheme, isDark, toggleTheme, dateFormat, setDateFormat, timeFormat, setTimeFormat } = useTheme();
    const { user, role } = useSelector((state) => state.auth);
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [showSuccess, setShowSuccess] = useState('');
    const [driveStatus, setDriveStatus] = useState({ configured: false, connected: false, googleEmail: '' });
    const [isDisconnecting, setIsDisconnecting] = useState(false);
    const [driveError, setDriveError] = useState('');

    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [profileForm, setProfileForm] = useState({
        name: user?.name || '',
        email: user?.email || '',
        phone: user?.phone || '',
    });

    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [isSavingPassword, setIsSavingPassword] = useState(false);
    const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [passwordError, setPasswordError] = useState('');

    const [notifications, setNotifications] = useState({
        emailNotifications: true,
        pushNotifications: true,
        assignmentAlerts: true,
        gradeAlerts: true,
        announcementAlerts: true,
    });

    const activeThemeMeta = APP_THEMES.find((t) => t.id === theme) || APP_THEMES[0];

    const showSuccessMessage = (msg) => {
        setShowSuccess(msg);
        setTimeout(() => setShowSuccess(''), 3000);
    };

    const handleThemeChange = (id) => {
        setTheme(id);
        showSuccessMessage(t('settings.themeApplied', { name: activeThemeMeta.name }));
    };

    useEffect(() => {
        if (role === 'student' || role === 'intern') {
            googleDriveAPI.getStatus()
                .then(res => setDriveStatus(res.data))
                .catch(() => {});
        }
    }, [role]);

    useEffect(() => {
        if (user) {
            setProfileForm({
                name: user.name || '',
                email: user.email || '',
                phone: user.phone || '',
            });
        }
    }, [user]);

    const handleConnectGoogleDrive = async () => {
        try {
            setDriveError('');
            const response = await googleDriveAPI.getAuthUrl();
            window.location.assign(response.data.url);
        } catch (error) {
            setDriveError(error.response?.data?.message || 'Google Drive connection is not configured yet.');
        }
    };

    const handleSaveProfile = async () => {
        setIsSavingProfile(true);
        try {
            const response = await authAPI.updateProfile({
                name: profileForm.name,
                email: profileForm.email,
                phone: profileForm.phone,
            });
            if (response.data.user) {
                dispatch(updateUser(response.data.user));
            }
            setIsEditingProfile(false);
            showSuccessMessage('Profile updated successfully!');
        } catch (error) {
            console.error('Error saving profile:', error);
        } finally {
            setIsSavingProfile(false);
        }
    };

    const handleChangePassword = async () => {
        setPasswordError('');
        if (!passwordForm.currentPassword || !passwordForm.newPassword) {
            setPasswordError('Please fill in all password fields.');
            return;
        }
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            setPasswordError('New password and confirm password do not match.');
            return;
        }
        if (passwordForm.newPassword.length < 6) {
            setPasswordError('New password must be at least 6 characters.');
            return;
        }
        setIsSavingPassword(true);
        try {
            await authAPI.updateProfile({
                currentPassword: passwordForm.currentPassword,
                password: passwordForm.newPassword,
            });
            setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
            setIsChangingPassword(false);
            showSuccessMessage('Password changed successfully!');
        } catch (error) {
            setPasswordError(error.response?.data?.message || 'Failed to change password. Check your current password.');
        } finally {
            setIsSavingPassword(false);
        }
    };

    const handleNotificationToggle = (key) => {
        setNotifications(prev => ({ ...prev, [key]: !prev[key] }));
        showSuccessMessage('Notification preference updated!');
    };

    return (
        <div className="max-w-5xl mx-auto px-3 sm:px-5 lg:px-8 py-6 sm:py-8 min-h-screen w-full min-w-0">
            <AnimatePresence>
                {showSuccess && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="fixed bottom-4 sm:bottom-10 left-3 right-3 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-[100] max-w-md sm:max-w-none mx-auto bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-4 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl shadow-2xl flex items-center gap-3 sm:gap-4 border border-white/10 dark:border-gray-100"
                    >
                        <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                            <Check className="w-4 h-4 text-white" />
                        </div>
                        <span className="font-black uppercase tracking-widest text-xs">{showSuccess}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Header */}
            <div className="mb-8 sm:mb-10">
                <div className="flex items-center gap-3 mb-2">
                    <Palette className="w-5 h-5 text-primary" />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">
                        {t('settings.studio')}
                    </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white uppercase italic tracking-tight">
                    {t('settings.title')}
                </h1>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1.5 max-w-md">
                    {t('settings.subtitle')}
                </p>
            </div>

            {/* Sections */}
            <div className="space-y-5 sm:space-y-6">

                {/* Account Section - ALL roles */}
                <section className="bg-white dark:bg-[#1a1f2e] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                    <div className="p-4 sm:p-5 border-b border-gray-50 dark:border-gray-800/50">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                                <User className="w-4.5 h-4.5" />
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">
                                    Account
                                </h3>
                                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">
                                    {getRoleLabel(role)} &middot; Profile Info
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="p-4 sm:p-5">
                        <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-5">
                            <div className="relative group">
                                <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center overflow-hidden border-2 border-primary/20">
                                    {user?.photo ? (
                                        <img src={user.photo} alt={user.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-2xl font-black text-primary">
                                            {(user?.name || 'U').charAt(0).toUpperCase()}
                                        </span>
                                    )}
                                </div>
                                {isEditingProfile && (
                                    <div className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                        <Camera className="w-6 h-6 text-white" />
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 w-full space-y-3">
                                {isEditingProfile ? (
                                    <>
                                        <div>
                                            <label className="block text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Full Name</label>
                                            <input
                                                type="text"
                                                value={profileForm.name}
                                                onChange={(e) => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
                                                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-primary focus:border-primary p-2.5 outline-none font-medium"
                                            />
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Email</label>
                                                <input
                                                    type="email"
                                                    value={profileForm.email}
                                                    onChange={(e) => setProfileForm(prev => ({ ...prev, email: e.target.value }))}
                                                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-primary focus:border-primary p-2.5 outline-none font-medium"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Phone</label>
                                                <input
                                                    type="tel"
                                                    value={profileForm.phone}
                                                    onChange={(e) => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
                                                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-primary focus:border-primary p-2.5 outline-none font-medium"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex gap-2 pt-1">
                                            <button
                                                onClick={handleSaveProfile}
                                                disabled={isSavingProfile}
                                                className="px-4 py-2 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-50"
                                            >
                                                {isSavingProfile ? <ButtonLoader /> : <Save className="w-3.5 h-3.5" />}
                                                Save
                                            </button>
                                            <button
                                                onClick={() => { setIsEditingProfile(false); setProfileForm({ name: user?.name || '', email: user?.email || '', phone: user?.phone || '' }); }}
                                                className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                                Cancel
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="space-y-1.5">
                                            <h4 className="text-base font-black text-gray-900 dark:text-white">{user?.name || 'User'}</h4>
                                            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                                                <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {user?.email}</span>
                                                {user?.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {user?.phone}</span>}
                                            </div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="px-2 py-0.5 bg-primary/10 text-primary text-[9px] font-black uppercase tracking-widest rounded-full">
                                                    {getRoleLabel(role)}
                                                </span>
                                                {user?.isVerified && (
                                                    <span className="px-2 py-0.5 bg-green-500/10 text-green-600 dark:text-green-400 text-[9px] font-black uppercase tracking-widest rounded-full">
                                                        Verified
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setIsEditingProfile(true)}
                                            className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
                                        >
                                            Edit Profile
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </section>

                {/* Password Section - ALL roles */}
                <section className="bg-white dark:bg-[#1a1f2e] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                    <div className="p-4 sm:p-5 border-b border-gray-50 dark:border-gray-800/50">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-red-50 dark:bg-red-500/10 rounded-xl flex items-center justify-center text-red-500">
                                <Shield className="w-4.5 h-4.5" />
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">
                                    Security
                                </h3>
                                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">
                                    Change Password
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="p-4 sm:p-5">
                        {!isChangingPassword ? (
                            <button
                                onClick={() => setIsChangingPassword(true)}
                                className="w-full sm:w-auto px-5 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-[10px] sm:text-xs font-black uppercase tracking-widest rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
                            >
                                <Lock className="w-4 h-4" />
                                Change Password
                            </button>
                        ) : (
                            <div className="space-y-3">
                                {passwordError && (
                                    <p className="text-xs font-semibold text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{passwordError}</p>
                                )}
                                <div>
                                    <label className="block text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1.5">Current Password</label>
                                    <div className="relative">
                                        <input
                                            type={showCurrentPassword ? 'text' : 'password'}
                                            value={passwordForm.currentPassword}
                                            onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                                            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-primary focus:border-primary p-2.5 pr-10 outline-none font-medium"
                                            placeholder="Enter current password"
                                        />
                                        <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                                            {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1.5">New Password</label>
                                    <div className="relative">
                                        <input
                                            type={showNewPassword ? 'text' : 'password'}
                                            value={passwordForm.newPassword}
                                            onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                                            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-primary focus:border-primary p-2.5 pr-10 outline-none font-medium"
                                            placeholder="Enter new password"
                                        />
                                        <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                                            {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1.5">Confirm New Password</label>
                                    <input
                                        type="password"
                                        value={passwordForm.confirmPassword}
                                        onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-primary focus:border-primary p-2.5 outline-none font-medium"
                                        placeholder="Confirm new password"
                                    />
                                </div>
                                <div className="flex gap-2 pt-1">
                                    <button
                                        onClick={handleChangePassword}
                                        disabled={isSavingPassword}
                                        className="px-4 py-2 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-50"
                                    >
                                        {isSavingPassword ? <ButtonLoader /> : <Lock className="w-3.5 h-3.5" />}
                                        Update Password
                                    </button>
                                    <button
                                        onClick={() => { setIsChangingPassword(false); setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' }); setPasswordError(''); }}
                                        className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </section>

                {/* Notifications - ALL roles */}
                <section className="bg-white dark:bg-[#1a1f2e] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                    <div className="p-4 sm:p-5 border-b border-gray-50 dark:border-gray-800/50">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-violet-50 dark:bg-violet-500/10 rounded-xl flex items-center justify-center text-violet-500">
                                <Bell className="w-4.5 h-4.5" />
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">
                                    Notifications
                                </h3>
                                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">
                                    Manage alert preferences
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="p-4 sm:p-5 space-y-1">
                        {[
                            { key: 'emailNotifications', label: 'Email Notifications', desc: 'Receive updates via email' },
                            { key: 'pushNotifications', label: 'Push Notifications', desc: 'Browser push alerts' },
                            { key: 'assignmentAlerts', label: 'Assignment Alerts', desc: 'New assignments & deadlines' },
                            { key: 'gradeAlerts', label: 'Grade Alerts', desc: 'Marks & grade updates' },
                            { key: 'announcementAlerts', label: 'Announcements', desc: 'Institution announcements' },
                        ].map((item) => (
                            <button
                                key={item.key}
                                onClick={() => handleNotificationToggle(item.key)}
                                className="w-full flex items-center justify-between gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                            >
                                <div className="text-left">
                                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{item.label}</p>
                                    <p className="text-[11px] text-gray-400">{item.desc}</p>
                                </div>
                                <div className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-300 flex items-center shrink-0 ${notifications[item.key] ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'}`}>
                                    <motion.div
                                        animate={{ x: notifications[item.key] ? 20 : 0 }}
                                        className="w-5 h-5 bg-white rounded-full shadow"
                                    />
                                </div>
                            </button>
                        ))}
                    </div>
                </section>

                {/* Language - Full Width */}
                <LanguagePicker />

                {/* Appearance + Date/Time Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">

                    {/* Appearance */}
                    <section className="bg-white dark:bg-[#1a1f2e] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                        <div className="p-4 sm:p-5 border-b border-gray-50 dark:border-gray-800/50">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 bg-amber-50 dark:bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-500">
                                    {isDark ? <Moon className="w-4.5 h-4.5" /> : <Sun className="w-4.5 h-4.5" />}
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">
                                        {t('settings.appearance')}
                                    </h3>
                                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">
                                        {t('settings.lightDark')}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 sm:p-5">
                            <button
                                onClick={toggleTheme}
                                className={`w-full min-h-[3rem] rounded-xl border-2 transition-all duration-300 flex items-center justify-between gap-3 px-4 ${
                                    isDark
                                        ? 'bg-gray-800 border-primary/40'
                                        : 'bg-gray-50 border-gray-200'
                                }`}
                            >
                                <span
                                    className={`text-[10px] sm:text-xs font-black uppercase tracking-widest ${
                                        isDark ? 'text-primary' : 'text-gray-500'
                                    }`}
                                >
                                    {isDark ? t('settings.midnightActive') : t('settings.solarActive')}
                                </span>
                                <div
                                    className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-300 flex items-center ${
                                        isDark ? 'bg-primary' : 'bg-gray-300'
                                    }`}
                                >
                                    <motion.div
                                        animate={{ x: isDark ? 20 : 0 }}
                                        className="w-5 h-5 bg-white rounded-full shadow"
                                    />
                                </div>
                            </button>
                        </div>
                    </section>

                    {/* Date & Time */}
                    <section className="bg-white dark:bg-[#1a1f2e] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                        <div className="p-4 sm:p-5 border-b border-gray-50 dark:border-gray-800/50">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 bg-blue-50 dark:bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500">
                                    <Clock className="w-4.5 h-4.5" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">
                                        {t('settings.regional')}
                                    </h3>
                                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">
                                        Date & Time
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 sm:p-5 space-y-3.5">
                            <div>
                                <label className="block text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1.5">
                                    {t('settings.dateFormat')}
                                </label>
                                <select
                                    value={dateFormat}
                                    onChange={(e) => setDateFormat(e.target.value)}
                                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-xs rounded-lg focus:ring-primary focus:border-primary block p-2.5 outline-none font-medium"
                                >
                                    <option value="DD MMM YYYY">12 May 2026</option>
                                    <option value="MM/DD/YYYY">05/12/2026</option>
                                    <option value="DD/MM/YYYY">12/05/2026</option>
                                    <option value="YYYY-MM-DD">2026-05-12</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1.5">
                                    {t('settings.timeFormat')}
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => setTimeFormat('12-hour')}
                                        className={`py-2 px-3 rounded-lg text-[10px] font-bold transition-all ${
                                            timeFormat === '12-hour'
                                                ? 'bg-primary text-white shadow'
                                                : 'bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                                        }`}
                                    >
                                        02:30 PM
                                    </button>
                                    <button
                                        onClick={() => setTimeFormat('24-hour')}
                                        className={`py-2 px-3 rounded-lg text-[10px] font-bold transition-all ${
                                            timeFormat === '24-hour'
                                                ? 'bg-primary text-white shadow'
                                                : 'bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                                        }`}
                                    >
                                        14:30
                                    </button>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>

                {/* Row 2: Themes (full width) */}
                <section className="bg-white dark:bg-[#1a1f2e] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                    <div className="p-4 sm:p-5 border-b border-gray-50 dark:border-gray-800/50">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                                <Paintbrush className="w-4.5 h-4.5" />
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">
                                    {t('settings.vibrantThemes')}
                                </h3>
                                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">
                                    {APP_THEMES.length} Themes Available
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="p-4 sm:p-5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                            {APP_THEMES.map((themeOption) => (
                                <ThemePreviewCard
                                    key={themeOption.id}
                                    theme={themeOption}
                                    isActive={theme === themeOption.id}
                                    onSelect={() => handleThemeChange(themeOption.id)}
                                />
                            ))}
                        </div>
                    </div>
                </section>

                {/* Row 3: Google Drive (only for students/interns) */}
                {(role === 'student' || role === 'intern') && (
                    <section className="bg-white dark:bg-[#1a1f2e] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                        <div className="p-4 sm:p-5 border-b border-gray-50 dark:border-gray-800/50">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500">
                                    <HardDrive className="w-4.5 h-4.5" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">
                                        Google Drive
                                    </h3>
                                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">
                                        Assignment uploads
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 sm:p-5">
                            {driveStatus.connected ? (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800/50">
                                        <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                                            <Check className="w-4 h-4 text-white" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs font-black text-emerald-700 dark:text-emerald-300 uppercase tracking-wide">Connected</p>
                                            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 truncate">{driveStatus.googleEmail}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={async () => {
                                            if (!window.confirm('Google Drive disconnect karne se uploads band ho jayenge. Kya aap continue karna chahte hain?')) return;
                                            setIsDisconnecting(true);
                                            try {
                                                await googleDriveAPI.disconnect();
                                                setDriveStatus(prev => ({ ...prev, connected: false, googleEmail: '' }));
                                            } catch (err) {
                                                console.error('Disconnect failed:', err);
                                            } finally {
                                                setIsDisconnecting(false);
                                            }
                                        }}
                                        disabled={isDisconnecting}
                                        className="w-full py-2.5 px-4 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 border border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400 text-[10px] sm:text-xs font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        <LogOut className="w-4 h-4" />
                                        {isDisconnecting ? 'Disconnecting...' : 'Sign Out'}
                                    </button>
                                    <p className="text-[10px] text-gray-400 font-medium leading-relaxed">
                                        Drive full hai? Sign out karke naya Google account connect kar sakte hain.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {!driveStatus.configured ? (
                                        <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800/50">
                                            <div className="w-8 h-8 rounded-full bg-amber-400 flex items-center justify-center shrink-0">
                                                <HardDrive className="w-4 h-4 text-white" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-black text-amber-700 dark:text-amber-300 uppercase tracking-wide">Not Configured</p>
                                                <p className="text-[11px] text-amber-600 dark:text-amber-400">Administrator ne abhi tak Google Drive setup nahi kiya</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
                                            <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center shrink-0">
                                                <HardDrive className="w-4 h-4 text-white" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-wide">Not Connected</p>
                                                <p className="text-[11px] text-gray-400">Assignment upload ke liye Google Drive connect karein</p>
                                            </div>
                                        </div>
                                    )}
                                    <button
                                        onClick={handleConnectGoogleDrive}
                                        disabled={!driveStatus.configured}
                                        className="w-full py-2.5 px-4 bg-primary hover:bg-orange-600 text-white text-[10px] sm:text-xs font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Connect Google Drive
                                    </button>
                                    {driveError && (
                                        <p className="text-[11px] font-semibold text-red-500 dark:text-red-400">{driveError}</p>
                                    )}
                                </div>
                            )}
                        </div>
                    </section>
                )}

                {/* Quick Links - ALL roles */}
                <section className="bg-white dark:bg-[#1a1f2e] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                    <div className="p-4 sm:p-5 border-b border-gray-50 dark:border-gray-800/50">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-cyan-50 dark:bg-cyan-500/10 rounded-xl flex items-center justify-center text-cyan-500">
                                <Layout className="w-4.5 h-4.5" />
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">
                                    Quick Links
                                </h3>
                                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">
                                    Navigate to your pages
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="p-4 sm:p-5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <button
                                onClick={() => navigate(`/${role}/profile`)}
                                className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-primary/30 hover:bg-primary/5 transition-all text-left"
                            >
                                <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                                    <User className="w-4 h-4 text-primary" />
                                </div>
                                <div>
                                    <p className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wide">My Profile</p>
                                    <p className="text-[10px] text-gray-400">View & edit full profile</p>
                                </div>
                            </button>
                            <button
                                onClick={() => navigate(`/${role}/help-support`)}
                                className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-primary/30 hover:bg-primary/5 transition-all text-left"
                            >
                                <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                                    <Sparkles className="w-4 h-4 text-primary" />
                                </div>
                                <div>
                                    <p className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wide">Help & Support</p>
                                    <p className="text-[10px] text-gray-400">Get help or report issues</p>
                                </div>
                            </button>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default Settings;
