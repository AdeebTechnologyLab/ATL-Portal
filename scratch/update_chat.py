import re

path = 'd:/Downloads/LMS-Adeeb-Technology-Lab/frontend/src/components/shared/ChatWidget.jsx'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

replacement = """            // [NEW] Bot Logic for non-admins
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

                setIsBotTyping(true);"""

content = re.sub(
    r"// \[NEW\] Bot Logic for non-admins.*?setIsBotTyping\(true\);",
    replacement,
    content,
    flags=re.DOTALL
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
