'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { messages } from './messages';

export const SUPPORTED_LOCALES = ['nl', 'en'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export type TranslationKey = keyof typeof messages.nl;

const DEFAULT_LOCALE: Locale = 'nl';
const LOCALE_STORAGE_KEY = 'contactswap_locale';

type TranslationValues = Record<string, string | number>;

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, values?: TranslationValues) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function isLocale(value: string | null): value is Locale {
  return value !== null && SUPPORTED_LOCALES.includes(value as Locale);
}

function normalizeLocale(value: string | null): Locale {
  if (isLocale(value)) {
    return value;
  }
  return DEFAULT_LOCALE;
}

function interpolate(template: string, values?: TranslationValues): string {
  if (!values) {
    return template;
  }

  return template.replace(/\{(\w+)\}/g, (_, rawKey: string) => {
    if (Object.prototype.hasOwnProperty.call(values, rawKey)) {
      return String(values[rawKey]);
    }
    return `{${rawKey}}`;
  });
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    const normalized = normalizeLocale(stored);

    if (stored !== normalized) {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, normalized);
    }

    setLocaleState(normalized);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = (nextLocale: Locale) => {
    const normalized = normalizeLocale(nextLocale);
    setLocaleState(normalized);
    window.localStorage.setItem(LOCALE_STORAGE_KEY, normalized);
  };

  const value = useMemo<I18nContextValue>(() => {
    return {
      locale,
      setLocale,
      t: (key, interpolationValues) => {
        const activeDict = messages[locale];
        const template = activeDict[key] ?? messages.nl[key] ?? key;
        return interpolate(template, interpolationValues);
      },
    };
  }, [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider.');
  }
  return context;
}
