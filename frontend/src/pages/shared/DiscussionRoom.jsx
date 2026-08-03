import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { io } from 'socket.io-client';
import { MessageSquare, Send, Trash2, Users, Loader2, Circle, BarChart3, Plus, X, Smile } from 'lucide-react';
import { chatAPI, googleDriveAPI } from '../../services/api';
import { getSocketURL } from '../../config/apiBaseUrl';
import ChatMediaButton from '../../components/shared/ChatMediaButton';
import ChatMediaDisplay from '../../components/shared/ChatMediaDisplay';

const isUserOnline = (lastSeen) => {
    if (!lastSeen) return false;
    return (Date.now() - new Date(lastSeen).getTime()) / 1000 / 60 < 2;
};

const linkRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;

const getSafeLink = (value) => {
    if (!value) return '#';
    return value.toLowerCase().startsWith('http') ? value : `https://${value}`;
};

const ADMIN_PHOTO = 'https://res.cloudinary.com/adeeb-tech-lab/image/upload/v1780787310/Company%20Logo/LMS_admin.jpg';
const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '👏', '🔥'];

const getSenderPhoto = (sender = {}, currentUser = {}) => {
    if (sender.photo) return sender.photo;
    if (sender.role === 'admin') return ADMIN_PHOTO;
    if (String(sender._id || '') === String(currentUser?._id || currentUser?.id || '') && currentUser?.photo) {
        return currentUser.photo;
    }
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(sender.name || 'User')}&background=1e1f21&color=fff`;
};

const renderMessageText = (text = '') => {
    const parts = String(text).split(linkRegex);
    return parts.map((part, index) => {
        if (!part.match(linkRegex)) return part;

        const trailingMatch = part.match(/[.,!?)]$/);
        const trailing = trailingMatch ? trailingMatch[0] : '';
        const cleanLink = trailing ? part.slice(0, -1) : part;

        return (
            <span key={`${cleanLink}-${index}`}>
                <a
                    href={getSafeLink(cleanLink)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-primary underline decoration-primary/30 underline-offset-2 break-all hover:decoration-primary"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        window.open(getSafeLink(cleanLink), '_blank', 'noopener,noreferrer');
                    }}
                >
                    {cleanLink}
                </a>
                {trailing}
            </span>
        );
    });
};

const groupReactions = (reactions = []) => {
    return reactions.reduce((groups, reaction) => {
        if (!reaction?.emoji) return groups;
        if (!groups[reaction.emoji]) groups[reaction.emoji] = [];
        groups[reaction.emoji].push(String(reaction.user?._id || reaction.user || ''));
        return groups;
    }, {});
};

const getPollStats = (poll = {}, myId) => {
    const options = poll.options || [];
    const totalVotes = options.reduce((sum, option) => sum + (option.votes || []).length, 0);
    const myVoteIndex = options.findIndex(option => (option.votes || []).some(vote => String(vote?._id || vote) === String(myId)));
    return { totalVotes, myVoteIndex };
};

const DiscussionRoom = () => {
    const { user, role } = useSelector((state) => state.auth);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [onlineCount, setOnlineCount] = useState(0);
    const [reactionPickerFor, setReactionPickerFor] = useState(null);
    const [showPollForm, setShowPollForm] = useState(false);
    const [showComposerActions, setShowComposerActions] = useState(false);
    const [pollQuestion, setPollQuestion] = useState('');
    const [pollOptions, setPollOptions] = useState(['', '']);
    const [pendingMedia, setPendingMedia] = useState([]);
    const [driveStatus, setDriveStatus] = useState({ connected: false });
    const socketRef = useRef(null);
    const messagesContainerRef = useRef(null);
    const bottomRef = useRef(null);
    const myId = user?._id || user?.id;
    const myEmail = (user?.email || '').toLowerCase();
    const myRollNo = (user?.rollNo || '').toLowerCase();
    const isAdmin = role === 'admin';
    const canCreatePoll = role === 'teacher';

    const loadMessages = async () => {
        try {
            const res = await chatAPI.getDiscussionMessages();
            setMessages(res.data.data || []);
            try {
                await chatAPI.markDiscussionRead();
            } catch (readError) {
                console.error('Discussion read mark failed:', readError);
            }
        } catch (error) {
            alert(error.response?.data?.message || 'Discussion messages load nahi ho sakay.');
        } finally {
            setLoading(false);
        }
    };

    const loadOnlineCount = async () => {
        try {
            const res = await chatAPI.getDiscussionOnlineCount();
            setOnlineCount(Number(res.data.count || 0));
        } catch (error) {
            console.error('Online users count load failed:', error);
        }
    };

    useEffect(() => {
        loadMessages();
        loadOnlineCount();

        socketRef.current = io(getSocketURL(), { withCredentials: true });
        if (myId) socketRef.current.emit('join_chat', String(myId));

        socketRef.current.on('discussion_message', (message) => {
            setMessages(prev => prev.some(m => String(m._id) === String(message._id)) ? prev : [...prev, message]);
            setTimeout(() => {
                chatAPI.markDiscussionRead().catch(() => {});
            }, 300);
        });

        socketRef.current.on('discussion_message_deleted', ({ messageId }) => {
            setMessages(prev => prev.filter(m => String(m._id) !== String(messageId)));
        });

        socketRef.current.on('discussion_cleared', () => {
            setMessages([]);
        });

        socketRef.current.on('discussion_reaction_updated', (updatedMessage) => {
            setMessages(prev => prev.map(msg => String(msg._id) === String(updatedMessage._id) ? updatedMessage : msg));
        });

        socketRef.current.on('discussion_poll_updated', (updatedMessage) => {
            setMessages(prev => prev.map(msg => String(msg._id) === String(updatedMessage._id) ? updatedMessage : msg));
        });

        socketRef.current.on('user_status_update', (data) => {
            setMessages(prev => prev.map(msg => (
                String(msg.sender?._id) === String(data.userId)
                    ? { ...msg, sender: { ...msg.sender, lastSeen: data.lastSeen } }
                    : msg
            )));
            loadOnlineCount();
        });

        const heartbeatInterval = setInterval(() => {
            if (socketRef.current && myId) socketRef.current.emit('heartbeat', String(myId));
        }, 30000);
        const onlineInterval = setInterval(loadOnlineCount, 30000);

        return () => {
            clearInterval(heartbeatInterval);
            clearInterval(onlineInterval);
            socketRef.current?.disconnect();
        };
    }, [myId]);

    useEffect(() => {
        googleDriveAPI.getStatus().then(res => setDriveStatus(res.data)).catch(() => {});
    }, []);

    const scrollToBottom = (smooth = true) => {
        requestAnimationFrame(() => {
            const container = messagesContainerRef.current;
            if (container) {
                container.scrollTo({
                    top: container.scrollHeight,
                    behavior: smooth ? 'smooth' : 'auto'
                });
            }
            bottomRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'end' });
        });
    };

    useLayoutEffect(() => {
        if (!loading) {
            scrollToBottom(false);
            const timeout = setTimeout(() => scrollToBottom(false), 120);
            return () => clearTimeout(timeout);
        }
    }, [loading]);

    useEffect(() => {
        if (!loading) scrollToBottom(true);
    }, [messages.length, loading]);

    const sendMessage = async (e) => {
        e.preventDefault();
        const text = newMessage.trim();
        if ((!text && pendingMedia.length === 0) || sending) return;
        setSending(true);
        setNewMessage('');
        try {
            const res = await chatAPI.sendDiscussionMessage(text, pendingMedia);
            const saved = res.data.data;
            setPendingMedia([]);
            setMessages(prev => prev.some(m => String(m._id) === String(saved._id)) ? prev : [...prev, saved]);
        } catch (error) {
            setNewMessage(text);
            alert(error.response?.data?.message || 'Message send nahi ho saka.');
        } finally {
            setSending(false);
        }
    };

    const deleteMessage = async (messageId) => {
        if (!window.confirm('Ye message delete karna hai?')) return;
        try {
            await chatAPI.deleteDiscussionMessage(messageId);
            setMessages(prev => prev.filter(m => String(m._id) !== String(messageId)));
        } catch (error) {
            alert(error.response?.data?.message || 'Message delete nahi ho saka.');
        }
    };

    const clearAll = async () => {
        if (!window.confirm('Poori discussion room chat clear karni hai?')) return;
        try {
            await chatAPI.clearDiscussion();
            setMessages([]);
        } catch (error) {
            alert(error.response?.data?.message || 'Discussion clear nahi ho saki.');
        }
    };

    const handleReaction = async (messageId, emoji) => {
        try {
            setReactionPickerFor(null);
            const res = await chatAPI.toggleDiscussionReaction(messageId, emoji);
            const updatedMessage = res.data.data;
            setMessages(prev => prev.map(msg => String(msg._id) === String(messageId) ? updatedMessage : msg));
        } catch (error) {
            alert(error.response?.data?.message || 'Reaction add nahi ho saka.');
        }
    };

    const createPoll = async (e) => {
        e.preventDefault();
        const question = pollQuestion.trim();
        const options = pollOptions.map(option => option.trim()).filter(Boolean);
        if (!question || options.length < 2) {
            alert('Poll question aur kam az kam 2 options required hain.');
            return;
        }
        try {
            const res = await chatAPI.createDiscussionPoll(question, options);
            const saved = res.data.data;
            setMessages(prev => prev.some(m => String(m._id) === String(saved._id)) ? prev : [...prev, saved]);
            setPollQuestion('');
            setPollOptions(['', '']);
            setShowPollForm(false);
            setShowComposerActions(false);
        } catch (error) {
            alert(error.response?.data?.message || 'Poll create nahi ho saka.');
        }
    };

    const votePoll = async (messageId, optionIndex) => {
        try {
            const res = await chatAPI.voteDiscussionPoll(messageId, optionIndex);
            const updatedMessage = res.data.data;
            setMessages(prev => prev.map(msg => String(msg._id) === String(messageId) ? updatedMessage : msg));
        } catch (error) {
            alert(error.response?.data?.message || 'Vote save nahi ho saka.');
        }
    };

    return (
        <div
            onContextMenu={(e) => e.preventDefault()}
            className="h-full min-h-0 overflow-hidden p-3 sm:p-4 md:p-5 flex flex-col gap-3 sm:gap-4 bg-gray-50 dark:bg-gray-950"
        >
            <div className="relative shrink-0 overflow-hidden bg-gradient-to-r from-[var(--bg-sidebar)] to-[var(--bg-sidebar-light)] rounded-xl sm:rounded-2xl p-3 sm:p-5 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                <div className="absolute -right-12 -top-12 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
                <div className="absolute -bottom-16 left-1/3 w-44 h-44 rounded-full bg-white/10 blur-3xl" />
                <div className="relative z-10 flex items-center gap-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center">
                        <MessageSquare className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-lg sm:text-2xl font-black tracking-tight">Discussion Room</h1>
                        <p className="hidden sm:block text-white/70 text-sm">Premium group discussion for all panels.</p>
                    </div>
                </div>
                <div className="relative z-10 flex items-center gap-3">
                    <div className="px-4 py-2 rounded-xl bg-white/15 border border-white/20 text-xs font-black flex items-center gap-2 text-white">
                        <Users className="w-4 h-4 text-white" />
                        {messages.length} Messages
                    </div>
                    <div className="px-4 py-2 rounded-xl bg-white/15 border border-white/20 text-xs font-black flex items-center gap-2 text-white">
                        <Circle className="w-3 h-3 fill-green-400 text-green-400" />
                        {onlineCount} Online
                    </div>
                    {isAdmin && (
                        <button
                            onClick={clearAll}
                            className="px-4 py-2 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-200 border border-red-500/25 text-xs font-black flex items-center gap-2 transition-all"
                        >
                            <Trash2 className="w-4 h-4" />
                            Clear All
                        </button>
                    )}
                </div>
            </div>

            <div className="flex-1 min-h-0 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl sm:rounded-2xl shadow-sm overflow-hidden flex flex-col">
                {loading ? (
                    <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400 gap-3">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Loading discussion...
                    </div>
                ) : (
                    <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5 bg-white dark:bg-gray-950">
                        {messages.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 dark:text-gray-400">
                                <MessageSquare className="w-16 h-16 mb-3 opacity-30" />
                                <p className="font-black uppercase tracking-widest">No discussion yet</p>
                                <p className="text-sm">Pehla message send karein.</p>
                            </div>
                        ) : messages.map((msg) => {
                            const sender = msg.sender || {};
                            const mine = String(sender._id) === String(myId)
                                || (!!myEmail && (sender.email || '').toLowerCase() === myEmail)
                                || (!!myRollNo && (sender.rollNo || '').toLowerCase() === myRollNo);
                            const online = isUserOnline(sender.lastSeen);
                            const reactionGroups = groupReactions(msg.reactions || []);
                            const hasPoll = !!msg.poll?.question;
                            const { totalVotes, myVoteIndex } = getPollStats(msg.poll, myId);
                            return (
                                <div key={msg._id} className={`flex items-start gap-4 ${mine ? 'justify-end flex-row-reverse' : 'justify-start'}`}>
                                    <div className="relative shrink-0">
                                        <img
                                            src={getSenderPhoto(sender, user)}
                                            alt={sender.name || 'User'}
                                            onContextMenu={(e) => e.preventDefault()}
                                            draggable={false}
                                            className="w-11 h-11 rounded-full object-cover border border-primary/50 shadow-sm select-none"
                                        />
                                        {online && (
                                            <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-white dark:border-gray-950 shadow-[0_0_10px_rgba(34,197,94,0.9)]" />
                                        )}
                                    </div>
                                    <div className={`min-w-0 max-w-[calc(100%-64px)] sm:max-w-[72%] ${mine ? 'ml-auto' : 'mr-auto'}`}>
                                        <div className={`group relative rounded-xl ${
                                            mine
                                                ? 'bg-primary/5 border-primary/15'
                                                : 'bg-gray-50 dark:bg-[#1e1f21] border-gray-100 dark:border-white/[0.06]'
                                        } border px-5 py-4 shadow-sm overflow-visible ${
                                            mine ? 'rounded-tr-sm' : 'rounded-tl-sm'
                                        }`}>
                                            <span className={`absolute top-3 bottom-3 w-[3px] rounded-full bg-primary/60 ${mine ? 'right-0' : 'left-0'}`} />
                                            <div className="flex items-center justify-between gap-3 mb-2">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <span className="text-sm font-black text-gray-900 dark:text-white truncate">
                                                        {sender.name || 'User'}
                                                    </span>
                                                    {sender.rollNo && (
                                                        <span className="shrink-0 text-[11px] font-bold text-gray-500 dark:text-[#8E9297]">
                                                            #{sender.rollNo}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            {hasPoll ? (
                                                <div className="space-y-3">
                                                    <div className="rounded-2xl border border-primary/15 bg-white/70 dark:bg-white/5 p-4">
                                                        <div className="flex items-center gap-2 mb-3">
                                                            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                                                                <BarChart3 className="w-4 h-4 text-primary" />
                                                            </div>
                                                            <div>
                                                                <p className="text-[10px] font-black uppercase tracking-widest text-primary">Poll</p>
                                                                <h4 className="font-black text-gray-900 dark:text-white">{msg.poll.question}</h4>
                                                            </div>
                                                        </div>
                                                        <div className="space-y-2">
                                                            {(msg.poll.options || []).map((option, optionIndex) => {
                                                                const votes = option.votes || [];
                                                                const percentage = totalVotes > 0 ? Math.round((votes.length / totalVotes) * 100) : 0;
                                                                const selected = myVoteIndex === optionIndex;
                                                                return (
                                                                    <button
                                                                        key={`${msg._id}-${optionIndex}`}
                                                                        type="button"
                                                                        onClick={() => votePoll(msg._id, optionIndex)}
                                                                        className={`relative w-full overflow-hidden rounded-xl border px-4 py-3 text-left transition-all ${
                                                                            selected
                                                                                ? 'border-primary bg-primary/10'
                                                                                : 'border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 hover:border-primary/40'
                                                                        }`}
                                                                    >
                                                                        <span
                                                                            className="absolute inset-y-0 left-0 bg-primary/15"
                                                                            style={{ width: `${percentage}%` }}
                                                                        />
                                                                        <span className="relative z-10 flex items-center justify-between gap-3">
                                                                            <span className="text-sm font-bold text-gray-900 dark:text-white">{option.text}</span>
                                                                            <span className="text-xs font-black text-primary">{percentage}% · {votes.length}</span>
                                                                        </span>
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                        <p className="mt-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                                                            {totalVotes} Vote{totalVotes === 1 ? '' : 's'}
                                                        </p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <p className="text-sm whitespace-pre-wrap break-words leading-relaxed font-normal text-gray-800 dark:text-white">
                                                    {renderMessageText(msg.text)}
                                                </p>
                                            )}
                                            <ChatMediaDisplay media={msg.media} isMine={mine} />
                                            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                                                <div className="flex flex-wrap items-center gap-2">
                                                {Object.entries(reactionGroups).map(([emoji, users]) => {
                                                    const reactedByMe = users.includes(String(myId));
                                                    return (
                                                        <button
                                                            key={emoji}
                                                            type="button"
                                                            onClick={() => handleReaction(msg._id, emoji)}
                                                            className={`px-2.5 py-1 rounded-full text-xs font-black border transition-all ${
                                                                reactedByMe
                                                                    ? 'bg-primary text-white border-primary shadow-sm'
                                                                    : 'bg-white dark:bg-white/5 text-gray-700 dark:text-white border-gray-200 dark:border-white/10 hover:border-primary/40'
                                                            }`}
                                                            title={reactedByMe ? 'Remove reaction' : 'React'}
                                                        >
                                                            <span className="mr-1">{emoji}</span>
                                                            {users.length}
                                                        </button>
                                                    );
                                                })}
                                                </div>
                                                <div className="relative ml-auto flex items-center gap-2">
                                                    <span className="text-[10px] font-semibold text-gray-500 dark:text-[#8E9297]">
                                                        {new Date(msg.createdAt).toLocaleString('en-US', {
                                                            day: '2-digit',
                                                            month: 'short',
                                                            hour: '2-digit',
                                                            minute: '2-digit',
                                                            hour12: true
                                                        })}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => setReactionPickerFor(reactionPickerFor === msg._id ? null : msg._id)}
                                                        className="relative w-7 h-7 rounded-full text-sm font-black bg-gray-100 dark:bg-white/5 text-transparent border border-gray-200 dark:border-white/10 hover:border-primary/40 transition-all flex items-center justify-center after:content-['😊'] after:absolute after:inset-0 after:flex after:items-center after:justify-center after:text-gray-500 dark:after:text-gray-300"
                                                        title="Add reaction"
                                                        style={{ display: 'none' }}
                                                    >
                                                        😊
                                                    </button>
                                                    {reactionPickerFor === msg._id && (
                                                        <div className={`absolute z-[999] bottom-full mb-2 ${mine ? 'right-0' : 'left-0'} flex items-center gap-1 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 p-2 shadow-xl`}>
                                                            {REACTION_EMOJIS.map((emoji) => (
                                                                <button
                                                                    key={emoji}
                                                                    type="button"
                                                                    onClick={() => handleReaction(msg._id, emoji)}
                                                                    className="w-9 h-9 rounded-xl text-lg hover:bg-primary/10 transition-all"
                                                                >
                                                                    {emoji}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setReactionPickerFor(reactionPickerFor === msg._id ? null : msg._id)}
                                                className={`absolute ${mine ? '-left-4' : '-right-4'} -bottom-4 z-40 w-8 h-8 rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur border border-gray-200/80 dark:border-white/10 shadow-sm hover:shadow-md hover:border-primary/40 transition-all flex items-center justify-center text-transparent`}
                                                title="Add reaction"
                                            >
                                                <Smile className="absolute w-4 h-4 text-black/50" />
                                                😊
                                            </button>
                                            {isAdmin && (
                                                <button
                                                    onClick={() => deleteMessage(msg._id)}
                                                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-red-500/15 text-red-200 border border-red-500/20 shadow-lg hidden group-hover:flex items-center justify-center hover:bg-red-500/25"
                                                    title="Delete message"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={bottomRef} />
                    </div>
                )}

                {showPollForm && canCreatePoll && (
                    <form onSubmit={createPoll} className="mx-3 md:mx-4 mb-3 rounded-2xl border border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-[#111827] p-4 shadow-sm space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-black uppercase tracking-widest text-gray-900 dark:text-white flex items-center gap-2">
                                <BarChart3 className="w-4 h-4 text-primary" />
                                Create Poll
                            </h3>
                            <button type="button" onClick={() => setShowPollForm(false)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <input
                            value={pollQuestion}
                            onChange={(e) => setPollQuestion(e.target.value)}
                            placeholder="Poll question..."
                            className="w-full px-4 py-3 rounded-xl bg-white dark:bg-[#1e1f21] border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white outline-none focus:border-primary/70"
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {pollOptions.map((option, index) => (
                                <input
                                    key={index}
                                    value={option}
                                    onChange={(e) => setPollOptions(prev => prev.map((value, i) => i === index ? e.target.value : value))}
                                    placeholder={`Option ${index + 1}`}
                                    className="px-4 py-2.5 rounded-xl bg-white dark:bg-[#1e1f21] border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white outline-none focus:border-primary/70"
                                />
                            ))}
                        </div>
                        <div className="flex flex-wrap gap-2 justify-between">
                            <button
                                type="button"
                                onClick={() => pollOptions.length < 6 && setPollOptions(prev => [...prev, ''])}
                                disabled={pollOptions.length >= 6}
                                className="px-4 py-2 rounded-xl bg-white dark:bg-white/10 text-gray-700 dark:text-white text-xs font-black disabled:opacity-50 flex items-center gap-2"
                            >
                                <Plus className="w-4 h-4" />
                                Add Option
                            </button>
                            <button type="submit" className="px-5 py-2 rounded-xl bg-primary text-white text-xs font-black">
                                Post Poll
                            </button>
                        </div>
                    </form>
                )}

                <form onSubmit={sendMessage} className="p-3 md:p-4 border-t border-gray-100 dark:border-white/10 bg-white dark:bg-[#171819] flex gap-3">
                    {canCreatePoll && (
                        <div className="relative shrink-0">
                            <button
                                type="button"
                                onClick={() => setShowComposerActions(prev => !prev)}
                                className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-300 hover:text-primary hover:border-primary/40 transition-all flex items-center justify-center"
                                title="More options"
                            >
                                <Plus className={`w-5 h-5 transition-transform ${showComposerActions ? 'rotate-45' : ''}`} />
                            </button>
                            {showComposerActions && (
                                <div className="absolute bottom-full left-0 mb-2 w-44 rounded-2xl border border-gray-100 dark:border-white/10 bg-white dark:bg-gray-900 p-2 shadow-xl z-50">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowPollForm(true);
                                            setShowComposerActions(false);
                                        }}
                                        className="w-full px-3 py-2.5 rounded-xl text-left text-sm font-black text-gray-700 dark:text-white hover:bg-primary/10 flex items-center gap-2"
                                    >
                                        <BarChart3 className="w-4 h-4 text-primary" />
                                        Poll
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                    <ChatMediaButton
                        onMediaUploaded={setPendingMedia}
                        driveStatus={driveStatus}
                        disabled={sending}
                    />
                    <input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Discussion room mein message type karein..."
                        className="flex-1 px-4 py-3 rounded-xl bg-gray-50 dark:bg-[#1e1f21] border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-[#8E9297] outline-none focus:border-primary/70"
                    />
                    <button
                        disabled={(!newMessage.trim() && pendingMedia.length === 0) || sending}
                        className="px-5 py-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-black disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-primary/20"
                    >
                        {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        <span className="hidden sm:inline">Send</span>
                    </button>
                </form>
            </div>
        </div>
    );
};

export default DiscussionRoom;
