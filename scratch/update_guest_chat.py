import re

path = 'd:/Downloads/LMS-Adeeb-Technology-Lab/frontend/src/components/shared/GuestChatWidget.jsx'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

replacement = """    const handleSendMessage = async (e, textOverride) => {
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
                const autoReply = "Assalam o Alaikum! Adeeb is currently not available, but he will read your message and reply to you as soon as possible. Please leave your message here.\\n\\nIf you want to use the bot again, just click or type 'Main Menu'.";
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
    };"""

content = re.sub(
    r"    const handleSendMessage = async \(e, textOverride\) => \{.*?    const handleOptionClick = \(value\) => \{",
    replacement + "\n\n    const handleOptionClick = (value) => {",
    content,
    flags=re.DOTALL
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
