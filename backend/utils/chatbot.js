const axios = require('axios');
const GlobalMessage = require('../models/GlobalMessage');
const { sendPushNotification } = require('../utils/pushHelper');

/**
 * Fetch and parse Google Sheet (Sheet1) to look for a chatbot match.
 * Sheet URL: https://docs.google.com/spreadsheets/d/1hCz8S0JFTFEESV7IRejWZipyB4isVDh7GKDRPH010dQ/edit?gid=0#gid=0
 * Export CSV format URL: https://docs.google.com/spreadsheets/d/1hCz8S0JFTFEESV7IRejWZipyB4isVDh7GKDRPH010dQ/export?format=csv&gid=0
 */
async function checkGoogleSheetAndReply(userMsg, senderId, recipientId, app) {
    try {
        const sheetUrl = "https://docs.google.com/spreadsheets/d/1hCz8S0JFTFEESV7IRejWZipyB4isVDh7GKDRPH010dQ/export?format=csv&gid=0";
        console.log(`[CHATBOT] Checking Google Sheet for match: "${userMsg}"`);

        const response = await axios.get(sheetUrl, { timeout: 6000 });
        const csvText = response.data;
        if (!csvText) {
            console.log('[CHATBOT] Received empty response from Google Sheet.');
            return;
        }

        // Parse CSV properly to support multi-line values in cells
        const cleanUserMsg = userMsg.trim().toLowerCase();
        let matchAnswer = null;

        const rows = [];
        let currentRow = [];
        let currentField = '';
        let inQuotes = false;

        for (let i = 0; i < csvText.length; i++) {
            const char = csvText[i];
            const nextChar = csvText[i + 1];

            if (char === '"') {
                if (inQuotes && nextChar === '"') {
                    currentField += '"';
                    i++; // Skip the next quote
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                currentRow.push(currentField);
                currentField = '';
            } else if ((char === '\r' || char === '\n') && !inQuotes) {
                currentRow.push(currentField);
                rows.push(currentRow);
                currentRow = [];
                currentField = '';
                if (char === '\r' && nextChar === '\n') {
                    i++;
                }
            } else {
                currentField += char;
            }
        }
        if (currentField || currentRow.length > 0) {
            currentRow.push(currentField);
            rows.push(currentRow);
        }

        // Search for a matching row
        for (const columns of rows) {
            if (columns.length >= 2) {
                const key = columns[0].trim().toLowerCase();
                const val = columns[1].trim();

                if (key === cleanUserMsg) {
                    matchAnswer = val;
                    break;
                }
            }
        }

        if (matchAnswer) {
            console.log(`[CHATBOT] Found match! Column A: "${userMsg}" -> Column B: "${matchAnswer}"`);
            
            // Wait 1.2 seconds to simulate natural typing speed
            setTimeout(async () => {
                try {
                    // Create auto-response message where Sender is Admin (recipientId) and Recipient is User (senderId)
                    const botMsg = await GlobalMessage.create({
                        sender: recipientId,
                        recipient: senderId,
                        text: matchAnswer
                    });

                    const populatedBotMsg = await GlobalMessage.findById(botMsg._id)
                        .populate('sender', 'name role')
                        .populate('recipient', 'name role');

                    // Broadcast via Socket
                    const io = app.get('io');
                    if (io) {
                        const socketData = {
                            ...populatedBotMsg.toObject(),
                            senderId: recipientId,
                            recipientId: senderId,
                            senderName: populatedBotMsg.sender.name
                        };
                        io.to(senderId.toString()).emit('new_global_message', socketData);
                        io.to(recipientId.toString()).emit('new_global_message', socketData);
                    }

                    // Push notification in background
                    sendPushNotification(senderId, {
                        title: `Support Auto-Reply`,
                        body: matchAnswer,
                        icon: '/logo.png',
                        url: `/chat`
                    });

                    console.log('[CHATBOT] Auto-reply message successfully sent and broadcasted!');
                } catch (err) {
                    console.error('[CHATBOT] Error creating auto-reply message:', err);
                }
            }, 1200);
        } else {
            console.log(`[CHATBOT] No match found in Google Sheet for: "${userMsg}"`);
        }
    } catch (error) {
        console.error('[CHATBOT] Error executing Google Sheet check:', error.message);
    }
}

module.exports = { checkGoogleSheetAndReply };
