/** Platform hover styles for social icon buttons */
export const PLATFORM_HOVER = {
    email: 'hover:bg-amber-500/20 hover:text-amber-400',
    website: 'hover:bg-primary/20 hover:text-primary',
    facebook: 'hover:bg-blue-500/20 hover:text-blue-400',
    instagram: 'hover:bg-pink-500/20 hover:text-pink-400',
    linkedin: 'hover:bg-sky-500/20 hover:text-sky-400',
    x: 'hover:bg-gray-400/20 hover:text-gray-200',
    youtube: 'hover:bg-red-500/20 hover:text-red-400',
    tiktok: 'hover:bg-gray-400/20 hover:text-white',
    github: 'hover:bg-purple-500/20 hover:text-purple-300',
    snapchat: 'hover:bg-yellow-500/20 hover:text-yellow-300',
    pinterest: 'hover:bg-red-600/20 hover:text-red-400',
    whatsapp: 'hover:bg-green-500/20 hover:text-green-400',
    threads: 'hover:bg-gray-400/20 hover:text-gray-200',
};

export const SOCIAL_LINK_GROUPS = [
    {
        id: 'adeeb-tech-lab',
        title: 'Adeeb Technology Lab',
        badge: 'Company',
        links: [
            { platform: 'website', label: 'Website', href: 'https://adeeb-technology-lab-website.vercel.app/' },
            { platform: 'email', label: 'Email', href: 'mailto:info.AdeebTechLab@gmail.com' },
            { platform: 'whatsapp', label: 'WhatsApp', href: 'https://www.whatsapp.com/channel/0029VaCeeBg4inos1Eqtbc43' },
            { platform: 'facebook', label: 'Facebook', href: 'https://web.facebook.com/AdeebTechnologyLab' },
            { platform: 'instagram', label: 'Instagram', href: 'https://www.instagram.com/adeebtechlab/' },
            { platform: 'linkedin', label: 'LinkedIn', href: 'https://www.linkedin.com/company/AdeebTechnologyLab/' },
            { platform: 'x', label: 'X (Twitter)', href: 'https://x.com/AdeebTechLab' },
            { platform: 'youtube', label: 'YouTube', href: 'https://www.youtube.com/AdeebTechnologyLab' },
            { platform: 'tiktok', label: 'TikTok', href: 'https://www.tiktok.com/@adeebtechnologylab' },
            { platform: 'threads', label: 'Threads', href: 'https://www.threads.com/@adeebtechlab' },
            { platform: 'github', label: 'GitHub', href: 'https://github.com/AdeebTechLab' },
            { platform: 'snapchat', label: 'Snapchat', href: 'https://www.snapchat.com/@salmanadeeb02' },
            { platform: 'pinterest', label: 'Pinterest', href: 'https://www.pinterest.com/adeebtechnologylab/' },
        ],
    },
    {
        id: 'computer-courses',
        title: 'The Computer Courses',
        badge: 'Academy',
        links: [
            { platform: 'website', label: 'Website', href: 'https://the-computer-courses-web.vercel.app' },
            { platform: 'email', label: 'Email', href: 'mailto:info.TheComputerCourse@gmail.com' },
            { platform: 'whatsapp', label: 'WhatsApp', href: 'https://www.whatsapp.com/channel/0029VaC5PtjEgGfEQtQZUh1p' },
            { platform: 'facebook', label: 'Facebook', href: 'https://www.facebook.com/TheComputerCourses' },
            { platform: 'instagram', label: 'Instagram', href: 'https://www.instagram.com/thecomputercourses' },
            { platform: 'linkedin', label: 'LinkedIn', href: 'https://www.linkedin.com/company/thecomputercourses' },
        ],
    },
];

/** @deprecated Use SOCIAL_LINK_GROUPS */
export const LAB_SOCIAL_LINKS = SOCIAL_LINK_GROUPS.flatMap((g) =>
    g.links.map((link) => ({
        id: link.platform,
        label: link.label,
        href: link.href,
        hoverClass: PLATFORM_HOVER[link.platform] || '',
    }))
);
