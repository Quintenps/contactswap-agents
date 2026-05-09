'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { api } from '../../../../lib/api';

export default function FormDonePage() {
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
    <main className="material-shell done-shell flex items-center justify-center">
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
              <span className="text-xs font-semibold uppercase tracking-[0.14em]">Submission complete</span>
            </div>

            <h1 className="material-title font-semibold">Your info has been sent 🎉</h1>
            <p className="text-sm leading-7 text-[var(--md-text)]">Nice. Your details were submitted successfully.</p>
            <p className="text-sm leading-7 text-[var(--md-muted)]">Now it is time for the swap: grab Quinten's contact below and complete the ContactSwap 🤝</p>

            {expiresAt ? (
              <p className="done-time-chip inline-flex rounded-full px-3 py-1 text-xs">
                Available until {formatDate(expiresAt)}
              </p>
            ) : null}

            {downloadUrl && canUseReturnCard ? (
              <a
                href={downloadUrl}
                className="done-download-button material-button mt-1 w-full sm:w-auto"
                download
              >
                Download Quinten's Contact (.vcf) 📥
              </a>
            ) : null}

            {retrieveState === 'checking' ? (
              <p className="rounded-xl border border-[var(--md-outline)] bg-white/80 px-3 py-2 text-sm text-[var(--md-muted)]">
                Verifying your secure download link...
              </p>
            ) : null}

            {retrieveState === 'missing' ? (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                Your download token is missing. Reopen the completion link from the same tab or ask Quinten for a new form link.
              </p>
            ) : null}

            {retrieveState === 'invalid' ? (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                This download token is not valid anymore. Ask Quinten to send a fresh form link, then complete the form again.
              </p>
            ) : null}

            {retrieveState === 'expired' ? (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                This download token has expired. Ask Quinten to send a new form link so you can complete the swap.
              </p>
            ) : null}

            {retrieveState === 'error' ? (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                We could not verify the download token right now. Refresh this page and try again.
              </p>
            ) : null}
          </div>

          <div className="space-y-4 text-left">
            <div className="done-panel rounded-2xl border border-[var(--md-outline)] p-4">
              <p className="text-sm font-semibold text-[var(--md-text)]">Swap step 2: Save contact 📱</p>
              <p className="material-muted mt-1 text-xs">
                {isDesktop
                  ? 'Scan this QR code with your phone camera to add Quinten directly.'
                  : 'Use the download button to save Quinten directly to your contacts.'}
              </p>

              {isDesktop && qrUrl && canUseReturnCard ? (
                <img
                  src={qrUrl}
                  alt="QR code for contact download"
                  className="mt-3 h-52 w-52 rounded-xl border border-[var(--md-outline)] bg-white p-2 shadow-sm"
                />
              ) : null}

              {isDesktop && !canUseReturnCard ? (
                <p className="mt-3 rounded-xl border border-[var(--md-outline)] bg-white/80 px-3 py-2 text-xs leading-6 text-[var(--md-muted)]">
                  A valid download token is required before we can show a QR code.
                </p>
              ) : null}
            </div>

            <div className="rounded-2xl border border-[var(--md-outline)] bg-white/75 p-4">
              <p className="text-sm font-semibold text-[var(--md-text)]">What to do now</p>
              <p className="mt-2 text-xs leading-6 text-[var(--md-muted)]">1. Download or scan to add Quinten to your contacts.</p>
              <p className="text-xs leading-6 text-[var(--md-muted)]">2. Confirm the contact card opens with name, email, and phone details.</p>
              <p className="text-xs leading-6 text-[var(--md-muted)]">3. If the link fails, request a fresh form link and retry.</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toLocaleString();
}

