import { useState, useEffect, useRef, useCallback } from 'react';
import { Trophy } from 'lucide-react';
import { statsAPI } from '../../services/api';

const MEDAL_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32'];

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
        const H = 150;
        canvas.width = W;
        canvas.height = H;
        const ctx = canvas.getContext('2d');

        const player = { x: 60, y: H / 2, w: 20, h: 14, vy: 0, grounded: false };
        const obstacles = [];
        const stars = [];
        let frame = 0;
        let sc = 0;
        aliveRef.current = true;

        for (let i = 0; i < 50; i++) {
            stars.push({ x: Math.random() * W, y: Math.random() * H, s: Math.random() * 1.5 + 0.5, sp: Math.random() * 1 + 0.3 });
        }

        const jump = () => {
            if (!aliveRef.current) return;
            if (player.grounded) { player.vy = -6; player.grounded = false; }
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

            ctx.fillStyle = '#0f0f1a';
            ctx.fillRect(0, 0, W, H);

            stars.forEach(s => {
                s.x -= s.sp * dt;
                if (s.x < 0) { s.x = W; s.y = Math.random() * H; }
                ctx.fillStyle = `rgba(255,255,255,${0.3 + s.s * 0.2})`;
                ctx.fillRect(s.x, s.y, s.s, s.s);
            });

            player.vy += 0.35 * dt;
            player.y += player.vy * dt;
            if (player.y >= H - player.h - 10) { player.y = H - player.h - 10; player.vy = 0; player.grounded = true; }
            if (player.y < 0) { player.y = 0; player.vy = 0; }

            ctx.fillStyle = '#FF6B00';
            ctx.shadowColor = '#FF6B00';
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.moveTo(player.x + player.w, player.y + player.h / 2);
            ctx.lineTo(player.x, player.y);
            ctx.lineTo(player.x, player.y + player.h);
            ctx.closePath();
            ctx.fill();
            ctx.shadowBlur = 0;

            if (frame % 90 === 0) {
                const gap = 80 + Math.random() * 60;
                const gapY = 40 + Math.random() * (H - 80 - gap);
                obstacles.push({ x: W, gapY, gap, w: 22 });
                sc++;
                setScore(sc);
            }

            ctx.fillStyle = '#1a1a2e';
            ctx.strokeStyle = '#FF6B0033';
            obstacles.forEach(o => {
                o.x -= 2.5 * dt;
                ctx.fillRect(o.x, 0, o.w, o.gapY);
                ctx.strokeRect(o.x, 0, o.w, o.gapY);
                ctx.fillRect(o.x, o.gapY + o.gap, o.w, H - o.gapY - o.gap);
                ctx.strokeRect(o.x, o.gapY + o.gap, o.w, H - o.gapY - o.gap);
            });

            for (const o of obstacles) {
                if (player.x + player.w > o.x && player.x < o.x + o.w) {
                    if (player.y < o.gapY || player.y + player.h > o.gapY + o.gap) {
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

            ctx.fillStyle = 'rgba(255,255,255,0.9)';
            ctx.font = 'bold 13px monospace';
            ctx.fillText(`${sc}`, W - 30, 20);

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
                    className="rounded-xl bg-[#0f0f1a] border border-white/10 cursor-pointer w-full"
                    style={{ height: 150 }}
                    onClick={() => { if (gameState !== 'playing') startGame(); }}
                />
                {gameState === 'idle' && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <p className="text-white/70 text-sm font-bold animate-pulse">Tap or Press Space</p>
                    </div>
                )}
                {gameState === 'over' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <p className="text-red-400 text-sm font-bold">Game Over! Score: {score}</p>
                        {highScore > 0 && <p className="text-white/50 text-[10px]">High Score: {highScore}</p>}
                        <p className="text-white/40 text-[9px] mt-1">Tap to play again</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const LeaderboardCard = () => {
    const [leaders, setLeaders] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchLeaders = useCallback(async () => {
        try {
            const res = await statsAPI.getLeaderboard();
            setLeaders(res.data.data || []);
        } catch { }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchLeaders();
        const interval = setInterval(fetchLeaders, 5000);
        return () => clearInterval(interval);
    }, [fetchLeaders]);

    const handleGameScore = useCallback(async (score) => {
        try { await statsAPI.saveGameScore(score); fetchLeaders(); } catch {}
    }, [fetchLeaders]);

    return (
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#141418]">
            <div className="flex items-center gap-2 mb-4">
                <Trophy className="w-5 h-5 text-primary" />
                <h3 className="text-sm font-black text-gray-900 dark:text-white">Leaderboard</h3>
            </div>

            <SpaceGame onScore={handleGameScore} />

            <div className="mt-3">
                {loading ? (
                    <div className="flex justify-center py-3"><div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
                ) : leaders.length === 0 ? (
                    <p className="text-center text-[10px] text-gray-400 py-2">No rankings yet</p>
                ) : (
                    <div className="grid grid-cols-5 gap-1.5">
                        {leaders.map((user, i) => (
                            <div key={user._id} className="flex flex-col items-center text-center p-2 rounded-xl bg-gray-50 dark:bg-white/5">
                                <div className="relative mb-1.5">
                                    <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 border-2" style={{ borderColor: MEDAL_COLORS[i] || '#666' }}>
                                        {user.photo ? (
                                            <img src={user.photo} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-500">{user.name?.[0]}</div>
                                        )}
                                    </div>
                                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black text-white" style={{ background: MEDAL_COLORS[i] || '#666' }}>
                                        {i + 1}
                                    </div>
                                </div>
                                <p className="text-[10px] font-bold text-gray-800 dark:text-white truncate w-full leading-tight">{user.name}</p>
                                <p className="text-[9px] font-black mt-0.5 leading-tight" style={{ color: MEDAL_COLORS[i] || '#666' }}>{user.gameScore || 0} pts</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default LeaderboardCard;
