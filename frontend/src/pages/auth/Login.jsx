import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, ArrowLeft, GraduationCap } from 'lucide-react';
import { loginStart, loginSuccess, loginFailure, clearError } from '../../features/auth/authSlice';
import { authAPI } from '../../services/api';
import { ButtonLoader } from '../../components/ui/Loader';
import GuestChatWidget from '../../components/shared/GuestChatWidget';
import { useTranslation } from 'react-i18next';

const Login = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { isLoading, error } = useSelector((state) => state.auth);

    const [formData, setFormData] = useState({
        email: '',
        password: '',
        rememberMe: false,
        agreeTerms: true,
    });
    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState({});
    const [navigationMessage] = useState(() => window.history.state?.usr?.message || '');

    useEffect(() => {
        if (!navigationMessage) return;
        const nextHistoryState = { ...(window.history.state || {}) };
        delete nextHistoryState.usr;
        window.history.replaceState(nextHistoryState, '', window.location.href);
    }, [navigationMessage]);

    const validateForm = () => {
        const newErrors = {};
        if (!formData.email) {
            newErrors.email = t('auth.emailRequired');
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = t('auth.emailInvalid');
        }
        if (!formData.password) {
            newErrors.password = t('auth.passwordRequired');
        } else if (formData.password.length < 4) {
            newErrors.password = t('auth.passwordMin');
        }
        if (!formData.agreeTerms) {
            newErrors.agreeTerms = t('auth.termsRequired');
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
        // Clear error when user starts typing
        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: '' }));
        }
        if (error && (name === 'email' || name === 'password')) {
            dispatch(clearError());
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        dispatch(loginStart());

        try {
            // Call real API with role
            const response = await authAPI.login({
                email: formData.email,
                password: formData.password,
                role: formData.role,
                rememberMe: formData.rememberMe
            });

            const { user, token } = response.data;

            // Store user in localStorage for persistence
            // localStorage.setItem('user', JSON.stringify(user));

            dispatch(loginSuccess({ user, token, rememberMe: formData.rememberMe }));

            // Navigate based on role
            const role = user.role;
            if (role === 'admin') navigate('/admin/dashboard');
            else if (role === 'teacher') navigate('/teacher/profile');
            else if (role === 'intern') navigate('/intern/dashboard');
            else if (role === 'job') navigate('/job/tasks');
            else navigate('/student/profile');
        } catch (err) {
            const message = err.response?.data?.message || t('auth.invalidCredentials');
            dispatch(loginFailure(message));
        }
    };

    return (
        <div className="h-screen flex overflow-hidden">
            {/* Left Side - Decorative */}
            <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                className="hidden lg:flex lg:w-1/2 relative overflow-hidden"
            >
                {/* Gradient Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f0f23]">
                    {/* Animated Background Elements */}
                    <div className="absolute top-20 left-20 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-pulse-slow"></div>
                    <div className="absolute bottom-20 right-20 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse-slow delay-300"></div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-pink-500/10 rounded-full blur-3xl animate-float"></div>
                </div>

                {/* Content */}
                <div className="relative z-10 flex flex-col items-center justify-center w-full h-full p-8">
                    {/* Logo & Branding */}
                    {/* Centered Logo Square */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.4, duration: 0.6 }}
                        className="relative flex flex-col items-center justify-center gap-8"
                    >
                        <div className="relative w-56 h-56 group flex-shrink-0">
                            {/* Outer Glow */}
                            <div className="absolute -inset-4 bg-primary/20 rounded-3xl blur-2xl group-hover:bg-primary/30 transition-all duration-500"></div>

                            {/* Square Glass Container */}
                            <div className="absolute inset-0 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-2xl overflow-hidden flex items-center justify-center p-6">
                                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
                                <img
                                    src="/logo.png"
                                    alt="AdeebTechLab Logo"
                                    className="w-full h-full object-contain transform group-hover:scale-105 transition-transform duration-500 relation z-10"
                                    onError={(e) => {
                                        e.target.style.display = 'none';
                                        e.target.nextSibling.style.display = 'block';
                                    }}
                                />
                                <GraduationCap className="w-20 h-20 text-white hidden" />
                            </div>
                        </div>
                    </motion.div>

                    {/* Branding Text - Moved Below Logo */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5, duration: 0.5 }}
                        className="flex flex-col items-center text-center relative z-20"
                    >
                        <h2 className="text-white text-3xl font-bold tracking-tight mb-2">{t('app.name')}</h2>
                        <p className="text-white/60 text-base">{t('app.tagline')}</p>
                    </motion.div>

                    {/* Decorative Lines */}
                    <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-primary/10 to-transparent"></div>
                </div>
            </motion.div>

            {/* Right Side - Login Form */}
            <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                className="w-full lg:w-1/2 flex items-center justify-center p-6 bg-white overflow-y-auto"
            >
                <div className="w-full max-w-md py-4">
                    {/* Header */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="mb-8"
                    >
                        <h1 className="text-4xl font-bold text-gray-900 mb-2">{t('auth.login')}</h1>
                        <p className="text-gray-500">{t('auth.welcomeBack')}</p>
                    </motion.div>

                    {/* Error Message */}
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`mb-4 p-4 ${error.includes('pending') ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-red-50 border-red-300 text-red-600'} border rounded-xl text-sm font-medium`}
                        >
                            {error}
                        </motion.div>
                    )}

                    {/* Success/Pending Message from Registration */}
                    {navigationMessage && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mb-4 p-4 bg-primary/5 border border-primary rounded-xl text-primary text-sm font-medium"
                        >
                            {navigationMessage}
                        </motion.div>
                    )}


                    {/* Login Form */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Email Field */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                        >
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                {t('auth.email')}
                            </label>
                            <div className="relative">
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="john@example.com"
                                    className={`w-full px-4 py-3.5 pl-12 border ${errors.email ? 'border-red-400' : 'border-gray-200'
                                        } rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-gray-50/50`}
                                />
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            </div>
                            {errors.email && (
                                <p className="mt-1 text-sm text-red-500">{errors.email}</p>
                            )}
                        </motion.div>

                        {/* Password Field */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                        >
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                {t('auth.password')}
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    placeholder="••••••••"
                                    className={`w-full px-4 py-3.5 pl-12 pr-12 border ${errors.password ? 'border-red-400' : 'border-gray-200'
                                        } rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-gray-50/50`}
                                />
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    {showPassword ? (
                                        <EyeOff className="w-5 h-5" />
                                    ) : (
                                        <Eye className="w-5 h-5" />
                                    )}
                                </button>
                            </div>
                            {errors.password && (
                                <p className="mt-1 text-sm text-red-500">{errors.password}</p>
                            )}
                        </motion.div>

                        {/* Remember Me & Forgot Password */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.55 }}
                            className="flex items-center justify-between"
                        >
                            <div className="flex items-center">
                                <input
                                    id="remember-me"
                                    name="rememberMe"
                                    type="checkbox"
                                    checked={formData.rememberMe}
                                    onChange={handleChange}
                                    className="h-4 w-4 text-gray-900 focus:ring-gray-500 border-gray-300 rounded cursor-pointer"
                                />
                                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700 cursor-pointer select-none">
                                    {t('auth.rememberMe')}
                                </label>
                            </div>

                            <Link
                                to="/forgot-password"
                                className="text-sm text-gray-600 hover:text-primary underline transition-colors"
                            >
                                {t('auth.forgotPassword')}
                            </Link>
                        </motion.div>

                        {/* Submit Button */}
                        <motion.button
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.6 }}
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-4 bg-gray-900 hover:bg-black text-white font-bold rounded-xl transition-all duration-300 flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed active:scale-95"
                        >
                            <ButtonLoader isLoading={isLoading}>
                                {isLoading ? t('auth.signingIn') : t('auth.login')}
                            </ButtonLoader>
                        </motion.button>

                        <div className="relative flex py-2 items-center">
                            <div className="flex-grow border-t border-gray-200"></div>
                            <span className="flex-shrink-0 mx-4 text-gray-400 text-xs font-bold uppercase tracking-widest">{t('auth.or')}</span>
                            <div className="flex-grow border-t border-gray-200"></div>
                        </div>

                        <Link to="/register">
                            <motion.button
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.7 }}
                                type="button"
                                className="w-full py-4 bg-white text-gray-900 font-bold rounded-xl transition-all duration-300 flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 border-2 border-gray-900 active:scale-95"
                            >
                                <span>{t('auth.createAccount')}</span>
                            </motion.button>
                        </Link>

                        {/* Terms Checkbox */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.65 }}
                            className="flex items-center"
                        >
                            <input
                                type="checkbox"
                                name="agreeTerms"
                                id="agreeTerms"
                                checked={formData.agreeTerms}
                                onChange={handleChange}
                                className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                            />
                            <label htmlFor="agreeTerms" className="ml-2 text-sm text-gray-600 cursor-pointer">
                                I agree to the{' '}
                                <Link to="/terms" className="font-semibold text-gray-900 underline">
                                    Terms & Condition
                                </Link>
                            </label>
                        </motion.div>
                        {errors.agreeTerms && (
                            <p className="text-sm text-red-500">{errors.agreeTerms}</p>
                        )}
                    </form>
                </div>
            </motion.div>
            <GuestChatWidget />
        </div>
    );
};

export default Login;




