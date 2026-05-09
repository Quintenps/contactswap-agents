'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { TemplateSummary } from '@contactswap/shared';
import { API_SECRET_STORAGE_KEY, ApiClientError, api } from '../../../lib/api';

type TemplateField = {
  fieldKey: string;
  required: boolean;
};

type TemplateWithFields = TemplateSummary & {
  fields?: TemplateField[];
};

export default function CreateFormPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [templates, setTemplates] = useState<TemplateWithFields[]>([]);
  const [templateId, setTemplateId] = useState('');
  const [isDragActive, setIsDragActive] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [success, setSuccess] = useState<{ url: string; expiresAt: string } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const apiSecret = window.localStorage.getItem(API_SECRET_STORAGE_KEY)?.trim();

    if (!apiSecret) {
      setErrorMessage('Admin session not found. Log in on /config first.');
      setIsLoadingTemplates(false);
      return;
    }

    const currentSecret = apiSecret;

    async function loadTemplates() {
      try {
        const response = await api.listTemplates(currentSecret);
        setTemplates(response.templates);
        const [firstTemplate] = response.templates;
        if (firstTemplate) {
          setTemplateId(firstTemplate.id);
        }
      } catch (error) {
        if (error instanceof ApiClientError && error.status === 401) {
          window.localStorage.removeItem(API_SECRET_STORAGE_KEY);
          setErrorMessage('Your admin session expired. Log in again on /config.');
          return;
        }

        if (error instanceof ApiClientError) {
          setErrorMessage(error.message);
          return;
        }

        setErrorMessage('Could not load templates right now.');
      } finally {
        setIsLoadingTemplates(false);
      }
    }

    void loadTemplates();
  }, []);

  function isVcfFile(file: File): boolean {
    const lowerName = file.name.toLowerCase();
    return lowerName.endsWith('.vcf') || file.type === 'text/vcard' || file.type === 'text/x-vcard';
  }

  function updateFile(file: File | null) {
    setErrorMessage('');
    setSuccess(null);

    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (!isVcfFile(file)) {
      setSelectedFile(null);
      setErrorMessage('Please upload a valid .vcf file.');
      return;
    }

    setSelectedFile(file);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const apiSecret = window.localStorage.getItem(API_SECRET_STORAGE_KEY)?.trim();
    if (!apiSecret) {
      setErrorMessage('Admin session not found. Log in on /config first.');
      return;
    }

    if (!selectedFile) {
      setErrorMessage('Select a VCF file before creating a form.');
      return;
    }

    if (!templateId) {
      setErrorMessage('Select a template before creating a form.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    setCopied(false);

    try {
      const response = await api.createForm(apiSecret, selectedFile, templateId);
      setSuccess({
        url: response.url,
        expiresAt: response.expiresAt,
      });
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 401) {
        window.localStorage.removeItem(API_SECRET_STORAGE_KEY);
        setErrorMessage('Your admin session expired. Log in again on /config.');
      } else if (error instanceof ApiClientError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('Could not create the form right now. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function copyUrl(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setCopied(false);
      setErrorMessage('Could not copy URL automatically. Copy it manually from the field.');
    }
  }

  function getFieldLabel(fieldKey: string): string {
    const labels: Record<string, string> = {
      full_name: 'Full Name',
      work_email: 'Work Email',
      personal_email: 'Personal Email',
      work_phone: 'Work Phone',
      cell_phone: 'Cell Phone',
      home_phone: 'Home Phone',
      work_address: 'Work Address',
      home_address: 'Home Address',
      company: 'Company',
      job_title: 'Job Title',
      website: 'Website',
      birthday: 'Birthday',
      notes: 'Notes',
      photo: 'Photo',
    };
    return labels[fieldKey] ?? fieldKey;
  }

  const selectedTemplate = templates.find((template) => template.id === templateId);

  if (success) {
    return (
      <main className="material-shell flex items-center justify-center">
        <div className="w-full max-w-md">
          <div className="material-elevated p-8">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--md-primary-container)]">
                <svg className="h-6 w-6 text-[var(--md-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-[var(--md-text)]">Form Created</h2>
              <p className="material-muted mt-2 text-sm">Your form is ready to share.</p>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--md-muted)]">Form URL</p>
                <p className="break-all rounded-xl border border-[var(--md-outline)] bg-white/88 px-3 py-2 text-xs text-[var(--md-text)]">{success.url}</p>
                <p className="material-muted mt-1 text-xs">Expires {formatDate(success.expiresAt)}</p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void copyUrl(success.url)}
                  className="material-button material-button-primary flex-1"
                >
                  {copied ? '✓ Copied' : 'Copy URL'}
                </button>
                <a
                  href={success.url}
                  target="_blank"
                  rel="noreferrer"
                  className="material-button material-button-secondary flex-1"
                >
                  Open Form
                </a>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setSuccess(null);
                setSelectedFile(null);
                setTemplateId(templates[0]?.id ?? '');
                setCopied(false);
              }}
              className="material-button material-button-secondary mt-6 w-full"
            >
              Create Another Form
            </button>

            <Link href="/config" className="mt-3 block text-center text-xs text-[var(--md-primary)] underline decoration-[var(--md-outline-strong)] underline-offset-2 hover:text-[#1f3da9]">
              Back to config
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="material-shell flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <p className="material-chip">Create Form</p>
          <h1 className="material-title mt-4 font-semibold">Upload A Contact</h1>
          <p className="material-muted mt-3 text-sm">Share a secure form to request updated contact information.</p>
        </div>

        <form className="material-elevated space-y-6 p-6" onSubmit={handleSubmit}>
          <fieldset disabled={isSubmitting} className="space-y-6">
            {/* VCF Upload */}
            <div>
              <label className="block text-sm font-semibold text-[var(--md-text)]">Contact File (VCF)</label>
              <p className="material-muted mt-1 text-xs">Upload the .vcf file of the contact you want to update.</p>

              <div
                role="button"
                tabIndex={0}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  setIsDragActive(true);
                }}
                onDragLeave={(event) => {
                  event.preventDefault();
                  setIsDragActive(false);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  setIsDragActive(false);
                  updateFile(event.dataTransfer.files?.[0] ?? null);
                }}
                className={`mt-3 cursor-pointer rounded-xl border-2 border-dashed p-6 transition ${
                  isDragActive
                    ? 'border-[var(--md-primary)] bg-[var(--md-primary-container)]/55'
                    : 'border-[var(--md-outline)] bg-white/86 hover:border-[var(--md-outline-strong)] hover:bg-white'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".vcf,text/vcard,text/plain"
                  className="hidden"
                  onChange={(event) => updateFile(event.target.files?.[0] ?? null)}
                  disabled={isSubmitting}
                />
                <div className="text-center">
                  <p className="text-sm font-semibold text-[var(--md-text)]">Drop your file here</p>
                  <p className="material-muted mt-1 text-xs">or click to select</p>
                </div>
              </div>

              {selectedFile ? (
                <p className="mt-2 rounded-lg bg-[var(--md-primary-container)] px-3 py-2 text-xs font-medium text-[var(--md-primary)]">✓ {selectedFile.name}</p>
              ) : null}
            </div>

            {/* Template Selection */}
            <div>
              <label htmlFor="template-id" className="block text-sm font-semibold text-zinc-900">
                Form Template
              </label>
              <p className="material-muted mt-1 text-xs">Choose which fields to request from this contact.</p>

              <select
                id="template-id"
                value={templateId}
                onChange={(event) => setTemplateId(event.target.value)}
                disabled={isLoadingTemplates || templates.length === 0 || isSubmitting}
                className="material-select mt-3 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-500"
              >
                {templates.length === 0 ? (
                  <option disabled>{isLoadingTemplates ? 'Loading templates...' : 'No templates available'}</option>
                ) : (
                  templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))
                )}
              </select>

              {/* Template Description */}
              {selectedTemplate?.description ? (
                <p className="material-muted mt-2 text-xs">{selectedTemplate.description}</p>
              ) : null}

              {/* Template Fields Display */}
              {selectedTemplate?.fields && selectedTemplate.fields.length > 0 ? (
                <div className="mt-4 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--md-muted)]">Form includes:</p>
                  <div className="flex flex-wrap gap-2">
                    {[...selectedTemplate.fields]
                      .sort((a: TemplateField, b: TemplateField) => {
                        // Sort required fields first, then by field name
                        if (a.required !== b.required) {
                          return b.required ? 1 : -1;
                        }
                        return getFieldLabel(a.fieldKey).localeCompare(getFieldLabel(b.fieldKey));
                      })
                      .map((field: TemplateField) => (
                        <span
                          key={field.fieldKey}
                          className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${
                            field.required
                              ? 'border border-[var(--md-outline)] bg-[var(--md-primary-container)] text-[var(--md-primary)]'
                              : 'border border-[var(--md-outline)] bg-white text-[var(--md-muted)]'
                          }`}
                        >
                          {getFieldLabel(field.fieldKey)}
                          {field.required ? (
                            <span className="ml-0.5 inline-flex h-1.5 w-1.5 rounded-full bg-[var(--md-primary)]" title="Required" />
                          ) : (
                            <span className="ml-0.5 text-zinc-400">○</span>
                          )}
                        </span>
                      ))}
                  </div>
                </div>
              ) : null}
            </div>

            {/* Error Message */}
            {errorMessage ? (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3">
                <p className="text-sm text-rose-700">{errorMessage}</p>
              </div>
            ) : null}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || !selectedFile || !templateId || isLoadingTemplates}
              className="material-button material-button-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Creating form...' : 'Create Form'}
            </button>
          </fieldset>

          {/* Back Link */}
          <div className="border-t border-[var(--md-outline)] pt-4 text-center">
            <Link href="/config" className="text-xs text-[var(--md-primary)] underline decoration-[var(--md-outline-strong)] underline-offset-2 hover:text-[#1f3da9]">
              Back to config
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}
