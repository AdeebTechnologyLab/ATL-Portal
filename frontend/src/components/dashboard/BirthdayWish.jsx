import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Cake, Heart, Gift, PartyPopper } from 'lucide-react';
import api from '../../services/api';
import { useSelector } from 'react-redux';

const BirthdayWish = () => {
    const { user } = useSelector((state) => state.auth);
    const [birthdays, setBirthdays] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [wishingId, setWishingId] = useState(null);

    useEffect(() => {
        fetchBirthdays();

        const timer = setTimeout(() => {
            if (birthdays.length > 0) createConfetti();
        }, 1000);

        return () => clearTimeout(timer);
    }, [birthdays.length]);

    const createConfetti = () => {
        const colors = ['#ff8e01', '#222d38', '#ffd700', '#ff4500', '#ffffff'];
        const container = document.getElementById('birthday-confetti-container');
        if (!container) return;

        for (let i = 0; i < 24; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti-piece';
            confetti.style.left = Math.random() * 100 + '%';
            confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.width = Math.random() * 6 + 4 + 'px';
            confetti.style.height = Math.random() * 6 + 4 + 'px';
            confetti.style.animationDelay = Math.random() * 2 + 's';
            confetti.style.animationDuration = Math.random() * 2 + 2 + 's';
            container.appendChild(confetti);
            setTimeout(() => confetti.remove(), 4000);
        }
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

    const handleWish = async (id, hasWished) => {
        if (hasWished) return;
        try {
            setWishingId(id);
            const res = await api.post(`/users/${id}/wish`);
            if (res.data.success) {
                fetchBirthdays();
                createConfetti();
            }
        } catch (error) {
            console.error('Error sending wish:', error);
        } finally {
            setWishingId(null);
        }
    };

    if (!isLoading && birthdays.length === 0) return null;

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
                    opacity: 0.7;
                    pointer-events: none;
                    border-radius: 2px;
                    animation: fall linear forwards;
                }
                @keyframes fall {
                    to { transform: translateY(120px) rotate(360deg); opacity: 0; }
                }
            `}</style>

            <motion.div
                className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-600 via-orange-600 to-rose-600 shadow-md shadow-primary/20 border border-white/10"
            >
                <motion.div className="absolute inset-0 bg-white/5 pointer-events-none" />

                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:p-4">
                    {/* Header */}
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                            <Cake className="w-4 h-4 text-white" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-white font-black text-sm sm:text-base leading-tight">
                                Happy Birthday! 🎂
                            </p>
                            <p className="text-white/70 text-xs leading-relaxed mt-0.5">
                                Wishing them joy, success &amp; happiness ✨
                            </p>
                        </div>
                    </div>

                    {/* Birthday people */}
                    <div className="flex flex-wrap justify-end gap-2 sm:ml-auto sm:max-w-[60%]">
                        {birthdays.map((person) => {
                            const currentYear = new Date().getFullYear();
                            const hasWished = person.birthdayWishes?.some(
                                (w) =>
                                    (w.from?._id || w.from) === (user?.id || user?._id) &&
                                    w.year === currentYear
                            );
                            const wishCount =
                                person.birthdayWishes?.filter((w) => w.year === currentYear).length || 0;
                            const roleLabel = person.roles ? person.roles.join(' / ') : person.role;

                            return (
                                <div
                                    key={person._id}
                                    className="min-w-0 w-full sm:w-auto sm:max-w-sm flex items-center gap-2.5 bg-white/15 hover:bg-white/25 border border-white/15 rounded-xl px-3 py-2 transition-colors"
                                >
                                    {person.photo ? (
                                        <img
                                            src={person.photo}
                                            alt=""
                                            className="w-9 h-9 shrink-0 rounded-lg object-cover border-2 border-white/30"
                                        />
                                    ) : (
                                        <div className="w-9 h-9 shrink-0 rounded-lg bg-white/25 flex items-center justify-center text-white font-bold text-sm border-2 border-white/30">
                                            {person.name.charAt(0)}
                                        </div>
                                    )}

                                    <div className="min-w-0 flex-1">
                                        <p className="text-white font-bold text-[13px] break-words leading-snug">{person.name}</p>
                                        <p className="text-white/80 text-[10px] uppercase font-bold tracking-wide break-words mt-0.5">
                                            {roleLabel}
                                        </p>
                                    </div>

                                    <div className="flex shrink-0 items-center gap-2 pl-2 border-l border-white/20">
                                        <span className="flex items-center gap-0.5 text-white/80 px-0.5">
                                            <Heart
                                                className={`w-3 h-3 ${wishCount > 0 ? 'fill-red-300 text-red-300' : 'text-white/50'}`}
                                            />
                                            <span className="text-[10px] font-black">{wishCount}</span>
                                        </span>

                                        <button
                                            onClick={() => handleWish(person._id, hasWished)}
                                            disabled={wishingId === person._id || hasWished}
                                            className={`min-h-8 px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wide flex items-center gap-1 transition-all ${hasWished
                                                    ? 'bg-white/10 text-white/45 cursor-default'
                                                    : 'bg-white text-primary hover:bg-white/90 active:scale-95'
                                                }`}
                                        >
                                            {wishingId === person._id ? (
                                                <PartyPopper className="w-3 h-3 animate-bounce" />
                                            ) : hasWished ? (
                                                'Done'
                                            ) : (
                                                <>
                                                    Wish <Gift className="w-2.5 h-2.5" />
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default BirthdayWish;
