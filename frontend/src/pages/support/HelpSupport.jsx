import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LifeBuoy,
  Search,
  ChevronDown,
  MapPin,
  Phone,
  Mail,
  Globe,
  Building2,
  BookOpen,
  Clock,
  Sparkles,
  GraduationCap,
  MessageCircle,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { getLanguageMeta } from '../../constants/languages';
import { FAQ_HIGHLIGHTS, FAQ_SECTIONS, ALL_FAQ_ITEMS } from '../../data/helpSupportFaq';

const SECTION_ICONS = {
  general: Sparkles,
  bahawalpur: MapPin,
  islamabad: Building2,
  courses: BookOpen,
  admission: GraduationCap,
  timing: Clock,
  contact: Mail,
  features: LifeBuoy,
};

function FaqAnswer({ item }) {
  return (
    <div>
      <p className="text-sm sm:text-base leading-relaxed text-gray-600 dark:text-white/70 pb-1">
        {item.a}
      </p>
      {item.links?.length > 0 && (
        <motion.div className="flex flex-wrap gap-2 mt-3">
          {item.links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              target={link.type === 'url' ? '_blank' : undefined}
              rel={link.type === 'url' ? 'noopener noreferrer' : undefined}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            >
              {link.type === 'tel' && <Phone className="w-3.5 h-3.5" />}
              {link.type === 'email' && <Mail className="w-3.5 h-3.5" />}
              {link.type === 'url' && <Globe className="w-3.5 h-3.5" />}
              {link.label}
            </a>
          ))}
        </motion.div>
      )}
    </div>
  );
}

