import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { Send, User, ShieldCheck, Bell } from 'lucide-react';
import { taskAPI } from '../../../services/api';
import Loader, { ButtonLoader } from '../../../components/ui/Loader';

const getSocketURL = () => {
    const rawUrl = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1' ? 'https://lms-adeeb-technology-lab.onrender.com/api' : 'http://localhost:5000/api');
    return rawUrl === '/api' ? 'https://lms-adeeb-technology-lab.onrender.com' : rawUrl.replace(/\/api\/?$/, '');
};

const SOCKET_URL = getSocketURL();

const TaskChat = ({ taskId, currentUser }) => {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [isFetching, setIsFetching] = useState(true);
    const [showNewMessageBanner, setShowNewMessageBanner] = useState(false);
    const socketRef = useRef();
    const scrollRef = useRef();

    useEffect(() => {
        // Fetch historical messages on mount
        const fetchHistory = async () => {
            try {
                const response = await taskAPI.getMessages(taskId);
                setMessages(response.data.messages || []);
                // Mark as read when opening
                await taskAPI.markAsRead(taskId);
            } catch (error) {
                console.error('Error fetching chat history:', error);
            } finally {
                setIsFetching(false);
            }
        };

        fetchHistory();

        // Initialize socket connection
        socketRef.current = io(SOCKET_URL, {
            withCredentials: true
        });

        // Join task room
        socketRef.current.emit('join_task', taskId);

        // Listen for new messages
        socketRef.current.on('new_message', async (message) => {
            setMessages((prev) => [...prev, message]);

            // Show banner if message is from someone else
            const senderId = message.sender?._id || message.senderId;
            const myId = currentUser.id || currentUser._id;
            if (senderId !== myId) {
                setShowNewMessageBanner(true);
                // Mark as read if user is actively in chat
                try {
                    await taskAPI.markAsRead(taskId);
                } catch (e) {
                    console.error('Error marking as read:', e);
                }
                // Hide banner after 3 seconds
                setTimeout(() => setShowNewMessageBanner(false), 3000);
            }
        });

        return () => {
            socketRef.current.disconnect();
        };
    }, [taskId, currentUser.id, currentUser._id]);

    useEffect(() => {
        // Scroll to bottom on new message
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || isSending) return;

        setIsSending(true);
        try {
            const response = await taskAPI.addMessage(taskId, newMessage);
            const savedMessage = response.data.message;

            // Emit via socket for real-time update
            socketRef.current.emit('send_message', {
                taskId,
                text: savedMessage.text,
                senderId: currentUser.id || currentUser._id,
                senderName: currentUser.name,
                senderRole: currentUser.role,
                createdAt: savedMessage.createdAt,
                sender: {
                    _id: currentUser.id || currentUser._id,
                    name: currentUser.name,
                    role: currentUser.role
                }
            });

            setNewMessage('');
        } catch (error) {
            console.error('Error sending message:', error);
            alert('Failed to send message');
        } finally {
            setIsSending(false);
        }
    };

    if (isFetching) {
        return (
            <div className="h-[400px]">
                <Loader message="Fetching Messages..." />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[400px] bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden relative">
            {/* New Message Notification Banner */}
            {showNewMessageBanner && (
                <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 animate-bounce">
                    <div className="bg-primary text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-xs font-bold">
                        <Bell className="w-3 h-3" />
                        New message received!
                    </div>
                </div>
            )}

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-2">
                        <User className="w-8 h-8 opacity-20" />
                        <p className="text-xs font-medium uppercase tracking-widest">Start the conversation</p>
                    </div>
                ) : (
                    messages.map((msg, index) => {
                        const senderId = msg.sender?._id || msg.senderId || msg.sender;
                        const myId = currentUser.id || currentUser._id;
                        const isMe = senderId === myId;
                        const senderRole = msg.sender?.role || msg.senderRole;
                        const senderName = msg.sender?.name || msg.senderName;

                        return (
                            <div key={index} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                <div className={`flex items-center gap-1.5 mb-1 px-1`}>
                                    {senderRole === 'admin' ? (
                                        <ShieldCheck className="w-3 h-3 text-primary" />
                                    ) : (
                                        <User className="w-3 h-3 text-gray-400" />
                                    )}
                                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">
                                        {isMe ? 'You' : senderName}
                                    </span>
                                </div>
                                <div className={`max-w-[80%] p-3 rounded-2xl text-sm shadow-sm whitespace-pre-wrap ${isMe
                                    ? 'bg-primary text-white rounded-tr-none'
                                    : 'bg-white text-gray-700 border border-gray-100 rounded-tl-none'
                                    }`}>
                                    {msg.text}
                                </div>
                                <span className="text-[9px] text-gray-400 mt-1 px-1 font-medium">
                                    {new Date(msg.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                </span>
                            </div>
                        );
                    })
                )}
                <div ref={scrollRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-gray-100 flex gap-2">
                <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 bg-gray-50 border-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-primary"
                />
                <ButtonLoader
                    type="submit"
                    isLoading={isSending}
                    disabled={!newMessage.trim()}
                    className="w-10 h-10 bg-primary hover:bg-purple-700 text-white rounded-xl flex items-center justify-center transition-all disabled:opacity-50 shadow-md"
                    icon={<Send className="w-4 h-4" />}
                />
            </form>
        </div>
    );
};

export default TaskChat;



