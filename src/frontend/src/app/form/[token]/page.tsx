'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { FieldKey, FormData } from '@contactswap/shared';
import { ApiClientError, api } from '../../../lib/api';
import { useI18n } from '@/lib/i18n';
import { LanguageSwitcher } from '@/lib/language-switcher';

type FlowState = 'loading' | 'intro' | 'form' | 'submitting' | 'error';
type LoadErrorKind = 'not-found' | 'already-submitted' | 'expired' | 'invalid' | 'generic';

const COUNTRY_FLAGS: Record<string, string> = {
  'Argentina': '🇦🇷',
  'Australia': '🇦🇺',
  'Austria': '🇦🇹',
  'Bangladesh': '🇧🇩',
  'Belarus': '🇧🇾',
  'Belgium': '🇧🇪',
  'Bolivia': '🇧🇴',
  'Bosnia': '🇧🇦',
  'Brazil': '🇧🇷',
  'Bulgaria': '🇧🇬',
  'Canada': '🇨🇦',
  'Chile': '🇨🇱',
  'China': '🇨🇳',
  'Colombia': '🇨🇴',
  'Costa Rica': '🇨🇷',
  'Croatia': '🇭🇷',
  'Cyprus': '🇨🇾',
  'Czech Republic': '🇨🇿',
  'Denmark': '🇩🇰',
  'Ecuador': '🇪🇨',
  'Egypt': '🇪🇬',
  'El Salvador': '🇸🇻',
  'Estonia': '🇪🇪',
  'Finland': '🇫🇮',
  'France': '🇫🇷',
  'Germany': '🇩🇪',
  'Greece': '🇬🇷',
  'Guatemala': '🇬🇹',
  'Honduras': '🇭🇳',
  'Hong Kong': '🇭🇰',
  'Hungary': '🇭🇺',
  'Iceland': '🇮🇸',
  'India': '🇮🇳',
  'Indonesia': '🇮🇩',
  'Ireland': '🇮🇪',
  'Israel': '🇮🇱',
  'Italy': '🇮🇹',
  'Japan': '🇯🇵',
  'Jordan': '🇯🇴',
  'Kenya': '🇰🇪',
  'Latvia': '🇱🇻',
  'Lebanon': '🇱🇧',
  'Lithuania': '🇱🇹',
  'Luxembourg': '🇱🇺',
  'Malaysia': '🇲🇾',
  'Malta': '🇲🇹',
  'Mexico': '🇲🇽',
  'Montenegro': '🇲🇪',
  'Netherlands': '🇳🇱',
  'New Zealand': '🇳🇿',
  'Nicaragua': '🇳🇮',
  'Nigeria': '🇳🇬',
  'Norway': '🇳🇴',
  'Pakistan': '🇵🇰',
  'Panama': '🇵🇦',
  'Paraguay': '🇵🇾',
  'Peru': '🇵🇪',
  'Philippines': '🇵🇭',
  'Poland': '🇵🇱',
  'Portugal': '🇵🇹',
  'Romania': '🇷🇴',
  'Russia': '🇷🇺',
  'Saudi Arabia': '🇸🇦',
  'Serbia': '🇷🇸',
  'Singapore': '🇸🇬',
  'Slovenia': '🇸🇮',
  'South Africa': '🇿🇦',
  'South Korea': '🇰🇷',
  'Spain': '🇪🇸',
  'Sweden': '🇸🇪',
  'Switzerland': '🇨🇭',
  'Taiwan': '🇹🇼',
  'Thailand': '🇹🇭',
  'Turkey': '🇹🇷',
  'UAE': '🇦🇪',
  'Ukraine': '🇺🇦',
  'United Kingdom': '🇬🇧',
  'United States': '🇺🇸',
  'Uruguay': '🇺🇾',
  'Venezuela': '🇻🇪',
  'Vietnam': '🇻🇳',
};

const COUNTRIES = Object.keys(COUNTRY_FLAGS).sort();

const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware',
  'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky',
  'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi',
  'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico',
  'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania',
  'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont',
  'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming',
];