const HelpSupport = () => {
  const { i18n } = useTranslation();
  const { isDark } = useTheme();
  const langMeta = getLanguageMeta(i18n.language?.split('-')[0] || 'en');
  const [search, setSearch] = useState('');
  const [activeSection, setActiveSection] = useState('all');
  const [openId, setOpenId] = useState(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let items = ALL_FAQ_ITEMS;
    if (activeSection !== 'all') {
      items = items.filter((i) => i.sectionId === activeSection);
    }
    if (!q) return items;
    return items.filter(
      (i) =>
        i.q.toLowerCase().includes(q) ||
        i.a.toLowerCase().includes(q) ||
        i.sectionTitle.includes(q)
    );
  }, [search, activeSection]);

  const grouped = useMemo(() => {
    const map = new Map();
    for (const item of filtered) {
      if (!map.has(item.sectionId)) {
        const section = FAQ_SECTIONS.find((s) => s.id === item.sectionId);
        map.set(item.sectionId, { section, items: [] });
      }
      map.get(item.sectionId).items.push(item);
    }
    return [...map.values()];
  }, [filtered]);

  const cardClass = isDark
    ? 'bg-[var(--bg-sidebar)]/40 border-white/10 text-white'
    : 'bg-white border-gray-100 text-gray-900 shadow-sm';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto w-full min-w-0 px-3 sm:px-5 md:px-6 lg:px-8 py-4 sm:py-6 lg:py-10 pb-20 sm:pb-16"
      dir={langMeta.dir}
    >
      <div
        className="relative overflow-hidden rounded-2xl sm:rounded-3xl mb-6 sm:mb-8 p-4 sm:p-6 md:p-10 text-white"
        style={{
          background:
            'linear-gradient(135deg, var(--primary-darkest) 0%, var(--secondary) 45%, var(--primary) 100%)',
        }}
      >
        <motion.div
          className="absolute -top-12 -left-12 w-48 h-48 rounded-full bg-white/5 blur-2xl"
          animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 6, repeat: Infinity }}
        />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-6">
          <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center shrink-0">
            <LifeBuoy className="w-7 h-7" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-primary-lighter/90 text-xs font-semibold tracking-wide mb-1" dir="ltr">
              Help & Support · FAQ / FQNA
            </p>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold leading-tight mb-2">Adeeb Technology Lab</h1>
            <p className="text-white/80 text-xs sm:text-sm md:text-base max-w-xl leading-relaxed">
              Website, Bahawalpur Campus, and Islamabad Campus — complete Q&A all in one place
            </p>
          </div>
        </div>
        <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8">
          {FAQ_HIGHLIGHTS.map((h) => (
            <div
              key={h.label}
              className="rounded-lg sm:rounded-xl bg-white/10 backdrop-blur px-2 sm:px-3 py-2.5 sm:py-3 text-center border border-white/10"
            >
              <p className="text-lg sm:text-xl md:text-2xl font-bold text-primary-lighter">{h.value}</p>
              <p className="text-[10px] sm:text-xs font-semibold mt-0.5 leading-tight">{h.label}</p>
              <p className="text-[9px] sm:text-[10px] text-white/60 mt-0.5 hidden md:block">{h.sub}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3 mb-6 sm:mb-8">
        <a
          href="mailto:info.AdeebTechLab@gmail.com"
          className={`flex items-center gap-3 p-3 sm:p-4 rounded-xl sm:rounded-2xl border transition-all active:scale-[0.99] md:hover:shadow-md md:hover:border-primary/30 ${cardClass}`}
        >
          <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center text-primary shrink-0">
            <Mail className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1 text-start sm:text-end">
            <p className="text-xs text-gray-500 dark:text-white/50">Email</p>
            <p className="text-sm font-semibold truncate" dir="ltr">
              info.AdeebTechLab@gmail.com
            </p>
          </div>
        </a>
        <a
          href="https://www.AdeebTechLab.com"
          target="_blank"
          rel="noopener noreferrer"
          className={`flex items-center gap-3 p-4 rounded-2xl border transition-all hover:shadow-md hover:border-primary/30 ${cardClass}`}
        >
          <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center text-primary shrink-0">
            <Globe className="w-5 h-5" />
          </div>
          <div className="min-w-0 text-right">
            <p className="text-xs text-gray-500 dark:text-white/50">Website</p>
            <p className="text-sm font-semibold" dir="ltr">
              www.AdeebTechLab.com
            </p>
          </div>
        </a>
        <button
          type="button"
          onClick={() =>
            window.dispatchEvent(new CustomEvent('openChatWidget', { detail: { open: true } }))
          }
          className={`flex items-center gap-3 p-3 sm:p-4 rounded-xl sm:rounded-2xl border transition-all active:scale-[0.99] md:hover:shadow-md md:hover:border-primary/30 text-start sm:text-end w-full ${cardClass}`}
        >
          <div className="w-10 h-10 rounded-xl bg-green-500/15 flex items-center justify-center text-green-600 dark:text-green-400 shrink-0">
            <MessageCircle className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-gray-500 dark:text-white/50">Live Chat</p>
            <p className="text-sm font-semibold">Open Support Chat</p>
          </div>
        </button>
      </div>

      <div
        className={`flex items-center gap-2 sm:gap-3 rounded-xl sm:rounded-2xl border px-3 sm:px-4 py-2.5 sm:py-3 mb-4 sm:mb-5 transition-colors ${
          isDark ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'
        }`}
      >
        <Search className={`w-5 h-5 shrink-0 ${isDark ? 'text-white/40' : 'text-gray-400'}`} />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search questions... (e.g. admission, Web Development)"
          className={`flex-1 bg-transparent border-none outline-none text-sm ${
            isDark ? 'text-white placeholder:text-white/30' : 'text-gray-800 placeholder:text-gray-400'
          }`}
          dir="auto"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            className="text-xs font-medium text-primary hover:underline shrink-0"
          >
            Clear
          </button>
        )}
      </div>

      <div className="-mx-3 sm:mx-0 px-3 sm:px-0 flex gap-2 overflow-x-auto pb-2 mb-5 sm:mb-6 scrollbar-thin snap-x-mandatory">
        <button
          type="button"
          onClick={() => setActiveSection('all')}
          className={`snap-start shrink-0 px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all ${
            activeSection === 'all'
              ? 'bg-primary text-white shadow-md'
              : isDark
                ? 'bg-white/5 text-white/70 hover:bg-white/10'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          All ({ALL_FAQ_ITEMS.length})
        </button>
        {FAQ_SECTIONS.map((s) => {
          const Icon = SECTION_ICONS[s.id] || BookOpen;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setActiveSection(s.id)}
              className={`snap-start shrink-0 flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
                activeSection === s.id
                  ? 'bg-primary text-white shadow-md'
                  : isDark
                    ? 'bg-white/5 text-white/70 hover:bg-white/10'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {s.title}
            </button>
          );
        })}
      </div>

      {grouped.length === 0 ? (
        <div className={`text-center py-16 rounded-2xl border ${cardClass}`}>
          <Search className="w-10 h-10 mx-auto text-gray-300 dark:text-white/20 mb-3" />
          <p className="font-medium">No questions found</p>
          <p className="text-sm text-gray-500 dark:text-white/50 mt-1">Try another search term</p>
        </div>
      ) : (
        <div className="space-y-8">
          {grouped.map(({ section, items }) => {
            const Icon = SECTION_ICONS[section.id] || BookOpen;
            return (
              <section key={section.id}>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center text-primary">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold">{section.title}</h2>
                  </div>
                </div>
                <div className="space-y-2">
                  {items.map((item) => {
                    const isOpen = openId === item.id;
                    return (
                      <div
                        key={item.id}
                        className={`rounded-2xl border overflow-hidden transition-shadow ${
                          isOpen ? 'shadow-md ring-1 ring-primary/20' : ''
                        } ${cardClass}`}
                      >
                        <button
                          type="button"
                          onClick={() => setOpenId(isOpen ? null : item.id)}
                          className="w-full flex items-start gap-2 sm:gap-3 p-3 sm:p-4 md:p-5 text-start hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
                          aria-expanded={isOpen}
                        >
                          <span
                            className={`hidden min-[400px]:inline shrink-0 text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md mt-0.5 ${
                              isDark ? 'bg-primary/20 text-primary' : 'bg-primary/10 text-primary'
                            }`}
                            dir="ltr"
                          >
                            {item.id.toUpperCase()}
                          </span>
                          <span className="flex-1 min-w-0 text-sm sm:text-base font-semibold leading-snug">
                            {item.q}
                          </span>
                          <ChevronDown
                            className={`w-5 h-5 shrink-0 text-gray-400 transition-transform duration-200 ${
                              isOpen ? 'rotate-180 text-primary' : ''
                            }`}
                          />
                        </button>
                        <AnimatePresence initial={false}>
                          {isOpen && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className={`overflow-hidden border-t ${isDark ? 'border-white/5' : 'border-gray-50'}`}
                            >
                              <div className="px-4 sm:px-5 pb-4 sm:pb-5 pt-3 sm:pr-12">
                                <FaqAnswer item={item} />
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <p className="text-center text-xs text-gray-400 dark:text-white/30 mt-10" dir="ltr">
        Complete FAQ Set · Adeeb Technology Lab © {new Date().getFullYear()}
      </p>
    </motion.div>
  );
};

export default HelpSupport;
