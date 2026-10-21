import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { io } from 'socket.io-client';
import { Brain, BookOpen, Check, Swords, X } from 'lucide-react';
import { quizGameAPI } from '../../services/api';
import { getSocketURL } from '../../config/apiBaseUrl';

// Chhota sa challenge sound (Web Audio se, koi audio file nahi chahiye)
const playChallengeSound = () => {
    try {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return;
        const ctx = new Ctx();
        const note = (freq, start, dur, vol = 0.22) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.0001, ctx.currentTime + start);
            gain.gain.exponentialRampToValueAtTime(vol, ctx.currentTime + start + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + dur);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(ctx.currentTime + start);
            osc.stop(ctx.currentTime + start + dur + 0.05);
        };
        note(880, 0, 0.16);        // A5
        note(1108.73, 0.1, 0.18);  // C#6
        note(1318.51, 0.2, 0.4);   // E6
        setTimeout(() => ctx.close(), 1400);
    } catch { /* audio unavailable */ }
};

// Global Quiz Battle challenge notification — har screen par dikhega
// (dashboard par na ruk kar). Jab tak host "Waiting for opponent…" mein
// wait karta rahega, tab tak open challenge ka toast dikhta rahega.
const QuizChallengeNotification = () => {
    const navigate = useNavigate();
    const { role, user } = useSelector((state) => state.auth);
    const toastsRef = useRef({});
    const myId = user?.id || user?._id || '';
    const ready = Boolean(myId && role);

    const dismissRoom = (gameId) => {
        const toastId = toastsRef.current[gameId];
        if (toastId) {
            toast.dismiss(toastId);
            delete toastsRef.current[gameId];
        }
    };

    const showToast = (gameId, hostName, testTitle) => {
        if (!gameId || toastsRef.current[gameId]) return;
        playChallengeSound();
        const toastId = toast(
            () => (
                <div className="w-full select-none overflow-hidden rounded-2xl border border-violet-200/70 bg-white shadow-2xl shadow-violet-600/25 dark:border-violet-500/25 dark:bg-[#1a1825]">
                    {/* Top gradient strip */}
                    <div className="h-1 w-full bg-gradient-to-r from-violet-500 via-indigo-500 to-fuchsia-500" />

                    <div className="flex items-start gap-3 p-4">
                        {/* Pulsing icon */}
                        <div className="relative shrink-0">
                            <span className="absolute -inset-1 animate-ping rounded-full bg-violet-500/40" />
                            <div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-500/40">
                                <Swords className="h-5 w-5 text-white" />
                            </div>
                        </div>

                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                                <span className="text-[9px] font-black uppercase tracking-[0.18em] text-violet-500 dark:text-violet-400">
                                    Live Challenge
                                </span>
                            </div>
                            <p className="mt-0.5 text-[15px] font-black leading-tight text-gray-900 dark:text-white">
                                Quiz Battle Challenge!
                            </p>
                            <p className="mt-1 text-[11.5px] font-semibold leading-snug text-gray-500 dark:text-gray-400">
                                <span className="font-black text-gray-800 dark:text-gray-100">{hostName}</span> ne aapko challenge kiya hai — kya aap challenge accept karte hain?
                            </p>
                            {testTitle && (
                                <span className="mt-2 inline-flex max-w-full items-center gap-1 truncate rounded-lg bg-violet-500/10 px-2 py-1 text-[10px] font-black text-violet-600 dark:bg-violet-500/15 dark:text-violet-300">
                                    <BookOpen className="h-3 w-3 shrink-0" />
                                    {testTitle}
                                </span>
                            )}
                        </div>

                        {/* Dismiss */}
                        <button
                            onClick={() => dismissRoom(gameId)}
                            className="shrink-0 rounded-lg p-1 text-gray-300 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:text-gray-600 dark:hover:bg-white/10 dark:hover:text-gray-300"
                            aria-label="Dismiss"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 border-t border-gray-100 px-4 py-3 dark:border-white/10">
                        <button
                            onClick={() => {
                                dismissRoom(gameId);
                                navigate(`/${role}/quiz-game`, { state: { gameId } });
                            }}
                            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-violet-500/30 transition-transform hover:scale-[1.02] active:scale-95"
                        >
                            <Check className="h-3.5 w-3.5" /> Accept
                        </button>
                        <button
                            onClick={() => dismissRoom(gameId)}
                            className="flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-gray-500 transition-colors hover:bg-gray-50 dark:border-white/10 dark:text-gray-400 dark:hover:bg-white/5"
                        >
                            <Brain className="h-3.5 w-3.5" /> Later
                        </button>
                    </div>
                </div>
            ),
            {
                duration: Infinity,
                id: `quiz-challenge-${gameId}`,
                style: { maxWidth: '420px', width: '100%', padding: 0, background: 'transparent' }
            }
        );
        toastsRef.current[gameId] = toastId;
    };

    const dismissAll = () => Object.keys(toastsRef.current).forEach(id => dismissRoom(id));

    // Socket one-shot event: game create hote hi foran dikhe
    useEffect(() => {
        if (!ready) return;
        const socket = io(getSocketURL(), { withCredentials: true });
        const joinPersonalRoom = () => {
            if (myId) socket.emit('join_chat', String(myId));
        };
        joinPersonalRoom();
        socket.on('connect', joinPersonalRoom);
        socket.on('quiz_challenge', ({ gameId, hostName, testTitle }) => {
            showToast(gameId, hostName, testTitle);
        });
        socket.on('quiz_challenge_closed', ({ gameId }) => {
            dismissRoom(gameId);
        });
        return () => {
            socket.disconnect();
            dismissAll();
        };
    }, [myId, role]);

    // Poll open rooms — jab tak room open (host waiting) hai, toast dikhta rahe
    useEffect(() => {
        if (!ready) return;
        let cancelled = false;
        let polling = false;
        const poll = async () => {
            if (polling || cancelled || document.hidden || !navigator.onLine) return;
            polling = true;
            try {
                const res = await quizGameAPI.getOpen();
                if (cancelled) return;
                const rooms = res.data.data || [];
                const visible = {};
                rooms.forEach(r => {
                    visible[r._id] = true;
                    if (!toastsRef.current[r._id]) showToast(r._id, r.host?.name || 'Koi', r.testTitle);
                });
                Object.keys(toastsRef.current).forEach(id => {
                    if (!visible[id]) dismissRoom(id);
                });
            } catch { /* ignore */ }
            finally { polling = false; }
        };
        poll();
        const interval = setInterval(poll, 30000);
        window.addEventListener('online', poll);
        document.addEventListener('visibilitychange', poll);
        return () => {
            cancelled = true;
            clearInterval(interval);
            window.removeEventListener('online', poll);
            document.removeEventListener('visibilitychange', poll);
            dismissAll();
        };
    }, [myId, role]);

    return null;
};

export default QuizChallengeNotification;