const COUNTRY_DIAL_CODES: Array<{ country: string; dialCode: string }> = [
  { country: 'United States', dialCode: '1' },
  { country: 'Canada', dialCode: '1' },
  { country: 'United Kingdom', dialCode: '44' },
  { country: 'Australia', dialCode: '61' },
  { country: 'Germany', dialCode: '49' },
  { country: 'France', dialCode: '33' },
  { country: 'Japan', dialCode: '81' },
  { country: 'China', dialCode: '86' },
  { country: 'India', dialCode: '91' },
  { country: 'Brazil', dialCode: '55' },
  { country: 'Mexico', dialCode: '52' },
  { country: 'Spain', dialCode: '34' },
  { country: 'Italy', dialCode: '39' },
  { country: 'Netherlands', dialCode: '31' },
  { country: 'Sweden', dialCode: '46' },
  { country: 'Switzerland', dialCode: '41' },
  { country: 'Austria', dialCode: '43' },
  { country: 'Belgium', dialCode: '32' },
  { country: 'Denmark', dialCode: '45' },
  { country: 'Finland', dialCode: '358' },
  { country: 'Greece', dialCode: '30' },
  { country: 'Ireland', dialCode: '353' },
  { country: 'Poland', dialCode: '48' },
  { country: 'Portugal', dialCode: '351' },
  { country: 'Czech Republic', dialCode: '420' },
  { country: 'Hungary', dialCode: '36' },
  { country: 'Romania', dialCode: '40' },
  { country: 'Bulgaria', dialCode: '359' },
  { country: 'Croatia', dialCode: '385' },
  { country: 'Slovenia', dialCode: '386' },
  { country: 'Estonia', dialCode: '372' },
  { country: 'Latvia', dialCode: '371' },
  { country: 'Lithuania', dialCode: '370' },
  { country: 'New Zealand', dialCode: '64' },
  { country: 'Singapore', dialCode: '65' },
  { country: 'South Korea', dialCode: '82' },
  { country: 'Thailand', dialCode: '66' },
  { country: 'Vietnam', dialCode: '84' },
  { country: 'Malaysia', dialCode: '60' },
  { country: 'Indonesia', dialCode: '62' },
  { country: 'Philippines', dialCode: '63' },
  { country: 'Pakistan', dialCode: '92' },
  { country: 'Bangladesh', dialCode: '880' },
  { country: 'Turkey', dialCode: '90' },
  { country: 'Egypt', dialCode: '20' },
  { country: 'South Africa', dialCode: '27' },
  { country: 'Nigeria', dialCode: '234' },
  { country: 'Kenya', dialCode: '254' },
  { country: 'Chile', dialCode: '56' },
  { country: 'Argentina', dialCode: '54' },
  { country: 'Colombia', dialCode: '57' },
  { country: 'Peru', dialCode: '51' },
  { country: 'Venezuela', dialCode: '58' },
  { country: 'Ecuador', dialCode: '593' },
  { country: 'Bolivia', dialCode: '591' },
  { country: 'Paraguay', dialCode: '595' },
  { country: 'Uruguay', dialCode: '598' },
  { country: 'Costa Rica', dialCode: '506' },
  { country: 'Guatemala', dialCode: '502' },
  { country: 'Honduras', dialCode: '504' },
  { country: 'El Salvador', dialCode: '503' },
  { country: 'Nicaragua', dialCode: '505' },
  { country: 'Panama', dialCode: '507' },
  { country: 'Hong Kong', dialCode: '852' },
  { country: 'Taiwan', dialCode: '886' },
  { country: 'UAE', dialCode: '971' },
  { country: 'Saudi Arabia', dialCode: '966' },
  { country: 'Israel', dialCode: '972' },
  { country: 'Lebanon', dialCode: '961' },
  { country: 'Jordan', dialCode: '962' },
  { country: 'Russia', dialCode: '7' },
  { country: 'Ukraine', dialCode: '380' },
  { country: 'Belarus', dialCode: '375' },
  { country: 'Serbia', dialCode: '381' },
  { country: 'Bosnia', dialCode: '387' },
  { country: 'Montenegro', dialCode: '382' },
  { country: 'Iceland', dialCode: '354' },
  { country: 'Luxembourg', dialCode: '352' },
  { country: 'Malta', dialCode: '356' },
  { country: 'Cyprus', dialCode: '357' },
  { country: 'Norway', dialCode: '47' },
].sort((a, b) => b.dialCode.length - a.dialCode.length);

function CountryCombobox({ id, value, onChange, disabled, error }: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  error?: string;
}) {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(
    () => COUNTRIES.filter((c) =>
      c.toLowerCase().includes(inputValue.toLowerCase())
    ),
    [inputValue],
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Reset highlighted index when filtered list changes
  useEffect(() => {
    setHighlightedIndex(0);
  }, [filtered]);

  // Keep input in sync with selected value
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setInputValue(e.target.value);
    setIsOpen(true);
    setHighlightedIndex(0);
  }

  function handleSelect(country: string) {
    onChange(country);
    setInputValue(country);
    setIsOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setIsOpen(true);
      return;
    }

    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev + 1) % filtered.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev - 1 + filtered.length) % filtered.length);
        break;
      case 'Enter':
        e.preventDefault();
        if (filtered[highlightedIndex]) {
          handleSelect(filtered[highlightedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setInputValue(value);
        break;
    }
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <input
        ref={inputRef}
        id={id}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={t('form.country.search')}
        className="material-input mt-1 w-full"
      />

      {isOpen && filtered.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-10 mt-1 max-h-60 overflow-y-auto rounded-lg border border-[var(--md-outline)] bg-white shadow-md">
          {filtered.map((country, index) => (
            <button
              key={country}
              type="button"
              onClick={() => handleSelect(country)}
              onMouseEnter={() => setHighlightedIndex(index)}
              className={`block w-full px-3 py-2 text-left text-sm transition-colors ${
                index === highlightedIndex
                  ? 'bg-[var(--md-primary)]/10 text-[var(--md-primary)]'
                  : 'text-[var(--md-text)] hover:bg-[var(--md-primary)]/5'
              }`}
            >
              {COUNTRY_FLAGS[country]} {country}
            </button>
          ))}
        </div>
      )}

      {isOpen && filtered.length === 0 && inputValue && (
        <div className="absolute top-full left-0 right-0 z-10 mt-1 rounded-lg border border-[var(--md-outline)] bg-white px-3 py-2 text-center text-sm text-[var(--md-muted)]">
          {t('form.country.none')}
        </div>
      )}

      {error && <p className="mt-1 text-xs text-[var(--md-error)]">{error}</p>}
    </div>
  );
}

