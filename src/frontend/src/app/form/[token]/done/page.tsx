'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { api } from '../../../../lib/api';
import { LanguageSwitcher } from '@/lib/language-switcher';
import { useI18n } from '@/lib/i18n';

export default function FormDonePage() {
  const { t, locale } = useI18n();
  const params = useParams<{ token: string }>();
  const searchParams = useSearchParams();
  const token = params.token;
  const retrieveToken = searchParams.get('rt') ?? '';
  const expiresAt = searchParams.get('exp') ?? '';
  const [isDesktop, setIsDesktop] = useState(false);
  const [retrieveState, setRetrieveState] = useState<'checking' | 'valid' | 'missing' | 'invalid' | 'expired' | 'error'>('checking');

  useEffect(() => {
    const media = window.matchMedia('(min-width: 768px)');
    const sync = () => setIsDesktop(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (!retrieveToken) {
      setRetrieveState('missing');
      return () => {
        cancelled = true;
      };
    }

    if (!/^[a-f0-9]{64}$/.test(retrieveToken)) {
      setRetrieveState('invalid');
      return () => {
        cancelled = true;
      };
    }

    if (expiresAt) {
      const parsedExpiry = new Date(expiresAt);
      if (!Number.isNaN(parsedExpiry.getTime()) && parsedExpiry.getTime() <= Date.now()) {
        setRetrieveState('expired');
        return () => {
          cancelled = true;
        };
      }
    }

    const controller = new AbortController();
    setRetrieveState('checking');

    const verify = async () => {
      try {
        const response = await fetch(api.getReturnCardQrUrl(token, retrieveToken), {
          signal: controller.signal,
          cache: 'no-store',
        });

        if (cancelled) {
          return;
        }

        if (response.ok) {
          setRetrieveState('valid');
          return;
        }

        if (response.status === 410) {
          setRetrieveState('expired');
          return;
        }

        if ([401, 404, 422].includes(response.status)) {
          setRetrieveState('invalid');
          return;
        }

        setRetrieveState('error');
      } catch {
        if (!cancelled) {
          setRetrieveState('error');
        }
      }
    };

    void verify();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [expiresAt, retrieveToken, token]);

  const downloadUrl = useMemo(() => {
    if (!retrieveToken) {
      return '';
    }
    return api.getReturnCardDownloadUrl(token, retrieveToken);
  }, [retrieveToken, token]);

  const qrUrl = useMemo(() => {
    if (!retrieveToken || !isDesktop) {
      return '';
    }
    return api.getReturnCardQrUrl(token, retrieveToken);
  }, [isDesktop, retrieveToken, token]);

  const canUseReturnCard = retrieveState === 'valid';

  return (
    <main className="material-shell done-shell relative flex items-center justify-center">
      <div className="recipient-language-anchor">
        <LanguageSwitcher />
      </div>

      <div className="done-emoji-cloud" aria-hidden>
        <span className="done-emoji done-emoji-lg done-emoji-a">🎉</span>
        <span className="done-emoji done-emoji-md done-emoji-b">🥳</span>
        <span className="done-emoji done-emoji-sm done-emoji-c">✨</span>
        <span className="done-emoji done-emoji-md done-emoji-d">📇</span>
        <span className="done-emoji done-emoji-sm done-emoji-e">🤝</span>
        <span className="done-emoji done-emoji-xs done-emoji-f">🎊</span>
      </div>

      <section className="material-elevated done-card relative w-full max-w-4xl overflow-hidden px-6 py-8 md:px-8">
        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
          <div className="space-y-4 text-left">
            <div className="inline-flex items-center gap-3 rounded-full border border-[var(--md-success)]/25 bg-[var(--md-success-soft)] px-3 py-2 text-[var(--md-success)]">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/80">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </span>
              <span className="text-xs font-semibold uppercase tracking-[0.14em]">{t('done.badge')}</span>
            </div>

            <h1 className="material-title font-semibold">{t('done.title')}</h1>
            <p className="text-sm leading-7 text-[var(--md-text)]">{t('done.body1')}</p>
            <p className="text-sm leading-7 text-[var(--md-muted)]">{t('done.body2')}</p>

            {expiresAt ? (
              <p className="done-time-chip inline-flex rounded-full px-3 py-1 text-xs">
                {t('done.availableUntil', { date: formatDate(expiresAt, locale) })}
              </p>
            ) : null}

            {!isDesktop && downloadUrl && canUseReturnCard ? (
              <a
                href={downloadUrl}
                className="done-download-button material-button mt-1 w-full sm:w-auto"
                download
              >
                {t('done.download')}
              </a>
            ) : null}

            {retrieveState === 'checking' ? (
              <p className="rounded-xl border border-[var(--md-outline)] bg-white/80 px-3 py-2 text-sm text-[var(--md-muted)]">
                {t('done.verify')}
              </p>
            ) : null}

            {retrieveState === 'missing' ? (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                {t('done.missing')}
              </p>
            ) : null}

            {retrieveState === 'invalid' ? (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                {t('done.invalid')}
              </p>
            ) : null}

            {retrieveState === 'expired' ? (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                {t('done.expired')}
              </p>
            ) : null}

            {retrieveState === 'error' ? (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                {t('done.error')}
              </p>
            ) : null}
          </div>

          <div className="space-y-4 text-left">
            {isDesktop && qrUrl && canUseReturnCard ? (
              <div className="done-panel relative flex min-h-[17rem] items-center justify-center overflow-hidden rounded-3xl border border-[var(--md-outline)] bg-gradient-to-br from-white via-[var(--md-primary-container)]/45 to-[var(--md-success-soft)] p-6">
                <div aria-hidden className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-[var(--md-primary)]/12 blur-2xl" />
                <div aria-hidden className="pointer-events-none absolute -bottom-8 -left-8 h-24 w-24 rounded-full bg-[var(--md-success)]/16 blur-2xl" />
                <img
                  src={qrUrl}
                  alt={t('done.qrAlt')}
                  className="relative h-56 w-56 rounded-2xl border border-[var(--md-outline)]/85 bg-white p-3 shadow-[0_12px_30px_rgba(0,0,0,0.12)]"
                />
              </div>
            ) : null}

            <div className="rounded-2xl border border-[var(--md-outline)] bg-white/75 p-4">
              <p className="text-sm font-semibold text-[var(--md-text)]">{t('done.next.title')}</p>
              <p className="mt-2 text-xs leading-6 text-[var(--md-muted)]">{t('done.next.step1')}</p>
              <p className="text-xs leading-6 text-[var(--md-muted)]">{t('done.next.step2')}</p>
              <p className="text-xs leading-6 text-[var(--md-muted)]">{t('done.next.step3')}</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function formatDate(iso: string, locale: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toLocaleString(locale);
}

