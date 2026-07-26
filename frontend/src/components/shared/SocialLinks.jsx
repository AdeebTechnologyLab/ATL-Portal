import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Share2, ChevronUp, ChevronDown } from 'lucide-react';
import { SOCIAL_LINK_GROUPS, PLATFORM_HOVER } from '../../constants/socialLinks';
import SocialIcon from './SocialIcon';
import { useTranslation } from 'react-i18next';

const SocialLinks = ({ className = '' }) => {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [activeGroup, setActiveGroup] = useState(null);
    const containerRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
                setActiveGroup(null);
            }
        };
        if (isOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const toggleOpen = () => {
        setIsOpen((prev) => {
            if (prev) setActiveGroup(null);
            return !prev;
        });
    };

    const selectGroup = (groupId) => {
        setActiveGroup((prev) => (prev === groupId ? null : groupId));
    };

    return (
        <div ref={containerRef} className={`relative ${className}`}>
            <img 
                src="/Flex.gif" 
                alt="Flex" 
                className="absolute -top-8 left-12 w-24 h-24 z-10 pointer-events-none drop-shadow-lg" 
            />
            <button
                type="button"
                onClick={toggleOpen}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                    isOpen
                        ? 'bg-white/10 text-[var(--text-sidebar)] border border-white/10'
                        : 'text-[var(--text-sidebar-muted)] hover:text-[var(--text-sidebar)] hover:bg-white/5'
                }`}
            >
                <Share2 className="w-5 h-5 shrink-0" />
                <span className="font-medium flex-1 text-left">{t('social.title')}</span>
                <motion.span
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.25 }}
                    className="shrink-0"
                >
                    <ChevronUp className="w-4 h-4 opacity-70" />
                </motion.span>
            </button>

            <AnimatePresence initial={false}>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0, marginTop: 0 }}
                        animate={{ opacity: 1, height: 'auto', marginTop: 8 }}
                        exit={{ opacity: 0, height: 0, marginTop: 0 }}
                        transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
                        className="overflow-hidden"
                    >
                        <div className="rounded-xl border border-white/10 bg-black/20 backdrop-blur-sm overflow-hidden">
                            {SOCIAL_LINK_GROUPS.map((group, index) => {
                                const isActive = activeGroup === group.id;

                                return (
                                    <div
                                        key={group.id}
                                        className={index > 0 ? 'border-t border-white/10' : ''}
                                    >
                                        <button
                                            type="button"
                                            onClick={() => selectGroup(group.id)}
                                            className={`w-full flex items-center justify-between gap-2 px-3.5 py-2.5 text-left transition-colors ${
                                                isActive
                                                    ? 'bg-primary/15 text-[var(--text-sidebar)]'
                                                    : 'text-[var(--text-sidebar-muted)] hover:bg-white/5 hover:text-[var(--text-sidebar)]'
                                            }`}
                                        >
                                            <span className="text-[11px] font-semibold leading-snug">
                                                {group.id === 'adeeb-tech-lab' ? t('social.adeebTechLab') : group.id === 'computer-courses' ? t('social.theComputerCourses') : group.title}
                                                {group.badge && (
                                                    <span className="text-primary font-bold ml-1">· {group.badge === 'Company' ? t('social.company') : group.badge === 'Academy' ? t('social.academy') : group.badge}</span>
                                                )}
                                            </span>
                                            <ChevronDown
                                                className={`w-3.5 h-3.5 shrink-0 opacity-60 transition-transform duration-200 ${
                                                    isActive ? 'rotate-180' : ''
                                                }`}
                                            />
                                        </button>

                                        <AnimatePresence initial={false}>
                                            {isActive && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    transition={{ duration: 0.22 }}
                                                    className="overflow-hidden"
                                                >
                                                    <motion.div
                                                        className="flex flex-wrap gap-1.5 px-3 pb-3 pt-0.5"
                                                        initial={{ y: -4 }}
                                                        animate={{ y: 0 }}
                                                        exit={{ y: -4 }}
                                                    >
                                                        {group.links.map((link) => {
                                                            const isExternal = link.href.startsWith('http');
                                                            const hoverClass =
                                                                PLATFORM_HOVER[link.platform] ||
                                                                'hover:bg-white/10 hover:text-white';

                                                            return (
                                                                <a
                                                                    key={link.platform}
                                                                    href={link.href}
                                                                    {...(isExternal
                                                                        ? {
                                                                              target: '_blank',
                                                                              rel: 'noopener noreferrer',
                                                                          }
                                                                        : {})}
                                                                    title={link.label}
                                                                    aria-label={`${group.title} — ${link.label}`}
                                                                    className={`flex items-center justify-center w-8 h-8 rounded-lg text-[var(--text-sidebar-muted)] bg-white/5 border border-white/10 transition-all duration-200 ${hoverClass}`}
                                                                >
                                                                    <SocialIcon platform={link.platform} />
                                                                </a>
                                                            );
                                                        })}
                                                    </motion.div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default SocialLinks;
