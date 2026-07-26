const nodemailer = require('nodemailer');
const axios = require('axios');

let transporter = null;
let transporterConfigKey = null;

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

const buildTransportOptions = (useAltPort = false) => {
    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASS?.replace(/\s/g, '');

    if (!user || !pass) {
        throw new Error('EMAIL_USER and EMAIL_PASS must be set in backend/.env');
    }

    if (useAltPort) {
        return {
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: 587,
            secure: false,
            auth: { user, pass },
            connectionTimeout: 15000,
            greetingTimeout: 15000,
            socketTimeout: 20000,
        };
    }

    return {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: Number(process.env.SMTP_PORT) || 465,
        secure: process.env.SMTP_SECURE !== 'false',
        auth: { user, pass },
        connectionTimeout: 15000,
        greetingTimeout: 15000,
        socketTimeout: 20000,
    };
};

const getTransporter = (useAltPort = false) => {
    const configKey = useAltPort ? '587' : '465';
    if (transporter && transporterConfigKey === configKey) {
        return transporter;
    }

    transporter = nodemailer.createTransport(buildTransportOptions(useAltPort));
    transporterConfigKey = configKey;
    return transporter;
};

const isEmailConfigured = () => {
    if (process.env.BREVO_API_KEY) {
        return Boolean(process.env.EMAIL_FROM || process.env.EMAIL_USER);
    }
    return Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS);
};

const isRetryableSmtpError = (error) => {
    const code = error?.code || '';
    const message = error?.message || '';
    return (
        code === 'ETIMEDOUT' ||
        code === 'ESOCKET' ||
        code === 'ECONNECTION' ||
        /timeout|connection closed|self signed/i.test(message)
    );
};

const sendEmailViaBrevo = async ({ to, subject, html, text }) => {
    const apiKey = process.env.BREVO_API_KEY;
    if (!apiKey) {
        throw new Error('BREVO_API_KEY not set');
    }

    const senderEmail = process.env.EMAIL_FROM || process.env.EMAIL_USER;
    if (!senderEmail) {
        throw new Error('EMAIL_FROM or EMAIL_USER must be set when using Brevo. Also verify this email in Brevo Settings > Senders.');
    }

    const payload = {
        sender: { name: 'Adeeb Technology Lab', email: senderEmail },
        to: [{ email: to }],
        subject,
        htmlContent: html,
        textContent: text || '',
    };

    const response = await axios.post(BREVO_API_URL, payload, {
        headers: {
            'api-key': apiKey,
            'Content-Type': 'application/json',
            Accept: 'application/json',
        },
        timeout: 15000,
    });

    console.log(`✅ Brevo email sent to ${to} (messageId: ${response.data.messageId})`);
    return response.data;
};

const sendEmail = async ({ to, subject, html, text }) => {
    if (process.env.BREVO_API_KEY) {
        return sendEmailViaBrevo({ to, subject, html, text });
    }

    const from = process.env.EMAIL_FROM || process.env.EMAIL_USER;
    let lastError;

    for (const useAltPort of [false, true]) {
        try {
            const transport = getTransporter(useAltPort);
            const info = await transport.sendMail({
                from: `"Adeeb Technology Lab" <${from}>`,
                to,
                subject,
                html,
                text: text || undefined,
            });

            console.log(`✅ Email sent to ${to} (messageId: ${info.messageId})`);
            return info;
        } catch (error) {
            lastError = error;
            if (!useAltPort && isRetryableSmtpError(error)) {
                console.warn('⚠️ SMTP on port 465 failed, retrying on port 587...');
                transporter = null;
                continue;
            }
            throw error;
        }
    }

    throw lastError;
};

module.exports = { sendEmail, isEmailConfigured, getTransporter };
