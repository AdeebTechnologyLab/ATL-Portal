import { Check, Languages } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { APP_LANGUAGES } from '../../constants/languages';

const LanguagePicker = () => {
    const { i18n, t } = useTranslation();
    const current = i18n.language?.split('-')[0] || 'en';

    return (
        <section className="bg-white dark:bg-[#1a1f2e] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
            <div className="p-5 sm:p-6 border-b border-gray-50 dark:border-gray-800/50">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-sky-50 dark:bg-sky-500/10 rounded-xl flex items-center justify-center text-sky-600 dark:text-sky-400">
                        <Languages className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-base sm:text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight">
                            {t('settings.language')}
                        </h3>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">
                            Change the entire LMS interface language
                        </p>
                    </div>
                </div>
            </div>

            <div className="p-4 sm:p-5">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                    {APP_LANGUAGES.map((lang) => {
                        const isActive = current === lang.code;
                        return (
                            <button
                                key={lang.code}
                                type="button"
                                onClick={() => i18n.changeLanguage(lang.code)}
                                className={`relative flex items-center gap-2.5 p-3 rounded-xl border-2 text-left transition-all duration-300 ${
                                    isActive
                                        ? 'border-primary bg-primary/5 shadow-md'
                                        : 'border-gray-100 dark:border-gray-800 hover:border-primary/30 hover:bg-gray-50 dark:hover:bg-white/5'
                                }`}
                            >
                                <span className="text-xl shrink-0">{lang.flag}</span>
                                <div className="flex-1 min-w-0">
                                    <p
                                        className={`text-xs font-black uppercase tracking-tight truncate ${
                                            isActive ? 'text-primary' : 'text-gray-900 dark:text-white'
                                        }`}
                                    >
                                        {lang.nativeName}
                                    </p>
                                    <p className="text-[9px] text-gray-500 dark:text-gray-400 font-semibold truncate">
                                        {lang.name}
                                    </p>
                                </div>
                                {isActive && (
                                    <span className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center shrink-0">
                                        <Check className="w-3 h-3 stroke-[3]" />
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
        </section>
    );
};

export default LanguagePicker;
