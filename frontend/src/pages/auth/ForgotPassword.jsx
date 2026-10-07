import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle, AlertCircle, RefreshCcw, Pencil } from 'lucide-react';
import { authAPI } from '../../services/api';
import WhatsAppWidget from '../../components/shared/WhatsAppWidget';
import { ButtonLoader } from '../../components/ui/Loader';

const RESEND_COOLDOWN = 60;

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');
    const [cooldown, setCooldown] = useState(0);
    const intervalRef = useRef(null);

    useEffect(() => {
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, []);

    const startCooldown = () => {
        setCooldown(RESEND_COOLDOWN);
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = setInterval(() => {
            setCooldown((c) => {
                if (c <= 1) {
                    clearInterval(intervalRef.current);
                    return 0;
                }
                return c - 1;
            });
        }, 1000);
    };

    const sendResetLink = async (emailToSend) => {
        setLoading(true);
        setError('');
        setSuccess(false);

        try {
            await authAPI.forgotPassword({
                email: emailToSend.toLowerCase().trim(),
            });
            setSuccess(true);
            startCooldown();
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

    const handleSubmit = (e) => {
        e.preventDefault();
        sendResetLink(email);
    };

    const handleResend = () => {
        if (cooldown > 0 || loading) return;
        sendResetLink(email);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#1d2831] to-[#222D38] flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="bg-[#1d2831]/95 border border-white/10 rounded-2xl p-8 shadow-2xl">
                    <Link to="/login" className="inline-flex items-center text-[#FF8E01] hover:text-[#e67e00] transition mb-6 text-sm font-medium">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Login
                    </Link>

                    <div className="flex flex-col items-center mb-8">
                        <div className="w-20 h-20 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20 overflow-hidden mb-4">
                            <img
                                src="/logo.png"
                                alt="Adeeb Technology Lab Logo"
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.nextSibling.style.display = 'block';
                                }}
                            />
                            <AlertCircle className="w-10 h-10 text-[#FF8E01] hidden" />
                        </div>
                        <h2 className="text-white text-2xl font-bold tracking-tight">Adeeb Technology Lab</h2>
                    </div>

                    <h1 className="text-3xl font-bold text-white mb-2">Forgot Password</h1>
                    <p className="text-white/80 mb-6">
                        Enter your email address. We&apos;ll find your account automatically and send a reset link.
                        Check your spam folder too.
                    </p>

                    {success ? (
                        <div className="bg-orange-500/15 border border-orange-500/40 rounded-lg p-4">
                            <div className="flex items-start gap-3">
                                <CheckCircle className="w-5 h-5 text-[#FF8E01] mt-0.5 shrink-0" />
                                <div>
                                    <h3 className="text-white font-semibold">Check your email</h3>
                                    <p className="text-white/80 text-sm mt-1">
                                        If an account exists for <strong>{email}</strong>, you will receive a reset link
                                        within a few minutes. Also check Spam / Promotions.
                                    </p>
                                </div>
                            </div>
                            <div className="mt-4 flex flex-col sm:flex-row gap-2">
                                <button
                                    type="button"
                                    disabled={cooldown > 0 || loading}
                                    onClick={handleResend}
                                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#FF8E01] text-white text-sm font-semibold rounded-lg hover:bg-[#e67e00] transition disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <RefreshCcw className="w-4 h-4" />
                                    {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend link'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSuccess(false);
                                        setEmail('');
                                    }}
                                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white/10 border border-white/20 text-white text-sm font-semibold rounded-lg hover:bg-white/20 transition"
                                >
                                    <Pencil className="w-4 h-4" />
                                    Use a different email
                                </button>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {error && (
                                <div className="bg-red-500/15 border border-red-500/40 rounded-lg p-3 flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                                    <span className="text-red-200 text-sm">{error}</span>
                                </div>
                            )}

                            <div>
                                <label className="block text-white text-sm font-medium mb-2">
                                    Email Address
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full bg-white/10 border border-white/20 rounded-lg py-3 px-10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF8E01] focus:border-transparent transition"
                                        placeholder="Enter your email"
                                        required
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-[#FF8E01] to-[#e67e00] text-white py-3.5 rounded-2xl font-bold shadow-lg shadow-orange-500/30 hover:from-[#e67e00] hover:to-[#FF8E01] hover:shadow-orange-600/40 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ButtonLoader isLoading={loading}>
                                    {loading ? 'Sending...' : 'Send Reset Link'}
                                </ButtonLoader>
                            </button>
                        </form>
                    )}

                    <p className="text-white/70 text-center text-sm mt-6">
                        Remember your password?{' '}
                        <Link to="/login" className="text-[#FF8E01] hover:text-[#e67e00] transition font-medium">
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