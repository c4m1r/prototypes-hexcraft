import { createContext, useContext, ReactNode } from 'react';
import { Language, getTranslation, Translations } from '../utils/i18n';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
}

export const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}

interface LanguageProviderProps {
  language: Language;
  setLanguage: (lang: Language) => void;
  children: ReactNode;
}

export function LanguageProvider({ language, setLanguage, children }: LanguageProviderProps) {
  const t = getTranslation(language);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

