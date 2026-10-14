import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { AlertTriangle } from 'lucide-react';
import Modal from '../ui/Modal';
import { authAPI } from '../../services/api';
import {
    getMissingInternProfileFields,
    INCOMPLETE_PROFILE_DISMISS_KEY,
} from '../../utils/profileCompleteness';

const AUTH_FREE_PREFIXES = ['/login', '/register', '/forgot-password', '/reset-password'];

// Shown right after an intern logs in whenever their profile is missing the
// required bio, requirements or skills. Mounted at app level so it survives the
// login page unmounting on successful authentication.
const IncompleteProfileReminder = () => {
    const { isAuthenticated, role } = useSelector((state) => state.auth);
    const navigate = useNavigate();
    const location = useLocation();
    const [missingFields, setMissingFields] = useState([]);

    const path = location.pathname;
    const onProfilePage = path === '/intern/profile';
    const onAuthFreePage = AUTH_FREE_PREFIXES.some((prefix) => path.startsWith(prefix));

    useEffect(() => {
        let cancelled = false;

        const check = async () => {
            if (!isAuthenticated || role !== 'intern' || onAuthFreePage) {
                setMissingFields([]);
                return;
            }
            if (sessionStorage.getItem(INCOMPLETE_PROFILE_DISMISS_KEY) === 'true') return;
            if (onProfilePage) return;

            try {
                const res = await authAPI.getMe();
                if (cancelled) return;
                setMissingFields(getMissingInternProfileFields(res.data?.user));
            } catch (error) {
                if (!cancelled) console.error('Incomplete profile check failed:', error);
            }
        };

        check();
        return () => {
            cancelled = true;
        };
    }, [isAuthenticated, role, onAuthFreePage, onProfilePage]);

    const dismiss = () => {
        sessionStorage.setItem(INCOMPLETE_PROFILE_DISMISS_KEY, 'true');
        setMissingFields([]);
    };

    const handleCompleteNow = () => {
        dismiss();
        navigate('/intern/profile');
    };

    const isOpen = isAuthenticated
        && role === 'intern'
        && !onAuthFreePage
        && !onProfilePage
        && missingFields.length > 0;

    return (
        <Modal
            isOpen={isOpen}
            onClose={dismiss}
            title="Profile Incomplete"
            size="sm"
            centerOnMobile
            zIndex={2000}
        >
            <div className="space-y-4">
                <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                        <AlertTriangle className="w-6 h-6 text-amber-500" />
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                            Aapki profile mukammal nahi hai. Baraye meharbani ye maloomat complete karein.
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Your intern profile is incomplete. Please complete the following.
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2">
                    {missingFields.map((field) => (
                        <span
                            key={field}
                            className="px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-semibold border border-amber-200 dark:border-amber-500/30"
                        >
                            {field}
                        </span>
                    ))}
                </div>

                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                    <button
                        type="button"
                        onClick={handleCompleteNow}
                        className="flex-1 py-3 px-4 rounded-xl bg-primary hover:bg-primary-dark text-white font-semibold text-sm transition-colors"
                    >
                        Complete Profile Now
                    </button>
                    <button
                        type="button"
                        onClick={dismiss}
                        className="flex-1 py-3 px-4 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200 font-semibold text-sm transition-colors"
                    >
                        Maybe Later
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default IncompleteProfileReminder;
