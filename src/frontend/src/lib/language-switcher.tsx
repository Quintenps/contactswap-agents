'use client';

import { useEffect, useRef, useState } from 'react';
import { useI18n } from './i18n';

type LanguageSwitcherProps = {
  className?: string;
};

const LOCALE_FLAGS: Record<'nl' | 'en', string> = {
  nl: '🇳🇱',
  en: '🇬🇧',
};

export function LanguageSwitcher({ className }: LanguageSwitcherProps) {
  const { locale, setLocale, t } = useI18n();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
      }
    };

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleEscape);

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isMenuOpen]);

  function selectLocale(nextLocale: 'nl' | 'en') {
    setLocale(nextLocale);
    setIsMenuOpen(false);
  }

  return (
    <div ref={containerRef} className={`inline-flex items-center ${className ?? ''}`}>
      <div className="relative">
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={isMenuOpen}
          aria-label={t('language.label')}
          onClick={() => setIsMenuOpen((open) => !open)}
          className="inline-flex h-10 min-w-[2.5rem] items-center justify-center gap-1.5 rounded-full border border-slate-300 bg-white px-3 text-slate-800 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300"
        >
          <span aria-hidden className="text-base leading-none">{LOCALE_FLAGS[locale]}</span>
          <span className="text-[11px] font-semibold uppercase tracking-[0.09em] text-slate-700">{locale}</span>
        </button>

        {isMenuOpen ? (
          <div
            role="menu"
            aria-label={t('language.label')}
            className="absolute right-0 mt-2 w-40 rounded-xl border border-slate-300 bg-white p-1.5 shadow-lg"
          >
            <button
              type="button"
              role="menuitemradio"
              aria-checked={locale === 'nl'}
              onClick={() => selectLocale('nl')}
              className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm font-semibold transition-colors ${
                locale === 'nl'
                  ? 'bg-slate-200 text-slate-900'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span>{t('language.option.nl')}</span>
              {locale === 'nl' ? <span aria-hidden className="text-slate-700">✓</span> : null}
            </button>
            <button
              type="button"
              role="menuitemradio"
              aria-checked={locale === 'en'}
              onClick={() => selectLocale('en')}
              className={`mt-1 flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm font-semibold transition-colors ${
                locale === 'en'
                  ? 'bg-slate-200 text-slate-900'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span>{t('language.option.en')}</span>
              {locale === 'en' ? <span aria-hidden className="text-slate-700">✓</span> : null}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
