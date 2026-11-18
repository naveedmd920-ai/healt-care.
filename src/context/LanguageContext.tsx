import React, { createContext, useContext, useEffect, useState } from 'react';
import { I18nextProvider, useTranslation } from 'react-i18next';
import i18n, { LANG_STORAGE_KEY, SupportedLanguage, getStoredLanguage } from '../i18n';
import { api, TOKEN_STORAGE_KEY } from '../services/api';

export type { SupportedLanguage };

interface LanguageContextValue {
  lang: SupportedLanguage;
  setLanguage: (next: SupportedLanguage, syncServer?: boolean) => Promise<void>;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<SupportedLanguage>(() => getStoredLanguage());

  useEffect(() => {
    document.documentElement.lang = lang;
    localStorage.setItem(LANG_STORAGE_KEY, lang);
    if (i18n.language !== lang) {
      i18n.changeLanguage(lang);
    }
  }, [lang]);

  const setLanguage = async (next: SupportedLanguage, syncServer = true) => {
    setLang(next);
    document.documentElement.lang = next;
    localStorage.setItem(LANG_STORAGE_KEY, next);
    await i18n.changeLanguage(next);

    if (syncServer && localStorage.getItem(TOKEN_STORAGE_KEY)) {
      try {
        await api.put('/user/language', { language: next });
      } catch {
        // Non-blocking preference sync
      }
    }
  };

  return (
    <I18nextProvider i18n={i18n}>
      <LanguageContext.Provider value={{ lang, setLanguage }}>
        {children}
      </LanguageContext.Provider>
    </I18nextProvider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  const { t, i18n: i18nInstance, ready } = useTranslation();
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return {
    lang: ctx.lang,
    setLanguage: ctx.setLanguage,
    t,
    i18n: i18nInstance,
    ready,
  };
}
