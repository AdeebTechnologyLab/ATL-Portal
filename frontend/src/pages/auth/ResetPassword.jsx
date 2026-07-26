import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { logout } from '../../features/auth/authSlice';
import { Lock, ArrowLeft, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { ButtonLoader } from '../../components/ui/Loader';
import { authAPI } from '../../services/api';

const ResetPassword = () => {
    const { token } = useParams();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

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
            // Redirect to login after 3 seconds
            setTimeout(() => {
                window.location.href = '/login';
            }, 2000);
        } catch (err) {
            setError(err.response?.data?.message || 'Invalid or expired reset link. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20">
                    <Link to="/login" className="inline-flex items-center text-blue-300 hover:text-white transition mb-6">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Login
                    </Link>

                    <h1 className="text-3xl font-bold text-white mb-2">Reset Password</h1>
                    <p className="text-gray-300 mb-6">
                        Enter your new password below.
                    </p>

                    {success ? (
                        <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4 flex items-start gap-3">
                            <CheckCircle className="w-5 h-5 text-green-400 mt-0.5" />
                            <div>
                                <h3 className="text-green-400 font-semibold">Password Reset Successful!</h3>
                                <p className="text-green-300 text-sm mt-1">
                                    Your password has been reset successfully. Redirecting to login...
                                </p>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {error && (
                                <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4 text-red-400" />
                                    <span className="text-red-300 text-sm">{error}</span>
                                </div>
                            )}

                            <div>
                                <label className="block text-gray-300 text-sm font-medium mb-2">
                                    New Password
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full bg-white/10 border border-white/20 rounded-lg py-3 px-10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                                        placeholder="Enter new password"
                                        required
                                        minLength={4}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition"
                                    >
                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-gray-300 text-sm font-medium mb-2">
                                    Confirm Password
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full bg-white/10 border border-white/20 rounded-lg py-3 px-10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                                        placeholder="Confirm new password"
                                        required
                                    />
                                </div>
                            </div>

                            <ButtonLoader
                                type="submit"
                                isLoading={loading}
                                className="w-full bg-gradient-to-r from-blue-500 to-primary text-white py-3 rounded-lg font-semibold hover:from-blue-600 hover:to-primary transition flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                Reset Password
                            </ButtonLoader>
                        </form>
                    )}

                    <p className="text-gray-400 text-center text-sm mt-6">
                        Link expired?{' '}
                        <Link to="/forgot-password" className="text-blue-400 hover:text-blue-300 transition">
                            Request a new one
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;
