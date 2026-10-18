import { useState, useEffect } from 'react';
import { Brain, ChevronDown, Trophy, Crown } from 'lucide-react';
import { quizGameAPI } from '../../services/api';
import QuizGame from '../../pages/shared/QuizGame';
import { getBackendOrigin } from '../../config/apiBaseUrl';

const getPhotoUrl = (p) => (p && p.startsWith('http') ? p : p ? `${getBackendOrigin()}${p.startsWith('/') ? '' : '/'}${p}` : '');

const QuizBattleCard = () => {
    const [open, setOpen] = useState(false);
    const [openRooms, setOpenRooms] = useState([]);
    const [leaders, setLeaders] = useState([]);

    // Open quiz challenges (dusre students ke waiting rooms)
    useEffect(() => {
        quizGameAPI.getOpen().then(res => setOpenRooms(res.data.data || [])).catch(() => {});
        quizGameAPI.getLeaderboard().then(res => setLeaders((res.data.data || []).slice(0, 10))).catch(() => {});
        const interval = setInterval(() => {
            quizGameAPI.getOpen().then(res => setOpenRooms(res.data.data || [])).catch(() => {});
            quizGameAPI.getLeaderboard().then(res => setLeaders((res.data.data || []).slice(0, 10))).catch(() => {});
        }, 10000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-white/10 dark:bg-[#141418] overflow-hidden">
            {/* Header - always visible, clickable to toggle */}
            <button
                aria-expanded={open}
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center gap-3 p-4 sm:p-5 cursor-pointer select-none hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors"
            >
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex-shrink-0 shadow-lg shadow-violet-500/25">
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

            <div className={`${open ? 'block' : 'hidden'} px-4 pb-4`}>
                <QuizGame inline onExit={() => setOpen(false)} />
            </div>

            <section hidden={!open} aria-label="Quiz Battle winners" className="mx-4 mb-4 border-t border-gray-100 dark:border-white/10 pt-4">
                <p className="mb-4 flex items-center gap-2 text-xs font-bold text-gray-600 dark:text-gray-300">
                    <Trophy className="h-4 w-4 text-amber-500" /> Top players — ranked by wins
                </p>
                {leaders.length === 0 ? (
                    <p className="py-3 text-center text-xs text-gray-400">No rankings yet — be the first!</p>
                ) : (
                    <>
                        <div className="flex items-end justify-center gap-3">
                            {[1, 0, 2].map(rank => {
                                const player = leaders[rank];
                                if (!player) return null;
                                const champion = rank === 0;
                                return (
                                    <div key={player._id || rank} className="flex min-w-0 max-w-[150px] flex-1 flex-col items-center">
                                        <div className="relative mb-2">
                                            <div className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full border-2 bg-gray-100 dark:bg-gray-800 ${champion ? 'h-14 w-14 border-yellow-400' : rank === 1 ? 'h-11 w-11 border-gray-300' : 'h-11 w-11 border-amber-600'}`}>
                                                {player.photo ? <img src={getPhotoUrl(player.photo)} alt="" className="h-full w-full object-cover" /> : <span className="text-sm font-bold text-gray-500">{player.name?.[0]}</span>}
                                            </div>
                                            {champion && <Crown className="absolute -right-1 -top-2 h-4 w-4 text-yellow-500" />}
                                            <span className={`absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white dark:border-[#141418] text-[9px] font-black text-white ${champion ? 'bg-yellow-500' : rank === 1 ? 'bg-gray-400' : 'bg-amber-600'}`}>{rank + 1}</span>
                                        </div>
                                        <p title={player.name} className="w-full min-h-10 break-words text-center text-[11px] leading-4 font-bold text-gray-800 dark:text-white">{player.name}</p>
                                        <p className="mt-0.5 text-[10px] text-gray-500 dark:text-gray-400">{player.wins || 0} {player.wins === 1 ? 'win' : 'wins'}</p>
                                        <div className={`mt-2 flex w-full items-center justify-center rounded-t-lg bg-gradient-to-t text-xs font-black text-white ${champion ? 'h-14 from-yellow-500 to-yellow-400' : rank === 1 ? 'h-10 from-gray-400 to-gray-300 dark:from-gray-600 dark:to-gray-500' : 'h-8 from-amber-700 to-amber-500'}`}>
                                            {player.totalScore || 0} pts
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        {leaders.length > 3 && <div className="mt-3 space-y-1.5">
                            {leaders.slice(3).map((player, index) => (
                                <div key={player._id || index} className="flex items-center gap-2.5 rounded-xl bg-gray-50 px-3 py-2 dark:bg-white/[0.03]">
                                    <span className="w-5 text-center text-[11px] font-black text-gray-400">{index + 4}</span>
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                                        {player.photo ? <img src={getPhotoUrl(player.photo)} alt="" className="h-full w-full object-cover" /> : <span className="text-xs text-gray-500">{player.name?.[0]}</span>}
                                    </div>
                                    <p className="min-w-0 flex-1 break-words text-[11px] font-bold text-gray-800 dark:text-white">{player.name}</p>
                                    <span className="shrink-0 text-[10px] text-gray-500 dark:text-gray-400">{player.wins || 0} {player.wins === 1 ? 'win' : 'wins'}</span>
                                    <span className="shrink-0 rounded-lg bg-primary/10 px-2 py-1 text-[11px] font-black text-primary">{player.totalScore || 0} pts</span>
                                </div>
                            ))}
                        </div>}
                    </>
                )}
            </section>

        </div>
    );
};

export default QuizBattleCard;
