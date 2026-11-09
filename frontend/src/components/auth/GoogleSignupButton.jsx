import { useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../../services/api';
import { loginSuccess } from '../../features/auth/authSlice';
import { ButtonLoader } from '../ui/Loader';

export const GoogleIcon = ({ className = 'h-5 w-5' }) => (
    <svg className={className} viewBox="0 0 48 48" aria-hidden="true">
        <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303C33.65 32.657 29.223 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
        <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
        <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
        <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44c11.045 0 20-8.955 20-20 0-1.341-.138-2.65-.389-3.917z" />
    </svg>
);

const getProfilePath = (role) => {
    if (role === 'admin') return '/admin/dashboard';
    if (role === 'teacher') return '/teacher/profile';
    if (role === 'job') return '/job/profile';
    if (role === 'intern') return '/intern/profile';
    return '/student/profile';
};

const GoogleSignupButton = ({
    role = 'student',
    termsAccepted = true,
    onRequireTerms,
    onError,
    disabled = false,
    label = 'Sign up with Google',
    helperText = 'Google se sirf name, email aur photo save honge. Baqi details login ke baad profile se add kar sakte hain.'
}) => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    const [googleReady, setGoogleReady] = useState(() => Boolean(window.google?.accounts?.oauth2));
    const [isLoading, setIsLoading] = useState(false);
    const tokenClientRef = useRef(null);
    const onErrorRef = useRef(onError);
    const onRequireTermsRef = useRef(onRequireTerms);

    onErrorRef.current = onError;
    onRequireTermsRef.current = onRequireTerms;

    useEffect(() => {
        if (!googleClientId || googleReady) return undefined;

        const scriptId = 'google-gsi-script';
        const existing = document.getElementById(scriptId);
        const handleLoad = () => setGoogleReady(true);

        if (existing) {
            existing.addEventListener('load', handleLoad);
            return () => existing.removeEventListener('load', handleLoad);
        }

        const script = document.createElement('script');
        script.id = scriptId;
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.addEventListener('load', handleLoad);
        document.head.appendChild(script);
        return () => script.removeEventListener('load', handleLoad);
    }, [googleClientId, googleReady]);

    useEffect(() => {
        if (!googleClientId || !googleReady || !window.google?.accounts?.oauth2) return;

        tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
            client_id: googleClientId,
            scope: 'openid email profile',
            error_callback: (error) => {
                setIsLoading(false);
                onErrorRef.current?.(error?.message || 'Google signup was cancelled.');
            },
            callback: async (tokenResponse) => {
                if (tokenResponse?.error) {
                    setIsLoading(false);
                    onErrorRef.current?.(tokenResponse.error_description || 'Google signup was cancelled.');
                    return;
                }
                if (!tokenResponse?.access_token) {
                    setIsLoading(false);
                    return;
                }

                try {
                    const res = await authAPI.googleRegister({
                        accessToken: tokenResponse.access_token,
                        rememberMe: true,
                        role
                    });
                    const { user, token, isNew } = res.data;
                    dispatch(loginSuccess({ user, token, rememberMe: true }));

                    if (isNew) {
                        navigate(getProfilePath(role), {
                            state: { message: 'Google account created. Please complete your profile.' }
                        });
                    } else {
                        navigate(getProfilePath(user.role));
                    }
                } catch (err) {
                    onErrorRef.current?.(err.response?.data?.message || 'Google signup failed. Please try again.');
                } finally {
                    setIsLoading(false);
                }
            }
        });
    }, [googleClientId, googleReady, dispatch, navigate, role]);

    if (!googleClientId) return null;

    const handleClick = () => {
        if (!termsAccepted) {
            onRequireTermsRef.current?.();
            return;
        }

        if (!tokenClientRef.current) {
            onErrorRef.current?.('Google signup is still loading. Please try again in a moment.');
            return;
        }

        onErrorRef.current?.('');
        setIsLoading(true);
        tokenClientRef.current.requestAccessToken({ prompt: 'select_account' });
    };

    return (
        <div className="mt-6">
            <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-gray-200"></div>
                <span className="flex-shrink-0 mx-4 text-gray-400 text-xs font-bold uppercase tracking-widest">Or</span>
                <div className="flex-grow border-t border-gray-200"></div>
            </div>

            <button
                type="button"
                onClick={handleClick}
                disabled={isLoading || disabled}
                className="w-full py-4 bg-white text-gray-900 font-bold rounded-xl border-2 border-gray-900 transition-all duration-300 flex items-center justify-center gap-2 hover:bg-gray-50 disabled:opacity-70 disabled:cursor-not-allowed active:scale-95"
            >
                {isLoading ? (
                    <ButtonLoader isLoading={isLoading}>Signing up...</ButtonLoader>
                ) : (
                    <>
                        <GoogleIcon className="h-5 w-5" />
                        {label}
                    </>
                )}
            </button>

            {helperText && (
                <p className="mt-2 text-center text-xs text-gray-500">{helperText}</p>
            )}
        </div>
    );
};

export default GoogleSignupButton;
