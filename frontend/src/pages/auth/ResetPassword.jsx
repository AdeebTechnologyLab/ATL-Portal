import { useState, useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { logout } from '../../features/auth/authSlice';
import { Lock, ArrowLeft, ArrowRight, CheckCircle, AlertCircle, Eye, EyeOff, RefreshCcw } from 'lucide-react';
import { ButtonLoader } from '../../components/ui/Loader';
import { authAPI } from '../../services/api';

const getPasswordStrength = (pw) => {
    if (!pw) return 0;
    let score = 0;
    if (pw.length >= 8) score += 1;
    if (pw.length >= 12) score += 1;
    if (/[A-Z]/.test(pw)) score += 1;
    if (/[0-9]/.test(pw)) score += 1;
    if (/[^A-Za-z0-9]/.test(pw)) score += 1;
    return Math.min(score, 4);
};

const STRENGTH_LABELS = ['Too short', 'Weak', 'Fair', 'Good', 'Strong'];
const STRENGTH_COLORS = ['bg-gray-500', 'bg-red-500', 'bg-yellow-500', 'bg-green-500', 'bg-green-600'];

const ResetPassword = () => {
    const { token } = useParams();
    const dispatch = useDispatch();
    const [tokenStatus, setTokenStatus] = useState('loading'); // loading | valid | invalid | error
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    // Auto-redirect is cancellable so the bottom buttons can jump immediately.
    const redirectTimerRef = useRef(null);
    useEffect(() => () => clearTimeout(redirectTimerRef.current), []);

    const goToLogin = () => {
        clearTimeout(redirectTimerRef.current);
        window.location.href = '/login';
    };

    const strength = getPasswordStrength(password);

    useEffect(() => {
        let cancelled = false;
        if (!token) {
            setTokenStatus('invalid');
            return;
        }
        authAPI.checkResetToken(token)
            .then((res) => {
                if (cancelled) return;
                setTokenStatus(res.data.valid ? 'valid' : 'invalid');
            })
            .catch(() => {
                if (cancelled) return;
                setTokenStatus('error');
            });
        return () => { cancelled = true; };
    }, [token]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (password.length < 4) {
            setError('Password must be at least 4 characters');
            return;
        }

        setLoading(true);

        try {
            await authAPI.resetPassword(token, { password });
            setSuccess(true);
            // Clear any existing session before redirecting
            dispatch(logout());
            // Redirect to login after 2 seconds
            redirectTimerRef.current = setTimeout(() => {
                window.location.href = '/login';
            }, 2000);
        } catch (err) {
            const status = err.response?.status;
            if (status === 429) {
                setError(err.response?.data?.message || 'Too many attempts. Please wait and try again.');
            } else {
                setError(err.response?.data?.message || 'Invalid or expired reset link. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    const renderExpired = () => (
        <div className="bg-red-500/15 border border-red-500/40 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
            <div>
                <h3 className="text-white font-semibold">Reset link invalid or expired</h3>
                <p className="text-red-200 text-sm mt-1">
                    This link is no longer valid. Request a new one to continue.
                </p>
                <Link
                    to="/forgot-password"
                    className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-[#FF8E01] hover:bg-[#e67e00] text-white text-sm font-semibold rounded-lg transition"
                >
                    <RefreshCcw className="w-4 h-4" />
                    Request a new link
                </Link>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#1d2831] to-[#222D38] flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="bg-[#1d2831]/95 border border-white/10 rounded-2xl p-8 shadow-2xl">
                    <Link to="/login" className="inline-flex items-center text-[#FF8E01] hover:text-[#e67e00] transition mb-6 text-sm font-medium">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Login
                    </Link>

                    <h1 className="text-3xl font-bold text-white mb-2">Reset Password</h1>
                    <p className="text-white/80 mb-6">
                        Enter your new password below.
                    </p>

                    {tokenStatus === 'loading' && (
                        <div className="py-10 text-center text-white/80">Checking your reset link...</div>
                    )}

                    {(tokenStatus === 'invalid' || tokenStatus === 'error') && renderExpired()}

                    {tokenStatus === 'valid' && (
                        success ? (
                            <div>
                                <div className="bg-orange-500/15 border border-orange-500/40 rounded-lg p-4 flex items-start gap-3">
                                    <CheckCircle className="w-5 h-5 text-[#FF8E01] mt-0.5 shrink-0" />
                                    <div>
                                        <h3 className="text-white font-semibold">Password Reset Successful!</h3>
                                        <p className="text-white/80 text-sm mt-1">
                                            Your password has been reset successfully. Redirecting to login...
                                        </p>
                                    </div>
                                </div>
                                <div className="mt-5 space-y-3">
                                    <button
                                        type="button"
                                        onClick={goToLogin}
                                        className="w-full bg-gradient-to-r from-[#FF8E01] to-[#e67e00] text-white py-3.5 rounded-2xl font-bold shadow-lg shadow-orange-500/30 hover:from-[#e67e00] hover:to-[#FF8E01] hover:shadow-orange-600/40 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2"
                                    >
                                        Go to Login
                                        <ArrowRight className="w-4 h-4" />
                                    </button>
                                    <Link
                                        to="/forgot-password"
                                        className="w-full inline-flex items-center justify-center gap-2 bg-white/10 border border-white/20 text-white py-3 rounded-lg font-semibold hover:bg-white/20 transition"
                                    >
                                        <RefreshCcw className="w-4 h-4" />
                                        Request a new link
                                    </Link>
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                                {error && (
                                    <div className="bg-red-500/15 border border-red-500/40 rounded-lg p-3 flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                                        <span className="text-red-200 text-sm">{error}</span>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-white text-sm font-medium mb-2">
                                        New Password
                                    </label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full bg-white/10 border border-white/20 rounded-lg py-3 px-10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF8E01] focus:border-transparent transition"
                                            placeholder="Enter new password"
                                            required
                                            minLength={4}
                                            maxLength={128}
                                            autoComplete="new-password"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-[#FF8E01] transition"
                                        >
                                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                        </button>
                                    </div>
                                    {password && (
                                        <div className="mt-2">
                                            <div className="flex gap-1.5">
                                                {[1, 2, 3, 4].map((i) => (
                                                    <div
                                                        key={i}
                                                        className={`h-1.5 flex-1 rounded-full transition-colors ${
                                                            i <= strength ? STRENGTH_COLORS[strength] : 'bg-white/15'
                                                        }`}
                                                    />
                                                ))}
                                            </div>
                                            <p className={`text-xs mt-1 ${strength >= 3 ? 'text-green-400' : strength >= 2 ? 'text-yellow-400' : 'text-white/70'}`}>
                                                {STRENGTH_LABELS[strength]}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-white text-sm font-medium mb-2">
                                        Confirm Password
                                    </label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className="w-full bg-white/10 border border-white/20 rounded-lg py-3 px-10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF8E01] focus:border-transparent transition"
                                            placeholder="Confirm new password"
                                            required
                                            minLength={4}
                                            autoComplete="new-password"
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-gradient-to-r from-[#FF8E01] to-[#e67e00] text-white py-3.5 rounded-2xl font-bold text-base shadow-lg shadow-orange-500/30 hover:from-[#e67e00] hover:to-[#FF8E01] hover:shadow-orange-600/40 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none uppercase tracking-wide"
                                >
                                    <ButtonLoader isLoading={loading}>
                                        Reset My Password
                                    </ButtonLoader>
                                </button>
                            </form>
                        )
                    )}
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;