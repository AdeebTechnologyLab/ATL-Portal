import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, User } from 'lucide-react';
import { getAnswer, isUrl, openExternalUrl } from './chatbotHelper';

const GuestChatWidget = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [isBotTyping, setIsBotTyping] = useState(false);

    const scrollRef = useRef();

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

        setTimeout(performScroll, 50);
        setTimeout(performScroll, 200);
    };

    useEffect(() => {
        if (isOpen && messages.length > 0) {
            setTimeout(() => scrollToBottom(true), 300);
        }
    }, [messages, isOpen]);

    // Send Main Menu on first open if empty
    useEffect(() => {
        if (isOpen && messages.length === 0) {
            setTimeout(() => sendBotMessage("Main Menu"), 100);
        }
    }, [isOpen]);

    const sendBotMessage = async (textOverride) => {
        setIsBotTyping(true);
        try {
            const botRes = await getAnswer(textOverride, "Guest");
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
        } catch (error) {
            console.error('Bot Error:', error);
        } finally {
            setIsBotTyping(false);
        }
    };

    const handleSendMessage = async (e, textOverride) => {
        if (e) e.preventDefault();

        const text = textOverride || newMessage;
        if (!text.trim()) return;
        
        if (isBotTyping) return; // Prevent double-clicks causing duplicate messages

        if (!textOverride) setNewMessage('');

        const userMsg = {
            _id: 'temp-' + Date.now(),
            text: text,
            senderId: 'guest',
            sender: { name: 'You' },
            createdAt: new Date().toISOString(),
            isBot: false
        };

        setMessages(prev => [...prev, userMsg]);
        scrollToBottom(true);
        
        const disabledUntil = localStorage.getItem('guestDisableBotUntil');
        const now = Date.now();

        if (text.toLowerCase().trim() === 'main menu') {
            localStorage.removeItem('guestDisableBotUntil');
        } else if (disabledUntil && now < parseInt(disabledUntil, 10)) {
            return;
        }

        if (text.toLowerCase().trim() === 'chat with adeeb') {
            setIsBotTyping(true);
            setTimeout(() => {
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
                localStorage.setItem('guestDisableBotUntil', (Date.now() + 2 * 60 * 60 * 1000).toString());
                setIsBotTyping(false);
            }, 500);
            return;
        }

        setIsBotTyping(true);
        setTimeout(() => {
            sendBotMessage(text);
        }, 500);
    };

    const handleOptionClick = (value) => {
        if (isUrl(value)) {
            openExternalUrl(value);
            const linkMsg = {
                _id: 'link-' + Date.now(),
                text: value,
                senderId: 'guest',
                sender: { name: 'You' },
                createdAt: new Date().toISOString(),
                isBot: false
            };
            setMessages(prev => [...prev, linkMsg]);
            return;
        }
        handleSendMessage(null, value);
    };

    return (
        <div className="fixed bottom-6 left-6 z-[9999]">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className="mb-4 w-full max-w-[95vw] md:w-[400px] bg-white rounded-[2rem] shadow-2xl border border-gray-100 overflow-hidden flex flex-col h-[700px] max-h-[90vh]"
                    >
                        {/* Header */}
                        <div className="bg-primary p-4 text-white flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 flex items-center justify-center overflow-hidden">
                                    <img src="/livechat.png" alt="Chat" className="w-full h-full object-contain" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-xl leading-none">Adeeb Chatbot</h3>
                                    <div className="text-[12px] text-orange-100 uppercase tracking-[0.2em] font-black mt-1.5 opacity-80 flex items-center gap-2">
                                        <span className="relative flex h-2 w-2">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                        </span>
                                        24/7 Online
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button type="button" onClick={() => setIsOpen(false)} className="p-3 hover:bg-white/10 rounded-full transition-all hover:rotate-90">
                                    <X className="w-7 h-7" />
                                </button>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="flex-1 overflow-y-auto bg-gray-50 flex flex-col p-4 space-y-4">
                            {messages.map((msg, index) => {
                                const isMe = msg.senderId === 'guest';
                                const isBot = msg.isBot;
                                
                                return (
                                    <div key={msg._id || index} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                        <div className={`flex items-end gap-2 max-w-[85%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                                            {!isMe && (
                                                <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                                                    <img src="/livechat.png" alt="Bot" className="w-6 h-6 object-contain" />
                                                </div>
                                            )}
                                            
                                            <div className={`p-3 rounded-2xl ${isMe ? 'bg-primary text-white rounded-br-sm' : 'bg-white border border-gray-100 shadow-sm rounded-bl-sm text-gray-800'}`}>
                                                <div className="whitespace-pre-wrap text-[13px] leading-relaxed" dangerouslySetInnerHTML={{ __html: msg.text.replace(/((https?:\/\/|www\.)[^\s<]+)/gi, url => `<a href="${url.startsWith('www.') ? 'https://'+url : url}" target="_blank" class="${isMe ? 'text-white hover:text-orange-100' : 'text-primary hover:text-orange-600'} underline decoration-current/40 underline-offset-4 font-bold transition-colors">${url}</a>`) }} />
                                            </div>
                                        </div>
                                        {msg.createdAt && (
                                            <span className={`text-[10px] text-gray-400 mt-1 ${isMe ? 'mr-10' : 'ml-10'}`}>
                                                {new Date(msg.createdAt).toLocaleString('en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
                                            </span>
                                        )}

                                        {isBot && msg.options && msg.options.length > 0 && (
                                            <div className="mt-2 ml-10 flex flex-wrap gap-2 max-w-[85%]">
                                                {msg.options.map((opt, i) => (
                                                    <button
                                                        key={i}
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            handleOptionClick(opt.value);
                                                        }}
                                                        className="px-3 py-1.5 bg-white border border-orange-200 text-primary text-xs font-bold rounded-lg hover:bg-orange-50 transition-all shadow-sm active:scale-95 text-left"
                                                    >
                                                        {opt.label}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                            
                            {isBotTyping && (
                                <div className="flex items-end gap-2 max-w-[85%]">
                                    <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                                        <img src="/livechat.png" alt="Bot" className="w-6 h-6 object-contain" />
                                    </div>
                                    <div className="px-4 py-3 bg-white border border-gray-100 shadow-sm rounded-2xl rounded-bl-sm flex gap-1">
                                        <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                        <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                        <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                                    </div>
                                </div>
                            )}
                            <div ref={scrollRef} className="h-4" />
                        </div>

                        {/* Input Footer */}
                        <div className="p-4 bg-white border-t border-gray-100">
                            <form onSubmit={(e) => handleSendMessage(e)} className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder="Type your message..."
                                    className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-[14px] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                                />
                                <button
                                    type="submit"
                                    disabled={!newMessage.trim() || isBotTyping}
                                    className="p-3 bg-primary text-white rounded-2xl hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Send className="w-5 h-5" />
                                </button>
                            </form>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

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
                    </motion.button>
                </div>
            )}
        </div>
    );
};

export default GuestChatWidget;
