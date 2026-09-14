import { useState, useRef, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Search, X, UserMinus } from 'lucide-react';
import { loginSuccess } from '../../features/auth/authSlice';
import { userAPI, authAPI } from '../../services/api';
import ProfileAvatar from '../ui/ProfileAvatar';

const ViewAsBar = ({ restoreOnly = false }) => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { role } = useSelector(state => state.auth);
    const isAdmin = role === 'admin';

    const [isImpersonating, setIsImpersonating] = useState(() => !!sessionStorage.getItem('adminBeforeImpersonate'));
    const [showSearch, setShowSearch] = useState(false);
    const [query, setQuery] = useState('');
    const [selectedRole, setSelectedRole] = useState('teacher');
    const [results, setResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [switching, setSwitching] = useState('');
    const timerRef = useRef(null);

    const searchUsers = useCallback((q, roleOverride = selectedRole) => {
        setQuery(q);
        if (timerRef.current) clearTimeout(timerRef.current);
        if (!q.trim()) { setResults([]); return; }
        timerRef.current = setTimeout(async () => {
            setSearching(true);
            try {
                const res = await userAPI.search(q.trim(), roleOverride);
                setResults(res.data.data || []);
            } catch {
                setResults([]);
            } finally {
                setSearching(false);
            }
        }, 300);
    }, [selectedRole]);

    const handleViewAs = async (targetUser) => {
        setSwitching(targetUser._id);
        try {
            const rememberMe = localStorage.getItem('rememberMe') === 'true';
            const storage = rememberMe ? localStorage : sessionStorage;
            const adminUser = storage.getItem('user');
            const adminToken = storage.getItem('token');
            const adminLoginTime = storage.getItem('loginTime');

            sessionStorage.setItem('adminBeforeImpersonate', JSON.stringify({
                user: adminUser,
                token: adminToken,
                loginTime: adminLoginTime,
                rememberMe: rememberMe ? 'true' : 'false'
            }));

            const res = await authAPI.adminImpersonate(targetUser._id);
            if (res.data.success) {
                dispatch(loginSuccess({
                    user: res.data.user,
                    token: res.data.token,
                    rememberMe: false
                }));
                setIsImpersonating(true);
                setShowSearch(false);
                setQuery('');
                setResults([]);
                navigate(0);
            }
        } catch (err) {
            alert(err.response?.data?.message || 'View As failed.');
        } finally {
            setSwitching('');
        }
    };

    const handleRestore = () => {
        const adminData = JSON.parse(sessionStorage.getItem('adminBeforeImpersonate'));
        if (!adminData) return;
        sessionStorage.removeItem('adminBeforeImpersonate');

        dispatch(loginSuccess({
            user: JSON.parse(adminData.user),
            token: adminData.token,
            rememberMe: adminData.rememberMe === 'true'
        }));
        setIsImpersonating(false);
        navigate(0);
    };

    if ((!isAdmin && !isImpersonating) || (restoreOnly && !isImpersonating)) return null;

    return (
        <div className="mb-4">
            {isImpersonating ? (
                <div className="flex items-center gap-3 rounded-xl bg-amber-500/10 border border-amber-500/30 px-4 py-2.5">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                        <span className="text-sm font-bold text-amber-600 truncate">Viewing as another user</span>
                    </div>
                    <button onClick={handleRestore} className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-black text-white hover:bg-amber-600 transition-colors shrink-0">
                        <UserMinus className="h-3.5 w-3.5" />
                        Back to Admin
                    </button>
                </div>
            ) : (
                <div className="relative">
                    {!showSearch ? (
                        <button onClick={() => { setShowSearch(true); setQuery(''); setResults([]); setSelectedRole('teacher'); }} className="flex items-center gap-2 rounded-xl border border-dashed border-blue-300 bg-blue-50/50 px-4 py-2.5 text-sm font-bold text-blue-600 hover:bg-blue-50 dark:border-blue-500/30 dark:bg-blue-500/5 dark:text-blue-400 transition-colors">
                            <Search className="h-4 w-4" />
                            View as Teacher...
                        </button>
                    ) : (
                        <div className="rounded-xl border border-blue-200 bg-white p-3 shadow-lg dark:border-blue-500/30 dark:bg-gray-900">
                            <div className="flex items-center gap-2">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                    <input autoFocus value={query} onChange={e => searchUsers(e.target.value)} placeholder="Roll number, name ya email likhein..." className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm font-semibold outline-none focus:border-blue-500 dark:border-white/10 dark:bg-black/20 dark:text-white" />
                                </div>
                                <button onClick={() => { setShowSearch(false); setQuery(''); setResults([]); }} className="rounded-lg p-2.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10">
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                            <div className="mt-2 max-h-48 overflow-y-auto">
                                {searching && <p className="py-3 text-center text-xs text-gray-400">Searching...</p>}
                                {!searching && query && results.length === 0 && (
                                    <p className="py-3 text-center text-xs text-gray-400">Koi user nahi mila.</p>
                                )}
                                {results.map(u => (
                                    <button key={u._id} onClick={() => handleViewAs(u)} disabled={switching === u._id} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-blue-50 dark:hover:bg-blue-500/10 disabled:opacity-50">
                                        <ProfileAvatar src={u.photo} name={u.name || 'User'} size="sm" border="border border-primary/30" />
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-bold text-gray-900 dark:text-white">{u.name}</p>
                                            <p className="truncate text-xs text-gray-400">#{u.rollNo || '?'} · {u.role}</p>
                                        </div>
                                        {switching === u._id ? (
                                            <span className="text-xs text-blue-600">Switching...</span>
                                        ) : (
                                            <span className="text-xs text-gray-400">View</span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ViewAsBar;
