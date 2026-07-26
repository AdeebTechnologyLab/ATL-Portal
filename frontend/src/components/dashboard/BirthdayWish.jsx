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
            className="relative mb-4"
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
                className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary to-[#ff6b00] shadow-md shadow-primary/20 border border-white/10"
            >
                <motion.div className="absolute inset-0 bg-white/5 pointer-events-none" />

                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3">
                    {/* Compact header */}
                    <div className="flex items-center gap-2.5 shrink-0 sm:pr-3 sm:border-r sm:border-white/20">
                        <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                            <Cake className="w-[18px] h-[18px] text-white" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-white font-bold text-sm leading-tight">
                                Happy Birthday! 🎂
                            </p>
                            <p className="text-white/70 text-[11px] leading-snug mt-0.5 hidden sm:block max-w-[220px]">
                                <span className="block">Wishing our amazing students</span>
                                <span className="block">a day filled with happiness, success, and joy! ✨</span>
                            </p>
                        </div>
                    </div>

                    {/* Birthday people — horizontal scroll on small screens */}
                    <div className="flex flex-1 gap-2 overflow-x-auto pb-0.5 sm:pb-0 scrollbar-thin justify-end">
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
                                    className="flex items-center gap-2.5 bg-white/15 hover:bg-white/20 border border-white/15 rounded-xl px-3 py-2.5 shrink-0 transition-colors min-h-[52px]"
                                >
                                    {person.photo ? (
                                        <img
                                            src={person.photo}
                                            alt=""
                                            className="w-10 h-10 rounded-lg object-cover border border-white/30"
                                        />
                                    ) : (
                                        <div className="w-10 h-10 rounded-lg bg-white/25 flex items-center justify-center text-white font-bold text-sm border border-white/30">
                                            {person.name.charAt(0)}
                                        </div>
                                    )}

                                    <div className="min-w-0 max-w-[150px]">
                                        <p className="text-white font-semibold text-sm truncate leading-tight">{person.name}</p>
                                        <p className="text-white/55 text-[10px] uppercase tracking-wide truncate mt-0.5">
                                            {roleLabel}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-1.5 pl-2 border-l border-white/15 self-stretch py-0.5">
                                        <span className="flex items-center gap-1 text-white/80 px-1">
                                            <Heart
                                                className={`w-3.5 h-3.5 ${wishCount > 0 ? 'fill-red-300 text-red-300' : 'text-white/50'}`}
                                            />
                                            <span className="text-xs font-bold">{wishCount}</span>
                                        </span>

                                        <button
                                            onClick={() => handleWish(person._id, hasWished)}
                                            disabled={wishingId === person._id || hasWished}
                                            className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide flex items-center gap-1 transition-all ${hasWished
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
                                                    Wish <Gift className="w-3 h-3" />
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
