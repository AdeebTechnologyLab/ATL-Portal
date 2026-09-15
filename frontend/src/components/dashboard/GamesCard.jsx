import { useState, useEffect, useRef, useCallback } from 'react';
import { Trophy, Crown, Medal, Zap, ChevronDown } from 'lucide-react';
import { statsAPI } from '../../services/api';
import { getBackendOrigin } from '../../config/apiBaseUrl';

const MEDAL_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32'];
const MEDAL_ICONS = [Crown, Medal, Medal];

const getPhotoUrl = (photo) => {
    if (!photo) return '';
    if (photo.startsWith('http') || photo.startsWith('data:')) return photo;
    return `${getBackendOrigin()}${photo}`;
};

const SpaceGame = ({ onScore }) => {
    const canvasRef = useRef(null);
    const wrapRef = useRef(null);
    const gameRef = useRef(null);
    const aliveRef = useRef(false);
    const [gameState, setGameState] = useState('idle');
    const [score, setScore] = useState(0);
    const [highScore, setHighScore] = useState(() => {
        try { return parseInt(localStorage.getItem('atl_highscore') || '0'); } catch { return 0; }
    });

    const cleanup = useCallback(() => {
        if (gameRef.current) cancelAnimationFrame(gameRef.current);
        gameRef.current = null;
        aliveRef.current = false;
    }, []);

    const startGame = useCallback(() => {
        cleanup();
        const canvas = canvasRef.current;
        const wrap = wrapRef.current;
        if (!canvas || !wrap) return;

        const W = wrap.clientWidth;
        const H = 180;
        canvas.width = W;
        canvas.height = H;
        const ctx = canvas.getContext('2d');

        const player = { x: 55, y: H / 2, w: 24, h: 18, vy: 0, grounded: false };
        const obstacles = [];
        const stars = [];
        const particles = [];
        let frame = 0;
        let sc = 0;
        let frameCount = 0;
        aliveRef.current = true;

        for (let i = 0; i < 60; i++) {
            stars.push({
                x: Math.random() * W,
                y: Math.random() * H,
                s: Math.random() * 2 + 0.5,
                sp: Math.random() * 0.6 + 0.2,
                twinkle: Math.random() * Math.PI * 2
            });
        }

        const jump = () => {
            if (!aliveRef.current) return;
            if (player.grounded) { player.vy = -6.5; player.grounded = false; }
        };

        const onKey = (e) => { if (e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); jump(); } };
        const onClick = (e) => { e.preventDefault(); jump(); };
        window.addEventListener('keydown', onKey);
        canvas.addEventListener('click', onClick);
        canvas.addEventListener('touchstart', onClick);

        setGameState('playing');
        setScore(0);

        let lastTime = performance.now();

        const draw = (time) => {
            if (!aliveRef.current) return;
            const dt = Math.min((time - lastTime) / 16, 3);
            lastTime = time;
            frame++;
            frameCount++;

            // Background gradient
            const grad = ctx.createLinearGradient(0, 0, 0, H);
            grad.addColorStop(0, '#0a0a1a');
            grad.addColorStop(0.5, '#0f1029');
            grad.addColorStop(1, '#1a1040');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, W, H);

            // Stars with twinkle
            stars.forEach(s => {
                s.x -= s.sp * dt;
                s.twinkle += 0.03 * dt;
                if (s.x < 0) { s.x = W; s.y = Math.random() * H; }
                const alpha = 0.3 + Math.sin(s.twinkle) * 0.2 + s.s * 0.1;
                ctx.fillStyle = `rgba(255,255,255,${alpha})`;
                ctx.beginPath();
                ctx.arc(s.x, s.y, s.s * 0.6, 0, Math.PI * 2);
                ctx.fill();
            });

            // Physics (easier: gentler gravity)
            player.vy += 0.22 * dt;
            player.y += player.vy * dt;
            if (player.y >= H - player.h - 12) { player.y = H - player.h - 12; player.vy = 0; player.grounded = true; }
            if (player.y < 0) { player.y = 0; player.vy = 0; }

            // Trail particles
            if (frameCount % 3 === 0) {
                particles.push({
                    x: player.x - 2,
                    y: player.y + player.h / 2 + (Math.random() - 0.5) * 6,
                    life: 1,
                    size: Math.random() * 3 + 1
                });
            }

            // Update particles
            for (let i = particles.length - 1; i >= 0; i--) {
                const p = particles[i];
                p.x -= 1.5 * dt;
                p.life -= 0.04 * dt;
                if (p.life <= 0) particles.splice(i, 1);
            }

            // Draw particles
            particles.forEach(p => {
                ctx.fillStyle = `rgba(255,120,0,${p.life * 0.6})`;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
                ctx.fill();
            });

            // Player rocket
            ctx.save();
            ctx.shadowColor = '#ff6b00';
            ctx.shadowBlur = 12;
            // Rocket body
            ctx.fillStyle = '#FF6B00';
            ctx.beginPath();
            ctx.ellipse(player.x + player.w / 2, player.y + player.h / 2, player.w / 2, player.h / 2, 0, 0, Math.PI * 2);
            ctx.fill();
            // Cockpit
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.ellipse(player.x + player.w * 0.6, player.y + player.h / 2, 4, 5, 0, 0, Math.PI * 2);
            ctx.fill();
            // Flame
            ctx.fillStyle = '#ffcc00';
            ctx.beginPath();
            const flameLen = 6 + Math.sin(frameCount * 0.3) * 3;
            ctx.moveTo(player.x - 2, player.y + player.h / 2 - 4);
            ctx.lineTo(player.x - flameLen - 4, player.y + player.h / 2);
            ctx.lineTo(player.x - 2, player.y + player.h / 2 + 4);
            ctx.closePath();
            ctx.fill();
            ctx.restore();

            // Obstacles (easier: bigger gaps, slower speed, more spacing)
            if (frame % 120 === 0) {
                const gap = 120 + Math.random() * 50;
                const gapY = 35 + Math.random() * (H - 70 - gap);
                obstacles.push({ x: W, gapY, gap, w: 28, passed: false });
            }

            // Draw obstacles with gradient
            obstacles.forEach(o => {
                o.x -= 2.0 * dt;

                const pipeGrad = ctx.createLinearGradient(o.x, 0, o.x + o.w, 0);
                pipeGrad.addColorStop(0, '#2a1a4e');
                pipeGrad.addColorStop(0.5, '#3d2a6e');
                pipeGrad.addColorStop(1, '#2a1a4e');

                ctx.fillStyle = pipeGrad;
                ctx.strokeStyle = '#FF6B0044';
                ctx.lineWidth = 1.5;

                // Top pipe
                ctx.fillRect(o.x, 0, o.w, o.gapY);
                ctx.strokeRect(o.x, 0, o.w, o.gapY);

                // Bottom pipe
                ctx.fillRect(o.x, o.gapY + o.gap, o.w, H - o.gapY - o.gap);
                ctx.strokeRect(o.x, o.gapY + o.gap, o.w, H - o.gapY - o.gap);

                // Pipe caps
                ctx.fillStyle = '#FF6B0033';
                ctx.fillRect(o.x - 3, o.gapY - 6, o.w + 6, 6);
                ctx.fillRect(o.x - 3, o.gapY + o.gap, o.w + 6, 6);

                // Score on pass
                if (!o.passed && o.x + o.w < player.x) {
                    o.passed = true;
                    sc++;
                    setScore(sc);
                }
            });

            // Collision (slightly forgiving hitbox)
            for (const o of obstacles) {
                if (player.x + player.w - 4 > o.x && player.x + 4 < o.x + o.w) {
                    if (player.y + 3 < o.gapY || player.y + player.h - 3 > o.gapY + o.gap) {
                        aliveRef.current = false;
                        break;
                    }
                }
            }

            if (!aliveRef.current) {
                setGameState('over');
                setScore(sc);
                onScore(sc);
                const best = Math.max(sc, highScore);
                setHighScore(best);
                try { localStorage.setItem('atl_highscore', String(best)); } catch {}
                window.removeEventListener('keydown', onKey);
                canvas.removeEventListener('click', onClick);
                canvas.removeEventListener('touchstart', onClick);
                return;
            }

            // Score HUD
            ctx.fillStyle = 'rgba(255,255,255,0.95)';
            ctx.font = 'bold 16px monospace';
            ctx.textAlign = 'right';
            ctx.fillText(`${sc}`, W - 14, 24);

            // Ground line
            ctx.strokeStyle = '#FF6B0022';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, H - 10);
            ctx.lineTo(W, H - 10);
            ctx.stroke();

            gameRef.current = requestAnimationFrame(draw);
        };

        gameRef.current = requestAnimationFrame(draw);

        return () => {
            window.removeEventListener('keydown', onKey);
            canvas.removeEventListener('click', onClick);
            canvas.removeEventListener('touchstart', onClick);
        };
    }, [cleanup, highScore, onScore]);

    useEffect(() => {
        return cleanup;
    }, [cleanup]);

    return (
        <div className="flex flex-col">
            <div ref={wrapRef} className="w-full relative">
                <canvas
                    ref={canvasRef}
                    className="rounded-xl bg-[#0a0a1a] border border-white/10 cursor-pointer w-full"
                    style={{ height: 180 }}
                    onClick={() => { if (gameState !== 'playing') startGame(); }}
                />
                {gameState === 'idle' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none gap-1">
                        <Zap className="w-6 h-6 text-orange-400 animate-bounce" />
                        <p className="text-white/80 text-sm font-bold">Tap to Launch</p>
                        <p className="text-white/40 text-[10px]">Space / Click / Tap</p>
                    </div>
                )}
                {gameState === 'over' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none bg-black/40 rounded-xl backdrop-blur-[1px]">
                        <p className="text-red-400 text-base font-black tracking-wide">GAME OVER</p>
                        <p className="text-white text-lg font-black mt-1">{score} <span className="text-white/50 text-xs font-bold">pts</span></p>
                        {highScore > 0 && <p className="text-yellow-400/80 text-[10px] font-bold mt-0.5">Best: {highScore}</p>}
                        <p className="text-white/40 text-[9px] mt-1.5">Tap to retry</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const GamesCard = () => {
    const [leaders, setLeaders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);

    const fetchLeaders = useCallback(async () => {
        try {
            const res = await statsAPI.getGames();
            setLeaders(res.data.data || []);
        } catch (err) {
            console.error('Failed to fetch games:', err);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchLeaders();
        const interval = setInterval(fetchLeaders, 5000);
        return () => clearInterval(interval);
    }, [fetchLeaders]);

    const handleGameScore = useCallback(async (score) => {
        try {
            await statsAPI.saveGameScore(score);
            fetchLeaders();
        } catch (err) {
            console.error('Failed to save game score:', err);
        }
    }, [fetchLeaders]);

    const topThree = leaders.slice(0, 3);
    const rest = leaders.slice(3, 10);

    return (
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-white/10 dark:bg-[#141418] overflow-hidden">
            {/* Header - always visible, clickable to toggle */}
            <button
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center gap-2.5 p-4 cursor-pointer select-none hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors"
            >
                <div className="p-1.5 rounded-lg bg-gradient-to-br from-yellow-400 to-orange-500 flex-shrink-0">
                    <Trophy className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm font-black text-gray-900 dark:text-white tracking-tight flex-1 text-left">Games</span>
                <div className="flex items-center gap-1.5">
                    {leaders.length > 0 && (
                        <span className="text-[10px] font-bold text-gray-400">{leaders.length} players</span>
                    )}
                    <ChevronDown
                        className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                    />
                </div>
            </button>

            {/* Collapsible content */}
            {open && (
                <div className="px-4 pb-4">
                    <SpaceGame onScore={handleGameScore} />

                    <div className="mt-4">
                        {loading ? (
                            <div className="flex justify-center py-4">
                                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                            </div>
                        ) : leaders.length === 0 ? (
                            <p className="text-center text-[11px] text-gray-400 py-3">No rankings yet — be the first!</p>
                        ) : (
                            <>
                                {/* Top 3 Podium */}
                                {topThree.length > 0 && (
                                    <div className="flex items-end justify-center gap-3 mb-3">
                                        {/* 2nd place */}
                                        {topThree[1] && (
                                            <div className="flex flex-col items-center flex-1 max-w-[90px]">
                                                <div className="relative mb-1.5">
                                                    <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-gray-300 bg-gray-100 dark:bg-gray-800">
                                                        {topThree[1].photo ? (
                                                            <img src={getPhotoUrl(topThree[1].photo)} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-sm font-bold text-gray-400">{topThree[1].name?.[0]}</div>
                                                        )}
                                                    </div>
                                                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black text-white bg-gray-400 border-2 border-white dark:border-[#141418]">2</div>
                                                </div>
                                                <p className="text-[10px] font-bold text-gray-700 dark:text-gray-300 truncate w-full text-center">{topThree[1].name}</p>
                                                <div className="mt-1 w-full h-10 bg-gradient-to-t from-gray-300 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-t-lg flex items-center justify-center">
                                                    <span className="text-[10px] font-black text-gray-600 dark:text-gray-300">{topThree[1].gameScore}</span>
                                                </div>
                                            </div>
                                        )}
                                        {/* 1st place */}
                                        {topThree[0] && (
                                            <div className="flex flex-col items-center flex-1 max-w-[100px]">
                                                <div className="relative mb-1.5">
                                                    <div className="w-14 h-14 rounded-full overflow-hidden border-3 border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 shadow-lg shadow-yellow-400/20">
                                                        {topThree[0].photo ? (
                                                            <img src={getPhotoUrl(topThree[0].photo)} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-base font-bold text-yellow-600">{topThree[0].name?.[0]}</div>
                                                        )}
                                                    </div>
                                                    <div className="absolute -top-2 -right-1"><Crown className="w-4 h-4 text-yellow-400" /></div>
                                                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black text-white bg-yellow-400 border-2 border-white dark:border-[#141418]">1</div>
                                                </div>
                                                <p className="text-[10px] font-bold text-gray-900 dark:text-white truncate w-full text-center">{topThree[0].name}</p>
                                                <div className="mt-1 w-full h-14 bg-gradient-to-t from-yellow-400 to-yellow-300 dark:from-yellow-600 dark:to-yellow-500 rounded-t-lg flex items-center justify-center shadow-lg shadow-yellow-400/20">
                                                    <span className="text-xs font-black text-white drop-shadow">{topThree[0].gameScore}</span>
                                                </div>
                                            </div>
                                        )}
                                        {/* 3rd place */}
                                        {topThree[2] && (
                                            <div className="flex flex-col items-center flex-1 max-w-[90px]">
                                                <div className="relative mb-1.5">
                                                    <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-amber-600 bg-amber-50 dark:bg-amber-900/20">
                                                        {topThree[2].photo ? (
                                                            <img src={getPhotoUrl(topThree[2].photo)} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-sm font-bold text-amber-600">{topThree[2].name?.[0]}</div>
                                                        )}
                                                    </div>
                                                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black text-white bg-amber-600 border-2 border-white dark:border-[#141418]">3</div>
                                                </div>
                                                <p className="text-[10px] font-bold text-gray-700 dark:text-gray-300 truncate w-full text-center">{topThree[2].name}</p>
                                                <div className="mt-1 w-full h-8 bg-gradient-to-t from-amber-600 to-amber-500 dark:from-amber-700 dark:to-amber-600 rounded-t-lg flex items-center justify-center">
                                                    <span className="text-[10px] font-black text-white">{topThree[2].gameScore}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Rest of the list */}
                                {rest.length > 0 && (
                                    <div className="space-y-1.5">
                                        {rest.map((user, i) => (
                                            <div key={user._id} className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-gray-50 dark:bg-white/[0.03] hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors">
                                                <span className="w-5 text-center text-[11px] font-black text-gray-400">{i + 4}</span>
                                                <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0">
                                                    {user.photo ? (
                                                        <img src={getPhotoUrl(user.photo)} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-gray-400">{user.name?.[0]}</div>
                                                    )}
                                                </div>
                                                <p className="text-[11px] font-bold text-gray-800 dark:text-white flex-1 truncate">{user.name}</p>
                                                <span className="text-[10px] font-black text-primary">{user.gameScore || 0}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default GamesCard;
