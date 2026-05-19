# Feature: Frontend Form Validation UX

> Improve recipient form validation so users can immediately see which fields are invalid and how to fix them.

**Status:** Todo  
**Assigned:** Unassigned  
**Parent:** Recipient form answer flow  
**Depends On:** feature-003-frontend-answer-form, feature-008-api-better-validation

## Goal

Make validation failures actionable in the recipient form by mapping API validation errors to specific fields, showing clear per-field feedback, and guiding the user to resolution with minimal friction.

## Current State / Problem

- Validation is enforced server-side (API + shared types) and submission can fail with 422.
- Frontend currently shows an error state/message but does not reliably indicate which field is wrong.
- Users must guess what to correct, causing unnecessary retries and drop-off.
- The API feature-008 introduces structured validation semantics (including `invalidField` and user-facing messages), but frontend behavior has not yet been specified to consume this shape.

## Proposed UX + Technical Approach

### UX Behavior

1. On submit, run lightweight client pre-checks only for required-empty fields.
2. Submit payload to API even if format is uncertain (API remains source of truth).
3. If API returns 422 with `{ error, invalidField }`:
   - Show inline field error for `invalidField`.
   - Mark input with error styling and accessible error text.
   - Move focus to first invalid field (or scroll into view on mobile).
  - Show a short generic form-level banner as supporting guidance.
4. If API returns 422 without `invalidField`:
   - Show form-level error banner only.
   - Preserve user input; do not clear fields.
5. Clear field-level error when user edits the field and it becomes locally valid (or after successful resubmit).
6. Prevent duplicate submits while request is in flight.

### Mapping Strategy (API Feature-008 Contract)

Frontend maps API validation response to local field errors as follows:

- Input contract expected from feature-008:
  - status: `422`
  - body: `{ error: string, invalidField?: string, status: 422 }`
- Mapping rules:
  - If `invalidField` matches a rendered field key, attach `error` to that field.
  - If `invalidField` does not exist in current rendered field set (mismatch/stale form), fall back to form-level error banner only.
  - Only one field-level API error is expected at a time (first failure), matching feature-008 behavior.

### Frontend State Model (suggested)

- `formValues: Record<string, string>`
- `fieldErrors: Record<string, string | undefined>`
- `formError: string | null`
- `isSubmitting: boolean`
- `lastApiInvalidField?: string`

### Accessibility + Interaction Details

- Inputs with errors use `aria-invalid="true"`.
- Inline error text is connected with `aria-describedby`.
- Form-level error uses `role="alert"`.
- Focus management prioritizes keyboard users after failed submit.
- Error summary remains concise; avoid repeating full technical details.

### Guardrails

- API is the authority for format validation; frontend pre-checks stay minimal in phase 1.
- Keep messages user-facing and non-technical.
- Never discard entered values on validation failure.

## Suggestions & Improvements

1. Introduce a small field-key-to-label map in frontend so fallback messages can include human names consistently.
2. Normalize API error handling in `src/frontend/src/lib/api.ts` to return a typed validation error object instead of generic thrown errors.
3. Add a reusable `setApiFieldError(invalidField, message)` helper to keep page components clean.
4. Add telemetry counters for validation failures by field key in a later phase (without logging user input), if needed.
5. Add optional blur-time local validation in phase 2 using shared schemas once validators are safely exposed for browser use.
6. Add visual anchoring on mobile (scroll + offset) so the invalid field is not hidden behind browser UI.

## Decisions from Review (2026-05-18)

1. Keep submit-cycle field mapping simple: prefer API-reported `invalidField` for field-level error targeting.
2. Keep format feedback behavior as defined: format validation remains API-driven in phase 1, and API messages are shown as user-facing feedback.
3. Do not emit a monitoring event for unknown/unmapped `invalidField` in phase 1.
4. Banner rule: when `invalidField` maps to a field, show both field-level error (primary) and a short form-level banner (supporting). The banner should be generic and non-duplicative (for example: "Please fix the highlighted field and try again."). When mapping is not possible, show only the form-level error banner with API message.
5. Add lightweight status precedence: if token-state responses (`409`/`410`) are returned, they take precedence over validation UI. Do not render 422 field mapping in that case.

## Acceptance Criteria

- [ ] Recipient form can render field-level errors from API 422 responses.
- [ ] Frontend maps API `invalidField` to the matching form field key.
- [ ] Invalid field receives visible error state and accessible semantics (`aria-invalid`, descriptive error text).
- [ ] On API field validation failure, viewport/focus moves to the invalid field.
- [ ] Form-level fallback error is shown when `invalidField` is missing or unmapped.
- [ ] When `invalidField` maps to a rendered field, UI shows both: field-level error (primary) and a short generic form-level banner (supporting).
- [ ] Existing user-entered values remain intact after failed submission.
- [ ] Submit button is disabled while request is in progress to prevent double submit.
- [ ] Field-level error clears when user updates the field and re-submits successfully.
- [ ] Error handling is compatible with API feature-008 response contract.
- [ ] Unknown/unmapped `invalidField` is handled via form-level fallback only (no monitoring event required in phase 1).
- [ ] Phase 1 format feedback remains API-driven (no blur-time format validation requirement).
- [ ] If `409` or `410` is returned, token-state handling overrides 422 field validation presentation.
- [ ] Mobile and desktop behavior both remain usable and visually clear.

## Dependencies

- API feature-008-api-better-validation (structured 422 response and `invalidField` contract).
- Existing recipient answer flow in feature-003-frontend-answer-form.
- Shared field key definitions used by frontend render logic and API payload shape.

## Files to Modify (anticipated)

- `src/frontend/src/app/forms/[token]/page.tsx` (or singular compatibility route in use) — map API validation errors to field UI.
- `src/frontend/src/lib/api.ts` — normalize 422 parsing and expose typed invalid field data.
- `src/frontend/src/app/forms/[token]/done/page.tsx` — no direct validation logic expected, but verify no regressions in post-submit flow.
- `src/frontend/src/lib/messages.ts` and i18n messages (if i18n feature is active) — user-facing validation strings.
- Optional shared form utilities (new helper module) for field error mapping and focus management.

## Implementation Notes for the Next PR

- Build this in a small, reviewable slice:
  1. API error parsing + typed shape in frontend client.
  2. Field-level render and focus behavior.
  3. Fallback banner + accessibility polish.
  4. Tests for mapping and failure states.
- Keep validation logic ownership explicit: API validates formats, frontend maps and presents.
