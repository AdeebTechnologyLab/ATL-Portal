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

module.exports = { sendEmail, isEmailConfigured, getTransporter };
