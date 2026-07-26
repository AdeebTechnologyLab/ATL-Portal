import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useSelector } from 'react-redux';
import { io } from 'socket.io-client';
import {
    MessageCircle, Send, User, GraduationCap
} from 'lucide-react';
import Loader, { ButtonLoader } from '../../../components/ui/Loader';
import { chatAPI } from '../../../services/api';
import ProfileAvatar from '../../../components/ui/ProfileAvatar';
import { formatDate } from '../../../utils/dateFormatter';

const getSocketURL = () => {
    const rawUrl = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1' ? 'https://lms-adeeb-technology-lab.onrender.com/api' : 'http://localhost:5000/api');
    return rawUrl === '/api' ? 'https://lms-adeeb-technology-lab.onrender.com' : rawUrl.replace(/\/api\/?$/, '');
};

const SOCKET_URL = getSocketURL();

const StudentChatTab = ({ course, isRestricted }) => {
    const { user } = useSelector((state) => state.auth);
    const [teachers, setTeachers] = useState([]);
    const [activeTeacher, setActiveTeacher] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);

    const socketRef = useRef();
    const scrollRef = useRef();
    const activeTeacherRef = useRef(activeTeacher);

    useEffect(() => {
        activeTeacherRef.current = activeTeacher;
    }, [activeTeacher]);

    // Initialize socket and fetch teachers
    useEffect(() => {
        fetchTeachers();

        socketRef.current = io(SOCKET_URL, { withCredentials: true });
        const myId = user.id || user._id;
        socketRef.current.emit('join_chat', myId);

        socketRef.current.on('new_global_message', (data) => {
            const currentTeacher = activeTeacherRef.current;
            if (!currentTeacher) return;

            const senderId = String(data.senderId || data.sender?._id || data.sender);
            const courseId = String(data.course || data.courseId || '');
            const currentTeacherId = String(currentTeacher._id);
            const currentCourseId = String(course._id || course.id);

            // If message is from current chat teacher in current course
            if (senderId === currentTeacherId && courseId === currentCourseId) {
                setMessages(prev => {
                    if (prev.some(m => m._id === data._id)) return prev;
                    return [...prev, data];
                });
                // Mark as read
                chatAPI.markCourseAsRead(currentCourseId, senderId).catch(console.error);
            }

            // Refresh teachers to update unread counts
            fetchTeachers();
        });

        return () => {
            if (socketRef.current) socketRef.current.disconnect();
        };
    }, [user, course._id || course.id]);

    // Scroll to bottom when messages change
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const fetchTeachers = async () => {
        try {
            const res = await chatAPI.getStudentCourses();
            const coursesData = res.data.data || [];
            // Find teachers for this specific course
            const courseId = course._id || course.id;
            const thisCourse = coursesData.find(c => String(c._id) === String(courseId));
            if (thisCourse && thisCourse.teachers && thisCourse.teachers.length > 0) {
                setTeachers(thisCourse.teachers);
                // Auto-select first teacher if none selected
                if (!activeTeacherRef.current) {
                    openChat(thisCourse.teachers[0]);
                }
            } else if (course.teachers && course.teachers.length > 0) {
                // Fallback to teachers from course prop
                const fallbackTeachers = course.teachers.map(t => ({
                    _id: t._id || t,
                    name: t.name || 'Teacher',
                    email: t.email || '',
                    photo: t.photo || '',
                    unreadCount: 0
                }));
                setTeachers(fallbackTeachers);
                if (!activeTeacherRef.current && fallbackTeachers.length > 0) {
                    openChat(fallbackTeachers[0]);
                }
            } else {
                setTeachers([]);
            }
        } catch (error) {
            console.error('Error fetching teachers:', error);
            setTeachers([]);
        } finally {
            setIsLoading(false);
        }
    };

    const openChat = async (teacher) => {
        setActiveTeacher(teacher);
        setMessages([]);

        try {
            const courseId = course._id || course.id;
            const res = await chatAPI.getCourseMessages(courseId, teacher._id);
            setMessages(res.data.data || []);
            // Mark as read
            await chatAPI.markCourseAsRead(courseId, teacher._id);
            fetchTeachers();
        } catch (error) {
            console.error('Error fetching messages:', error);
        }
    };

    const handleSendMessage = async (e) => {
        if (e) e.preventDefault();
        if (!newMessage.trim() || !activeTeacher || isSending || isRestricted) return;

        const teacherId = activeTeacher._id || activeTeacher.id;
        if (!teacherId) {
            console.error('No teacher ID found');
            return;
        }

        setIsSending(true);
        try {
            const courseId = course._id || course.id;
            const res = await chatAPI.sendCourseMessage(courseId, teacherId, newMessage.trim());
            if (res.data && res.data.data) {
                setMessages(prev => [...prev, res.data.data]);
            }
            setNewMessage('');
        } catch (error) {
            console.error('Error sending message:', error);
        } finally {
            setIsSending(false);
        }
    };

    const formatTime = (date) => {
        return new Date(date).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    };

    const getDisplayDate = (date) => {
        const today = new Date();
        const msgDate = new Date(date);
        if (msgDate.toDateString() === today.toDateString()) return 'Today';
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        if (msgDate.toDateString() === yesterday.toDateString()) return 'Yesterday';
        return formatDate(msgDate);
    };

    // Group messages by date
    const groupedMessages = messages.reduce((groups, msg) => {
        const date = getDisplayDate(msg.createdAt);
        if (!groups[date]) groups[date] = [];
        groups[date].push(msg);
        return groups;
    }, {});

    if (isLoading) {
        return (
            <Loader message="Initializing Secure Chat..." />
        );
    }

    if (teachers.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                    <MessageCircle className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                </div>
                <h3 className="text-lg font-bold text-gray-700 dark:text-gray-300 mb-2">No Teachers Available</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm">No teachers are assigned to this course yet.</p>
            </div>
        );
    }

    return (
        <div className="flex h-[500px] gap-2 sm:gap-4">
            {/* Teachers List - Only DP on mobile */}
            <div className="w-16 sm:w-64 bg-gray-50 dark:bg-slate-900 rounded-xl p-2 sm:p-3 flex flex-col shrink-0">
                <h3 className="text-[10px] sm:text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 px-1 sm:px-2 text-center sm:text-left">
                    <span className="hidden sm:inline">Teachers</span>
                    <span className="sm:hidden">TC</span>
                </h3>
                <div className="space-y-2 flex-1 overflow-y-auto no-scrollbar">
                    {teachers.map((teacher) => (
                        <button
                            key={teacher._id}
                            onClick={() => openChat(teacher)}
                            className={`w-full flex items-center justify-center sm:justify-start gap-3 p-2 sm:p-3 rounded-lg transition-all ${
                                activeTeacher?._id === teacher._id
                                    ? 'bg-primary/10 text-primary'
                                    : 'hover:bg-gray-100 dark:hover:bg-slate-700'
                            }`}
                        >
                            <div className="relative shrink-0">
                                <ProfileAvatar src={teacher.photo} name={teacher.name} size="md" fallbackColor="bg-primary/10" />
                                {teacher.unreadCount > 0 && (
                                    <span className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 bg-red-500 text-white text-[8px] sm:text-[10px] font-bold rounded-full flex items-center justify-center">
                                        {teacher.unreadCount}
                                    </span>
                                )}
                            </div>
                            <div className="hidden sm:block flex-1 text-left">
                                <p className="font-semibold text-sm truncate">{teacher.name}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{teacher.email}</p>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 bg-gray-50 dark:bg-slate-900 rounded-xl flex flex-col">
                {activeTeacher ? (
                    <>
                        {/* Chat Header */}
                        <div className="p-4 border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-t-xl">
                            <div className="flex items-center gap-3">
                                <ProfileAvatar src={activeTeacher.photo} name={activeTeacher.name} size="md" fallbackColor="bg-primary/10" />
                                <div>
                                    <h4 className="font-bold text-gray-900 dark:text-white">{activeTeacher.name}</h4>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Teacher</p>
                                </div>
                            </div>
                        </div>

                        {/* Messages */}
                        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                            {Object.entries(groupedMessages).map(([date, msgs]) => (
                                <div key={date}>
                                    <div className="flex items-center gap-3 my-4">
                                        <div className="flex-1 h-px bg-gray-200 dark:bg-slate-700"></div>
                                        <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">{date}</span>
                                        <div className="flex-1 h-px bg-gray-200 dark:bg-slate-700"></div>
                                    </div>
                                    {msgs.map((msg) => {
                                        const isMe = String(msg.sender?._id || msg.sender) === String(user.id || user._id);
                                        return (
                                            <motion.div
                                                key={msg._id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'} mb-2`}
                                            >
                                                {!isMe && (
                                                    <div className="shrink-0 mb-1">
                                                        <ProfileAvatar src={activeTeacher?.photo} name={activeTeacher?.name} size="xs" fallbackColor="bg-primary/10" />
                                                    </div>
                                                )}
                                                <div className={`max-w-[75%] px-4 py-2 rounded-2xl ${
                                                    isMe
                                                        ? 'bg-primary text-white rounded-br-md'
                                                        : 'bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-800 dark:text-gray-200 rounded-bl-md'
                                                }`}>
                                                    <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                                                    <p className={`text-[10px] mt-1 ${isMe ? 'text-primary' : 'text-gray-400 dark:text-gray-500'}`}>
                                                        {formatTime(msg.createdAt)}
                                                    </p>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            ))}
                            {messages.length === 0 && (
                                <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500">
                                    <MessageCircle className="w-12 h-12 mb-2 opacity-50" />
                                    <p className="text-sm">No messages yet. Start the conversation!</p>
                                </div>
                            )}
                        </div>

                        {/* Message Input */}
                        <form onSubmit={handleSendMessage} className="p-4 bg-white dark:bg-slate-800 rounded-b-xl border-t border-gray-100 dark:border-slate-700">
                            {isRestricted && (
                                <p className="text-xs text-red-500 mb-2">Messaging disabled due to payment restrictions.</p>
                            )}
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder="Type your message..."
                                    disabled={isRestricted}
                                    className="flex-1 px-4 py-3 bg-gray-100 dark:bg-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSendMessage();
                                        }
                                    }}
                                />
                                <button
                                    onClick={() => handleSendMessage()}
                                    disabled={!newMessage.trim() || !activeTeacher || isRestricted || isSending}
                                    className="px-4 py-3 bg-primary text-white rounded-xl hover:bg-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ButtonLoader
                                        isLoading={isSending}
                                        icon={<Send className="w-5 h-5" />}
                                    />
                                </button>
                            </div>
                        </form>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500">
                        <User className="w-12 h-12 mb-2 opacity-50" />
                        <p className="text-sm">Select a teacher to start chatting</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StudentChatTab;
