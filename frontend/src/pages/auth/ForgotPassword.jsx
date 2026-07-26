import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { authAPI } from '../../services/api';
import WhatsAppWidget from '../../components/shared/WhatsAppWidget';
import { ButtonLoader } from '../../components/ui/Loader';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess(false);

        try {
            await authAPI.forgotPassword({
                email: email.toLowerCase().trim(),
            });
            setSuccess(true);
        } catch (err) {
            const serverMessage = err.response?.data?.message;
            const isNetworkFailure =
                !err.response &&
                (err.code === 'ERR_NETWORK' ||
                    err.code === 'ECONNABORTED' ||
                    err.message === 'Network Error' ||
                    /timeout/i.test(err.message || ''));

            setError(
                serverMessage ||
                    (isNetworkFailure
                        ? 'Request timed out or server is unavailable. Wait 30 seconds and try again. If it persists, contact admin.'
                        : err.message) ||
                    'Could not send reset email. Please try again or contact support.'
            );
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

                    <div className="flex flex-col items-center mb-8">
                        <div className="w-20 h-20 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 overflow-hidden mb-4">
                            <img
                                src="/logo.png"
                                alt="Adeeb Technology Lab Logo"
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.nextSibling.style.display = 'block';
                                }}
                            />
                            <AlertCircle className="w-10 h-10 text-white hidden" />
                        </div>
                        <h2 className="text-white text-2xl font-bold tracking-tight">Adeeb Technology Lab</h2>
                    </div>

                    <h1 className="text-3xl font-bold text-white mb-2">Forgot Password</h1>
                    <p className="text-gray-300 mb-6">
                        Enter your email address. We'll find your account automatically and send a reset link.
                        Check your spam folder too.
                    </p>

                    {success ? (
                        <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4 flex items-start gap-3">
                            <CheckCircle className="w-5 h-5 text-green-400 mt-0.5" />
                            <div>
                                <h3 className="text-green-400 font-semibold">Check your email</h3>
                                <p className="text-green-300 text-sm mt-1">
                                    If an account exists for <strong>{email}</strong>, you will receive a reset link
                                    within a few minutes. Also check Spam / Promotions.
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
                                    Email Address
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full bg-white/10 border border-white/20 rounded-lg py-3 px-10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                                        placeholder="Enter your email"
                                        required
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-blue-500 to-primary text-white py-3 rounded-lg font-semibold hover:from-blue-600 hover:to-primary transition flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                <ButtonLoader isLoading={loading}>
                                    {loading ? 'Sending...' : 'Send Reset Link'}
                                </ButtonLoader>
                            </button>
                        </form>
                    )}

                    <p className="text-gray-400 text-center text-sm mt-6">
                        Remember your password?{' '}
                        <Link to="/login" className="text-blue-400 hover:text-blue-300 transition">
                            Sign in
                        </Link>
                    </p>
                </div>
            </div>
            <WhatsAppWidget />
        </div>
    );
};

export default ForgotPassword;




