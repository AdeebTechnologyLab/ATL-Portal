import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { io } from 'socket.io-client';
import { motion } from 'framer-motion';
import {
    ArrowLeft, BookOpen, Brain, CheckCircle2, Crown, Hourglass, Loader2,
    Play, Swords, Target, Timer, Trophy, Users, XCircle, Zap
} from 'lucide-react';
import { quizGameAPI } from '../../services/api';
import { getSocketURL } from '../../config/apiBaseUrl';
import { getBackendOrigin } from '../../config/apiBaseUrl';

const GAME_QUESTIONS = 10;
const ROOM_TIMEOUT_MS = 2 * 60 * 1000;

const getPhotoUrl = (photo) => {
    if (!photo) return '';
    if (photo.startsWith('http') || photo.startsWith('data:')) return photo;
    return `${getBackendOrigin()}${photo}`;
};

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

const OPTION_STYLES = [
    'from-violet-500/90 to-violet-600/90 border-violet-400/40',
    'from-sky-500/90 to-sky-600/90 border-sky-400/40',
    'from-emerald-500/90 to-emerald-600/90 border-emerald-400/40',
    'from-amber-500/90 to-amber-600/90 border-amber-400/40',
    'from-rose-500/90 to-rose-600/90 border-rose-400/40',
    'from-cyan-500/90 to-cyan-600/90 border-cyan-400/40'
];

const ScoreBadge = ({ player, isMe, isWinner, tie }) => (
    <div className={`flex items-center gap-3 rounded-2xl border p-3.5 transition-all ${
        isWinner && !tie
            ? 'border-amber-400/60 bg-amber-400/10 shadow-lg shadow-amber-500/10'
            : 'border-white/10 bg-white/[0.04]'
    }`}>
        <div className="relative shrink-0">
            {player.photo ? (
                <img src={getPhotoUrl(player.photo)} alt="" className="h-12 w-12 rounded-full border-2 border-white/15 object-cover" />
            ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-white/15 bg-white/10 text-lg font-black text-white">
                    {player.name?.[0]?.toUpperCase() || '?'}
                </div>
            )}
            {isWinner && !tie && (
                <Crown className="absolute -right-1.5 -top-1.5 h-5 w-5 text-amber-400" />
            )}
        </div>
        <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-black text-white">
                {player.name || 'Player'} {isMe && <span className="text-[10px] font-bold uppercase tracking-wider text-white/50">(You)</span>}
            </p>
            <p className="text-[11px] font-semibold text-white/50">{player.role || 'player'}</p>
        </div>
        <div className={`flex h-11 min-w-11 items-center justify-center rounded-xl px-2 text-xl font-black ${
            isWinner && !tie ? 'bg-amber-400 text-slate-900' : 'bg-white/10 text-white'
        }`}>
            {player.score ?? 0}
        </div>
    </div>
);

