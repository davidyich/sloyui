import { createContext, useContext, useMemo, type ReactNode } from 'react';

export type Locale = 'ru' | 'en';
const LocaleContext = createContext<Locale>('ru');

/** Localizes built-in interface text. Consumer content remains under consumer control. */
export function LocaleProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useLocale(): Locale { return useContext(LocaleContext); }
export function useTranslate() {
  const locale = useLocale();
  return useMemo(() => (ru: string, en: string): string => locale === 'en' ? en : ru, [locale]);
}
