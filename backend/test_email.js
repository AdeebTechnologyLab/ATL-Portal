const nodemailer = require('nodemailer');
require('dotenv').config();

async function testEmail() {
    console.log('Testing Email Configuration...');
    console.log('EMAIL_USER:', process.env.EMAIL_USER);
    // Mask password
    console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? '********' : 'NOT SET');

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    try {
        await transporter.verify();
        console.log('✅ SMTP Connection verified successfully');

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: process.env.EMAIL_USER, // Send to self for test
            subject: 'LMS Email Test',
            text: 'This is a test email from the LMS backend.'
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Email sent successfully:', info.messageId);
    } catch (error) {
        console.error('❌ Email test failed:');
        console.error(error);
    }
}

testEmail();