const QuizGame = () => {
    const location = useLocation();
    const { user } = useSelector((state) => state.auth);

    // flow: subject -> test -> lobby -> playing -> result
    const [flow, setFlow] = useState(location.state?.gameId ? 'reconnecting' : 'subject');
    const [subjects, setSubjects] = useState([]);
    const [tests, setTests] = useState([]);
    const [selectedSubject, setSelectedSubject] = useState(null);
    const [, setSelectedTestId] = useState(null);
    const [game, setGame] = useState(null);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [myAnswers, setMyAnswers] = useState({});
    const [opponentAnswered, setOpponentAnswered] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [waitElapsed, setWaitElapsed] = useState(0);
    const [openRooms, setOpenRooms] = useState([]);
    const [history, setHistory] = useState([]);
    const [error, setError] = useState('');
    const [isBusy, setIsBusy] = useState(false);

    const socketRef = useRef(null);
    const gameIdRef = useRef(null);
    const myId = String(user?.id || user?._id || location.state?.userId || '');
    const stateRef = useRef({});
    stateRef.current = { game, currentQuestionIndex, myAnswers, flow };

    // --- Socket wiring ---
    useEffect(() => {
        socketRef.current = io(getSocketURL(), { withCredentials: true });
        const socket = socketRef.current;
        if (myId) socket.emit('join_chat', myId);
        return () => socket.disconnect();
    }, []);

    useEffect(() => {
        const socket = socketRef.current;
        if (!socket) return;

        const onOpponentAnswered = ({ questionIndex }) => {
            if (Number(questionIndex) === stateRef.current.currentQuestionIndex) {
                setOpponentAnswered(true);
            }
        };

        const onNext = ({ nextIndex }) => {
            const { game: g, currentQuestionIndex: cqi, flow: f } = stateRef.current;
            if (f !== 'playing') return;
            const next = Number(nextIndex) || (cqi + 1);
            setOpponentAnswered(false);
            if (next >= GAME_QUESTIONS) {
                // Dono ne aakhri answer diya -> finish
                finishGame(g?._id || gameIdRef.current);
            } else {
                setCurrentQuestionIndex(next);
            }
        };

        const onEnded = () => {
            const id = stateRef.current.game?._id || gameIdRef.current;
            if (id) refreshGame(id);
        };

        socket.on('quiz_game_opponent_answered', onOpponentAnswered);
        socket.on('quiz_game_next', onNext);
        socket.on('quiz_game_ended', onEnded);
        return () => {
            socket.off('quiz_game_opponent_answered', onOpponentAnswered);
            socket.off('quiz_game_next', onNext);
            socket.off('quiz_game_ended', onEnded);
        };
    }, []);

    // --- Fallback polling (agar socket miss ho jaye) ---
    useEffect(() => {
        if (flow !== 'playing' && flow !== 'reconnecting') return;
        const id = game?._id || gameIdRef.current;
        if (!id) return;
        // Socket room join taake next/ended events dono players ko pohanchen
        socketRef.current?.emit('join_quiz_game', `quiz-game:${id}`);
        const timer = setInterval(() => refreshGame(id, true), 4000);
        return () => clearInterval(timer);
    }, [flow, game?._id]);

    const refreshGame = async (id, quiet = false) => {
        try {
            const res = await quizGameAPI.get(id);
            const fresh = res.data.data;
            setGame(fresh);
            gameIdRef.current = id;
            if (fresh.status === 'ended') {
                setFlow('result');
            } else if (fresh.status === 'active' && stateRef.current.flow !== 'playing') {
                setFlow('playing');
            }
        } catch (err) {
            if (!quiet) setError(err.response?.data?.message || 'Game not found');
        }
    };

    // Reconnect (notification se aaye to)
    useEffect(() => {
        const gameId = location.state?.gameId;
        if (gameId && flow === 'reconnecting') {
            refreshGame(gameId);
        }
    }, [location.state?.gameId]);

    // Subject list
    useEffect(() => {
        if (flow !== 'subject') return;
        quizGameAPI.getSummary().then(res => setSubjects(res.data.data || [])).catch(() => {});
        quizGameAPI.getOpen().then(res => setOpenRooms(res.data.data || [])).catch(() => {});
        quizGameAPI.getMyHistory().then(res => setHistory(res.data.data || [])).catch(() => {});
    }, [flow]);

    // Lobby waiting timer
    useEffect(() => {
        if (flow !== 'lobby') return;
        const timer = setInterval(() => setWaitElapsed(e => e + 1), 1000);
        return () => clearInterval(timer);
    }, [flow]);

    const loadTests = async (subject) => {
        setSelectedSubject(subject);
        setError('');
        try {
            const res = await quizGameAPI.getTests(subject._id);
            setTests(res.data.data || []);
            setFlow('test');
        } catch {
            setError('Tests load nahi hue — dobara try karo');
        }
    };

    const createGame = async (testId) => {
        setIsBusy(true);
        setError('');
        try {
            const res = await quizGameAPI.create(testId);
            setGame(res.data.data);
            gameIdRef.current = res.data.data._id;
            setCurrentQuestionIndex(0);
            setMyAnswers({});
            setSelectedTestId(testId);
            setFlow('lobby');
        } catch (err) {
            setError(err.response?.data?.message || 'Game create nahi hua');
        } finally {
            setIsBusy(false);
        }
    };

    const joinGame = async (gameId) => {
        setIsBusy(true);
        setError('');
        try {
            const res = await quizGameAPI.join(gameId);
            setGame(res.data.data);
            gameIdRef.current = gameId;
            setCurrentQuestionIndex(0);
            setMyAnswers({});
            setFlow('playing');
        } catch (err) {
            setError(err.response?.data?.message || 'Join nahi ho saka');
        } finally {
            setIsBusy(false);
        }
    };

    // Lobby me jab host join ho jaye (socket ya polling se)
    useEffect(() => {
        if (flow !== 'lobby' || !game) return;
        const id = game._id;
        const timer = setInterval(async () => {
            try {
                const res = await quizGameAPI.get(id);
                if (res.data.data.status === 'active') {
                    setGame(res.data.data);
                    setFlow('playing');
                }
            } catch { /* keep waiting */ }
        }, 2500);
        return () => clearInterval(timer);
    }, [flow, game?._id]);

    const selectAnswer = async (optionIndex) => {
        if (isSubmitting || myAnswers[currentQuestionIndex] !== undefined) return;
        setIsSubmitting(true);
        setMyAnswers(prev => ({ ...prev, [currentQuestionIndex]: optionIndex }));
        try {
            const res = await quizGameAPI.answer(game._id, currentQuestionIndex, optionIndex);
            setGame(prev => ({ ...prev, ...res.data.data }));
        } catch (err) {
            setMyAnswers(prev => {
                const copy = { ...prev };
                delete copy[currentQuestionIndex];
                return copy;
            });
            setError(err.response?.data?.message || 'Answer submit nahi hua');
        } finally {
            setIsSubmitting(false);
        }
    };

    const finishGame = useCallback(async (id) => {
        const gameId = id || gameIdRef.current;
        if (!gameId) return;
        try {
            const res = await quizGameAPI.finish(gameId);
            setGame(res.data.data);
            setFlow('result');
        } catch (err) {
            setError(err.response?.data?.message || 'Game finish nahi hua');
        }
    }, []);

    const me = game?.players?.find(p => String(p.user) === myId);
    const opponent = game?.players?.find(p => String(p.user) !== myId);
    const currentQuestion = game?.questions?.[currentQuestionIndex];
    const mySelected = myAnswers[currentQuestionIndex];
    const totalPlayed = (game?.players || []).filter(p => Object.keys(p.answers || {}).length > 0).length;

    /* ------------------------------ SUBJECT SELECT ------------------------------ */
    if (flow === 'subject') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 px-4 py-8 text-white">
                <div className="mx-auto max-w-3xl">
                    <div className="mb-8 text-center">
                        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-2xl shadow-violet-500/30">
                            <Brain className="h-10 w-10" />
                        </div>
                        <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Quiz Battle</h1>
                        <p className="mt-2 text-sm text-white/60">Subject chuno, test select karo, aur kisi bhi student/intern ke sath 1v1 MCQ race khelo</p>
                    </div>

                    {error && <div className="mb-4 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-300">{error}</div>}

                    <h2 className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-widest text-white/50">
                        <BookOpen className="h-4 w-4" /> Subject chuno
                    </h2>
                    {subjects.length === 0 ? (
                        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-8 text-center text-white/50">
                            Abhi koi subject/tests available nahi — jab teacher test banayenge to yahan dikhega
                        </div>
                    ) : (
                        <div className="grid gap-3 sm:grid-cols-2">
                            {subjects.map(subject => (
                                <button
                                    key={subject._id}
                                    onClick={() => loadTests(subject)}
                                    className="group flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.05] p-5 text-left transition-all hover:border-violet-400/50 hover:bg-violet-500/10"
                                >
                                    <div>
                                        <p className="font-black">{subject.title}</p>
                                        <p className="text-xs text-white/50">{subject.testCount} test{subject.testCount !== 1 ? 's' : ''} available</p>
                                    </div>
                                    <Play className="h-5 w-5 text-violet-400 transition-transform group-hover:scale-125" />
                                </button>
                            ))}
                        </div>
                    )}

                    {openRooms.length > 0 && (
                        <>
                            <h2 className="mb-3 mt-8 flex items-center gap-2 text-sm font-black uppercase tracking-widest text-white/50">
                                <Swords className="h-4 w-4" /> Open challenges — foran join karo
                            </h2>
                            <div className="space-y-2">
                                {openRooms.map(room => (
                                    <button
                                        key={room._id}
                                        onClick={() => joinGame(room._id)}
                                        disabled={isBusy}
                                        className="flex w-full items-center justify-between rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-left transition-all hover:bg-amber-400/20 disabled:opacity-50"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-400/20 text-lg font-black">
                                                {room.host?.name?.[0]?.toUpperCase() || '?'}
                                            </div>
                                            <div>
                                                <p className="text-sm font-black">{room.host?.name} ne challenge khara kiya hai!</p>
                                                <p className="text-xs text-white/60">{room.testTitle}</p>
                                            </div>
                                        </div>
                                        <span className="rounded-xl bg-amber-400 px-4 py-2 text-xs font-black uppercase tracking-wider text-slate-900">
                                            Join
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </>
                    )}

                    {history.length > 0 && (
                        <>
                            <h2 className="mb-3 mt-8 flex items-center gap-2 text-sm font-black uppercase tracking-widest text-white/50">
                                <Trophy className="h-4 w-4" /> Recent results
                            </h2>
                            <div className="space-y-2">
                                {history.map(h => (
                                    <div key={h._id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                                        <div>
                                            <p className="text-sm font-bold">{h.testTitle}</p>
                                            <p className="text-[11px] text-white/40">{new Date(h.endedAt).toLocaleString()}</p>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm font-black">
                                            <span className="rounded-lg bg-white/10 px-2 py-1">{h.myScore} - {h.opponentScore}</span>
                                            {h.isTie
                                                ? <span className="text-white/50">Tie</span>
                                                : String(h.winner) === myId
                                                    ? <span className="text-emerald-400">Won</span>
                                                    : <span className="text-rose-400">Lost</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>
        );
    }

    /* ------------------------------ TEST SELECT ------------------------------ */
    if (flow === 'test') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 px-4 py-8 text-white">
                <div className="mx-auto max-w-3xl">
                    <button onClick={() => setFlow('subject')} className="mb-6 flex items-center gap-2 text-sm font-bold text-white/60 hover:text-white">
                        <ArrowLeft className="h-4 w-4" /> Subjects
                    </button>
                    <h1 className="mb-1 text-2xl font-black">{selectedSubject?.title}</h1>
                    <p className="mb-6 text-sm text-white/50">Test select karo — us mein se 10 random MCQs aayenge</p>
                    {error && <div className="mb-4 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-300">{error}</div>}
                    <div className="space-y-3">
                        {tests.map(test => (
                            <button
                                key={test._id}
                                onClick={() => createGame(test._id)}
                                disabled={isBusy}
                                className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.05] p-5 text-left transition-all hover:border-violet-400/50 hover:bg-violet-500/10 disabled:opacity-50"
                            >
                                <div>
                                    <p className="font-black">{test.title}</p>
                                    <p className="text-xs text-white/50">{test.questionCount} questions · {test.totalMarks} marks</p>
                                </div>
                                {isBusy ? <Loader2 className="h-5 w-5 animate-spin text-violet-400" /> : <Play className="h-5 w-5 text-violet-400" />}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    /* ------------------------------ LOBBY (WAITING) ------------------------------ */
    if (flow === 'lobby' || flow === 'reconnecting') {
        const host = game?.players?.[0];
        return (
            <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 px-4 text-white">
                <div className="w-full max-w-md text-center">
                    <motion.div
                        animate={{ scale: [1, 1.08, 1] }}
                        transition={{ repeat: Infinity, duration: 1.6 }}
                        className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full border-4 border-violet-400/40 bg-violet-500/20"
                    >
                        <Hourglass className="h-10 w-10 text-violet-300" />
                    </motion.div>
                    <h1 className="text-2xl font-black">Waiting for opponent…</h1>
                    <p className="mt-2 text-sm text-white/60">
                        {game?.testTitle} · {GAME_QUESTIONS} MCQs
                    </p>
                    <p className="mt-1 text-xs text-white/40">
                        Doosra student/intern join karte hi game apne aap start ho jayega ({Math.floor(waitElapsed / 60)}:{String(waitElapsed % 60).padStart(2, '0')} elapsed)
                    </p>

                    {host && (
                        <div className="mx-auto mt-6 flex max-w-xs items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.05] p-4">
                            {host.photo ? (
                                <img src={getPhotoUrl(host.photo)} alt="" className="h-11 w-11 rounded-full border-2 border-white/15 object-cover" />
                            ) : (
                                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 font-black">{host.name?.[0]}</div>
                            )}
                            <div className="text-left">
                                <p className="text-sm font-black">{host.name} <span className="text-[10px] font-bold uppercase text-white/40">(You)</span></p>
                                <p className="text-xs text-white/50">Host</p>
                            </div>
                        </div>
                    )}

                    <div className="mx-auto mt-6 flex max-w-xs items-center justify-center gap-1">
                        {[0, 1, 2].map(i => (
                            <motion.span
                                key={i}
                                className="h-2.5 w-2.5 rounded-full bg-violet-400"
                                animate={{ opacity: [0.25, 1, 0.25] }}
                                transition={{ repeat: Infinity, duration: 1.1, delay: i * 0.2 }}
                            />
                        ))}
                    </div>

                    <button
                        onClick={() => { setFlow('subject'); setGame(null); gameIdRef.current = null; }}
                        className="mt-8 rounded-xl border border-white/15 px-5 py-2.5 text-sm font-bold text-white/70 hover:bg-white/5"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        );
    }

    /* ------------------------------ RESULT ------------------------------ */
    if (flow === 'result' && game) {
        const iWon = game.isTie ? false : String(game.winner) === myId;
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 px-4 py-8 text-white">
                <div className="mx-auto max-w-lg">
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="mb-6 text-center"
                    >
                        <div className={`mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl shadow-2xl ${
                            game.isTie ? 'bg-white/10' : iWon ? 'bg-gradient-to-br from-amber-400 to-orange-500 shadow-amber-500/30' : 'bg-gradient-to-br from-slate-600 to-slate-700'
                        }`}>
                            {game.isTie ? <Swords className="h-10 w-10" /> : iWon ? <Trophy className="h-10 w-10" /> : <Target className="h-10 w-10" />}
                        </div>
                        <h1 className="text-3xl font-black">
                            {game.isTie ? "It's a Tie!" : iWon ? 'You Won! 🎉' : 'Better luck next time'}
                        </h1>
                        <p className="mt-1 text-sm text-white/60">{game.testTitle}</p>
                    </motion.div>

                    <div className="mb-5 space-y-3">
                        {(game.players || []).map(p => (
                            <ScoreBadge
                                key={p._id}
                                player={p}
                                isMe={String(p.user) === myId}
                                isWinner={String(p.user) === String(game.winner || '')}
                                tie={game.isTie}
                            />
                        ))}
                    </div>

                    {/* Answer review */}
                    <div className="mb-6 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                        <h2 className="mb-3 text-sm font-black uppercase tracking-widest text-white/50">Answer review</h2>
                        <div className="space-y-2">
                            {game.questions.map((q, idx) => {
                                const myReveal = me?.reveal?.find(r => r.questionIndex === idx);
                                const correct = myReveal?.correct;
                                return (
                                    <div key={idx} className="flex items-start gap-2.5 rounded-xl bg-white/[0.03] px-3 py-2.5">
                                        {correct
                                            ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                                            : <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />}
                                        <div className="min-w-0">
                                            <p className="truncate text-xs font-bold text-white/80">{idx + 1}. {q.question}</p>
                                            <p className="text-[11px] text-white/45">
                                                Correct: <span className="font-bold text-emerald-300">{OPTION_LETTERS[q.correctOption]}. {q.options[q.correctOption]}</span>
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={() => { setFlow('subject'); setGame(null); gameIdRef.current = null; setMyAnswers({}); setCurrentQuestionIndex(0); }}
                            className="flex-1 rounded-2xl bg-gradient-to-r from-violet-500 to-indigo-600 py-3.5 font-black shadow-lg shadow-violet-500/25"
                        >
                            Play Again
                        </button>
                        <button
                            onClick={() => { setFlow('subject'); setGame(null); gameIdRef.current = null; setMyAnswers({}); setCurrentQuestionIndex(0); }}
                            className="rounded-2xl border border-white/15 px-6 py-3.5 font-bold text-white/70 hover:bg-white/5"
                        >
                            Exit
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    /* ------------------------------ PLAYING ------------------------------ */
    if (flow === 'playing' && game && currentQuestion) {
        const answeredCount = Object.keys(myAnswers).length;
        return (
            <div className="flex min-h-screen flex-col bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 text-white">
                {/* Top bar */}
                <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 sm:px-6">
                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-white/50">
                        <Zap className="h-4 w-4 text-amber-400" /> {game.testTitle}
                    </div>
                    <div className="flex items-center gap-2 text-xs font-black">
                        <span className="rounded-lg bg-white/10 px-2.5 py-1">
                            Q{currentQuestionIndex + 1} / {game.questions.length}
                        </span>
                        <span className="rounded-lg bg-emerald-500/20 px-2.5 py-1 text-emerald-300">{me?.score ?? 0} pts</span>
                    </div>
                </div>

                {/* Players race bar */}
                <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
                    {[me, opponent].map((p, i) => p ? (
                        <div key={p.user} className={`flex flex-1 items-center gap-2.5 rounded-2xl border px-3 py-2.5 ${
                            i === 0 ? 'border-violet-400/40 bg-violet-500/10' : 'border-white/10 bg-white/[0.04]'
                        }`}>
                            {p.photo ? (
                                <img src={getPhotoUrl(p.photo)} alt="" className="h-9 w-9 rounded-full border-2 border-white/15 object-cover" />
                            ) : (
                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-sm font-black">{p.name?.[0]}</div>
                            )}
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-black">{p.name} {i === 0 && <span className="text-white/40">(You)</span>}</p>
                                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
                                    <motion.div
                                        className="h-full rounded-full bg-gradient-to-r from-violet-400 to-indigo-500"
                                        animate={{ width: `${((i === 0 ? answeredCount : Object.keys(p.answers || {}).length) / game.questions.length) * 100}%` }}
                                    />
                                </div>
                            </div>
                            <span className="text-sm font-black">{i === 0 ? answeredCount : Object.keys(p.answers || {}).length}</span>
                        </div>
                    ) : <div key={i} className="flex-1" />)}
                </div>

                {/* Question */}
                <div className="flex flex-1 flex-col items-center justify-center px-4 pb-8 sm:px-6">
                    <motion.div
                        key={currentQuestionIndex}
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="w-full max-w-2xl"
                    >
                        <div className="mb-6 rounded-3xl border border-white/10 bg-white/[0.05] p-6 text-center">
                            <p className="text-xs font-black uppercase tracking-widest text-violet-300">Question {currentQuestionIndex + 1}</p>
                            <h2 className="mt-2 text-lg font-black leading-snug sm:text-xl">{currentQuestion.question}</h2>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                            {currentQuestion.options.map((option, idx) => {
                                const selected = mySelected === idx;
                                return (
                                    <button
                                        key={idx}
                                        onClick={() => selectAnswer(idx)}
                                        disabled={mySelected !== undefined || isSubmitting}
                                        className={`flex items-center gap-3 rounded-2xl border p-4 text-left font-bold transition-all ${
                                            selected
                                                ? `bg-gradient-to-r ${OPTION_STYLES[idx % OPTION_STYLES.length]} text-white shadow-lg scale-[0.98]`
                                                : 'border-white/10 bg-white/[0.05] hover:border-violet-400/50 hover:bg-violet-500/10 disabled:opacity-60'
                                        }`}
                                    >
                                        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-black ${
                                            selected ? 'bg-white/25' : 'bg-white/10'
                                        }`}>
                                            {OPTION_LETTERS[idx]}
                                        </span>
                                        <span className="text-sm leading-snug">{option}</span>
                                        {selected && <CheckCircle2 className="ml-auto h-5 w-5 shrink-0" />}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Status line */}
                        <div className="mt-5 text-center text-xs font-bold">
                            {mySelected !== undefined ? (
                                opponentAnswered || totalPlayed >= 2 ? (
                                    <span className="text-emerald-400">Dono ne answer kar diya — next aa raha hai…</span>
                                ) : (
                                    <span className="text-amber-300 flex items-center justify-center gap-1.5">
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Opponent ka answer ka intezar…
                                    </span>
                                )
                            ) : (
                                <span className="text-white/40">Answer chuno — dono select karenge to next question apne aap aayega</span>
                            )}
                        </div>
                    </motion.div>
                </div>
            </div>
        );
    }

    /* ------------------------------ LOADING / FALLBACK ------------------------------ */
    return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 text-white">
            <div className="text-center">
                <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-violet-400" />
                <p className="text-sm font-bold text-white/60">Loading Quiz Battle…</p>
                {error && <p className="mt-2 text-xs font-bold text-red-300">{error}</p>}
            </div>
        </div>
    );
};

export default QuizGame;