function validatePhoneNumber(
  value: string,
  t: (key: string, values?: Record<string, string | number>) => string,
): {
  isValid: boolean;
  error?: string;
  formatted: string;
} {
  if (!value.trim()) {
    return { isValid: false, formatted: '' };
  }

  const digitsOnly = value.replace(/\D/g, '');

  if (digitsOnly.length < 10) {
    return {
      isValid: false,
      formatted: value,
      error: t('form.phone.short'),
    };
  }

  if (digitsOnly.length > 15) {
    return {
      isValid: false,
      formatted: value,
      error: t('form.phone.long'),
    };
  }

  let formatted = value;
  if (digitsOnly.length === 10) {
    formatted = `(${digitsOnly.slice(0, 3)}) ${digitsOnly.slice(3, 6)}-${digitsOnly.slice(6)}`;
  } else if (digitsOnly.length === 11 && digitsOnly[0] === '1') {
    formatted = `+1 (${digitsOnly.slice(1, 4)}) ${digitsOnly.slice(4, 7)}-${digitsOnly.slice(7)}`;
  } else {
    formatted = `+${digitsOnly}`;
  }

  return { isValid: true, formatted };
}

function getCountryFromPhoneNumber(value: string): string {
  const trimmed = value.trim();
  if (!trimmed.startsWith('+') && !trimmed.startsWith('00')) {
    return '';
  }

  const normalized = trimmed.startsWith('00') ? trimmed.slice(2) : trimmed.slice(1);
  const digitsOnly = normalized.replace(/\D/g, '');
  if (!digitsOnly) {
    return '';
  }

  const match = COUNTRY_DIAL_CODES.find(({ dialCode }) => digitsOnly.startsWith(dialCode));
  return match?.country ?? '';
}

function PhoneInput({ id, value, onChange, disabled, error, label }: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  error?: string;
  label: string;
}) {
  const { t } = useI18n();
  const [isTouched, setIsTouched] = useState(false);
  const validation = useMemo(() => validatePhoneNumber(value, t), [value, t]);
  const detectedCountry = useMemo(() => getCountryFromPhoneNumber(value), [value]);
  const countryFlag = detectedCountry ? COUNTRY_FLAGS[detectedCountry] : undefined;

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    onChange(e.target.value);
  }

  function handleBlur() {
    setIsTouched(true);
    if (validation.isValid && value) {
      onChange(validation.formatted);
    }
  }

  const showValidation = isTouched && value;
  const hasError = showValidation && !validation.isValid;

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-[var(--md-text)]">
        {label}
      </label>
      <div className="relative mt-1">
        {countryFlag ? (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-lg"
          >
            {countryFlag}
          </span>
        ) : null}
        <input
          id={id}
          type="tel"
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={disabled}
          placeholder={t('form.phone.placeholder')}
          className={`material-input w-full ${countryFlag ? 'pl-12' : ''}`}
        />
      </div>
      {error && <p className="mt-1 text-xs text-[var(--md-error)]">{error}</p>}
      {showValidation && !error && (
        <>
          {hasError ? (
            <p className="mt-1 text-xs text-[var(--md-error)]">{validation.error}</p>
          ) : (
            <p className="mt-1 text-xs text-green-600">{`✓ ${t('form.phone.valid')}`}</p>
          )}
        </>
      )}
    </div>
  );
}

