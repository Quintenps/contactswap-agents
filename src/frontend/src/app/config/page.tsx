'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { ListFormsResponse, OwnerCardStatusResponse } from '@contactswap/shared';
import { API_SECRET_STORAGE_KEY, ApiClientError, api } from '../../lib/api';

type AuthState = 'checking' | 'unauthenticated' | 'authenticated';
type ThemeMode = 'light' | 'dark';

const THEME_STORAGE_KEY = 'contactswap_config_theme';

export default function ConfigPage() {
  const [authState, setAuthState] = useState<AuthState>('checking');
  const [themeMode, setThemeMode] = useState<ThemeMode>('light');
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
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (storedTheme === 'light' || storedTheme === 'dark') {
      setThemeMode(storedTheme);
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setThemeMode('dark');
    }

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


  function setTheme(mode: ThemeMode) {
    setThemeMode(mode);
    window.localStorage.setItem(THEME_STORAGE_KEY, mode);
  }

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

  const tone = useMemo(() => buildTone(themeMode), [themeMode]);

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
        <section className="mx-auto grid min-h-[72vh] max-w-6xl gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className={`text-xs uppercase tracking-[0.18em] ${tone.mutedText}`}>Soft Studio</p>
            <h1 className={`mt-3 max-w-2xl text-5xl font-semibold leading-tight ${tone.strongText}`}>
              Pastel light and slate-blue dark, with a cleaner admin rhythm.
            </h1>
            <p className={`mt-5 max-w-xl text-sm leading-7 ${tone.mutedText}`}>
              Forms are table-forward. Actions live in a focused side rail. Mono typography keeps it technical and calm.
            </p>
            <div className="mt-6 inline-flex gap-2 rounded-xl border p-1">
              <ThemeChip active={themeMode === 'light'} onClick={() => setTheme('light')}>Pastel Light</ThemeChip>
              <ThemeChip active={themeMode === 'dark'} onClick={() => setTheme('dark')}>Slate Blue Dark</ThemeChip>
            </div>
          </div>

          <form className={`rounded-3xl border p-7 ${tone.card}`} onSubmit={handleSubmit}>
            <label className={`block text-xs uppercase tracking-[0.12em] ${tone.mutedText}`} htmlFor="api-secret">
              API Secret
            </label>
            <input
              id="api-secret"
              type="password"
              autoComplete="current-password"
              value={secretInput}
              onChange={(event) => setSecretInput(event.target.value)}
              className={`mt-3 w-full rounded-2xl border px-4 py-3 text-sm outline-none transition ${tone.input}`}
              placeholder="Enter admin secret"
            />

            <button type="submit" disabled={isSubmitting} className={`mt-4 w-full rounded-2xl px-4 py-3 text-sm font-semibold ${tone.primaryButton}`}>
              {isSubmitting ? 'Verifying...' : 'Enter dashboard'}
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
        <header className={`rounded-3xl border p-5 ${tone.card}`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className={`text-xs uppercase tracking-[0.18em] ${tone.mutedText}`}>Config Workspace</p>
              <h1 className={`mt-2 text-3xl font-semibold ${tone.strongText}`}>Admin board</h1>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex gap-1 rounded-xl border p-1">
                <ThemeChip active={themeMode === 'light'} onClick={() => setTheme('light')}>Light</ThemeChip>
                <ThemeChip active={themeMode === 'dark'} onClick={() => setTheme('dark')}>Dark</ThemeChip>
              </div>
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
          <section className={`rounded-3xl border ${tone.card}`}>
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <p className={`text-xs uppercase tracking-[0.18em] ${tone.mutedText}`}>Forms</p>
                <p className={`mt-1 text-sm ${tone.mutedText}`}>All submissions.</p>
              </div>
              <span className={`rounded-lg border px-2 py-1 text-xs ${tone.badge}`}>{formsResponse?.total ?? 0} total</span>
            </div>

            <div className="overflow-x-auto">
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
                          <span className={`rounded-md border px-2 py-1 ${statusCellClassName(form.status, themeMode)}`}>{form.status}</span>
                        </td>
                        <td className="px-4 py-3">{formatDate(form.createdAt)}</td>
                        <td className="px-4 py-3">{formatRelativeTime(form.expiresAt)}</td>
                        <td className="px-4 py-3">
                          <span className="inline-block max-w-[180px] truncate align-bottom text-[0.7rem]">{form.token}</span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => void handleDeleteForm(form.id)}
                            disabled={deletingFormId === form.id}
                            className={`rounded-md px-2 py-1 text-xs transition ${deletingFormId === form.id ? 'opacity-60' : `${themeMode === 'dark' ? 'text-rose-300 hover:bg-rose-900/20' : 'text-rose-600 hover:bg-rose-50'}`}`}
                          >
                            {deletingFormId === form.id ? 'Deleting...' : 'Delete'}
                          </button>
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

            <div className="border-t px-5 py-3 text-xs">
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

            <div className="border-t px-5 py-4 text-xs">
              <Link className={`${tone.link}`} href="/config/templates">
                Open template management
              </Link>
            </div>
          </section>

          <aside className="space-y-5">
            <section className={`rounded-3xl border p-5 ${tone.card}`}>
              <p className={`text-xs uppercase tracking-[0.18em] ${tone.mutedText}`}>Actions</p>

              <div className="mt-4 space-y-3">
                <button type="button" onClick={() => setShowUploadPanel((v) => !v)} className={`w-full rounded-xl px-4 py-2 text-xs font-semibold transition ${tone.primaryButton}`}>
                  {showUploadPanel ? 'Close' : 'Upload Owner Card'}
                </button>
                <Link href="/config/create-form" className={`block rounded-xl px-4 py-2 text-center text-xs font-semibold transition ${tone.secondaryButton}`}>
                  Create Form
                </Link>
              </div>

              {showUploadPanel ? (
                <form className="mt-3 space-y-3 border-t pt-3" onSubmit={handleOwnerCardUpload}>
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

            <section className={`rounded-3xl border p-5 ${tone.card}`}>
              <p className={`text-xs uppercase tracking-[0.18em] ${tone.mutedText}`}>Owner Card</p>
              <h3 className={`mt-2 text-sm font-semibold ${tone.strongText}`}>
                {ownerCardStatus?.configured ? '✓ Configured' : '○ Missing'}
              </h3>
              <p className={`mt-2 text-xs ${tone.mutedText}`}>
                {ownerCardStatus?.updatedAt ? `Updated ${formatDate(ownerCardStatus.updatedAt)}` : 'Upload your VCF file to enable return-card flow.'}
              </p>
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}

function ThemeChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-3 py-2 text-xs transition ${active ? 'bg-zinc-900 text-zinc-50' : 'text-zinc-600 hover:text-zinc-900'}`}
    >
      {children}
    </button>
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

function buildTone(themeMode: ThemeMode) {
  if (themeMode === 'dark') {
    return {
      page: 'bg-[radial-gradient(circle_at_top,_#283252_0%,_#11162b_35%,_#0c1020_70%)] text-slate-100',
      card: 'border-slate-700/70 bg-slate-900/75 backdrop-blur',
      strongText: 'text-slate-100',
      mutedText: 'text-slate-300/80',
      input: 'border-slate-600 bg-slate-950/70 text-slate-100 focus:border-violet-300',
      inputWrap: 'border-slate-600 bg-slate-950/60',
      primaryButton: 'bg-violet-200 text-slate-950 hover:bg-violet-100 disabled:opacity-60',
      secondaryButton: 'border border-slate-500/80 text-slate-100 hover:bg-slate-800/70 disabled:opacity-60',
      tableHead: 'bg-slate-950/70 text-slate-300',
      tableRow: 'border-slate-700/70 text-slate-100',
      badge: 'border-slate-500/90 text-slate-200',
      errorBox: 'border-rose-700/80 bg-rose-900/20 text-rose-200',
      link: 'text-violet-200 underline decoration-violet-400/60 underline-offset-4',
      fileInput: 'text-slate-200 file:bg-violet-200 file:text-slate-950 hover:file:bg-violet-100',
    };
  }

  return {
    page: 'bg-[radial-gradient(circle_at_top,_#f8eafe_0%,_#f7f9ff_36%,_#f5fffb_78%)] text-zinc-900',
    card: 'border-zinc-200/80 bg-white/85 backdrop-blur',
    strongText: 'text-zinc-900',
    mutedText: 'text-zinc-600',
    input: 'border-zinc-300 bg-white text-zinc-900 focus:border-violet-500',
    inputWrap: 'border-zinc-300 bg-zinc-50/80',
    primaryButton: 'bg-zinc-900 text-zinc-50 hover:bg-zinc-700 disabled:opacity-60',
    secondaryButton: 'border border-zinc-300 text-zinc-700 hover:bg-violet-50 disabled:opacity-60',
    tableHead: 'bg-violet-50 text-zinc-700',
    tableRow: 'border-zinc-200 text-zinc-800',
    badge: 'border-zinc-300 text-zinc-700',
    errorBox: 'border-rose-200 bg-rose-50 text-rose-700',
    link: 'text-violet-700 underline decoration-violet-300 underline-offset-4',
    fileInput: 'text-zinc-600 file:bg-zinc-900 file:text-zinc-50 hover:file:bg-zinc-700',
  };
}

function statusCellClassName(status: string, themeMode: ThemeMode): string {
  if (themeMode === 'dark') {
    if (status === 'completed') return 'border-emerald-700/80 bg-emerald-900/20 text-emerald-300';
    if (status === 'expired') return 'border-amber-700/80 bg-amber-900/20 text-amber-300';
    return 'border-sky-700/80 bg-sky-900/20 text-sky-300';
  }

  if (status === 'completed') return 'border-emerald-300 bg-emerald-50 text-emerald-700';
  if (status === 'expired') return 'border-amber-300 bg-amber-50 text-amber-700';
  return 'border-sky-300 bg-sky-50 text-sky-700';
}
