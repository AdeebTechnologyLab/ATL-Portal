import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Cake, Check, Mail } from 'lucide-react';
import { io } from 'socket.io-client';
import api, { emailAPI } from '../../services/api';
import { useSelector } from 'react-redux';
import { showToast } from '../../utils/customToast';
import { getBackendOrigin, getSocketURL } from '../../config/apiBaseUrl';

const SOCKET_URL = getSocketURL();

let wishAudio = null;
let lastWishSoundAt = 0;

// Birthday wish ringtone that ships in /public (throttled so bursts don't stack)
const playWishSound = () => {
    try {
        const now = Date.now();
        if (now - lastWishSoundAt < 1500) return;
        lastWishSoundAt = now;

        if (!wishAudio) {
            wishAudio = new Audio('/burthdaywish.mp3');
            wishAudio.preload = 'auto';
            wishAudio.volume = 0.75;
        }
        wishAudio.currentTime = 0;
        const promise = wishAudio.play();
        if (promise?.catch) promise.catch(() => {});
    } catch {
        /* autoplay may be blocked until the first user gesture */
    }
};

const getPhotoUrl = (p) =>
    p ? (p.startsWith('http') ? p : `${getBackendOrigin()}${p.startsWith('/') ? '' : '/'}${p}`) : '';

const WhatsAppIcon = ({ className }) => (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
);

const buildWishMessage = (person, roleLabel) => {
    const destination = roleLabel || person.role || 'member';
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return [
        `Dear ${person.name} (${destination}),`,
        '',
        'Wishing you a very Happy Birthday! 🎂',
        '',
        'May your special day be filled with joy, and the year ahead bring you success, good health and endless happiness.',
        '',
        'Thank you for being a wonderful part of Adeeb Technology Lab.',
        '',
        'With warm regards,',
        'HR Department',
        'Adeeb Technology Lab',
        '',
        `Portal: ${origin}`,
    ].join('\n');
};

