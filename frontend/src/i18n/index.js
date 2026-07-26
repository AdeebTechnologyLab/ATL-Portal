import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import ur from './locales/ur.json';
import hi from './locales/hi.json';
import ar from './locales/ar.json';
import { getLanguageMeta, RTL_LANGUAGES } from '../constants/languages';

const STORAGE_KEY = 'app-language';

export function applyDocumentLanguage(lng) {
  const meta = getLanguageMeta(lng);
  const root = document.documentElement;
  root.lang = lng;
  root.dir = meta.dir;

  root.classList.remove('urdu-text', 'hindi-text', 'arabic-text', 'lang-rtl', 'lang-ltr');
  if (meta.fontClass) root.classList.add(meta.fontClass);
  root.classList.add(meta.dir === 'rtl' ? 'lang-rtl' : 'lang-ltr');
}

const savedLng = localStorage.getItem(STORAGE_KEY) || 'en';

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ur: { translation: ur },
    hi: { translation: hi },
    ar: { translation: ar },
  },
  lng: savedLng,
  fallbackLng: 'en',
  supportedLngs: ['en', 'ur', 'hi', 'ar'],
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
});

applyDocumentLanguage(i18n.language);

i18n.on('languageChanged', (lng) => {
  localStorage.setItem(STORAGE_KEY, lng);
  applyDocumentLanguage(lng);
});

export { RTL_LANGUAGES };
export default i18n;
