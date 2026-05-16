'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { ListFormsResponse, OwnerCardStatusResponse } from '@contactswap/shared';
import { API_SECRET_STORAGE_KEY, ApiClientError, api } from '../../lib/api';

type AuthState = 'checking' | 'unauthenticated' | 'authenticated';

export default function ConfigPage() {
  const [authState, setAuthState] = useState<AuthState>('checking');
  const [secretInput, setSecretInput] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [authError, setAuthError] = useState('');
  const [dashboardError, setDashboardError] = useState('');
  const [statusMessage, setStatusMessage] = useState('Checking saved access...');
  const [ownerCardStatus, setOwnerCardStatus] = useState<OwnerCardStatusResponse | null>(null);
  const [formsResponse, setFormsResponse] = useState<ListFormsResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState('');
  const [showUploadPanel, setShowUploadPanel] = useState(false);
  const [deletingFormId, setDeletingFormId] = useState<string | null>(null);
  const [formsOffset, setFormsOffset] = useState(0);

  const FORMS_LIMIT = 10;

  useEffect(() => {
    const storedSecret = window.localStorage.getItem(API_SECRET_STORAGE_KEY)?.trim();

    if (!storedSecret) {
      setAuthState('unauthenticated');
      setStatusMessage('');
      return;
    }

    void authenticateWithSecret(storedSecret, {
      persistSecret: true,
      loadingMessage: 'Checking saved access...',
      invalidMessage: 'Saved access expired. Enter the API secret again.',
    });
  }, []);
  useEffect(() => {
    if (authState === 'authenticated' && apiSecret && formsOffset !== undefined) {
      void refreshDashboard(apiSecret);
    }
  }, [formsOffset]);

  async function authenticateWithSecret(
    nextSecret: string,
    options: {
      persistSecret: boolean;
      loadingMessage: string;
      invalidMessage: string;
    },
  ) {
    setAuthState('checking');
    setAuthError('');
    setDashboardError('');
    setStatusMessage(options.loadingMessage);

    try {
      const [nextOwnerCardStatus, nextFormsResponse] = await Promise.all([
        api.verifyApiSecret(nextSecret),
        api.listForms(nextSecret, { limit: FORMS_LIMIT, offset: 0 }),
      ]);

      if (options.persistSecret) {
        window.localStorage.setItem(API_SECRET_STORAGE_KEY, nextSecret);
      }

      setApiSecret(nextSecret);
      setOwnerCardStatus(nextOwnerCardStatus);
      setFormsResponse(nextFormsResponse);
      setFormsOffset(0);
      setSecretInput('');
      setAuthState('authenticated');
      setStatusMessage('');
    } catch (error) {
      clearStoredSecret();
      setApiSecret('');
      setOwnerCardStatus(null);
      setFormsResponse(null);
      setAuthState('unauthenticated');
      setStatusMessage('');
      setAuthError(resolveAuthError(error, options.invalidMessage));
    }
  }

  async function refreshDashboard(secret = apiSecret) {
    if (!secret) {
      return;
    }

    setIsRefreshing(true);
    setDashboardError('');

    try {
      const [nextOwnerCardStatus, nextFormsResponse] = await Promise.all([
        api.verifyApiSecret(secret),
        api.listForms(secret, { limit: FORMS_LIMIT, offset: formsOffset }),
      ]);

      setOwnerCardStatus(nextOwnerCardStatus);
      setFormsResponse(nextFormsResponse);
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 401) {
        handleLogout('Your admin session expired. Enter the API secret again.');
      } else {
        setDashboardError(resolveDashboardError(error));
      }
    } finally {
      setIsRefreshing(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedSecret = secretInput.trim();
    if (!trimmedSecret) {
      setAuthError('Enter the API secret to continue.');
      return;
    }

    setIsSubmitting(true);

    try {
      await authenticateWithSecret(trimmedSecret, {
        persistSecret: true,
        loadingMessage: 'Verifying API secret...',
        invalidMessage: 'That API secret was rejected.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleOwnerCardUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!apiSecret) {
      return;
    }

    const form = event.currentTarget;
    const fileInput = form.elements.namedItem('ownerCard') as HTMLInputElement | null;
    const file = fileInput?.files?.[0];

    if (!file) {
      setDashboardError('Choose a .vcf file before uploading.');
      return;
    }

    setIsUploading(true);
    setDashboardError('');

    try {
      const vcfText = await file.text();
      await api.uploadOwnerCard(apiSecret, vcfText);
      await refreshDashboard(apiSecret);
      form.reset();
      setSelectedFileName('');
      setShowUploadPanel(false);
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 401) {
        handleLogout('Your admin session expired. Enter the API secret again.');
      } else {
        setDashboardError(resolveDashboardError(error));
      }
    } finally {
      setIsUploading(false);
    }
  }

  function handleLogout(message = '') {
    clearStoredSecret();
    setApiSecret('');
    setSecretInput('');
    setOwnerCardStatus(null);
    setFormsResponse(null);
    setDashboardError('');
    setSelectedFileName('');
    setShowUploadPanel(false);
    setAuthError(message);
    setStatusMessage('');
    setAuthState('unauthenticated');
  }

  async function handleDeleteForm(formId: string) {
    if (!apiSecret) {
      return;
    }

    if (!confirm('Are you sure you want to delete this form? This action cannot be undone.')) {
      return;
    }

    setDeletingFormId(formId);
    setDashboardError('');

    try {
      await api.deleteForm(apiSecret, formId);
      await refreshDashboard(apiSecret);
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 401) {
        handleLogout('Your admin session expired. Enter the API secret again.');
      } else {
        setDashboardError(resolveDashboardError(error));
      }
    } finally {
      setDeletingFormId(null);
    }
  }

  const tone = buildTone();

  if (authState === 'checking') {
    return (
      <main className={`min-h-screen px-5 py-12 ${tone.page}`}>
        <section className="mx-auto flex min-h-[70vh] max-w-3xl items-center justify-center">
          <div className={`w-full rounded-3xl border p-8 ${tone.card}`}>
            <div className="config-loading-line" />
            <p className={`mt-6 text-xs uppercase tracking-[0.18em] ${tone.mutedText}`}>Admin Access</p>
            <h1 className={`mt-3 text-3xl font-semibold ${tone.strongText}`}>Booting config workspace</h1>
            <p className={`mt-2 text-sm ${tone.mutedText}`}>{statusMessage}</p>
          </div>
        </section>
      </main>
    );
  }

  if (authState === 'unauthenticated') {
    return (
      <main className={`min-h-screen px-5 py-10 ${tone.page}`}>
        <section className="mx-auto flex min-h-[72vh] max-w-6xl items-center justify-center">
          <form className={`w-full max-w-md rounded-3xl border p-7 ${tone.card}`} onSubmit={handleSubmit}>
            <input
              id="api-secret"
              type="password"
              autoComplete="current-password"
              value={secretInput}
              onChange={(event) => setSecretInput(event.target.value)}
              className={`w-full rounded-2xl border px-4 py-3 text-sm outline-none transition ${tone.input}`}
              placeholder="Enter access code"
            />

            <button type="submit" disabled={isSubmitting} className={`mt-4 w-full rounded-2xl px-4 py-3 text-sm font-semibold ${tone.primaryButton}`}>
              {isSubmitting ? 'Verifying...' : 'Continue'}
            </button>

            {authError ? <p className={`mt-4 rounded-xl border px-3 py-2 text-sm ${tone.errorBox}`}>{authError}</p> : null}
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className={`min-h-screen px-5 py-8 ${tone.page}`}>
      <section className="mx-auto max-w-7xl space-y-5">
        <header className={`rounded-3xl border p-5 shadow-sm ${tone.card}`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className={`text-xs uppercase tracking-[0.18em] ${tone.mutedText}`}>Config Workspace</p>
              <h1 className={`mt-2 text-3xl font-semibold ${tone.strongText}`}>Admin board</h1>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => void refreshDashboard()} disabled={isRefreshing} className={`rounded-xl px-3 py-2 text-xs ${tone.secondaryButton}`}>
                {isRefreshing ? 'Refreshing...' : 'Refresh'}
              </button>
              <button type="button" onClick={() => handleLogout()} className={`rounded-xl px-3 py-2 text-xs ${tone.primaryButton}`}>
                Log out
              </button>
            </div>
          </div>
        </header>

        {dashboardError ? <p className={`rounded-xl border px-3 py-2 text-sm ${tone.errorBox}`}>{dashboardError}</p> : null}

        <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
          <section className={`overflow-hidden rounded-3xl border shadow-sm ${tone.card}`}>
            <div className={`flex items-center justify-between border-b px-5 py-4 ${tone.sectionBand}`}>
              <div>
                <p className={`text-xs uppercase tracking-[0.18em] ${tone.mutedText}`}>Forms</p>
                <p className={`mt-1 text-sm ${tone.mutedText}`}>All submissions.</p>
              </div>
              <span className={`rounded-lg border px-2 py-1 text-xs ${tone.badge}`}>{formsResponse?.total ?? 0} total</span>
            </div>

            <div className={`overflow-x-auto ${tone.sectionBody}`}>
              <table className="min-w-full border-collapse text-left text-xs">
                <thead>
                  <tr className={`${tone.tableHead}`}>
                    <th className="px-4 py-3 font-semibold">Contact</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Created</th>
                    <th className="px-4 py-3 font-semibold">Expires in</th>
                    <th className="px-4 py-3 font-semibold">Token</th>
                    <th className="px-4 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {formsResponse?.forms.length ? (
                    formsResponse.forms.map((form) => (
                      <tr key={form.id} className={`border-t ${tone.tableRow}`}>
                        <td className="px-4 py-3">{form.originalContactName}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-md border px-2 py-1 ${statusCellClassName(form.status)}`}>{form.status}</span>
                        </td>
                        <td className="px-4 py-3">{formatDate(form.createdAt)}</td>
                        <td className="px-4 py-3">{formatRelativeTime(form.expiresAt)}</td>
                        <td className="px-4 py-3">
                          <span className="inline-block max-w-[180px] truncate align-bottom text-[0.7rem]">{form.token}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <a
                              href={`/forms/${form.token}`}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-md px-2 py-1 text-xs text-[var(--md-primary)] transition hover:bg-[var(--md-primary-container)]"
                            >
                              View
                            </a>
                            <button
                              type="button"
                              onClick={() => void handleDeleteForm(form.id)}
                              disabled={deletingFormId === form.id}
                              className={`rounded-md px-2 py-1 text-xs transition ${deletingFormId === form.id ? 'opacity-60' : 'text-rose-600 hover:bg-rose-50'}`}
                            >
                              {deletingFormId === form.id ? 'Deleting...' : 'Delete'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className={`px-4 py-12 text-center ${tone.mutedText}`}>
                        No forms found yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className={`border-t px-5 py-3 text-xs ${tone.sectionBand}`}>
              <div className="flex items-center justify-between gap-3">
                <div className={`${tone.mutedText}`}>
                  Page {formsResponse ? Math.floor(formsOffset / FORMS_LIMIT) + 1 : 1} of {formsResponse ? Math.ceil(formsResponse.total / FORMS_LIMIT) || 1 : 1} • {formsResponse?.total ?? 0} total
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setFormsOffset(Math.max(0, formsOffset - FORMS_LIMIT))}
                    disabled={formsOffset === 0 || isRefreshing}
                    className={`rounded-md px-3 py-1 text-xs ${formsOffset === 0 ? `${tone.mutedText}` : tone.secondaryButton}`}
                  >
                    ← Previous
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormsOffset(formsOffset + FORMS_LIMIT)}
                    disabled={!formsResponse || formsOffset + FORMS_LIMIT >= formsResponse.total || isRefreshing}
                    className={`rounded-md px-3 py-1 text-xs ${!formsResponse || formsOffset + FORMS_LIMIT >= formsResponse.total ? `${tone.mutedText}` : tone.secondaryButton}`}
                  >
                    Next →
                  </button>
                </div>
              </div>
            </div>

            <div className={`border-t px-5 py-4 text-xs ${tone.sectionBand}`}>
              <Link className={`${tone.link}`} href="/config/templates">
                Open template management
              </Link>
            </div>
          </section>

          <aside className="space-y-5">
            <section className={`rounded-3xl border p-5 shadow-sm ${tone.card}`}>
              <p className={`text-xs uppercase tracking-[0.18em] ${tone.mutedText}`}>Actions</p>

              <div className={`mt-4 space-y-3 rounded-2xl border p-4 ${tone.sectionInset}`}>
                <button type="button" onClick={() => setShowUploadPanel((v) => !v)} className={`w-full rounded-xl px-4 py-2 text-xs font-semibold transition ${tone.primaryButton}`}>
                  {showUploadPanel ? 'Close' : 'Upload Owner Card'}
                </button>
                <Link href="/config/create-form" className={`block rounded-xl px-4 py-2 text-center text-xs font-semibold transition ${tone.secondaryButton}`}>
                  Create Form
                </Link>
              </div>

              {showUploadPanel ? (
                <form className={`mt-3 space-y-3 rounded-2xl border p-4 ${tone.sectionInset}`} onSubmit={handleOwnerCardUpload}>
                  <div className={`rounded-2xl border p-3 ${tone.inputWrap}`}>
                    <label className={`block text-xs uppercase tracking-[0.12em] ${tone.mutedText}`}>VCF File</label>
                    <input
                      name="ownerCard"
                      type="file"
                      accept=".vcf,text/vcard,text/plain"
                      className={`mt-2 block w-full text-xs file:mr-3 file:rounded-md file:border-0 file:px-3 file:py-2 ${tone.fileInput}`}
                      onChange={(event) => setSelectedFileName(event.target.files?.[0]?.name ?? '')}
                    />
                    <p className={`mt-2 truncate text-xs ${tone.mutedText}`}>{selectedFileName || 'No file selected.'}</p>
                  </div>
                  <button type="submit" disabled={isUploading} className={`w-full rounded-xl px-4 py-2 text-xs font-semibold ${tone.primaryButton}`}>
                    {isUploading ? 'Uploading...' : 'Upload Now'}
                  </button>
                </form>
              ) : null}
            </section>

            <section className={`rounded-3xl border p-5 shadow-sm ${tone.card}`}>
              <p className={`text-xs uppercase tracking-[0.18em] ${tone.mutedText}`}>Owner Card</p>
              <div className={`mt-4 rounded-2xl border p-4 ${tone.sectionInset}`}>
                <h3 className={`text-sm font-semibold ${tone.strongText}`}>
                  {ownerCardStatus?.configured ? '✓ Configured' : '○ Missing'}
                </h3>
                <p className={`mt-2 text-xs ${tone.mutedText}`}>
                  {ownerCardStatus?.updatedAt ? `Updated ${formatDate(ownerCardStatus.updatedAt)}` : 'Upload your VCF file to enable return-card flow.'}
                </p>
              </div>
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}

function clearStoredSecret() {
  window.localStorage.removeItem(API_SECRET_STORAGE_KEY);
}

function resolveAuthError(error: unknown, invalidMessage: string): string {
  if (error instanceof ApiClientError) {
    if (error.status === 401) {
      return invalidMessage;
    }

    if (error.status && error.status >= 500) {
      return 'The API is unavailable right now. Try again shortly.';
    }

    return error.message;
  }

  return 'Unable to verify the API secret right now.';
}

function resolveDashboardError(error: unknown): string {
  if (error instanceof ApiClientError) {
    return error.message;
  }

  return 'Something went wrong while loading admin data.';
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function formatRelativeTime(value: string): string {
  const now = new Date();
  const expiresAt = new Date(value);
  const diffMs = expiresAt.getTime() - now.getTime();

  if (diffMs < 0) {
    return 'Expired';
  }

  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    return `${diffDays} day${diffDays === 1 ? '' : 's'}`;
  }

  if (diffHours > 0) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'}`;
  }

  if (diffMins > 0) {
    return `${diffMins} minute${diffMins === 1 ? '' : 's'}`;
  }

  return 'Less than a minute';
}

function buildTone() {
  return {
    page: 'bg-[radial-gradient(circle_at_top,_#dbe5ff_0%,_#edf1ff_32%,_#f5f8ff_78%)] text-slate-900',
    card: 'border-indigo-100 bg-white',
    sectionBand: 'bg-white',
    sectionBody: 'bg-white',
    sectionInset: 'border-indigo-100 bg-white',
    strongText: 'text-slate-900',
    mutedText: 'text-slate-600',
    input: 'border-indigo-200 bg-white text-slate-900 focus:border-indigo-500',
    inputWrap: 'border-indigo-200 bg-indigo-50/70',
    primaryButton: 'bg-[var(--md-primary)] text-white hover:bg-[#2745b5] disabled:opacity-60',
    secondaryButton: 'border border-indigo-200 text-slate-700 hover:bg-indigo-50 disabled:opacity-60',
    tableHead: 'bg-indigo-50 text-slate-700',
    tableRow: 'border-indigo-100 text-slate-800',
    badge: 'border-indigo-200 text-slate-700',
    errorBox: 'border-rose-200 bg-rose-50 text-rose-700',
    link: 'text-[var(--md-primary)] underline decoration-indigo-300 underline-offset-4',
    fileInput: 'text-slate-600 file:bg-[var(--md-primary)] file:text-white hover:file:bg-[#2745b5]',
  };
}

function statusCellClassName(status: string): string {
  if (status === 'completed') return 'border-emerald-300 bg-emerald-50 text-emerald-700';
  if (status === 'expired') return 'border-amber-300 bg-amber-50 text-amber-700';
  return 'border-sky-300 bg-sky-50 text-sky-700';
}