// Pakistan-local numbers (03xx / 3xx) ko international 92... format mein convert karo
const getWhatsAppUrl = (phone, text) => {
    const encoded = encodeURIComponent(text);
    const digits = (phone || '').replace(/\D/g, '');
    let intl = '';
    if (digits.startsWith('92') && digits.length >= 11) intl = digits;
    else if (digits.startsWith('0') && digits.length >= 11) intl = `92${digits.slice(1)}`;
    else if (digits.startsWith('3') && digits.length === 10) intl = `92${digits}`;
    else if (digits.length > 10) intl = digits;
    return intl ? `https://wa.me/${intl}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
};

const getDayLabel = (dob) => {
    if (!dob) return null;
    const d = new Date(dob);
    if (Number.isNaN(d.getTime())) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const bday = new Date(today.getFullYear(), d.getMonth(), d.getDate());
    let diff = Math.round((bday - today) / 86400000);
    if (diff > 180) diff -= 365;
    if (diff < -180) diff += 365;
    return diff === 0 ? 'Today' : null;
};

const PersonAvatar = ({ photo, name }) => {
    const [failed, setFailed] = useState(false);

    if (photo && !failed) {
        return (
            <img
                src={photo}
                alt=""
                className="w-11 h-11 rounded-full object-cover ring-2 ring-white shadow-sm dark:ring-[#141418]"
                onError={() => setFailed(true)}
            />
        );
    }

    return (
        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-orange-500 to-amber-400 flex items-center justify-center text-white font-black text-base ring-2 ring-white shadow-sm dark:ring-[#141418]">
            {name?.charAt(0)?.toUpperCase() || '?'}
        </div>
    );
};

const BirthdayWish = ({ showShareActions = false }) => {
    const { user } = useSelector((state) => state.auth);
    const [birthdays, setBirthdays] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [wishingId, setWishingId] = useState(null);
    const [burstOn, setBurstOn] = useState(false);
    const [emailSendingId, setEmailSendingId] = useState(null);
    const burstTimerRef = useRef(null);
    const lastLocalWishRef = useRef(0);

    const createConfetti = () => {
        const colors = ['#ff8e01', '#222d38', '#ffd700', '#ff4500', '#ffffff', '#ff69b4'];
        const container = document.getElementById('birthday-confetti-container');
        if (!container) return;

        const fall = (container.offsetHeight || 260) + 60;
        for (let i = 0; i < 45; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti-piece';
            confetti.style.left = Math.random() * 100 + '%';
            confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.width = Math.random() * 6 + 4 + 'px';
            confetti.style.height = Math.random() * 6 + 4 + 'px';
            confetti.style.setProperty('--fall', `${fall}px`);
            confetti.style.animationDelay = Math.random() * 0.8 + 's';
            confetti.style.animationDuration = Math.random() * 1.2 + 1.4 + 's';
            container.appendChild(confetti);
            setTimeout(() => confetti.remove(), 4000);
        }
    };

    const celebrate = () => {
        setBurstOn(false);
        requestAnimationFrame(() => setBurstOn(true));
        createConfetti();
        playWishSound();
        if (burstTimerRef.current) clearTimeout(burstTimerRef.current);
        burstTimerRef.current = setTimeout(() => setBurstOn(false), 1200);
    };

    const fetchBirthdays = async () => {
        try {
            const res = await api.get('/users/birthdays');
            if (res.data.success) setBirthdays(res.data.data);
        } catch (error) {
            console.error('Error fetching birthdays:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchBirthdays();
        try {
            // Preload so the first wish plays instantly
            wishAudio = new Audio('/burthdaywish.mp3');
            wishAudio.preload = 'auto';
            wishAudio.volume = 0.75;
        } catch { /* ignore */ }
    }, []);

    // Real-time: everyone sees confetti + hears sound when anyone sends a wish
    useEffect(() => {
        const socket = io(SOCKET_URL, { withCredentials: true });
        socket.on('birthday_wish_sent', () => {
            if (Date.now() - lastLocalWishRef.current > 2500) celebrate();
            fetchBirthdays();
        });
        return () => {
            socket.disconnect();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (birthdays.length === 0) return;
        const timer = setTimeout(createConfetti, 600);
        return () => clearTimeout(timer);
    }, [birthdays.length]);

    useEffect(() => () => {
        if (burstTimerRef.current) clearTimeout(burstTimerRef.current);
    }, []);

    const handleWish = async (id, hasWished) => {
        if (hasWished) return;
        try {
            setWishingId(id);
            const res = await api.post(`/users/${id}/wish`);
            if (res.data.success) {
                lastLocalWishRef.current = Date.now();
                celebrate();
                fetchBirthdays();
            }
        } catch (error) {
            console.error('Error sending wish:', error);
        } finally {
            setWishingId(null);
        }
    };

    const handleShareEmail = async (person, roleLabel) => {
        if (emailSendingId) return;
        const subject = `Happy Birthday, ${person.name}! 🎂`;
        try {
            setEmailSendingId(person._id);
            await emailAPI.send({
                to: person.email,
                subject,
                heading: subject,
                message: buildWishMessage(person, roleLabel),
            });
            showToast.success('Birthday Email Sent', `Email sent successfully to ${person.email}.`);
        } catch (error) {
            console.error('Birthday email failed:', error);
            showToast.error(
                'Email Failed',
                error.response?.data?.message || 'Email could not be sent. Please try again.'
            );
        } finally {
            setEmailSendingId(null);
        }
    };

    if (isLoading || birthdays.length === 0) return null;

    return (
        <motion.div
            id="birthday-confetti-container"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative"
        >
            <style>{`
                .confetti-piece {
                    position: absolute;
                    top: -10px;
                    z-index: 50;
                    opacity: 0.85;
                    pointer-events: none;
                    border-radius: 2px;
                    animation: fall linear forwards;
                }
                @keyframes fall {
                    to { transform: translateY(var(--fall, 260px)) rotate(720deg); opacity: 0; }
                }
                .bday-burst {
                    animation: bday-burst 1.1s ease-out;
                }
                @keyframes bday-burst {
                    0% { box-shadow: 0 0 0 0 rgba(251, 146, 60, 0.55); }
                    30% { box-shadow: 0 0 0 6px rgba(251, 146, 60, 0.35); }
                    100% { box-shadow: 0 0 0 18px rgba(251, 146, 60, 0); }
                }
            `}</style>

            <div className="relative overflow-hidden rounded-2xl border border-orange-200/70 bg-white shadow-sm dark:border-orange-500/20 dark:bg-[#141418]">
                {/* Header strip */}
                <div className="relative overflow-hidden bg-gradient-to-r from-orange-500 via-amber-500 to-rose-500 px-3.5 py-3 sm:px-4">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(255,255,255,0.28),transparent_55%)]" />
                    <span className="pointer-events-none absolute -right-2 -top-3 select-none text-5xl opacity-20">🎂</span>

                    <div className="relative flex items-center gap-2.5">
                        <div className="w-9 h-9 shrink-0 rounded-xl bg-white/25 backdrop-blur flex items-center justify-center ring-1 ring-white/30">
                            <Cake className="w-[18px] h-[18px] text-white" strokeWidth={2.5} />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-white font-black text-sm sm:text-base leading-tight drop-shadow-sm">
                                Happy Birthday! 🎂
                            </p>
                            <p className="text-white/85 text-[11px] leading-snug mt-0.5">
                                Wishing them joy, success &amp; happiness ✨
                            </p>
                        </div>
                        <span className="shrink-0 rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white ring-1 ring-white/30 backdrop-blur">
                            {birthdays.length} {birthdays.length === 1 ? 'person' : 'people'}
                        </span>
                    </div>
                </div>

                {/* People */}
                <div className="p-3 sm:p-4">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {birthdays.map((person) => {
                            const currentYear = new Date().getFullYear();
                            const hasWished = person.birthdayWishes?.some(
                                (w) =>
                                    (w.from?._id || w.from) === (user?.id || user?._id) &&
                                    w.year === currentYear
                            );
                            const wishCount =
                                person.birthdayWishes?.filter((w) => w.year === currentYear).length || 0;
                            const roleLabel = (person.roles ? person.roles.join(' / ') : person.role || '')
                                .replace(/^\w/, (c) => c.toUpperCase());
                            const dayLabel = getDayLabel(person.dob);
                            const photo = getPhotoUrl(person.photo);
                            const sending = wishingId === person._id;
                            const canWish = !hasWished && !sending;

                            return (
                                <motion.div
                                    key={person._id}
                                    layout
                                    whileHover={canWish ? { y: -2 } : undefined}
                                    whileTap={canWish ? { scale: 0.985 } : undefined}
                                    onClick={canWish ? () => handleWish(person._id, hasWished) : undefined}
                                    onKeyDown={canWish ? (e) => {
                                        if (e.target !== e.currentTarget) return;
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            handleWish(person._id, hasWished);
                                        }
                                    } : undefined}
                                    role={canWish ? 'button' : undefined}
                                    tabIndex={canWish ? 0 : undefined}
                                    aria-label={hasWished ? `You wished ${person.name} this year` : `Send birthday wish to ${person.name}`}
                                    title={hasWished ? 'You already wished 🎉' : 'Click to send a birthday wish 🎉'}
                                    className={`group flex items-center gap-3 rounded-xl border p-3 transition-all ${burstOn ? 'bday-burst' : ''} ${
                                        hasWished
                                            ? 'cursor-default border-emerald-200 bg-emerald-50/70 dark:border-emerald-500/25 dark:bg-emerald-500/[0.07]'
                                            : 'cursor-pointer border-gray-100 bg-gray-50 hover:border-orange-300 hover:bg-orange-50/70 hover:shadow-md hover:shadow-orange-500/10 focus:outline-none focus:ring-2 focus:ring-orange-400/50 dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-orange-500/30 dark:hover:bg-orange-500/[0.07]'
                                    }`}
                                >
                                    {/* Avatar */}
                                    <div className="relative shrink-0">
                                        <PersonAvatar photo={photo} name={person.name} />
                                        <span className="absolute -bottom-0.5 -right-0.5 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-white text-xs leading-none shadow ring-1 ring-gray-100 dark:bg-[#141418] dark:ring-white/10">
                                            🎂
                                        </span>
                                    </div>

                                    {/* Info */}
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-1.5">
                                            <p className="truncate text-[13px] font-black text-gray-900 dark:text-white">
                                                {person.name}
                                            </p>
                                            {dayLabel && (
                                                <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-orange-100 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-orange-600 dark:bg-orange-500/15 dark:text-orange-400">
                                                    <Cake className="w-2.5 h-2.5" />
                                                    {dayLabel}
                                                </span>
                                            )}
                                        </div>
                                        <div className="mt-1 flex items-center gap-2">
                                            <span className="rounded bg-gray-200 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-gray-600 dark:bg-white/10 dark:text-gray-300">
                                                {roleLabel}
                                            </span>
                                            <span
                                                className={`inline-flex items-center gap-1 text-[11px] font-black ${
                                                    hasWished
                                                        ? 'text-emerald-600 dark:text-emerald-400'
                                                        : 'text-gray-500 dark:text-gray-400'
                                                } ${sending ? 'animate-pulse' : ''}`}
                                                title={hasWished ? 'You already wished 🎉' : 'Click card to send a wish 🎉'}
                                            >
                                                🎉 {wishCount}
                                                {hasWished && <Check className="w-3 h-3" strokeWidth={3} />}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Share actions (admin panel only) */}
                                    {showShareActions && (() => {
                                        const sendingEmail = emailSendingId === person._id;
                                        return (
                                            <div
                                                className="flex shrink-0 items-center gap-1.5 self-stretch pl-2 border-l border-gray-200 dark:border-white/10"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <a
                                                    href={getWhatsAppUrl(person.phone, buildWishMessage(person, roleLabel))}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    aria-label={`Send WhatsApp wish to ${person.name}`}
                                                    title="Send wish on WhatsApp"
                                                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200 transition-all hover:bg-emerald-500 hover:text-white hover:shadow-md hover:shadow-emerald-500/30 active:scale-95 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/25"
                                                >
                                                    <WhatsAppIcon className="w-4 h-4" />
                                                </a>
                                                <button
                                                    type="button"
                                                    onClick={() => handleShareEmail(person, roleLabel)}
                                                    disabled={sendingEmail}
                                                    aria-label={`Send email wish to ${person.name}`}
                                                    title="Send birthday email"
                                                    className={`flex h-8 w-8 items-center justify-center rounded-lg ring-1 transition-all active:scale-95 ${
                                                        sendingEmail
                                                            ? 'cursor-wait bg-sky-50 text-sky-500 ring-sky-200 dark:bg-sky-500/10 dark:ring-sky-500/25'
                                                            : 'bg-sky-50 text-sky-600 ring-sky-200 hover:bg-sky-500 hover:text-white hover:shadow-md hover:shadow-sky-500/30 dark:bg-sky-500/10 dark:text-sky-400 dark:ring-sky-500/25'
                                                    }`}
                                                >
                                                    {sendingEmail ? (
                                                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                                    ) : (
                                                        <Mail className="w-4 h-4" />
                                                    )}
                                                </button>
                                            </div>
                                        );
                                    })()}
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default BirthdayWish;
