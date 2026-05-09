# Feature: Frontend Answer Form Flow

> Build the recipient journey for answering a shared contact form URL, including intro step, prefilled form, and exchange-complete success screen.

**Status:** Todo  
**Assigned:** Unassigned  
**Parent:** SPEC.md -> "User Flow: 2. Recipient Fills the Form" + "User Flow: 3. Exchange Completes"  
**Depends On:** feature-005-api-retrieve-form, feature-006-api-answer-forms, feature-007-api-return-card-on-form-answer

## Goal

Create a clear, low-friction public flow for recipients who open a shared URL (for example `/forms/{form_token}`):
1. See a subtle intro screen explaining what will happen.
2. Continue into a prefilled form.
3. Submit updated contact details.
4. Land on a success screen that completes the contact swap by returning the requester's contact card.

The flow should feel trustworthy, minimal, and fast on mobile and desktop.

## User Flow

1. Recipient opens shared URL (`/forms/{token}`).
2. Frontend fetches form payload from `GET /v1/forms/:token`.
3. If valid and pending, show an intro/info screen first (not the form immediately).
4. Intro screen explains:
   - They are about to fill in a contact update form.
   - After submitting, they will receive the requester's contact card.
   - Submitted information is processed and then discarded (not retained).
5. Recipient clicks `Continue`.
6. Frontend shows form fields from API `fields`, prefilled with API `prefilled` values.
7. Recipient updates values and submits.
8. Frontend posts to `POST /v1/forms/:token/answer`.
9. On success, frontend navigates to done state/page.
10. Done state shows:
   - Friendly thank-you message.
   - Desktop: QR code to retrieve requester's card.
   - Mobile: clear button/link to download requester's `.vcf` directly.

## Acceptance Criteria

- [ ] Public route for answering form exists and renders for tokenized URLs.
- [ ] Route supports canonical link format from product requirement (`/forms/{token}`) or provides a compatibility redirect from `/form/{token}`.
- [ ] Initial state for valid token is an info/intro screen, not the editable form.
- [ ] Intro screen copy clearly mentions:
- [ ] A form will be presented after continue.
- [ ] Contact swap behavior (submit theirs, receive yours).
- [ ] Privacy behavior (data processed and deleted after processing).
- [ ] Continue action transitions to form view without losing fetched form data.
- [ ] Form renders fields from API `fields` and pre-populates from API `prefilled`.
- [ ] Required field validation is enforced in UI before submit.
- [ ] Submit action calls `POST /v1/forms/:token/answer` with expected payload.
- [ ] Submit button shows loading state and prevents duplicate submissions.
- [ ] Successful submit transitions to done/success page.
- [ ] Done page shows thank-you confirmation.
- [ ] Done page desktop UX includes QR code rendering for return-card flow.
- [ ] Done page mobile UX includes direct VCF download action.
- [ ] Error states are handled for at least: 404 (not found), 409 (already submitted), 410 (expired), 422 (invalid payload), and generic failures.
- [ ] Mobile and desktop layouts are both usable and visually clean.

## Out of Scope (for this feature)

- Email delivery/status UI for owner notification.
- Rich analytics/tracking.
- Localization/i18n system.
- Re-answer or edit-after-submit workflow.

## Technical Notes

- Prefer route target: `src/frontend/src/app/forms/[token]/page.tsx` (plural path for product URL consistency).
- If keeping existing singular structure (`/form/[token]`), add redirect/alias strategy so shared links remain stable.
- Intro and form can be implemented in one route with local view-state (`intro` -> `form` -> `submitting` -> `done`).
- Existing done page location may be reused or moved:
  - Current structure appears to include `src/frontend/src/app/form/[token]/done/page.tsx`.
- Use shared API client helpers in `src/frontend/src/lib/api.ts` for:
  - Retrieve form by token
  - Submit answer
  - Fetch return-card QR / download URL handling
- Keep loading states subtle and non-blocking where possible.
- Prefer preserving prefilled values if submit fails with recoverable errors.
- Keep privacy statement visible but unobtrusive (short helper text is enough).

## API Expectations

- `GET /v1/forms/:token` for intro+form data hydration.
- `POST /v1/forms/:token/answer` for submission.
- Success response includes exchange metadata (`retrieveToken`, `expiresAt`) used by done page.
- Done experience integrates with return-card endpoints from API feature-007:
  - Desktop QR endpoint
  - Direct return-card download endpoint

## Files to Create/Modify

- `src/frontend/src/app/forms/[token]/page.tsx` — recipient intro + answer form flow
- `src/frontend/src/app/forms/[token]/done/page.tsx` — success state with QR/download UX
- `src/frontend/src/lib/api.ts` — public form retrieve/answer/return-card helpers
- `src/frontend/src/app/globals.css` — optional subtle styles for intro/success states
- `src/frontend/src/app/form/[token]/page.tsx` and `src/frontend/src/app/form/[token]/done/page.tsx` — optional compatibility wrappers or redirects (if singular route currently exists)

## Build Scope For First Pass

- Build token route with intro step.
- Fetch and render prefilled dynamic form fields.
- Submit answer payload with loading/error states.
- Build success screen with desktop/mobile differentiated return-card actions.
- Handle token error states gracefully (missing, expired, already used).
