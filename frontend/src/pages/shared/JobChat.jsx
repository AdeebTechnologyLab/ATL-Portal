import { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { ArrowLeft, Briefcase, MessageCircle, Search, Send, ShieldCheck, Trash2 } from 'lucide-react';
import { chatAPI, googleDriveAPI } from '../../services/api';
import ChatMediaButton from '../../components/shared/ChatMediaButton';
import ChatMediaDisplay from '../../components/shared/ChatMediaDisplay';
import Loader from '../../components/ui/Loader';
import ProfileAvatar from '../../components/ui/ProfileAvatar';

const JobChat = () => {
    const { user } = useSelector(state => state.auth);
    const location = useLocation();
    const [jobs, setJobs] = useState([]);
    const [activeJob, setActiveJob] = useState(null);
    const [activeContact, setActiveContact] = useState(null);
    const [messages, setMessages] = useState([]);
    const [text, setText] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [pendingMedia, setPendingMedia] = useState([]);
    const [driveStatus, setDriveStatus] = useState({ connected: false });
    const endRef = useRef(null);

    const loadJobs = async (quiet = false) => {
        try {
            const res = await chatAPI.getJobChats();
            setJobs(res.data.data || []);
        } finally { if (!quiet) setLoading(false); }
    };

    const loadMessages = async (job = activeJob, contact = activeContact) => {
        if (!job || !contact) return;
        const res = await chatAPI.getJobMessages(job._id, contact._id);
        setMessages(res.data.data || []);
        await chatAPI.markJobChatRead(job._id, contact._id);
        loadJobs(true);
    };

    useEffect(() => { loadJobs(); }, []);
    useEffect(() => {
        const timer = setInterval(() => {
            loadJobs(true);
            if (activeJob && activeContact) loadMessages(activeJob, activeContact);
        }, 5000);
        return () => clearInterval(timer);
    }, [activeJob, activeContact]);
    useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
    useEffect(() => {
        googleDriveAPI.getStatus().then(res => setDriveStatus(res.data)).catch(() => {});
    }, []);

    const openChat = async (job, contact) => {
        setActiveJob(job);
        setActiveContact(contact);
        setMessages([]);
        await loadMessages(job, contact);
    };

    const openApplicantJobChat = async (job) => {
        const primaryManager = job.contacts?.[0];
        if (!primaryManager) return;
        await openChat(job, primaryManager);
    };

    useEffect(() => {
        if (user?.role !== 'job' || activeJob || jobs.length === 0) return;
        const requestedJob = location.state?.taskId
            ? jobs.find(job => String(job._id) === String(location.state.taskId))
            : null;
        openApplicantJobChat(requestedJob || jobs[0]);
    }, [jobs, location.state?.taskId, user?.role, activeJob]);

    const send = async e => {
        e.preventDefault();
        if ((!text.trim() && pendingMedia.length === 0) || !activeJob || !activeContact || sending) return;
        setSending(true);
        try {
            const res = await chatAPI.sendJobMessage(activeJob._id, activeContact._id, text.trim(), pendingMedia);
            setMessages(prev => [...prev, res.data.data]);
            setText('');
            setPendingMedia([]);
        } finally { setSending(false); }
    };

    const clearChat = async () => {
        if (!window.confirm(`Clear all job chat with ${activeContact.name}?`)) return;
        await chatAPI.clearJobChat(activeJob._id, activeContact._id);
        setMessages([]);
    };

    const visibleJobs = jobs.filter(job => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return true;
        return job.title?.toLowerCase().includes(query) ||
            (job.contacts || []).some(contact => contact.name?.toLowerCase().includes(query));
    });

    if (loading) return <Loader message="Loading job chats..." />;

    return (
        <div className="flex h-[calc(100dvh-8.5rem)] min-h-0 flex-col gap-4 overflow-hidden">
            <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-primary/20">
                    <MessageCircle className="h-5 w-5" />
                </div>
                <div>
                    <h1 className="text-xl font-black text-gray-900 dark:text-white sm:text-2xl">Job Messages</h1>
                    <p className="text-xs text-gray-500 dark:text-gray-400 sm:text-sm">Private conversations about assigned work</p>
                </div>
            </div>
            <div className={`grid min-h-0 flex-1 grid-cols-1 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl shadow-gray-200/40 dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/20 ${user?.role === 'job' ? '' : 'lg:grid-cols-[330px_1fr]'}`}>
                {user?.role !== 'job' && <aside className={`${activeContact ? 'hidden lg:flex' : 'flex'} h-full min-h-0 flex-col border-r border-gray-200 bg-gray-50/60 dark:border-slate-700 dark:bg-slate-900`}>
                    <div className="border-b border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                        <div className="mb-3 flex items-center justify-between">
                            <div>
                                <p className="font-black text-gray-900 dark:text-white">Conversations</p>
                                <p className="text-[11px] text-gray-400">{jobs.length} job thread{jobs.length === 1 ? '' : 's'}</p>
                            </div>
                            <span className="flex h-8 min-w-8 items-center justify-center rounded-full bg-primary/10 px-2 text-xs font-black text-primary">{jobs.reduce((sum, job) => sum + Number(job.totalUnread || 0), 0)}</span>
                        </div>
                        <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800">
                            <Search className="h-4 w-4 text-gray-400" />
                            <input value={searchQuery} onChange={event => setSearchQuery(event.target.value)} placeholder="Search conversations" className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm text-gray-900 outline-none ring-0 placeholder:text-gray-400 focus:border-0 focus:ring-0 dark:text-white" />
                        </div>
                    </div>
                    <div className="no-scrollbar flex-1 overflow-y-auto p-2">
                    {visibleJobs.length === 0 ? <div className="flex h-56 flex-col items-center justify-center px-6 text-center"><MessageCircle className="mb-3 h-9 w-9 text-gray-300" /><p className="text-sm font-semibold text-gray-500 dark:text-gray-400">No conversations found</p></div> : visibleJobs.map(job => (
                        <div key={job._id} className="mb-1">
                            {user?.role === 'job' ? (
                                <button
                                    onClick={() => openApplicantJobChat(job)}
                                    className={`group flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all ${activeJob?._id === job._id ? 'border-primary/20 bg-white shadow-sm ring-1 ring-primary/10 dark:bg-slate-800' : 'border-transparent hover:bg-white hover:shadow-sm dark:hover:bg-slate-800'}`}
                                >
                                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${activeJob?._id === job._id ? 'bg-primary text-white' : 'bg-primary/10 text-primary'}`}><Briefcase className="h-5 w-5" /></div>
                                    <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-gray-900 dark:text-gray-100">{job.title}</p><p className="mt-0.5 truncate text-[11px] text-gray-400">{job.contacts?.[0]?.name || 'Job manager'} · Private chat</p></div>
                                    {job.totalUnread > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white">{job.totalUnread}</span>}
                                </button>
                            ) : <>
                            <div className="flex items-center gap-2 mb-2">
                                <Briefcase className="w-4 h-4 text-primary" />
                                <p className="font-bold text-sm text-gray-900 dark:text-gray-100 flex-1">{job.title}</p>
                                {job.totalUnread > 0 && <span className="bg-red-500 text-white text-xs rounded-full min-w-5 h-5 px-1 flex items-center justify-center">{job.totalUnread}</span>}
                            </div>
                            <div className="space-y-1">
                                {job.contacts.map(contact => (
                                    <button key={contact._id} onClick={() => openChat(job, contact)} className={`w-full flex items-center gap-2 p-2 rounded-xl text-left transition-colors ${activeJob?._id === job._id && activeContact?._id === contact._id ? 'bg-primary/10 dark:bg-primary/25' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                                        <div className="w-9 h-9 rounded-full overflow-hidden bg-primary text-white flex items-center justify-center font-bold shrink-0">
                                            {contact.photo ? <img src={contact.photo} alt={contact.name} className="w-full h-full object-cover" /> : contact.name?.charAt(0)}
                                        </div>
                                        <span className="text-sm font-semibold text-gray-800 dark:text-gray-100 flex-1 truncate">{contact.name}</span>
                                        {contact.unreadCount > 0 && <span className="bg-red-500 text-white text-[10px] rounded-full min-w-5 h-5 px-1 flex items-center justify-center">{contact.unreadCount}</span>}
                                    </button>
                                ))}
                            </div>
                            </>}
                        </div>
                    ))}
                    </div>
                </aside>}
                <section className={`${activeContact || user?.role === 'job' ? 'flex' : 'hidden lg:flex'} flex-col min-w-0 min-h-0`}>
                    {!activeContact ? (
                        <div className="flex flex-1 flex-col items-center justify-center bg-gradient-to-br from-white to-gray-50 px-6 text-center text-gray-400 dark:from-slate-900 dark:to-slate-950 dark:text-gray-500"><div className="mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-primary/10"><MessageCircle className="h-9 w-9 text-primary" /></div><p className="text-lg font-black text-gray-700 dark:text-slate-200">Select a conversation</p><p className="mt-1 max-w-xs text-sm">Choose a job thread to view messages and continue the discussion.</p></div>
                    ) : <>
                        <header className="flex min-h-[72px] shrink-0 items-center gap-3 border-b border-gray-200 bg-white px-3 py-3 dark:border-slate-700 dark:bg-slate-900 sm:px-5">
                            {user?.role !== 'job' && <button
                                type="button"
                                onClick={() => {
                                    setActiveContact(null);
                                    setActiveJob(null);
                                    setMessages([]);
                                }}
                                className="lg:hidden w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 flex items-center justify-center shrink-0"
                                aria-label="Back to conversations"
                            >
                                <ArrowLeft className="w-4 h-4" />
                            </button>}
                            {user?.role === 'job' ? (
                                <div className="flex min-w-0 flex-1 items-center gap-4">
                                    <div className="min-w-0 shrink-0"><p className="max-w-44 truncate text-sm font-black text-gray-900 dark:text-white sm:max-w-60">{activeJob.title}</p><p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">Job contacts</p></div>
                                    <div className="no-scrollbar flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1">
                                        {(activeJob.contacts || []).map(contact => (
                                            <div
                                                key={contact._id}
                                                className="relative flex w-[76px] shrink-0 flex-col items-center px-1 py-1 text-center"
                                            >
                                                <div className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-primary to-orange-400 text-xs font-black text-white">
                                                    <span>{contact.name?.charAt(0)?.toUpperCase() || '?'}</span>
                                                    {contact.photo && <img src={contact.photo} alt="" className="absolute inset-0 h-full w-full object-cover" onError={event => { event.currentTarget.style.display = 'none'; }} />}
                                                </div>
                                                <p className="mt-1.5 w-full truncate text-[11px] font-black text-gray-800 dark:text-slate-100">{contact.name}</p>
                                                {contact.unreadCount > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-black text-white ring-2 ring-white dark:ring-slate-900">{contact.unreadCount}</span>}
                                            </div>
                                        ))}
                                    </div>
                                    <span className="hidden shrink-0 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 sm:block">{activeJob.contacts?.length || 0} contacts</span>
                                </div>
                            ) : <>
                                <ProfileAvatar src={activeContact.photo} name={activeContact.name} size="md" />
                                <div className="min-w-0 flex-1"><div className="flex items-center gap-1.5"><p className="truncate font-black text-gray-900 dark:text-white">{activeContact.name}</p><ShieldCheck className="h-4 w-4 flex-none text-emerald-500" /></div><p className="truncate text-xs text-gray-500 dark:text-gray-400">{activeJob.title}</p></div>
                            </>}
                            {user?.role === 'admin' && <button onClick={clearChat} className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg" title="Clear chat"><Trash2 className="w-5 h-5" /></button>}
                        </header>
                        <div className="no-scrollbar flex-1 min-h-0 p-3 sm:p-5 overflow-y-auto bg-[#f6f7fb] dark:bg-slate-950 space-y-3">
                            {messages.length === 0 && <div className="mx-auto mt-14 max-w-xs text-center"><div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm dark:bg-slate-900"><Send className="h-5 w-5 text-primary" /></div><p className="font-bold text-gray-700 dark:text-slate-200">Start the conversation</p><p className="mt-1 text-xs text-gray-400">Send a message about this job.</p></div>}
                            {messages.map(message => {
                                const mine = String(message.sender?._id || message.sender) === String(user?.id || user?._id);
                                return <div key={message._id} className={`flex items-end gap-2 ${mine ? 'justify-end' : 'justify-start'}`}>{!mine && <ProfileAvatar src={message.sender?.photo} name={message.sender?.name} size="xs" />}<div className={`max-w-[82%] px-3.5 py-2.5 shadow-sm sm:max-w-[70%] ${mine ? 'rounded-2xl rounded-br-sm bg-primary text-white' : 'rounded-2xl rounded-bl-sm border border-gray-200 bg-white text-gray-800 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-100'}`}><p className="whitespace-pre-wrap break-words text-[13px] leading-relaxed sm:text-sm">{message.text}</p><ChatMediaDisplay media={message.media} isMine={mine} /><p className={`mt-1.5 text-right text-[9px] ${mine ? 'text-white/65' : 'text-gray-400'}`}>{new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p></div></div>;
                            })}
                            <div ref={endRef} />
                        </div>
                        <form onSubmit={send} className="flex shrink-0 gap-2 border-t border-gray-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900 sm:p-4">
                            <ChatMediaButton onMediaUploaded={setPendingMedia} driveStatus={driveStatus} disabled={sending} />
                            <div className="flex min-w-0 flex-1 items-center rounded-2xl border border-gray-200 bg-gray-50 px-4 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10 dark:border-slate-700 dark:bg-slate-800"><input value={text} onChange={e => setText(e.target.value)} placeholder="Type your message..." className="min-w-0 flex-1 border-0 bg-transparent py-3 text-sm text-gray-900 outline-none ring-0 placeholder:text-gray-400 focus:border-0 focus:ring-0 dark:text-white" /></div>
                            <button disabled={(!text.trim() && pendingMedia.length === 0) || sending} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-primary/20 transition-transform hover:scale-105 disabled:scale-100 disabled:opacity-40"><Send className="h-5 w-5" /></button>
                        </form>
                    </>}
                </section>
            </div>
        </div>
    );
};

export default JobChat;
