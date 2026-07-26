import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Palette, Check, Layout, Sun, Moon, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { APP_THEMES } from '../../constants/themes';
import LanguagePicker from '../../components/settings/LanguagePicker';

function ThemePreviewCard({ theme: themeData, isActive, onSelect, actionLabel }) {
    return (
        <motion.button
            type="button"
            whileHover={{ y: -4 }}
            whileTap={{ scale: 0.98 }}
            onClick={onSelect}
            className={`group relative w-full text-left rounded-2xl sm:rounded-[1.75rem] border-2 overflow-hidden transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary active:scale-[0.99] md:hover:shadow-xl ${
                isActive
                    ? 'border-transparent shadow-xl sm:shadow-2xl ring-2 ring-offset-2'
                    : 'border-gray-100 dark:border-gray-800 md:hover:border-gray-200 dark:md:hover:border-gray-700'
            }`}
            style={
                isActive
                    ? {
                          ringColor: themeData.primary,
                          boxShadow: `0 20px 40px -12px ${themeData.primary}40`,
                      }
                    : undefined
            }
        >
            {/* Mini app mockup */}
            <motion.div
                className="relative h-28 sm:h-32 flex overflow-hidden"
                style={{ backgroundColor: themeData.bgMain }}
            >
                {/* Sidebar strip */}
                <div
                    className="w-[22%] min-w-[3.5rem] h-full flex flex-col gap-1.5 p-2 shrink-0"
                    style={{ backgroundColor: themeData.sidebar }}
                >
                    <div className="h-2 w-6 rounded-full bg-white/25" />
                    <motion.div
                        className="h-1.5 w-full rounded-full"
                        style={{ backgroundColor: themeData.primary }}
                    ></motion.div>
                    <div className="h-1.5 w-4/5 rounded-full bg-white/15" />
                    <div className="h-1.5 w-3/5 rounded-full bg-white/10" />
                </div>
                {/* Main content */}
                <div className="flex-1 p-2.5 sm:p-3 flex flex-col gap-2 min-w-0">
                    <div
                        className="h-2.5 w-1/2 rounded-full opacity-80"
                        style={{ backgroundColor: themeData.textPrimary }}
                    />
                    <div
                        className="rounded-lg flex-1 min-h-[3rem] p-2 flex flex-col justify-between shadow-sm"
                        style={{ backgroundColor: themeData.bgCard }}
                    >
                        <div
                            className="h-1.5 w-3/4 rounded-full opacity-30"
                            style={{ backgroundColor: themeData.textPrimary }}
                        />
                        <span
                            className="self-start text-[9px] font-bold px-2 py-1 rounded-md shadow-sm"
                            style={{
                                backgroundColor: themeData.primary,
                                color: themeData.onPrimary,
                            }}
                        >
                            {actionLabel}
                        </span>
                    </div>
                </div>
                {isActive && (
                    <motion.div
                        layoutId="themeActiveBadge"
                        className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full flex items-center justify-center shadow-lg"
                        style={{ backgroundColor: themeData.primary, color: themeData.onPrimary }}
                    >
                        <Check className="w-4 h-4 stroke-[3]" />
                    </motion.div>
                )}
            </motion.div>

            {/* Info + color chips */}
            <div
                className={`p-4 sm:p-5 ${
                    isActive
                        ? 'bg-white dark:bg-gray-800/80'
                        : 'bg-white/90 dark:bg-[#1a1f2e]/90'
                }`}
            >
                <motion.div className="flex items-start justify-between gap-2 mb-3">
                    <div className="min-w-0">
                        <span
                            className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500"
                        >
                            Theme {themeData.number}
                        </span>
                        <h4 className="text-base sm:text-lg font-black text-gray-900 dark:text-white uppercase italic tracking-tight truncate mt-0.5">
                            {themeData.name}
                        </h4>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 font-semibold mt-0.5">
                            {themeData.tagline}
                        </p>
                    </div>
                </motion.div>
                <div className="flex items-center gap-2">
                    <span
                        className="text-[8px] font-bold uppercase tracking-wider text-gray-400 shrink-0"
                        title="Primary"
                    >
                        Brand
                    </span>
                    <div className="flex gap-1.5 flex-1">
                        <span
                            className="h-5 flex-1 max-w-[2.5rem] rounded-md shadow-inner border border-black/5"
                            style={{ backgroundColor: themeData.primary }}
                            title={`Primary ${themeData.primary}`}
                        />
                        <span
                            className="h-5 flex-1 max-w-[2.5rem] rounded-md shadow-inner border border-black/5"
                            style={{ backgroundColor: themeData.sidebar }}
                            title={`Sidebar ${themeData.sidebar}`}
                        />
                        <span
                            className="h-5 flex-1 max-w-[2.5rem] rounded-md shadow-inner border border-black/5"
                            style={{ backgroundColor: themeData.textPrimary }}
                            title={`Text ${themeData.textPrimary}`}
                        />
                    </div>
                </div>
            </div>

            {isActive && (
                <motion.div
                    layoutId="themeActiveBar"
                    className="absolute bottom-0 left-0 right-0 h-1"
                    style={{ backgroundColor: themeData.primary }}
                />
            )}
        </motion.button>
    );
}

