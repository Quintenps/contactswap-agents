# Feature: Frontend Index Page Redesign

> Replace the boilerplate homepage with a clean, purposeful landing page that surfaces the app identity and gives authenticated admins a direct path to the admin workspace.

**Status:** Todo  
**Assigned:** Unassigned  
**Parent:** SPEC.md  
**Depends On:** `api.verifyApiSecret` (existing, used to detect login state)

## Goal

Redesign `src/frontend/src/app/page.tsx` to be minimal, intentional, and honest about what ContactSwap is. The current page is a placeholder with generic Material design showcase copy. Replace it with a page centered on the app name, a short description, and a conditional admin entry point — nothing more.

The redesign must remain within the existing Material Design visual language (CSS custom properties, `material-*` classes, elevated surfaces).

## User Flow

### Unauthenticated visitor
1. Visitor opens the root URL `/`.
2. Page shows the ContactSwap wordmark and a one-line description.
3. No action buttons or links are shown — the page is purely informational.

### Authenticated admin
1. Admin opens the root URL `/`.
2. Page detects auth state by attempting `api.verifyApiSecret` with the stored API secret from `localStorage` (`API_SECRET_STORAGE_KEY`).
3. If the call succeeds: a single **"Go to admin"** button appears, linking to `/config`.
4. If the call fails (no secret stored, or secret rejected): no button is shown — identical to the unauthenticated state.
5. The auth check is performed client-side after hydration; the button should appear without a full-page reload.

## Acceptance Criteria

- [ ] Old boilerplate content (two-column layout, sidebar cards, chip, placeholder copy) is fully removed.
- [ ] Page displays the app name **ContactSwap** as the primary heading.
- [ ] Page displays a short, accurate subtitle (see Suggested Copy below).
- [ ] Auth check is performed client-side using `api.verifyApiSecret` with the secret from `localStorage`.
- [ ] While the auth check is in flight, the button area is not shown (avoid layout shift or flash).
- [ ] If authenticated, a single **"Go to admin"** (or equivalent) button is shown, linking to `/config`.
- [ ] If unauthenticated or auth check fails, no button is shown — no error message, no prompt to log in.
- [ ] Layout is centered, vertically and horizontally balanced on all viewport sizes.
- [ ] No two-column layout — single, narrow, centred column only.
- [ ] Keeps the existing `material-shell` wrapper or equivalent Material surface.
- [ ] No additional decorative elements, cards, or marketing copy beyond the wordmark, subtitle, and conditional button.

## Suggested Copy

```
ContactSwap

Share your contact. Get theirs back.
```

Short alternatives to consider:
- "Send a form. Get a vCard back."
- "Contact exchange, without the back-and-forth."
- "The polite way to swap contact details."

The final wording can be decided at implementation time — the feature file leaves it open, but the tone should be plain and functional, not marketing-speak.

## Out of Scope (for this feature)

- Login/authentication UI (no username/password form, no login page).
- Any onboarding or feature-explanation content.
- Linking to or explaining the recipient flow from this page.
- Dark mode or theme switching.

## Technical Notes

- Auth detection is **client-side only** — use a `'use client'` component (or a small child component) to read `localStorage` and call the API after mount.
- Avoid flickering: render nothing in the button slot until the auth check resolves. A simple `null` render before resolution is preferred over a spinner.
- `API_SECRET_STORAGE_KEY` and `api.verifyApiSecret` are already exported from `src/frontend/src/lib/api.ts` — reuse them directly.
- The `localStorage` read and `verifyApiSecret` call should both be wrapped in try/catch; any failure should silently result in the unauthenticated view.
- Keep the component small. If auth detection logic grows, extract it to a small `useAuthState` hook inside the same file or a local `lib/` helper.
- The page is a Next.js Server Component by default; the auth-aware button should be a `'use client'` child component to avoid hydration issues from `localStorage` access.
