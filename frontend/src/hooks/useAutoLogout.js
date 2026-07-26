import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { logout, setUser } from '../features/auth/authSlice';
import { authAPI } from '../services/api';

const TWO_HOURS = 2 * 60 * 60 * 1000; // 2 hours in milliseconds

const useAutoLogout = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { isAuthenticated } = useSelector((state) => state.auth);

    useEffect(() => {
        if (!isAuthenticated) return;

        let timeoutId;
        let cancelled = false;

        const expireSession = () => {
            dispatch(logout());
            navigate('/login', {
                state: { message: 'Your session has expired after 2 hours. Please login again.' }
            });
        };

        const checkSession = async () => {
            // Check if "Remember Me" was selected - if so, skip auto-logout
            const rememberMeLocal = localStorage.getItem('rememberMe');
            try {
                const response = await authAPI.getMe();
                if (!cancelled && response.data?.user) {
                    dispatch(setUser(response.data.user));
                }
            } catch {
                // The API interceptor clears an invalid session and redirects.
                return;
            }

            if (rememberMeLocal !== 'true') {
                const loginTime = Number(sessionStorage.getItem('loginTime') || localStorage.getItem('loginTime'));
                if (!loginTime) {
                    expireSession();
                    return;
                }

                const remaining = TWO_HOURS - (Date.now() - loginTime);
                if (remaining <= 0) {
                    expireSession();
                    return;
                }

                timeoutId = window.setTimeout(expireSession, remaining);
            }
        };

        // Check immediately
        checkSession();

        return () => {
            cancelled = true;
            if (timeoutId) window.clearTimeout(timeoutId);
        };
    }, [isAuthenticated, dispatch, navigate]);
};

export default useAutoLogout;

