import { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { ArrowLeft, Briefcase, MessageCircle, Send, Trash2 } from 'lucide-react';
import { chatAPI } from '../../services/api';
import Loader from '../../components/ui/Loader';

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
        if (user?.role !== 'job' || !location.state?.taskId || activeJob || jobs.length === 0) return;
        const requestedJob = jobs.find(job => String(job._id) === String(location.state.taskId));
        if (requestedJob) openApplicantJobChat(requestedJob);
    }, [jobs, location.state?.taskId, user?.role, activeJob]);

    const send = async e => {
        e.preventDefault();
        if (!text.trim() || !activeJob || !activeContact || sending) return;
        setSending(true);
        try {
            const res = await chatAPI.sendJobMessage(activeJob._id, activeContact._id, text.trim());
            setMessages(prev => [...prev, res.data.data]);
            setText('');
        } finally { setSending(false); }
    };

    const clearChat = async () => {
        if (!window.confirm(`Clear all job chat with ${activeContact.name}?`)) return;
        await chatAPI.clearJobChat(activeJob._id, activeContact._id);
        setMessages([]);
    };

    if (loading) return <Loader message="Loading job chats..." />;

    return (
        <div className="space-y-3 sm:space-y-4">
            <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Job Collaboration</h1>
                <p className="text-xs sm:text-base text-gray-500 dark:text-gray-400">Jobs, applicants and private discussions in one place</p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] h-[calc(100dvh-10rem)] min-h-[520px] lg:min-h-[620px] bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl sm:rounded-2xl overflow-hidden shadow-sm">
                <aside className={`${activeContact ? 'hidden lg:block' : 'block'} border-r border-gray-100 dark:border-gray-700 overflow-y-auto h-full bg-white dark:bg-gray-900`}>
                    {jobs.length === 0 ? <p className="p-6 text-sm text-gray-500 dark:text-gray-400">No job conversations yet.</p> : jobs.map(job => (
                        <div key={job._id} className="border-b border-gray-100 dark:border-gray-700 p-2.5 sm:p-3">
                            {user?.role === 'job' ? (
                                <button
                                    onClick={() => openApplicantJobChat(job)}
                                    className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-colors ${activeJob?._id === job._id ? 'bg-primary/10 dark:bg-primary/25' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                                >
                                    <Briefcase className="w-5 h-5 text-primary shrink-0" />
                                    <span className="font-bold text-sm text-gray-900 dark:text-gray-100 flex-1">{job.title}</span>
                                    {job.totalUnread > 0 && <span className="bg-red-500 text-white text-xs rounded-full min-w-5 h-5 px-1 flex items-center justify-center">{job.totalUnread}</span>}
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
                </aside>
                <section className={`${activeContact ? 'flex' : 'hidden lg:flex'} flex-col min-w-0 min-h-0`}>
                    {!activeContact ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500"><MessageCircle className="w-12 h-12 mb-2" /><p>Select a job conversation</p></div>
                    ) : <>
                        <header className="p-3 sm:p-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2 sm:gap-3 bg-white dark:bg-gray-900 shrink-0">
                            <button
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
                            </button>
                            {user?.role === 'job' ? (
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-sm sm:text-base text-gray-900 dark:text-white mb-1.5 sm:mb-2 truncate">{activeJob.title}</p>
                                    <div className="flex items-start gap-2 sm:gap-3 overflow-x-auto no-scrollbar">
                                        {activeJob.contacts.map(manager => (
                                            <div key={manager._id} className="flex flex-col items-center w-14">
                                                <div className="w-9 h-9 rounded-full overflow-hidden bg-primary text-white flex items-center justify-center text-sm font-bold ring-2 ring-white dark:ring-gray-700">
                                                    {manager.photo ? <img src={manager.photo} alt={manager.name} className="w-full h-full object-cover" /> : manager.name?.charAt(0)}
                                                </div>
                                                <span className="mt-1 text-[10px] leading-tight text-center text-gray-600 dark:text-gray-300 line-clamp-2">{manager.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : <div className="flex-1"><p className="font-bold text-gray-900 dark:text-white">{activeContact.name}</p><p className="text-xs text-gray-500 dark:text-gray-400">{activeJob.title}</p></div>}
                            {user?.role === 'admin' && <button onClick={clearChat} className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg" title="Clear chat"><Trash2 className="w-5 h-5" /></button>}
                        </header>
                        <div className="flex-1 min-h-0 p-3 sm:p-4 overflow-y-auto bg-gray-50 dark:bg-gray-950 space-y-2.5 sm:space-y-3">
                            {messages.length === 0 && <p className="text-center text-sm text-gray-400 mt-12">No messages yet. Start the discussion.</p>}
                            {messages.map(message => {
                                const mine = String(message.sender?._id || message.sender) === String(user?.id || user?._id);
                                return <div key={message._id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[86%] sm:max-w-[78%] px-3 sm:px-4 py-2 rounded-2xl ${mine ? 'bg-primary text-white rounded-br-md' : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100 rounded-bl-md'}`}><p className="text-[9px] sm:text-[10px] font-bold opacity-70 mb-1">{message.sender?.name}</p><p className="text-[13px] sm:text-sm whitespace-pre-wrap break-words">{message.text}</p><p className="text-[8px] sm:text-[9px] opacity-60 mt-1 text-right">{new Date(message.createdAt).toLocaleString()}</p></div></div>;
                            })}
                            <div ref={endRef} />
                        </div>
                        <form onSubmit={send} className="p-2.5 sm:p-4 border-t border-gray-100 dark:border-gray-700 flex gap-2 bg-white dark:bg-gray-900 shrink-0"><input value={text} onChange={e => setText(e.target.value)} placeholder="Write a message..." className="min-w-0 flex-1 px-3 sm:px-4 py-2.5 sm:py-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 text-sm" /><button disabled={!text.trim() || sending} className="w-11 sm:w-auto sm:px-4 bg-primary text-white rounded-xl disabled:opacity-50 flex items-center justify-center shrink-0"><Send className="w-5 h-5" /></button></form>
                    </>}
                </section>
            </div>
        </div>
    );
};

export default JobChat;