const Settings = () => {
    const { t } = useTranslation();
    const { theme, setTheme, isDark, toggleTheme, dateFormat, setDateFormat, timeFormat, setTimeFormat } = useTheme();
    const [showSuccess, setShowSuccess] = useState(false);

    const activeThemeMeta = APP_THEMES.find((t) => t.id === theme) || APP_THEMES[0];

    const handleThemeChange = (id) => {
        setTheme(id);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8 lg:space-y-12 px-3 sm:px-5 md:px-6 lg:px-10 py-4 sm:py-6 lg:py-10 min-h-screen w-full min-w-0">
            <AnimatePresence>
                {showSuccess && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="fixed bottom-4 sm:bottom-10 left-3 right-3 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-[100] max-w-md sm:max-w-none mx-auto bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-4 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl shadow-2xl flex items-center gap-3 sm:gap-4 border border-white/10 dark:border-gray-100"
                    >
                        <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                            <Check className="w-4 h-4 text-white" />
                        </div>
                        <span className="font-black uppercase tracking-widest text-xs">
                            {t('settings.themeApplied', { name: activeThemeMeta.name })}
                        </span>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl lg:rounded-[2.5rem] bg-gradient-to-br from-gray-900 to-black p-5 sm:p-8 lg:p-10 text-white shadow-2xl border border-white/5">
                <div className="relative z-10 flex flex-col gap-4 sm:gap-6">
                    <div className="space-y-2">
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-center gap-3 text-primary"
                        >
                            <Palette className="w-5 h-5" />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em]">
                                {t('settings.studio')}
                            </span>
                        </motion.div>
                        <h1 className="text-2xl sm:text-4xl md:text-5xl font-black uppercase italic tracking-tighter leading-tight">
                            {t('settings.title')}
                        </h1>
                        <p className="text-gray-400 font-medium text-xs sm:text-sm tracking-wide max-w-md leading-relaxed">
                            {t('settings.subtitle')}
                        </p>
                    </div>
                </div>
                <div className="absolute top-0 right-0 w-40 sm:w-64 h-40 sm:h-64 bg-primary/20 blur-[80px] sm:blur-[100px] rounded-full -mr-16 sm:-mr-20 -mt-16 sm:-mt-20 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-32 sm:w-48 h-32 sm:h-48 bg-primary/10 blur-[60px] sm:blur-[80px] rounded-full -ml-8 sm:-ml-10 -mb-8 sm:-mb-10 pointer-events-none" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6 lg:gap-8">
                <div className="lg:col-span-1 space-y-5 sm:space-y-6 lg:space-y-8">
                    <LanguagePicker />

                    <section className="bg-white dark:bg-[#1a1f2e] rounded-2xl sm:rounded-[2rem] p-4 sm:p-6 md:p-8 border border-gray-100 dark:border-gray-800 shadow-xl shadow-gray-200/20 dark:shadow-none transition-all md:hover:shadow-2xl">
                        <div className="space-y-8">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-amber-50 dark:bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500 shadow-inner">
                                    {isDark ? <Moon className="w-6 h-6" /> : <Sun className="w-6 h-6" />}
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase italic leading-none">
                                        {t('settings.appearance')}
                                    </h3>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                                        {t('settings.lightDark')}
                                    </p>
                                </div>
                            </div>
                            <div onClick={toggleTheme} className="group relative cursor-pointer">
                                <div
                                    className={`min-h-[3.5rem] sm:h-16 rounded-xl sm:rounded-2xl border-2 transition-all duration-500 flex items-center justify-between gap-3 px-4 sm:px-5 ${
                                        isDark
                                            ? 'bg-gray-800 border-primary/40'
                                            : 'bg-gray-50 border-gray-200'
                                    }`}
                                >
                                    <span
                                        className={`text-[10px] sm:text-xs font-black uppercase tracking-widest shrink-0 min-w-0 ${
                                            isDark ? 'text-primary' : 'text-gray-500'
                                        }`}
                                    >
                                        {isDark ? t('settings.midnightActive') : t('settings.solarActive')}
                                    </span>
                                    <div
                                        className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 flex items-center ${
                                            isDark ? 'bg-primary' : 'bg-gray-300'
                                        }`}
                                    >
                                        <motion.div
                                            animate={{ x: isDark ? 24 : 0 }}
                                            className="w-4 h-4 bg-white rounded-full shadow-lg"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="bg-white dark:bg-[#1a1f2e] rounded-2xl sm:rounded-[2rem] p-4 sm:p-6 md:p-8 border border-gray-100 dark:border-gray-800 shadow-xl shadow-gray-200/20 dark:shadow-none transition-all md:hover:shadow-2xl">
                        <div className="space-y-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-blue-50 dark:bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500 shadow-inner">
                                    <Layout className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase italic leading-none">
                                        {t('settings.regional')}
                                    </h3>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                                        Date & Time
                                    </p>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] sm:text-xs font-black uppercase tracking-widest text-gray-500 mb-2">
                                        {t('settings.dateFormat')}
                                    </label>
                                    <select
                                        value={dateFormat}
                                        onChange={(e) => setDateFormat(e.target.value)}
                                        className="w-full bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm rounded-xl focus:ring-primary focus:border-primary block p-2.5 outline-none font-medium"
                                    >
                                        <option value="DD MMM YYYY">12 May 2026 (DD MMM YYYY)</option>
                                        <option value="MM/DD/YYYY">05/12/2026 (MM/DD/YYYY)</option>
                                        <option value="DD/MM/YYYY">12/05/2026 (DD/MM/YYYY)</option>
                                        <option value="YYYY-MM-DD">2026-05-12 (YYYY-MM-DD)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] sm:text-xs font-black uppercase tracking-widest text-gray-500 mb-2">
                                        {t('settings.timeFormat')}
                                    </label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            onClick={() => setTimeFormat('12-hour')}
                                            className={`py-2.5 px-4 rounded-xl text-xs font-bold transition-all ${timeFormat === '12-hour' ? 'bg-primary text-white shadow-md' : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                                        >
                                            12-Hour (02:30 PM)
                                        </button>
                                        <button
                                            onClick={() => setTimeFormat('24-hour')}
                                            className={`py-2.5 px-4 rounded-xl text-xs font-bold transition-all ${timeFormat === '24-hour' ? 'bg-primary text-white shadow-md' : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                                        >
                                            24-Hour (14:30)
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    <div className="bg-primary/5 dark:bg-primary/5 rounded-2xl sm:rounded-[2rem] p-5 sm:p-8 border-2 border-dashed border-primary/20 flex flex-col items-center text-center space-y-3 sm:space-y-4">
                        <div className="w-12 h-12 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center shadow-lg">
                            <Layout className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                            <h4 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-widest italic">
                                {t('settings.uiLayouts')}
                            </h4>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">
                                {t('settings.compactRelaxed')}
                            </p>
                        </div>
                        <span className="px-3 py-1 bg-primary/10 text-primary text-[8px] font-black uppercase tracking-[0.2em] rounded-full">
                            {t('settings.comingSoon')}
                        </span>
                    </div>
                </div>

                <div className="lg:col-span-2 space-y-5 sm:space-y-6 min-w-0">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
                        <div className="flex items-start gap-3">
                            <div className="w-11 h-11 rounded-2xl bg-primary/15 flex items-center justify-center text-primary shrink-0">
                                <Sparkles className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white uppercase italic tracking-tight">
                                    {t('settings.vibrantThemes')}
                                </h2>
                                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-1 max-w-md">
                                    {t('settings.themesHint')}
                                </p>
                            </div>
                        </div>
                        <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest shrink-0">
                            {t('settings.masterpieces', { count: APP_THEMES.length })}
                        </span>
                    </div>

                    {/* Active theme summary */}
                    <div
                        className="rounded-xl sm:rounded-2xl border border-gray-100 dark:border-gray-800 p-3 sm:p-4 flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-3 sm:gap-4"
                        style={{ backgroundColor: activeThemeMeta.bgMain }}
                    >
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                            {t('settings.active')}
                        </span>
                        <span
                            className="text-sm font-black uppercase italic"
                            style={{ color: activeThemeMeta.textPrimary }}
                        >
                            {activeThemeMeta.name}
                        </span>
                        <div className="flex gap-2 w-full sm:w-auto sm:ml-auto justify-start sm:justify-end">
                            {[activeThemeMeta.primary, activeThemeMeta.sidebar, activeThemeMeta.bgCard].map(
                                (c) => (
                                    <span
                                        key={c}
                                        className="w-6 h-6 rounded-lg border border-black/10 shadow-sm"
                                        style={{ backgroundColor: c }}
                                    />
                                )
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 md:gap-5">
                        {APP_THEMES.map((themeOption) => (
                            <ThemePreviewCard
                                key={themeOption.id}
                                theme={themeOption}
                                isActive={theme === themeOption.id}
                                onSelect={() => handleThemeChange(themeOption.id)}
                                actionLabel={t('common.action')}
                            />
                        ))}
                    </div>

                    <motion.div
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        className="p-5 sm:p-8 md:p-10 rounded-2xl sm:rounded-[2.5rem] bg-gradient-to-br from-primary/5 via-transparent to-primary/5 border border-primary/10 flex flex-col items-center text-center"
                    >
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium max-w-lg leading-relaxed">
                            {t('settings.themeTip')}
                        </p>
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

export default Settings;
