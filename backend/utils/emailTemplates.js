const SOCIAL_LINKS = [
    { label: 'Website', href: 'https://adeeb-technology-lab-website.vercel.app/' },
    { label: 'Facebook', href: 'https://web.facebook.com/AdeebTechnologyLab' },
    { label: 'Instagram', href: 'https://www.instagram.com/adeebtechlab/' },
    { label: 'LinkedIn', href: 'https://www.linkedin.com/company/AdeebTechnologyLab/' },
    { label: 'X (Twitter)', href: 'https://x.com/AdeebTechLab' },
    { label: 'YouTube', href: 'https://www.youtube.com/AdeebTechnologyLab' },
    { label: 'TikTok', href: 'https://www.tiktok.com/@adeebtechnologylab' },
    { label: 'Threads', href: 'https://www.threads.com/@adeebtechlab' },
    { label: 'GitHub', href: 'https://github.com/AdeebTechLab' },
    { label: 'Snapchat', href: 'https://www.snapchat.com/@salmanadeeb02' },
    { label: 'Pinterest', href: 'https://www.pinterest.com/adeebtechnologylab/' },
    { label: 'WhatsApp Channel', href: 'https://www.whatsapp.com/channel/0029VaCeeBg4inos1Eqtbc43' },
    { label: 'Email', href: 'mailto:info.AdeebTechLab@gmail.com' },
];

const escapeHtml = (value) =>
    String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

const renderMessageHtml = (message) =>
    String(message || '')
        .replace(/\r\n/g, '\n')
        .split('\n')
        .map((line) => {
            if (!line.trim()) {
                return '<div style="height:10px;line-height:10px;">&nbsp;</div>';
            }
            return `<p style="margin:0 0 10px;font-size:14px;line-height:1.65;color:#555555;">${escapeHtml(line)}</p>`;
        })
        .join('');

const buildBrandedEmail = ({ heading, message, subtitle = 'Official Notification' }) => {
    const safeHeading = escapeHtml(heading || 'Adeeb Technology Lab');
    const socialLinkStyle =
        'display:inline-block;margin:3px 4px;padding:8px 12px;border-radius:8px;background:#f3f4f6;color:#374151;text-decoration:none;font-size:12px;font-weight:bold;';
    const socialLinksHtml = SOCIAL_LINKS.map(
        (link) => `<a href="${link.href}" style="${socialLinkStyle}">${escapeHtml(link.label)}</a>`
    ).join('');

    const html = `
        <div style="font-family: Arial, Helvetica, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #f5f6f8;">
            <div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 16px; overflow: hidden;">
                <div style="background: linear-gradient(135deg, #ff8e01, #e67e00); padding: 28px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 22px;">Adeeb Technology Lab</h1>
                    <p style="margin: 6px 0 0; color: rgba(255,255,255,0.9); font-size: 13px; letter-spacing: 1px; text-transform: uppercase;">${escapeHtml(subtitle)}</p>
                </div>
                <div style="padding: 28px; color: #333333;">
                    <h2 style="margin: 0 0 16px; font-size: 18px; color: #1f2937;">${safeHeading}</h2>
                    ${renderMessageHtml(message)}
                    <div style="text-align: center; margin: 24px 0 4px;">
                        <a href="https://wa.me/923092333121" style="display: inline-block; padding: 12px 22px; background: #25d366; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px;">Contact Support on WhatsApp</a>
                    </div>
                </div>
                <div style="padding: 22px 28px 28px; text-align: center; border-top: 1px solid #eeeeee; background: #fafafa;">
                    <p style="margin: 0 0 10px; font-size: 11px; color: #888888; text-transform: uppercase; letter-spacing: 1.5px; font-weight: bold;">Follow us</p>
                    <div style="margin: 0 0 16px;">${socialLinksHtml}</div>
                    <p style="margin: 0; font-size: 12px; color: #999999;">© 2026 Adeeb Technology Lab. All rights reserved.</p>
                    <p style="margin: 6px 0 0; font-size: 12px; color: #999999;">Great People work with Adeeb Technology Lab</p>
                </div>
            </div>
        </div>
    `;

    const text = `${message || ''}\n\nFollow us:\n${SOCIAL_LINKS.map((link) => `${link.label}: ${link.href}`).join('\n')}\n\n© 2026 Adeeb Technology Lab. All rights reserved.\nGreat People work with Adeeb Technology Lab`;

    return { html, text };
};

module.exports = { buildBrandedEmail, SOCIAL_LINKS };