function AddressSection({ label, prefix, fields, values, errors, isSubmitting, onUpdate, isLastSection }: {
  label: string;
  prefix: 'work_address' | 'home_address';
  fields: Array<{ fieldKey: FieldKey; required: boolean }>;
  values: Record<string, string>;
  errors: Record<string, string>;
  isSubmitting: boolean;
  onUpdate: (fieldKey: FieldKey, value: string) => void;
  isLastSection: boolean;
}) {
  const { t } = useI18n();
  const selectedCountry = values[`${prefix}_country`] ?? '';
  const isUSSelected = selectedCountry === 'United States';

  return (
    <section className={`space-y-4 border-t border-[var(--md-outline)]/60 py-4 ${isLastSection ? 'border-b' : ''}`}>
      <div className="flex items-center gap-3 pt-2">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--md-muted)]">{label}</p>
        <div aria-hidden className="h-px flex-1 bg-[var(--md-outline)]/70" />
      </div>
        {/* Street (full width) */}
        {fields.find((f) => f.fieldKey.endsWith('_street')) && (
          <div>
            <label htmlFor={`${prefix}_street`} className="block text-sm font-semibold text-[var(--md-text)]">
              {t('form.address.street')}
            </label>
            <input
              id={`${prefix}_street`}
              type="text"
              value={values[`${prefix}_street`] ?? ''}
              onChange={(e) => onUpdate(`${prefix}_street` as FieldKey, e.target.value)}
              disabled={isSubmitting}
              className="material-input mt-1 w-full"
            />
            {errors[`${prefix}_street`] && (
              <p className="mt-1 text-xs text-[var(--md-error)]">{errors[`${prefix}_street`]}</p>
            )}
          </div>
        )}

        {/* City */}
        {fields.find((f) => f.fieldKey.endsWith('_city')) && (
          <div>
            <label htmlFor={`${prefix}_city`} className="block text-sm font-semibold text-[var(--md-text)]">
              {t('form.address.city')}
            </label>
            <input
              id={`${prefix}_city`}
              type="text"
              value={values[`${prefix}_city`] ?? ''}
              onChange={(e) => onUpdate(`${prefix}_city` as FieldKey, e.target.value)}
              disabled={isSubmitting}
              className="material-input mt-1 w-full"
            />
            {errors[`${prefix}_city`] && (
              <p className="mt-1 text-xs text-[var(--md-error)]">{errors[`${prefix}_city`]}</p>
            )}
          </div>
        )}

        {/* State / Region */}
        {fields.find((f) => f.fieldKey.endsWith('_state')) && (
          <div>
            <label htmlFor={`${prefix}_state`} className="block text-sm font-semibold text-[var(--md-text)]">
              {t('form.address.state')}
            </label>
            {isUSSelected ? (
              <select
                id={`${prefix}_state`}
                value={values[`${prefix}_state`] ?? ''}
                onChange={(e) => onUpdate(`${prefix}_state` as FieldKey, e.target.value)}
                disabled={isSubmitting}
                className="material-input mt-1 w-full"
              >
                <option value="">{t('form.address.stateSelect')}</option>
                {US_STATES.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id={`${prefix}_state`}
                type="text"
                value={values[`${prefix}_state`] ?? ''}
                onChange={(e) => onUpdate(`${prefix}_state` as FieldKey, e.target.value)}
                disabled={isSubmitting}
                className="material-input mt-1 w-full"
              />
            )}
            {errors[`${prefix}_state`] && (
              <p className="mt-1 text-xs text-[var(--md-error)]">{errors[`${prefix}_state`]}</p>
            )}
          </div>
        )}

        {/* Postal Code */}
        {fields.find((f) => f.fieldKey.endsWith('_postal_code')) && (
          <div>
            <label htmlFor={`${prefix}_postal_code`} className="block text-sm font-semibold text-[var(--md-text)]">
              {t('form.address.postal')}
            </label>
            <input
              id={`${prefix}_postal_code`}
              type="text"
              value={values[`${prefix}_postal_code`] ?? ''}
              onChange={(e) => onUpdate(`${prefix}_postal_code` as FieldKey, e.target.value)}
              disabled={isSubmitting}
              className="material-input mt-1 w-full"
            />
            {errors[`${prefix}_postal_code`] && (
              <p className="mt-1 text-xs text-[var(--md-error)]">{errors[`${prefix}_postal_code`]}</p>
            )}
          </div>
        )}

        {/* Country */}
        {fields.find((f) => f.fieldKey.endsWith('_country')) && (
          <div>
            <label htmlFor={`${prefix}_country`} className="block text-sm font-semibold text-[var(--md-text)]">
              {t('form.address.country')}
            </label>
            <CountryCombobox
              id={`${prefix}_country`}
              value={values[`${prefix}_country`] ?? ''}
              onChange={(val) => onUpdate(`${prefix}_country` as FieldKey, val)}
              disabled={isSubmitting}
              error={errors[`${prefix}_country`]}
            />
          </div>
        )}
    </section>
  );
}

