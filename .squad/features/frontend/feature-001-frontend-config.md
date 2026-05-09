# Feature: Frontend Config Page

> Build a password-gated config page that unlocks a minimal admin dashboard.

**Status:** Todo  
**Assigned:** Unassigned  
**Parent:** SPEC.md -> Frontend  
**Depends On:** feature-001-api-health, feature-003-api-list-forms

## Goal

Create a `/config` webpage where an admin enters the API secret, verifies it against the backend, and then accesses a minimal dashboard for admin actions (starting with upload cards and viewing forms).

## User Flow

1. Admin opens `/config`.
2. If a secret is stored locally, the page shows a subtle loading state while re-validating it.
3. If no valid API secret is stored locally, show password input form.
4. Admin enters API secret and submits.
5. Frontend sends a verification request to backend.
6. If verification succeeds, API secret is stored in localStorage and admin dashboard is shown.
7. If verification fails, show an error and keep admin on login form.
8. On later visits, stored secret is reused to auto-authenticate and directly show dashboard.
9. If a stored secret has become invalid, it is cleared and the user returns to the password form.
10. Admin can log out to clear localStorage and return to the password form.

## Acceptance Criteria

- [ ] `/config` route exists and renders.
- [ ] Unauthenticated state shows only API-secret password form.
- [ ] Submission validates secret via backend endpoint (no fake client-side validation).
- [ ] Verification uses `GET /v1/config/owner-card` with `x-api-secret`.
- [ ] Valid secret is persisted in localStorage and reused on refresh/revisit.
- [ ] Stored secret is revalidated on page load before showing admin UI.
- [ ] Invalid secret shows clear error feedback and does not persist.
- [ ] Authenticated state shows a minimal admin dashboard with at least:
- [ ] Upload owner card capability.
- [ ] View forms capability.
- [ ] Logout action that clears localStorage and resets auth state.
- [ ] Loading and error states are present for auth verification.
- [ ] Loading state feels subtle and smooth rather than heavy or blocking.

## Out of Scope (for this feature)

- Full admin UI polish and visual design system.
- Advanced role/permission model beyond API-secret gate.
- Server-issued session tokens (localStorage API secret is the initial approach).

## Technical Notes

- Route target: `src/frontend/src/app/config/page.tsx`.
- Store secret under a single localStorage key (for example: `contactswap_api_secret`).
- Use `src/frontend/src/lib/api.ts` for API requests so auth handling is centralized.
- Prefer a lightweight auth state model: `checking`, `unauthenticated`, `authenticated`, `error`.
- Ensure secret is never logged to console.
- On invalid stored secret, clear the localStorage key immediately.
- Logout clears the stored API secret and resets in-memory auth state.
- Add clear TODO markers where future token/session auth could replace localStorage secret.

## API Expectations

- Verification calls `GET /v1/config/owner-card` and treats any authenticated `200` response as a valid secret.
- Frontend sends API secret via the expected header contract used by backend middleware.
- Invalid secrets are expected to fail with `401` from protected endpoints.

## Files to Create/Modify

- `src/frontend/src/app/config/page.tsx` — config auth flow and dashboard shell
- `src/frontend/src/lib/api.ts` — API helper support for authenticated config requests
- `src/frontend/src/app/config/templates/page.tsx` — optional first dashboard action target
- `src/frontend/src/app/globals.css` — minimal styles for auth form/dashboard states (if needed)

## Build Scope For First Pass

- Implement API-secret login form.
- Implement stored-secret revalidation on page load.
- Implement subtle loading state for auth checks.
- Implement logout.
- Implement owner-card upload action.
- Implement forms list view in a minimal dashboard layout.
