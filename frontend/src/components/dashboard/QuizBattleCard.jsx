import { useState, useEffect } from 'react';
import { Brain, ChevronDown } from 'lucide-react';
import { quizGameAPI } from '../../services/api';
import QuizGame from '../../pages/shared/QuizGame';

const QuizBattleCard = () => {
    const [open, setOpen] = useState(false);
    const [openRooms, setOpenRooms] = useState([]);

    // Open quiz challenges (dusre students ke waiting rooms)
    useEffect(() => {
        quizGameAPI.getOpen().then(res => setOpenRooms(res.data.data || [])).catch(() => {});
        const interval = setInterval(() => {
            quizGameAPI.getOpen().then(res => setOpenRooms(res.data.data || [])).catch(() => {});
        }, 10000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-white/10 dark:bg-[#141418] overflow-hidden">
            {/* Header - always visible, clickable to toggle */}
            <button
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center gap-3 p-4 cursor-pointer select-none hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors"
            >
                <div className="p-1.5 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex-shrink-0 shadow-lg shadow-violet-500/25">
                    <Brain className="w-4 h-4 text-white" />
                </div>
                <div className="min-w-0 flex-1 text-left">
                    <p className="flex items-center gap-1.5 text-sm font-black text-gray-900 dark:text-white">
                        Quiz Battle
                        {openRooms.length > 0 && (
                            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-black text-white">{openRooms.length}</span>
                        )}
                    </p>
                    {openRooms.length > 0 && (
                        <p className="truncate text-[11px] text-gray-500 dark:text-gray-400">
                            {openRooms[0].host?.name} ne aapko challenge kiya hai — accept karo!
                        </p>
                    )}
                </div>
                <ChevronDown
                    className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                />
            </button>

            {/* Collapsible content — full Quiz Battle inline (no full screen) */}
            <div className={`${open ? 'block' : 'hidden'} px-4 pb-4`}>
                <QuizGame inline onExit={() => setOpen(false)} />
            </div>
        </div>
    );
};

export default QuizBattleCard;