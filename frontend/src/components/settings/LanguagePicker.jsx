import { Check, Languages } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { APP_LANGUAGES } from '../../constants/languages';

const LanguagePicker = () => {
    const { i18n, t } = useTranslation();
    const current = i18n.language?.split('-')[0] || 'en';

    return (
        <section className="bg-white dark:bg-[#1a1f2e] rounded-2xl sm:rounded-[2rem] p-4 sm:p-6 md:p-8 border border-gray-100 dark:border-gray-800 shadow-xl shadow-gray-200/20 dark:shadow-none">
            <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-sky-50 dark:bg-sky-500/10 rounded-xl sm:rounded-2xl flex items-center justify-center text-sky-600 dark:text-sky-400 shadow-inner shrink-0">
                    <Languages className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div className="min-w-0">
                    <h3 className="text-base sm:text-lg font-black text-gray-900 dark:text-white uppercase italic leading-tight">
                        {t('settings.language')}
                    </h3>
                    <p className="text-[9px] sm:text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5 sm:mt-1 leading-snug">
                        {t('settings.languageSubtitle')}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-2.5 sm:gap-3">
                {APP_LANGUAGES.map((lang) => {
                    const isActive = current === lang.code;
                    return (
                        <button
                            key={lang.code}
                            type="button"
                            onClick={() => i18n.changeLanguage(lang.code)}
                            className={`relative flex items-center gap-2.5 sm:gap-3 p-3 sm:p-4 rounded-xl sm:rounded-2xl border-2 text-left transition-all duration-300 min-h-[4.25rem] ${
                                isActive
                                    ? 'border-primary bg-primary/5 shadow-md'
                                    : 'border-gray-100 dark:border-gray-800 active:bg-gray-50 dark:active:bg-white/5 md:hover:border-primary/30 md:hover:bg-gray-50 dark:md:hover:bg-white/5'
                            }`}
                        >
                            <span className="text-xl sm:text-2xl shrink-0" aria-hidden>
                                {lang.flag}
                            </span>
                            <div className="flex-1 min-w-0">
                                <p
                                    className={`text-sm font-black uppercase tracking-tight truncate ${
                                        isActive
                                            ? 'text-primary'
                                            : 'text-gray-900 dark:text-white'
                                    }`}
                                >
                                    {lang.nativeName}
                                </p>
                                <p className="text-[10px] text-gray-500 dark:text-gray-400 font-semibold mt-0.5 truncate">
                                    {lang.name}
                                </p>
                            </div>
                            {isActive && (
                                <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-primary text-white flex items-center justify-center shrink-0">
                                    <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[3]" />
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
        </section>
    );
};

export default LanguagePicker;
