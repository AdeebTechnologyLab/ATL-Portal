const nodemailer = require('nodemailer');

let transporter = null;
let transporterConfigKey = null;

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

const PLACEHOLDER_RE = /your_gmail|your_16_char|app_password|change_me|example\.com|xxxx/i;

const getEmailConfigIssue = () => {
    const user = (process.env.EMAIL_USER || '').toString().trim();
    const pass = (process.env.EMAIL_PASS || '').toString().trim();

    if (!user || !pass) {
        return 'No email method configured. Set EMAIL_USER + EMAIL_PASS (Gmail App Password) in backend/.env.';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user)) {
        return `EMAIL_USER ("${user}") does not look like a valid email address. Set a real Gmail address in backend/.env.`;
    }
    if (PLACEHOLDER_RE.test(`${user} ${pass}`)) {
        return 'EMAIL_USER / EMAIL_PASS still contain placeholder values. Replace them with a real Gmail address and App Password (https://myaccount.google.com/apppasswords).';
    }
    return null;
};

// isEmailConfigured() returns true only for REAL credentials so the app does not
// pretend reset emails were sent when SMTP would fail anyway (placeholder creds).
const isEmailConfigured = () => !getEmailConfigIssue();

const getTransporter = (useAltPort = false) => {
    const configKey = useAltPort ? '587' : '465';
    if (transporter && transporterConfigKey === configKey) {
        return transporter;
    }

    transporter = nodemailer.createTransport(buildTransportOptions(useAltPort));
    transporterConfigKey = configKey;
    return transporter;
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

const sendEmail = async ({ to, subject, html, text }) => {
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

// Like sendEmail but bounded by an overall timeout so the requester never faces
// an unbounded SMTP wait (previously caused 30s+ timeouts / 502 on Render/Vercel).
// If it times out, the underlying send keeps running in the background.
const sendEmailWithTimeout = async (payload, timeoutMs = 10000) => {
    let timer;
    const timeout = new Promise((_, reject) => {
        timer = setTimeout(() => {
            const err = new Error(`Email send is taking longer than ${Math.round(timeoutMs / 1000)}s`);
            err.code = 'ETIMEOUT_MAIL';
            reject(err);
        }, timeoutMs);
    });

    try {
        return await Promise.race([sendEmail(payload), timeout]);
    } finally {
        clearTimeout(timer);
    }
};

module.exports = { sendEmail, sendEmailWithTimeout, isEmailConfigured, getEmailConfigIssue, getTransporter };
