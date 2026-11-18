import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './translations/en.json';
import te from './translations/te.json';
import hi from './translations/hi.json';

export type SupportedLanguage = 'en' | 'te' | 'hi';

export const LANG_STORAGE_KEY = 'rhc_language';

export function getStoredLanguage(): SupportedLanguage {
  try {
    const saved = localStorage.getItem(LANG_STORAGE_KEY);
    if (saved === 'en' || saved === 'te' || saved === 'hi') {
      return saved;
    }
  } catch {
    // Ignore storage access errors in restricted environments
  }
  return 'en';
}

const initialLanguage = getStoredLanguage();
if (typeof document !== 'undefined') {
  document.documentElement.lang = initialLanguage;
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    te: { translation: te },
    hi: { translation: hi },
  },
  lng: initialLanguage,
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
  returnObjects: true,
});

export default i18n;
