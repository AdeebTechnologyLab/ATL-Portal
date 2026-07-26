import re

def fix_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # We want to find the autoReply assignment and change its quotes to backticks
    # It currently looks like: const autoReply = "Assalam...here.\n\nIf...Menu'.";
    
    # Let's just use string replace.
    # The start is: const autoReply = "Assalam
    # The end is: Menu'.";
    
    old_string = 'const autoReply = "Assalam o Alaikum! Adeeb is currently not available, but he will read your message and reply to you as soon as possible. Please leave your message here.\n\nIf you want to use the bot again, just click or type \'Main Menu\'.";'
    new_string = 'const autoReply = `Assalam o Alaikum! Adeeb is currently not available, but he will read your message and reply to you as soon as possible. Please leave your message here.\\n\\nIf you want to use the bot again, just click or type \\\'Main Menu\\\'.`;'
    
    content = content.replace(old_string, new_string)
    
    # Wait, the string in the file actually contains literal newlines because python \n was interpreted as literal newline!
    # So the old string in the file is:
    old_string_multiline = '''const autoReply = "Assalam o Alaikum! Adeeb is currently not available, but he will read your message and reply to you as soon as possible. Please leave your message here.

If you want to use the bot again, just click or type 'Main Menu'.";'''
    
    new_string_multiline = '''const autoReply = `Assalam o Alaikum! Adeeb is currently not available, but he will read your message and reply to you as soon as possible. Please leave your message here.

If you want to use the bot again, just click or type 'Main Menu'.`;'''

    content = content.replace(old_string_multiline, new_string_multiline)

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

fix_file('d:/Downloads/LMS-Adeeb-Technology-Lab/frontend/src/components/shared/ChatWidget.jsx')
fix_file('d:/Downloads/LMS-Adeeb-Technology-Lab/frontend/src/components/shared/GuestChatWidget.jsx')

print("Fixed autoReply strings in both files.")
