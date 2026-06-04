# Feature: Frontend Total Contact Swaps on Done State

> Show the cumulative total contact swaps count on the post-submit done experience to reinforce social proof after a successful exchange.

**Status:** Todo  
**Assigned:** Jesse  
**Parent:** feature-003-frontend-answer-form  
**Depends On:** feature-010-api-total-contactswaps, feature-003-frontend-answer-form

## Goal

After a recipient successfully submits a form, the done experience should display the latest `totalContactSwaps` value returned by the answer response.

This should add lightweight social proof without interrupting the completion flow or degrading current success UX.

## User Flow Placement

1. Recipient submits form from `/forms/{token}` answer flow.
2. Frontend receives successful `POST /v1/forms/:token/answer` response.
3. Frontend navigates to done state/page.
4. Done state shows existing completion content plus total swaps metric from response data.

Placement constraint:
- Metric is shown only in post-submit done state, not on intro/form-entry screens.

## Scope

### In (Frontend Only)

- Done-page UI addition for displaying total contact swaps after successful submit.
- Frontend API client type/handling updates required to read `totalContactSwaps` from answer success response.
- Safe rendering fallback when `totalContactSwaps` is missing, null, invalid, or unavailable in client state.
- Responsive presentation for mobile and desktop done layouts.

### Out

- API route implementation, counter persistence, or D1 migration work.
- Backend response contract design beyond consuming the field.
- Analytics dashboards, milestone badges, or gamification systems.
- Any changes to pre-submit intro or form editing steps.

## Implementation Notes

- Primary touchpoints:
  - `src/frontend/src/lib/api.ts` for answer response typing/parsing to include `totalContactSwaps`.
  - `src/frontend/src/app/forms/[token]/done/page.tsx` for done-state metric rendering.
  - If singular compatibility route remains active, keep parity in `src/frontend/src/app/form/[token]/done/page.tsx`.
- Data handoff approach:
  - Preserve `totalContactSwaps` from submit success into done-page state/params using the same mechanism currently used for post-submit metadata.
  - Do not introduce extra API calls solely to fetch this value.
- Rendering behavior:
  - Use a concise label (for example: "Total contact swaps") and prominent numeric value.
  - Keep visual priority below primary success confirmation so completion CTA remains clear.
- Formatting guidance:
  - Display as locale-aware integer with grouping separators.
  - Guard against negative/non-integer values; fall back to hidden metric block when value is invalid.

## Acceptance Criteria

- [ ] Done page displays total swaps metric when answer response includes valid `totalContactSwaps`.
- [ ] Metric is sourced from answer response data, with dependency on API feature-010 contract.
- [ ] If `totalContactSwaps` is missing or invalid, done page still renders successfully without metric regressions.
- [ ] Displayed number uses readable integer formatting (group separators).
- [ ] Metric presentation is visually clean and legible on both mobile and desktop done layouts.
- [ ] Existing done-page behaviors (thank-you, QR/download actions) remain intact.
- [ ] No additional backend/API implementation tasks are introduced in this frontend feature.

## Dependencies

- `feature-010-api-total-contactswaps` must provide `totalContactSwaps` in successful answer responses.
- `feature-003-frontend-answer-form` submission + done navigation flow remains the integration base.

## Out of Scope

- Retrofitting historical submissions to show previously computed totals.
- Cross-page global counters outside done state.
- A/B experimentation, celebratory animations, or milestone copy variants.
- Backend resilience/retry mechanics for metric generation.
