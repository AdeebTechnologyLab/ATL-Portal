export const APP_LANGUAGES = [
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    dir: 'ltr',
    flag: '🇬🇧',
    fontClass: '',
  },
  {
    code: 'ur',
    name: 'Urdu',
    nativeName: 'اردو',
    dir: 'rtl',
    flag: '🇵🇰',
    fontClass: 'urdu-text',
  },
  {
    code: 'hi',
    name: 'Hindi',
    nativeName: 'हिन्दी',
    dir: 'ltr',
    flag: '🇮🇳',
    fontClass: 'hindi-text',
  },
  {
    code: 'ar',
    name: 'Arabic',
    nativeName: 'العربية',
    dir: 'rtl',
    flag: '🇸🇦',
    fontClass: 'arabic-text',
  },
];

export const RTL_LANGUAGES = ['ur', 'ar'];

export const getLanguageMeta = (code) =>
  APP_LANGUAGES.find((l) => l.code === code) || APP_LANGUAGES[0];