export default function FormPage() {
  const { t } = useI18n();
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const token = params.token;

  const [flowState, setFlowState] = useState<FlowState>('loading');
  const [formData, setFormData] = useState<FormData | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [photoDataUri, setPhotoDataUri] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const [submitError, setSubmitError] = useState('');
  const [loadErrorKind, setLoadErrorKind] = useState<LoadErrorKind>('generic');
  const [loadErrorMessage, setLoadErrorMessage] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadForm() {
      setFlowState('loading');
      try {
        const response = await api.getPublicForm(token);
        if (!isMounted) {
          return;
        }

        const nextValues: Record<string, string> = {};
        for (const field of response.fields) {
          nextValues[field.fieldKey] = response.prefilled[field.fieldKey] ?? '';
        }

        setFormData(response);
        setValues(nextValues);
        setPhotoDataUri(response.prefilled['photo'] ?? null);
        setFieldErrors({});
        setSubmitError('');
        setFlowState('intro');
      } catch (error) {
        if (!isMounted) {
          return;
        }

        if (error instanceof ApiClientError) {
          setLoadErrorMessage(error.message);
          if (error.status === 404) {
            setLoadErrorKind('not-found');
          } else if (error.status === 409) {
            setLoadErrorKind('already-submitted');
          } else if (error.status === 410) {
            setLoadErrorKind('expired');
          } else if (error.status === 422) {
            setLoadErrorKind('invalid');
          } else {
            setLoadErrorKind('generic');
          }
        } else {
          setLoadErrorKind('generic');
          setLoadErrorMessage('');
        }

        setFlowState('error');
      }
    }

    void loadForm();

    return () => {
      isMounted = false;
    };
  }, [token]);

  const orderedFields = useMemo(
    () => [...(formData?.fields ?? [])].sort((a, b) => a.order - b.order),
    [formData],
  );
  const isSubmitting = flowState === 'submitting';

  function getFieldType(fieldKey: FieldKey): React.HTMLInputTypeAttribute {
    if (fieldKey.includes('email')) {
      return 'email';
    }
    if (fieldKey.includes('phone')) {
      return 'tel';
    }
    if (fieldKey === 'birthday') {
      return 'date';
    }
    if (fieldKey === 'website') {
      return 'url';
    }
    return 'text';
  }

  function getFieldLabel(fieldKey: FieldKey): string {
    return t(`field.${fieldKey}`);
  }

  function isFieldRequired(field: { fieldKey: FieldKey; required: boolean }): boolean {
    if (field.required) {
      return true;
    }
    const fieldKey = field.fieldKey;
    return fieldKey.includes('email') || fieldKey.includes('phone') || fieldKey === 'birthday';
  }

  function validateFields(): boolean {
    const nextErrors: Record<string, string> = {};

    for (const field of orderedFields) {
      if (!isFieldRequired(field)) {
        continue;
      }
      const value = values[field.fieldKey]?.trim() ?? '';
      if (!value) {
        nextErrors[field.fieldKey] = t('form.field.required', { label: getFieldLabel(field.fieldKey) });
      }
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function updateValue(fieldKey: FieldKey, nextValue: string) {
    setValues((current) => ({ ...current, [fieldKey]: nextValue }));
    setFieldErrors((current) => {
      if (!current[fieldKey]) {
        return current;
      }
      const { [fieldKey]: _, ...rest } = current;
      return rest;
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!formData) {
      return;
    }

    setSubmitError('');

    if (!validateFields()) {
      return;
    }

    setFlowState('submitting');
    try {
      const trimmedValues = Object.fromEntries(
        orderedFields.map((field) => [field.fieldKey, (values[field.fieldKey] ?? '').trim()]),
      );

      const response = await api.answerPublicForm(formData.token, {
        fields: trimmedValues,
        photo: photoDataUri ?? undefined,
      });

      const rt = encodeURIComponent(response.exchange.retrieveToken);
      const exp = encodeURIComponent(response.exchange.expiresAt);
      router.push(`/form/${formData.token}/done?rt=${rt}&exp=${exp}`);
    } catch (error) {
      if (error instanceof ApiClientError) {
        if (error.status === 409) {
          setLoadErrorKind('already-submitted');
          setLoadErrorMessage(error.message);
          setFlowState('error');
          return;
        }
        if (error.status === 410) {
          setLoadErrorKind('expired');
          setLoadErrorMessage(error.message);
          setFlowState('error');
          return;
        }

        setSubmitError(error.message);
      } else {
        setSubmitError(t('form.error.fallbackSubmit'));
      }
      setFlowState('form');
    }
  }

  if (flowState === 'loading') {
    return (
      <main className="material-shell relative flex items-start justify-center pt-8 md:pt-12">
        <div className="recipient-language-anchor">
          <LanguageSwitcher />
        </div>
        <section className="form-reveal material-elevated w-full max-w-3xl overflow-hidden p-6 md:p-8">
          <div className="form-orb form-orb-a" aria-hidden />
          <div className="form-orb form-orb-b" aria-hidden />
          <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div className="space-y-3 text-left">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--md-muted)]">{t('form.loading.badge')}</p>
              <h1 className="material-title font-semibold">{t('form.loading.title')}</h1>
              <p className="material-muted max-w-md text-sm leading-7">{t('form.loading.description')}</p>
            </div>
            <div className="rounded-3xl border border-[var(--md-outline)] bg-white/75 p-5 shadow-sm">
              <div className="config-loading-line w-full" />
              <div className="mt-5 space-y-3">
                <div className="h-10 rounded-2xl bg-[var(--md-primary-container)]/65" />
                <div className="h-10 w-5/6 rounded-2xl bg-[var(--md-primary-container)]/45" />
                <div className="h-10 w-2/3 rounded-2xl bg-[var(--md-primary-container)]/35" />
              </div>
            </div>
          </div>
          <div className="config-loading-line mx-auto mt-6" />
        </section>
      </main>
    );
  }

  if (flowState === 'error') {
    const stateContent: Record<LoadErrorKind, { title: string; description: string }> = {
      'already-submitted': {
        title: t('form.error.alreadySubmitted.title'),
        description: t('form.error.alreadySubmitted.description'),
      },
      expired: {
        title: t('form.error.expired.title'),
        description: t('form.error.expired.description'),
      },
      'not-found': {
        title: t('form.error.notFound.title'),
        description: t('form.error.notFound.description'),
      },
      invalid: {
        title: t('form.error.invalid.title'),
        description: t('form.error.invalid.description'),
      },
      generic: {
        title: t('form.error.generic.title'),
        description: t('form.error.generic.description'),
      },
    };
    const content = stateContent[loadErrorKind];

    return (
      <main className="material-shell relative flex items-start justify-center pt-8 md:pt-12">
        <div className="recipient-language-anchor">
          <LanguageSwitcher />
        </div>
        <section className="form-reveal material-elevated w-full max-w-3xl p-6 md:p-10">
          <div className="mx-auto flex w-full max-w-xl flex-col items-center text-center">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
              {content.title}
            </h1>
            <p className="mt-3 max-w-lg text-sm leading-7 text-slate-600">
              {content.description}
            </p>

          </div>
        </section>
      </main>
    );
  }

  if (flowState === 'intro' && formData) {
    const firstName = formData.contactName.split(' ')[0] ?? formData.contactName;

    return (
      <main className="material-shell relative flex items-start justify-center pt-8 md:pt-12">
        <div className="recipient-language-anchor">
          <LanguageSwitcher />
        </div>
        <section className="form-reveal material-elevated relative w-full max-w-3xl overflow-hidden p-6 md:p-8 lg:p-10">
          <div className="space-y-5 text-left">
            <div className="space-y-2">
              <h1 className="material-title font-semibold">{t('form.intro.title', { name: firstName })}</h1>
            </div>
              <p className="max-w-2xl text-base leading-8 text-[var(--md-text)]">
                {t('form.intro.body1')}
              </p>
              <p className="max-w-2xl text-sm leading-7 text-[var(--md-muted)]">
                {t('form.intro.body2')}
              </p>
              <p className="max-w-2xl text-sm leading-7 text-[var(--md-muted)]">
                {t('form.intro.body3')}
              </p>

              <button
                type="button"
                onClick={() => setFlowState('form')}
                className="material-button material-button-primary mt-2 w-full sm:w-auto"
              >
                {t('form.intro.cta')}
              </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="material-shell relative flex items-start justify-center pt-8 md:pt-12">
      <div className="recipient-language-anchor">
        <LanguageSwitcher />
      </div>
      <section className="form-reveal material-elevated w-full max-w-5xl overflow-hidden p-6 md:p-8 lg:p-10">
        <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
          <div className="space-y-4 text-left">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--md-muted)]">{t('form.header.badge')}</p>
            <h1 className="material-title font-semibold">{t('form.header.title')}</h1>
            <p className="material-muted max-w-xl text-sm leading-7">
              {t('form.header.description')}
            </p>
          </div>

          <div className="form-card-float rounded-3xl border border-[var(--md-outline)] bg-white/90 p-5 shadow-sm md:p-6">
            <form className="space-y-4" onSubmit={handleSubmit}>
              <fieldset disabled={isSubmitting} className={`space-y-4 transition-opacity duration-200 ${isSubmitting ? 'opacity-80' : 'opacity-100'}`}>
                {(() => {
                  const rendered: React.ReactNode[] = [];
                  const processedFields = new Set<string>();
                  const workFieldKeys = new Set<string>(['company', 'job_title', 'work_email']);
                  const workSectionFieldKeys = new Set<string>([
                    ...orderedFields
                      .filter((f) => f.fieldKey.startsWith('work_address_'))
                      .map((f) => f.fieldKey),
                    ...orderedFields
                      .filter((f) => workFieldKeys.has(f.fieldKey))
                      .map((f) => f.fieldKey),
                  ]);
                  
                  for (let index = 0; index < orderedFields.length; index++) {
                    const field = orderedFields[index];
                    
                    // Skip already processed address fields
                    if (processedFields.has(field.fieldKey)) continue;

                    // Group work fields under a single section.
                    if (workSectionFieldKeys.has(field.fieldKey)) {
                      const workRendered: React.ReactNode[] = [];

                      for (const workField of orderedFields) {
                        if (!workSectionFieldKeys.has(workField.fieldKey) || processedFields.has(workField.fieldKey)) {
                          continue;
                        }

                        if (workField.fieldKey.startsWith('work_address_')) {
                          const addressFields = orderedFields.filter((f) => f.fieldKey.startsWith('work_address_'));
                          addressFields.forEach((f) => processedFields.add(f.fieldKey));
                          workRendered.push(
                            <AddressSection
                              key="work-address"
                              label={t('form.address.work')}
                              prefix="work_address"
                              fields={addressFields}
                              values={values}
                              errors={fieldErrors}
                              isSubmitting={isSubmitting}
                              onUpdate={updateValue}
                              isLastSection={true}
                            />,
                          );
                          continue;
                        }

                        processedFields.add(workField.fieldKey);
                        const workValue = values[workField.fieldKey] ?? '';
                        const workError = fieldErrors[workField.fieldKey];
                        const workIsLongText = workField.fieldKey === 'notes';
                        const workIsPhoneField = workField.fieldKey.includes('phone');

                        workRendered.push(
                          <div key={workField.fieldKey} className="form-enter" style={{ animationDelay: `${index * 55}ms` }}>
                            {workIsPhoneField ? (
                              <PhoneInput
                                id={workField.fieldKey}
                                value={workValue}
                                onChange={(val) => updateValue(workField.fieldKey, val)}
                                disabled={isSubmitting}
                                error={workError}
                                label={getFieldLabel(workField.fieldKey) + (isFieldRequired(workField) ? ' *' : '')}
                              />
                            ) : (
                              <>
                                <label htmlFor={workField.fieldKey} className="block text-sm font-semibold text-[var(--md-text)]">
                                  {getFieldLabel(workField.fieldKey)}
                                  {isFieldRequired(workField) ? <span className="ml-1 text-[var(--md-error)]">*</span> : null}
                                </label>

                                {workIsLongText ? (
                                  <textarea
                                    id={workField.fieldKey}
                                    name={workField.fieldKey}
                                    value={workValue}
                                    onChange={(event) => updateValue(workField.fieldKey, event.target.value)}
                                    rows={3}
                                    className="material-input mt-2 resize-y"
                                    required={isFieldRequired(workField)}
                                  />
                                ) : (
                                  <input
                                    id={workField.fieldKey}
                                    name={workField.fieldKey}
                                    value={workValue}
                                    onChange={(event) => updateValue(workField.fieldKey, event.target.value)}
                                    type={getFieldType(workField.fieldKey)}
                                    className="material-input mt-2"
                                    required={isFieldRequired(workField)}
                                  />
                                )}

                                {workError ? (
                                  <p className="mt-1 text-xs text-[var(--md-error)]" role="alert">
                                    {workError}
                                  </p>
                                ) : null}
                              </>
                            )}
                          </div>,
                        );
                      }

                      rendered.push(
                        <section key="work-section" className="space-y-4 border-t border-[var(--md-outline)]/60 py-4">
                          <div className="flex items-center gap-3 pt-2">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--md-muted)]">{t('form.section.work')}</p>
                            <div aria-hidden className="h-px flex-1 bg-[var(--md-outline)]/70" />
                          </div>
                          {workRendered}
                        </section>,
                      );
                      continue;
                    }
                    
                    // Detect work address section
                    if (field.fieldKey.startsWith('work_address_')) {
                      const addressFields = orderedFields.filter((f) => f.fieldKey.startsWith('work_address_'));
                      addressFields.forEach((f) => processedFields.add(f.fieldKey));
                      rendered.push(
                        <AddressSection
                          key="work-address"
                          label={t('form.address.work')}
                          prefix="work_address"
                          fields={addressFields}
                          values={values}
                          errors={fieldErrors}
                          isSubmitting={isSubmitting}
                          onUpdate={updateValue}
                          isLastSection={false}
                        />,
                      );
                      continue;
                    }
                    
                    // Detect home address section
                    if (field.fieldKey.startsWith('home_address_')) {
                      const addressFields = orderedFields.filter((f) => f.fieldKey.startsWith('home_address_'));
                      addressFields.forEach((f) => processedFields.add(f.fieldKey));
                      rendered.push(
                        <AddressSection
                          key="home-address"
                          label={t('form.address.home')}
                          prefix="home_address"
                          fields={addressFields}
                          values={values}
                          errors={fieldErrors}
                          isSubmitting={isSubmitting}
                          onUpdate={updateValue}
                          isLastSection={true}
                        />,
                      );
                      continue;
                    }
                    
                    const value = values[field.fieldKey] ?? '';
                    const error = fieldErrors[field.fieldKey];
                    const isLongText = field.fieldKey === 'notes';
                    const isPhotoField = field.fieldKey === 'photo';
                    const isPhoneField = field.fieldKey.includes('phone');

                    if (isPhotoField) {
                      rendered.push(
                        <div key={field.fieldKey} className="form-enter" style={{ animationDelay: `${index * 55}ms` }}>
                          <label className="block text-sm font-semibold text-[var(--md-text)]">
                            {getFieldLabel(field.fieldKey)}
                            {isFieldRequired(field) ? <span className="ml-1 text-[var(--md-error)]">*</span> : null}
                          </label>
                          <p className="material-muted mt-1 text-xs">{t('form.photo.help')}</p>

                          <input
                            ref={photoInputRef}
                            id="photo-upload"
                            type="file"
                            accept="image/jpeg,image/png"
                            className="hidden"
                            disabled={isSubmitting}
                            onChange={(event) => {
                              const file = event.target.files?.[0];
                              if (!file) {
                                return;
                              }
                              const reader = new FileReader();
                              reader.onload = () => {
                                setPhotoDataUri(reader.result as string);
                              };
                              reader.readAsDataURL(file);
                            }}
                          />

                          <div className="mt-2 flex items-center gap-4">
                            {photoDataUri ? (
                              <img
                                src={photoDataUri}
                                alt={t('form.photo.alt')}
                                className="h-20 w-20 rounded-full border border-[var(--md-outline)] object-cover shadow-sm"
                              />
                            ) : (
                              <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-dashed border-[var(--md-outline)] bg-white/60 text-[var(--md-muted)]">
                                <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                                </svg>
                              </div>
                            )}

                            <div className="flex flex-col gap-2">
                              <button
                                type="button"
                                onClick={() => photoInputRef.current?.click()}
                                className="material-button material-button-secondary text-sm"
                              >
                                {photoDataUri ? t('form.photo.change') : t('form.photo.upload')}
                              </button>
                              {photoDataUri ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPhotoDataUri(null);
                                    if (photoInputRef.current) {
                                      photoInputRef.current.value = '';
                                    }
                                  }}
                                  className="text-xs text-[var(--md-muted)] underline underline-offset-2 hover:text-[var(--md-error)]"
                                >
                                  {t('form.photo.remove')}
                                </button>
                              ) : null}
                            </div>
                          </div>

                          {error ? (
                            <p className="mt-1 text-xs text-[var(--md-error)]" role="alert">
                              {error}
                            </p>
                          ) : null}
                        </div>,
                      );
                      continue;
                    }

                    rendered.push(
                        <div key={field.fieldKey} className="form-enter" style={{ animationDelay: `${index * 55}ms` }}>
                          {isPhoneField ? (
                            <PhoneInput
                              id={field.fieldKey}
                              value={value}
                              onChange={(val) => updateValue(field.fieldKey, val)}
                              disabled={isSubmitting}
                              error={error}
                              label={getFieldLabel(field.fieldKey) + (isFieldRequired(field) ? ' *' : '')}
                            />
                          ) : (
                            <>
                              <label htmlFor={field.fieldKey} className="block text-sm font-semibold text-[var(--md-text)]">
                                {getFieldLabel(field.fieldKey)}
                                {isFieldRequired(field) ? <span className="ml-1 text-[var(--md-error)]">*</span> : null}
                              </label>

                              {isLongText ? (
                                <textarea
                                  id={field.fieldKey}
                                  name={field.fieldKey}
                                  value={value}
                                  onChange={(event) => updateValue(field.fieldKey, event.target.value)}
                                  rows={3}
                                  className="material-input mt-2 resize-y"
                                  required={isFieldRequired(field)}
                                />
                              ) : (
                                <input
                                  id={field.fieldKey}
                                  name={field.fieldKey}
                                  value={value}
                                  onChange={(event) => updateValue(field.fieldKey, event.target.value)}
                                  type={getFieldType(field.fieldKey)}
                                  className="material-input mt-2"
                                  required={isFieldRequired(field)}
                                />
                              )}

                              {error ? (
                                <p className="mt-1 text-xs text-[var(--md-error)]" role="alert">
                                  {error}
                                </p>
                              ) : null}
                            </>
                          )}
                        </div>,
                    );
                  }
                  
                  return rendered;
                })()}
              </fieldset>

              {submitError ? (
                <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-[var(--md-error)]" role="alert">
                  {submitError}
                </p>
              ) : null}

              {isSubmitting ? (
                <div className="space-y-2 rounded-xl border border-[var(--md-outline)] bg-white/80 px-3 py-2">
                  <p className="text-xs text-[var(--md-muted)]">{t('form.submit.sending')}</p>
                  <div className="config-loading-line w-full" />
                </div>
              ) : null}

              <button
                type="submit"
                disabled={isSubmitting}
                className="material-button material-button-primary w-full disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? (
                  <span className="inline-flex items-center gap-2">
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.35" strokeWidth="3" />
                      <path d="M21 12a9 9 0 00-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                    {t('form.submit.progress')}
                  </span>
                ) : t('form.submit.button')}
              </button>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
