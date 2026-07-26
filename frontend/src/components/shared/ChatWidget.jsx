import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';



import { motion, AnimatePresence } from 'framer-motion';



import { useSelector } from 'react-redux';



import { io } from 'socket.io-client';



import {



    MessageCircle, X, Send, User, ShieldCheck,



    Bell, ChevronLeft, Search, Trash2, CheckCheck



} from 'lucide-react';



import Loader, { ButtonLoader } from '../ui/Loader';



import { chatAPI, userAPI } from '../../services/api';



import { getAnswer, isUrl, openExternalUrl } from './chatbotHelper';







const getSocketURL = () => {



    const rawUrl = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1' ? 'https://lms-adeeb-technology-lab.onrender.com/api' : 'http://localhost:5000/api');



    return rawUrl === '/api' ? 'https://lms-adeeb-technology-lab.onrender.com' : rawUrl.replace(/\/api\/?$/, '');



};







const SOCKET_URL = getSocketURL();







const ChatWidget = () => {



    const { user, isAuthenticated } = useSelector((state) => state.auth);



    const [isOpen, setIsOpen] = useState(false);



    const [activeChat, setActiveChat] = useState(null); // { userId, userName }



    const [conversations, setConversations] = useState([]);



    const [messages, setMessages] = useState([]);



    const [newMessage, setNewMessage] = useState('');



    const [unreadCount, setUnreadCount] = useState(0);



    const [isLoading, setIsLoading] = useState(false);



    const [adminUser, setAdminUser] = useState(null);



    const [searchQuery, setSearchQuery] = useState('');



    const [onlineUsers, setOnlineUsers] = useState({});

    const [, setTick] = useState(0); // Force re-render for online dot



    const [activeTab, setActiveTab] = useState('all'); // all | student | intern | teacher | job



    const [tabUnreadCounts, setTabUnreadCounts] = useState({});



    const [allUsers, setAllUsers] = useState([]); // List of all verified users for the active tab (unified directory)



    const [isBotTyping, setIsBotTyping] = useState(false);







    const socketRef = useRef();



    const scrollRef = useRef();



    const activeChatRef = useRef(activeChat);



    const isOpenRef = useRef(isOpen);



    const myIdRef = useRef((user.id || user._id || '').toString());



    const adminUserRef = useRef(null);



    const autoSendHelpPendingRef = useRef(false);



    const [incomingNotify, setIncomingNotify] = useState(null); // { senderName, text }







    useEffect(() => {



        activeChatRef.current = activeChat;



    }, [activeChat]);







    useEffect(() => {



        isOpenRef.current = isOpen;



    }, [isOpen]);







    useEffect(() => {



        myIdRef.current = (user.id || user._id || '').toString();



    }, [user.id, user._id]);







    useEffect(() => {



        adminUserRef.current = adminUser;



    }, [adminUser]);







    // Show for all authenticated users
    const [isTakingTest, setIsTakingTest] = useState(false);

    useEffect(() => {
        const observer = new MutationObserver(() => {
            setIsTakingTest(document.body.hasAttribute('data-taking-test'));
        });
        observer.observe(document.body, { attributes: true, attributeFilter: ['data-taking-test'] });
        return () => observer.disconnect();
    }, []);

    const shouldShow = isAuthenticated && !isTakingTest;







    // Request browser notification permission on mount



    useEffect(() => {



        if (!shouldShow) return;



        if ('Notification' in window && Notification.permission === 'default') {



            Notification.requestPermission();



        }



    }, [shouldShow]);







    // Helper to show a browser notification



    const showBrowserNotification = (title, messageText, url = null) => {



        if (!('Notification' in window)) return;



        if (Notification.permission !== 'granted') return;







        const notification = new Notification(title, {



            body: messageText.length > 100 ? messageText.substring(0, 100) + '...' : messageText,



            icon: '/favicon.ico',



            tag: url ? 'general-notification' : 'chat-message', // Replaces previous notification instead of stacking



            silent: false



        });







        notification.onclick = () => {



            window.focus();



            if (url) {



                window.location.href = url;



            } else {



                setIsOpen(true);



            }



            notification.close();



        };







        // Auto close after 6 seconds



        setTimeout(() => notification.close(), 6000);



    };







    useEffect(() => {



        if (!shouldShow) return;







        // Initialize Socket



        socketRef.current = io(SOCKET_URL, {



            withCredentials: true



        });







        const myId = user.id || user._id;



        socketRef.current.emit('join_chat', myId);







        socketRef.current.on('new_global_message', (data) => {



            // Skip course/job messages - they have dedicated collaboration screens



            if (data.course || data.courseId || data.task || data.taskId) return;







            const myIdStr = myIdRef.current;



            const senderIdRaw = data.senderId || data.sender?._id || data.sender;



            const recipientIdRaw = data.recipientId || data.recipient?._id || data.recipient;







            if (!senderIdRaw || !recipientIdRaw) return;







            const senderId = String(senderIdRaw);



            const recipientId = String(recipientIdRaw);







            // The 'other side' of the conversation



            const otherSideId = senderId === myIdStr ? recipientId : senderId;







            // Use refs to check state without re-binding listener



            const currentActive = activeChatRef.current;



            const isCurrentlyOpen = isOpenRef.current;



            const currentActiveId = currentActive?.userId ? String(currentActive.userId) : null;







            // Debug log (optional but helpful)



            // console.log('Socket Message:', { senderId, otherSideId, currentActiveId, isCurrentlyOpen });







            // If we are currently chatting with this user (Active Chat matches sender/recipient)



            if (currentActiveId === otherSideId) {



                setMessages(prev => {



                    // Prevent duplicates



                    if (prev.some(m => m._id === data._id)) return prev;



                    return [...prev, data];



                });







                // If the widget is ALSO open, mark as read immediately



                if (isCurrentlyOpen) {



                    chatAPI.markAsRead(otherSideId)



                        .then(() => fetchUnreadCount())



                        .catch(console.error);



                } else {



                    // If widget is closed but active chat is set (minimized?), show notification



                    // But usually activeChat implies intention to see



                    // We'll treat it as "Background" update if not open



                    setIncomingNotify({



                        senderName: data.senderName || 'New Message',



                        text: data.text



                    });



                    setUnreadCount(prev => prev + 1);



                    // Show browser notification when widget is closed



                    if (document.hidden) {



                        showBrowserNotification(`New message from ${data.senderName || 'New Message'}`, data.text);



                    }



                }



            } else {



                // Not the active chat



                if (recipientId === myIdStr || (data.notifyAdmin && senderId === myIdStr)) {



                    if (recipientId === myIdStr) {



                        setUnreadCount(prev => prev + 1);



                    }







                    const notifTitle = data.notifyAdmin ? `Bot assisting a user` : (data.senderName || 'New Message');







                    setIncomingNotify({



                        senderName: notifTitle,



                        text: data.text



                    });



                    // Clear notification after 5s



                    setTimeout(() => setIncomingNotify(null), 5000);







                    // Show browser notification for background messages



                    if (document.hidden || !isOpenRef.current) {



                        showBrowserNotification(notifTitle, data.text);



                    }



                }







                // Sync lists



                setTimeout(() => {



                    fetchUnreadCount();



                    if (user?.role === 'admin') {



                        fetchConversations();



                    }



                }, 500);



            }



        });







        socketRef.current.on('new_browser_notification', (data) => {



            // data: { title, message, url }



            if (document.hidden || !isOpenRef.current) {



                showBrowserNotification(data.title, data.message, data.url);



            } else {



                showBrowserNotification(data.title, data.message, data.url);



            }



        });







        socketRef.current.on('user_status_update', (data) => {



            setOnlineUsers(prev => ({



                ...prev,



                [data.userId]: data.lastSeen



            }));



        });







        // Initial data fetch



        fetchUnreadCount();



        if (user?.role !== 'admin') {



            fetchAdmin();



            // Also fetch messages/check for existing conversation



            const checkExistingChat = async () => {



                try {



                    const res = await userAPI.getVerifiedByRole('admin');



                    if (res.data.data && res.data.data.length > 0) {



                        const admin = res.data.data[0];



                        const msgRes = await chatAPI.getMessages(admin._id);



                        if (msgRes.data.data && msgRes.data.data.length > 0) {



                            startChat(admin);



                        }



                    }



                } catch (e) {



                    console.error('Error checking existing chat:', e);



                }



            };



            checkExistingChat();



        } else if (user?.role === 'admin') {



            fetchConversations();



        }







        // Add event listener for remote toggle



        const handleToggleChat = (e) => {



            if (e.detail?.open !== undefined) {



                setIsOpen(e.detail.open);



                // If opening and not an admin, try to start chat with admin automatically



                if (e.detail.open && user?.role !== 'admin' && adminUserRef.current) {



                    startChat(adminUserRef.current);



                }



            } else {



                setIsOpen(prev => !prev);



            }



        };







        window.addEventListener('openChatWidget', handleToggleChat);







        // Heartbeat logic to keep status updated in real-time



        const heartbeatInterval = setInterval(() => {



            if (socketRef.current && myId) {



                socketRef.current.emit('heartbeat', myId);



            }



        }, 30000); // Pulse every 30 seconds

        // Force re-render every 30s so online dot stays accurate
        const tickInterval = setInterval(() => setTick(n => n + 1), 30000);







        return () => {



            socketRef.current?.disconnect();



            window.removeEventListener('openChatWidget', handleToggleChat);



            clearInterval(heartbeatInterval);
            clearInterval(tickInterval);



        };



    }, [shouldShow, user?.role, (user.id || user._id)]);







    const scrollToBottom = (instant = false) => {



        if (!scrollRef.current) return;



        const container = scrollRef.current.parentElement;



        if (!container) return;







        const performScroll = () => {



            container.scrollTop = container.scrollHeight;



        };







        if (instant) {



            performScroll();



        } else {



            container.scrollTo({



                top: container.scrollHeight,



                behavior: 'smooth'



            });



        }







        // Multi-trigger to handle layout shifts/images



        setTimeout(performScroll, 50);



        setTimeout(performScroll, 200);



        setTimeout(performScroll, 500);



    };







    useEffect(() => {



        if (isOpen && (activeChat || messages.length > 0)) {



            setTimeout(() => scrollToBottom(true), 300);



        }



    }, [messages, activeChat, isOpen]);







    // Mark messages as read when widget is opened with an active chat



    useEffect(() => {



        if (isOpen && activeChat?.userId) {



            chatAPI.markAsRead(activeChat.userId)



                .then(() => {



                    fetchUnreadCount();



                })



                .catch(console.error);



        }



    }, [isOpen, activeChat?.userId]);







    // Set autoSendHelpPendingRef when widget is opened for non-admin users



    useEffect(() => {



        if (isOpen && user?.role !== 'admin') {



            autoSendHelpPendingRef.current = true;



        } else {



            autoSendHelpPendingRef.current = false;



        }



    }, [isOpen, user?.role]);







    // Auto-start chat with admin when widget is opened for non-admin users



    useEffect(() => {



        if (isOpen && user?.role !== 'admin' && adminUser) {



            startChat(adminUser);



        }



    }, [isOpen, adminUser, user?.role]);







    const fetchUnreadCount = async () => {



        try {



            const res = await chatAPI.getUnread();



            setUnreadCount(res.data.count);



        } catch (e) {



            console.error('Error fetching unread count:', e);



        }



    };







    const fetchAdmin = async () => {



        try {



            const res = await userAPI.getVerifiedByRole('admin');



            if (res.data.data && res.data.data.length > 0) {



                setAdminUser(res.data.data[0]);



            }



        } catch (e) {



            console.error('Error fetching admin:', e);



        }



    };







    const fetchConversations = async () => {



        try {



            const res = await chatAPI.getConversations();



            const convs = res.data.data || [];



            setConversations(convs);







            // Calculate unread counts per role



            const counts = {



                student: 0,



                intern: 0,



                teacher: 0,



                job: 0



            };







            convs.forEach(c => {



                if (c.unreadCount > 0 && c.user.role) {



                    // Normalize role to lowercase to handle potential inconsistencies



                    const role = c.user.role.toLowerCase();



                    counts[role] = (counts[role] || 0) + c.unreadCount;



                }



            });



            setTabUnreadCounts(counts);







            // Also update total unread count for badge



            fetchUnreadCount();



        } catch (e) {



            console.error('Error fetching conversations:', e);



        }



    };







    const fetchAllUsersByRole = async (role) => {



        try {



            const res = await userAPI.getVerifiedByRole(role === 'all' ? 'student' : role); // Default to student for 'all' or specific role



            // If role is 'all', maybe we just show students or we need a multi-role fetch



            // For now, let's fetch based on the selected tab



            if (role === 'all') {



                // In 'All' tab, we primarily show recent conversations. 



                // To start a 'New Chat', users should pick a specific role tab.



                setAllUsers([]);



                return;



            }



            setAllUsers(res.data.data || []);



        } catch (e) {



            console.error('Error fetching all users:', e);



        }



    };







    useEffect(() => {



        if (user?.role === 'admin' && activeTab !== 'all') {



            fetchAllUsersByRole(activeTab);



        } else {



            setAllUsers([]);



        }



    }, [activeTab]);







    const fetchMessages = async (otherUserId) => {



        setIsLoading(true);



        try {



            const res = await chatAPI.getMessages(otherUserId);



            const fetchedMsgs = res.data.data || [];



            setMessages(fetchedMsgs);







            // Mark as read and update badge



            chatAPI.markAsRead(otherUserId)



                .then(() => {



                    fetchUnreadCount();



                    if (user?.role === 'admin') fetchConversations();



                })



                .catch(console.error);







            // Auto-send "Main Menu" if pending for non-admin support chat



            if (autoSendHelpPendingRef.current && user?.role !== 'admin') {



                autoSendHelpPendingRef.current = false;



                



                if (fetchedMsgs.length === 0) {



                    try {



                        const botRes = await getAnswer("Main Menu", user?.name);



                        const botMsg = {



                            _id: 'bot-' + Date.now(),



                            text: botRes.answer,



                            senderId: 'bot',



                            sender: { _id: 'bot', name: 'Adeeb Chatbot' },



                            createdAt: new Date().toISOString(),



                            isBot: true,



                            options: botRes.options



                        };



                        setMessages(prev => {



                            if (prev.some(m => m._id === botMsg._id)) return prev;



                            return [...prev, botMsg];



                        });



                        



                        try {



                            const adminId = adminUser ? adminUser._id : otherUserId;



                            if (adminId) {



                                await chatAPI.sendBotReply(adminId, botRes.answer, botRes.options);



                            }



                        } catch (err) {



                            console.error('Error syncing bot menu to backend', err);



                        }



                    } catch (e) {



                        console.error('Error fetching bot menu:', e);



                    }



                } else {



                    setNewMessage("Main Menu");



                }



            }



        } catch (error) {



            console.error('Error fetching messages:', error);



        } finally {



            setIsLoading(false);



        }



    };







    const handleSendMessage = async (e, textOverride) => {



        if (e) e.preventDefault();



        const recipientId = user?.role === 'admin' ? activeChat.userId : adminUser?._id;







        const text = textOverride || newMessage;



        if (!text.trim() || !recipientId) return;







        if (isBotTyping) return; // Prevent double clicks on bot options







        if (!textOverride) setNewMessage('');







        const tempId = 'temp-' + Date.now();



        const optimisticMsg = {



            _id: tempId,



            text: text,



            senderId: (user.id || user._id).toString(),



            sender: user,



            createdAt: new Date().toISOString()



        };







        // Real optimistic update: Add message to local state immediately



        if (activeChat && activeChat.userId.toString() === recipientId.toString()) {



            setMessages(prev => [...prev, optimisticMsg]);



            scrollToBottom(true);



        }







        try {



            const res = await chatAPI.sendMessage(recipientId, text);



            const savedMsg = res.data.data;







            // Replace optimistic message with real message from server



            if (activeChat && activeChat.userId.toString() === recipientId.toString()) {



                setMessages(prev => {



                    const alreadyHasReal = prev.some(m => m._id === savedMsg._id);



                    if (alreadyHasReal) {



                        return prev.filter(m => m._id !== tempId);



                    }



                    return prev.map(m => m._id === tempId ? savedMsg : m);



                });



            }







            // Backend now handles socket emission to both parties



            if (user?.role === 'admin') {



                fetchConversations();



            }







                        // [NEW] Bot Logic for non-admins
            if (user?.role !== 'admin') {
                const disabledUntil = localStorage.getItem('disableBotUntil');
                const now = Date.now();

                if (text.toLowerCase().trim() === 'main menu') {
                    localStorage.removeItem('disableBotUntil');
                } else if (disabledUntil && now < parseInt(disabledUntil, 10)) {
                    return;
                }

                if (text.toLowerCase().trim() === 'chat with adeeb') {
                    setIsBotTyping(true);
                    setTimeout(async () => {
                        const autoReply = `Assalam o Alaikum! Adeeb is currently not available, but he will read your message and reply to you as soon as possible. Please leave your message here.\n\nIf you want to use the bot again, just click or type \'Main Menu\'.`;
                        const botMsg = {
                            _id: 'bot-' + Date.now(),
                            text: autoReply,
                            senderId: 'bot',
                            sender: { _id: 'bot', name: 'Adeeb Chatbot' },
                            createdAt: new Date().toISOString(),
                            isBot: true,
                            options: [{ label: 'Main Menu', value: 'Main Menu' }]
                        };
                        setMessages(prev => [...prev, botMsg]);
                        localStorage.setItem('disableBotUntil', (Date.now() + 2 * 60 * 60 * 1000).toString());
                        
                        try {
                            const adminId = adminUser ? adminUser._id : activeChat?.userId;
                            if (adminId) {
                                await chatAPI.sendBotReply(adminId, autoReply, botMsg.options);
                            }
                        } catch (err) {}
                        setIsBotTyping(false);
                    }, 500);
                    return;
                }

                setIsBotTyping(true);



                setTimeout(async () => {



                    try {



                        const botRes = await getAnswer(text, user?.name);



                        if (!botRes) {



                            setIsBotTyping(false);



                            return;



                        }



                        const botMsg = {



                            _id: 'bot-' + Date.now(),



                            text: botRes.answer,



                            senderId: 'bot',



                            sender: { _id: 'bot', name: 'Adeeb Chatbot' },



                            createdAt: new Date().toISOString(),



                            isBot: true,



                            options: botRes.options



                        };



                        setMessages(prev => [...prev, botMsg]);







                        // Send to backend so Admin sees it



                        try {



                            const adminId = adminUser ? adminUser._id : activeChat?.userId;



                            if (adminId) {



                                await chatAPI.sendBotReply(adminId, botRes.answer, botRes.options);



                            }



                        } catch (err) {



                            console.error('Error syncing bot reply to backend', err);



                        }



                    } catch (err) {



                        console.error('Bot Error:', err);



                    } finally {



                        setIsBotTyping(false);



                    }



                }, 500); // slight delay for "typing" feel



            }







        } catch (e) {



            console.error('Error sending message:', e);



        }



    };







    const handleOptionClick = (value) => {



        if (isUrl(value)) {



            openExternalUrl(value);



            // Optionally add to chat



            const linkMsg = {



                _id: 'link-' + Date.now(),



                text: value,



                senderId: (user.id || user._id).toString(),



                sender: user,



                createdAt: new Date().toISOString()



            };



            setMessages(prev => [...prev, linkMsg]);



            return;



        }



        handleSendMessage(null, value);



    };







    const handleDeleteChat = async () => {



        const confirmClear = confirm(



            "⚠️ CLEAR CHAT HISTORY ONLY?\n\n" +



            "This will permanently remove all messages with this user.\n" +



            "The user account will NOT be deleted and will remain in the 'Students/Teachers' sections.\n\n" +



            "Proceed?"



        );



        if (!confirmClear) return;







        try {



            console.log('[ChatWidget] Calling chatAPI.clearChatHistory...');



            const res = await chatAPI.clearChatHistory(activeChat.userId);



            alert(



                `✅ Success: Chat history cleared.\n\n` +



                `The user has been removed from the "Recent" list because there are no messages.\n` +



                `You can find them again in the "Students", "Teachers", or "Job" tabs to start a new chat.`



            );



            closeChat();



            fetchConversations();



        } catch (e) {



            console.error('Error deleting chat:', e);



            alert('Failed to clear chat history');



        }



    };







    const startChat = (targetUser) => {



        if (!targetUser) return;



        const targetId = targetUser._id || targetUser.userId || targetUser.id;



        if (!targetId) {



            console.error('StartChat failed: No ID found for user', targetUser);



            return;



        }







        setActiveChat({



            userId: targetId,



            userName: targetUser.name || targetUser.user?.name || 'User',



            photo: targetUser.photo || targetUser.user?.photo || null,



            role: targetUser.role || targetUser.user?.role || '',



            phone: targetUser.phone || targetUser.user?.phone || '',



            rollNo: targetUser.rollNo || targetUser.user?.rollNo || ''



        });



        fetchMessages(targetId);



    };







    const closeChat = () => {



        setActiveChat(null);



        setMessages([]);



        setIsOpen(false); // Fully close the widget



    };







    // Go back to conversation list without closing the widget



    const goBack = () => {



        setActiveChat(null);



        setMessages([]);



    };







    if (!shouldShow) return null;







    return (



        <div className="fixed bottom-6 right-6 z-[9999]" style={{ display: isTakingTest ? 'none' : undefined }}>



            <AnimatePresence>



                {isOpen && (



                    <motion.div



                        initial={{ opacity: 0, y: 20, scale: 0.95 }}



                        animate={{ opacity: 1, y: 0, scale: 1 }}



                        exit={{ opacity: 0, y: 20, scale: 0.95 }}



                        className="mb-4 w-full max-w-[95vw] md:w-[600px] bg-white rounded-[2rem] shadow-2xl border border-gray-100 overflow-hidden flex flex-col h-[800px] max-h-[90vh]"



                    >



                        {/* Header */}



                        <div className="bg-primary p-4 text-white flex items-center justify-between">



                            <div className="flex items-center gap-4">



                                {activeChat && user?.role === 'admin' ? (



                                    <button



                                        type="button"



                                        onClick={goBack}



                                        className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-2xl transition-all active:scale-95 group"



                                    >



                                        <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />



                                        <span className="font-bold text-sm">Back</span>



                                    </button>



                                ) : (



                                    <div className="w-14 h-14 flex items-center justify-center overflow-hidden">



                                        <img src="/livechat.png" alt="Chat" className="w-full h-full object-contain" />



                                    </div>



                                )}



                                <div>



                                    <h3 className="font-bold text-xl leading-none">



                                        {activeChat ? activeChat.userName : 'Message Center'}



                                    </h3>



                                    <div className="text-[12px] text-orange-100 uppercase tracking-[0.2em] font-black mt-1.5 opacity-80 flex items-center gap-2">



                                        {activeChat ? (



                                            user?.role === 'admin' ? (



                                                <span className="normal-case tracking-normal font-bold">
                                                    {[
                                                        activeChat.role ? activeChat.role.charAt(0).toUpperCase() + activeChat.role.slice(1) : null,
                                                        activeChat.rollNo ? `Roll #${activeChat.rollNo}` : null,
                                                        activeChat.phone || null
                                                    ].filter(Boolean).join(' • ') || 'Direct Message'}
                                                </span>



                                            ) : (



                                                <>



                                                    <span className="relative flex h-2 w-2">



                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>



                                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>



                                                    </span>



                                                    Adeeb Chatbot • 24/7 Online



                                                </>



                                            )



                                        ) : (



                                            user?.role === 'admin' ? <span>Recent Conversations</span> : <span>Support Chat</span>



                                        )}



                                    </div>



                                </div>



                            </div>



                            <div className="flex items-center gap-2">



                                {activeChat && user?.role === 'admin' && (



                                    <button



                                        type="button"



                                        onClick={handleDeleteChat}



                                        className="p-3 hover:bg-white/10 rounded-full transition-all text-white/80 hover:text-white hover:bg-red-500/20"



                                        title="Clear Chat History (Messages Only)"



                                    >



                                        <Trash2 className="w-5 h-5" />



                                    </button>



                                )}



                                <button type="button" onClick={() => setIsOpen(false)} className="p-3 hover:bg-white/10 rounded-full transition-all hover:rotate-90">



                                    <X className="w-7 h-7" />



                                </button>



                            </div>



                        </div>







                        {/* Body */}



                        <div className="flex-1 overflow-y-auto bg-gray-50 flex flex-col">



                            {!activeChat ? (



                                // Conversation List (Admin) or Welcome (Jober)



                                <div className="p-4 space-y-4 flex-1">



                                    {user?.role === 'admin' ? (



                                        <>



                                            <div className="relative mb-4">



                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />



                                                <input



                                                    type="text"



                                                    placeholder="Search users..."



                                                    className="w-full pl-9 pr-4 py-2 bg-white border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20"



                                                    value={searchQuery}



                                                    onChange={(e) => setSearchQuery(e.target.value)}



                                                />



                                            </div>







                                            {/* Tabs */}



                                            <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">



                                                {[



                                                    { id: 'all', label: 'Recent' },



                                                    { id: 'student', label: 'Students' },



                                                    { id: 'intern', label: 'Interns' },



                                                    { id: 'teacher', label: 'Teachers' },



                                                    { id: 'job', label: 'Job' }



                                                ].map(tab => (



                                                    <button



                                                        key={tab.id}



                                                        type="button"



                                                        onClick={() => setActiveTab(tab.id)}



                                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all ${activeTab === tab.id



                                                            ? 'bg-primary text-white shadow-md shadow-orange-200'



                                                            : 'bg-white text-gray-500 hover:bg-gray-100 border border-gray-100'



                                                            }`}



                                                    >



                                                        {tab.label}



                                                    </button>



                                                ))}



                                            </div>







                                            {(() => {



                                                // Unified Logic: Merge conversations + allUsers



                                                let displayedItems = [];







                                                if (activeTab === 'all') {



                                                    // Just show existing conversations



                                                    displayedItems = conversations.map(c => ({



                                                        ...c,



                                                        isConvo: true,



                                                        userObj: c.user



                                                    }));



                                                } else {



                                                    // Map of existing convos for this tab for easy lookup



                                                    const convoMap = new Map();



                                                    conversations.filter(c => c.user && c.user.role === activeTab).forEach(c => {



                                                        const uid = c.user?._id || c._id;



                                                        if (uid) convoMap.set(uid.toString(), c);



                                                    });







                                                    // Merge: All users from directory



                                                    allUsers.forEach(u => {



                                                        const id = (u._id || u.id).toString();



                                                        if (convoMap.has(id)) {



                                                            const c = convoMap.get(id);



                                                            displayedItems.push({



                                                                ...c,



                                                                isConvo: true,



                                                                userObj: c.user



                                                            });



                                                            convoMap.delete(id); // Remove to avoid duplicates



                                                        } else {



                                                            displayedItems.push({



                                                                _id: u._id || u.id,



                                                                userObj: u,



                                                                isConvo: false,



                                                                unreadCount: 0,



                                                                lastMessage: 'No messages yet',



                                                                lastMessageAt: null



                                                            });



                                                        }



                                                    });







                                                    // Any convos left that weren't in allUsers (unlikely but safe)



                                                    convoMap.forEach(c => {



                                                        displayedItems.push({



                                                            ...c,



                                                            isConvo: true,



                                                            userObj: c.user



                                                        });



                                                    });



                                                }







                                                // Final Filter & Sort



                                                const filtered = displayedItems



                                                    .filter(item => {



                                                        const name = item.userObj?.name || '';



                                                        return name.toLowerCase().includes(searchQuery.toLowerCase());



                                                    })



                                                    .sort((a, b) => {



                                                        // Sort by most recent first



                                                        if (a.lastMessageAt && b.lastMessageAt) {



                                                            return new Date(b.lastMessageAt) - new Date(a.lastMessageAt);



                                                        }



                                                        if (a.lastMessageAt) return -1;



                                                        if (b.lastMessageAt) return 1;



                                                        // Fallback to name



                                                        return a.userObj.name.localeCompare(b.userObj.name);



                                                    });







                                                if (filtered.length === 0) {



                                                    return (



                                                        <div className="text-center py-32 opacity-20">



                                                            <MessageCircle className="w-20 h-20 mx-auto mb-4" />



                                                            <p className="text-lg font-black uppercase tracking-tighter">No users found</p>



                                                        </div>



                                                    );



                                                }







                                                return (



                                                    <div className="grid gap-3">



                                                        {filtered.map((item) => (



                                                            <button



                                                                key={item._id}



                                                                type="button"



                                                                onClick={() => startChat(item.userObj)}



                                                                className="w-full p-5 bg-white rounded-[1.5rem] border border-gray-100 shadow-sm hover:shadow-xl hover:border-orange-100 transition-all flex items-center gap-5 text-left group relative overflow-hidden"



                                                            >



                                                                {/* Activity Indicator */}



                                                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-transparent group-hover:bg-primary transition-all" />







                                                                <div className="relative shrink-0">
                                                                    <div className="w-14 h-14 bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl flex items-center justify-center text-primary font-black text-xl shadow-inner text-center overflow-hidden">



                                                                    {item.userObj?.photo ? (



                                                                        <img src={item.userObj.photo} alt="DP" className="w-full h-full object-cover" />



                                                                    ) : (



                                                                        (item.userObj?.name || 'U').charAt(0).toUpperCase()



                                                                    )}



                                                                </div>
                                                                    {/* Online Dot */}
                                                                    {onlineUsers[item.userObj?._id] && (Date.now() - new Date(onlineUsers[item.userObj._id]).getTime() < 120000) && (
                                                                        <span className="absolute bottom-0 right-0 flex h-3.5 w-3.5">
                                                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                                                            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-green-500 border-2 border-white"></span>
                                                                        </span>
                                                                    )}
                                                                </div>



                                                                <div className="flex-1 min-w-0">



                                                                    <div className="flex items-center justify-between mb-1.5">



                                                                        <div className="flex items-center gap-2">



                                                                            <h4 className="font-black text-gray-900 truncate text-base group-hover:text-primary transition-colors">



                                                                                {item.userObj?.name || 'Unknown User'}



                                                                            </h4>



                                                                            <span className="px-2 py-0.5 bg-gray-100 text-[10px] rounded-lg font-bold text-gray-500 uppercase tracking-wider">



                                                                                {item.userObj.role || 'User'}



                                                                            </span>



                                                                        </div>



                                                                        {item.lastMessageAt && (



                                                                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">



                                                                                {new Date(item.lastMessageAt).toLocaleString('en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}



                                                                            </span>



                                                                        )}



                                                                    </div>



                                                                    <div className="flex items-center justify-between">



                                                                        <p className={`text-sm truncate pr-4 ${item.unreadCount > 0 ? 'text-gray-900 font-bold' : 'text-gray-500'}`}>



                                                                            {item.lastMessage}



                                                                        </p>



                                                                        {item.unreadCount > 0 && (



                                                                            <span className="flex-shrink-0 w-6 h-6 bg-primary text-white text-[11px] rounded-xl flex items-center justify-center font-black shadow-lg shadow-orange-200">



                                                                                {item.unreadCount}



                                                                            </span>



                                                                        )}



                                                                    </div>



                                                                </div>



                                                            </button>



                                                        ))}



                                                    </div>



                                                );



                                            })()}



                                        </>



                                    ) : (



                                        <div className="flex-grow flex items-center justify-center">



                                            <Loader message="Connecting to Support..." size="sm" />



                                        </div>



                                    )}



                                </div>



                            ) : (



                                // Chat Window



                                <div className="flex flex-col h-full">



                                    <div className="flex-1 overflow-y-auto p-4 space-y-4">



                                        {isLoading ? (



                                            <Loader message="Loading messages..." size="sm" />



                                        ) : (



                                            messages.map((msg, index) => {



                                                const myId = (user.id || user._id).toString();



                                                const senderId = (msg.sender?._id || msg.sender || msg.senderId).toString();



                                                const isMe = senderId === myId;



                                                const isBot = msg.isBot;



                                                



                                                const getAvatarUrl = () => {



                                                    const adminPhoto = "https://res.cloudinary.com/adeeb-tech-lab/image/upload/v1780787310/Company%20Logo/LMS_admin.jpg";



                                                    if (isBot) return "/livechat.png";



                                                    if (isMe) {



                                                        if (user?.role === 'admin') return adminPhoto;



                                                        return user?.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=random`;



                                                    }



                                                    



                                                    const isOtherAdmin = msg.sender?.role === 'admin' || activeChat?.userName?.toLowerCase().includes('admin');



                                                    if (isOtherAdmin) return adminPhoto;



                                                    



                                                    const otherName = msg.sender?.name || activeChat?.userName || 'User';



                                                    return msg.sender?.photo || activeChat?.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(otherName)}&background=random`;



                                                };







                                                return (



                                                    <div key={index} className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}>



                                                        <div className={`flex gap-2 max-w-[90%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>



                                                            {/* Avatar */}



                                                            <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 mt-auto mb-5 shadow-sm border border-gray-100 dark:border-gray-700 bg-white">



                                                                <img src={getAvatarUrl()} alt="Avatar" className="w-full h-full object-cover" />



                                                            </div>



                                                            



                                                            {/* Message Content */}



                                                            <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>



                                                                {isBot ? (



                                                                    <div className="relative px-5 py-4 rounded-2xl rounded-bl-sm text-sm font-medium shadow-lg leading-relaxed whitespace-pre-wrap bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700/50 shadow-slate-200/50 dark:shadow-slate-900/20"



                                                                        dangerouslySetInnerHTML={{ __html: msg.text.replace(/((https?:\/\/|www\.)[^\s<]+)/gi, url => `<a href="${url.startsWith('www.') ? 'https://'+url : url}" target="_blank" class="text-primary hover:text-orange-600 dark:text-orange-400 dark:hover:text-orange-300 underline decoration-primary/30 dark:decoration-orange-400/40 underline-offset-4 font-bold transition-colors">${url}</a>`) }}



                                                                    />



                                                                ) : (



                                                                    <div className={`p-3.5 rounded-2xl text-[15px] shadow-sm leading-relaxed whitespace-pre-wrap ${isMe



                                                                        ? 'bg-primary text-white rounded-br-none shadow-orange-100'



                                                                        : 'bg-white text-gray-800 border border-gray-100 rounded-bl-none pr-6'



                                                                        }`}>



                                                                        {msg.text}



                                                                    </div>



                                                                )}



                                                                



                                                                {/* Options (Buttons) */}



                                                                {msg.options && msg.options.length > 0 && (



                                                                    <div className={`flex flex-wrap gap-2 mt-4 ${isMe ? 'justify-end' : 'justify-start'}`}>



                                                                        {msg.options.map((opt, i) => (



                                                                            <button



                                                                                key={i}



                                                                                type="button"



                                                                                onClick={() => handleOptionClick(opt.value)}



                                                                                className={`px-3 py-1.5 text-[11.5px] font-semibold rounded-xl transition-all duration-300 shadow-sm border-none ${



                                                                                    opt.label.toLowerCase() === 'main menu' || opt.label.toLowerCase() === 'chat with adeeb'



                                                                                        ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:shadow-lg hover:shadow-green-500/30 hover:-translate-y-0.5'



                                                                                        : opt.label.toLowerCase() === 'exit'



                                                                                            ? 'bg-gradient-to-r from-rose-500 to-red-600 text-white hover:shadow-lg hover:shadow-red-500/30 hover:-translate-y-0.5'



                                                                                            : 'bg-gradient-to-r from-primary to-orange-600 text-white hover:shadow-lg hover:shadow-orange-500/30 hover:-translate-y-0.5'



                                                                                }`}



                                                                            >



                                                                                {opt.label}



                                                                            </button>



                                                                        ))}



                                                                    </div>



                                                                )}



                                                                



                                                                {/* Time */}



                                                                <span className={`text-[10px] text-gray-400 mt-1.5 px-1 font-bold uppercase tracking-wider flex items-center gap-1`}>



                                                                    {new Date(msg.createdAt).toLocaleString('en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}



                                                                    {isMe && !isBot && (



                                                                        <CheckCheck 



                                                                            className={`w-3.5 h-3.5 ${



                                                                                msg.isRead ? 'text-blue-500' : 



                                                                                (onlineUsers[activeChat?.userId || activeChat?._id] && (Date.now() - new Date(onlineUsers[activeChat?.userId || activeChat?._id]).getTime() < 60000) ? 'text-gray-500' : 'text-gray-300')



                                                                            }`} 



                                                                        />



                                                                    )}



                                                                </span>



                                                            </div>



                                                        </div>



                                                    </div>



                                                );



                                            })



                                        )}



                                        {isBotTyping && (



                                            <div className="flex items-start">



                                                <div className="bg-gray-800 text-white border border-gray-700 rounded-2xl rounded-tl-none px-4 py-3 flex gap-1 items-center h-10 shadow-sm">



                                                    <span className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />



                                                    <span className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />



                                                    <span className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />



                                                </div>



                                            </div>



                                        )}



                                        <div ref={scrollRef} />



                                    </div>







                                    {/* Input */}



                                    <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-gray-100 flex gap-2">



                                        <input



                                            type="text"



                                            value={newMessage}



                                            onChange={(e) => setNewMessage(e.target.value)}



                                            placeholder="Type a message..."



                                            className="flex-1 bg-gray-50 border-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-orange-500"



                                        />



                                        <button



                                            type="submit"



                                            disabled={!newMessage.trim()}



                                            className="w-10 h-10 bg-primary hover:bg-orange-700 text-white rounded-xl flex items-center justify-center transition-all disabled:opacity-50"



                                        >



                                            <Send className="w-4 h-4" />



                                        </button>



                                    </form>



                                </div>



                            )}



                        </div>



                    </motion.div>



                )}



            </AnimatePresence>







            {/* Incoming Message Notification */}



            <AnimatePresence>



                {incomingNotify && !isOpen && (



                    <motion.div



                        initial={{ opacity: 0, x: 50, scale: 0.8 }}



                        animate={{ opacity: 1, x: 0, scale: 1 }}



                        exit={{ opacity: 0, x: 50, scale: 0.8 }}



                        onClick={() => {



                            setIsOpen(true);



                            setIncomingNotify(null);



                        }}



                        className="absolute bottom-20 right-0 w-64 bg-white rounded-2xl shadow-2xl border border-orange-100 p-4 cursor-pointer hover:bg-orange-50 transition-colors z-50 flex items-start gap-3"



                    >



                        <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">



                            <MessageCircle className="w-5 h-5 text-primary" />



                        </div>



                        <div className="flex-1 min-w-0">



                            <p className="text-xs font-black text-primary uppercase tracking-widest mb-0.5">{incomingNotify.senderName}</p>



                            <p className="text-sm text-gray-700 truncate font-medium">{incomingNotify.text}</p>



                        </div>



                        <button



                            onClick={(e) => { e.stopPropagation(); setIncomingNotify(null); }}



                            className="text-gray-400 hover:text-gray-600"



                        >



                            <X className="w-4 h-4" />



                        </button>



                    </motion.div>



                )}



            </AnimatePresence>







                            {/* Bubble */}
        {!isOpen && (
            <div className="relative">
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsOpen(true)}
                    style={{ outline: '4px solid #FF8E01', outlineOffset: '2px' }}
                    className="w-16 h-16 rounded-full shadow-2xl flex items-center justify-center transition-all relative bg-white overflow-visible"
                >
                    <img src="/livechat.png" alt="Live Chat" className="w-full h-full object-contain p-1 rounded-full" />
                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-4 w-4 z-50">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 text-white text-[10px] items-center justify-center font-bold">
                                {unreadCount}
                            </span>
                        </span>
                    )}
                </motion.button>
            </div>
        )}
    </div >
);
};

export default ChatWidget;



