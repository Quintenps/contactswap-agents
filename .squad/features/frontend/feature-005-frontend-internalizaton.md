# Feature: Frontend Internationalization (i18n)

> Add multilingual support for recipient-facing frontend experiences, with Dutch as the default language and English as an alternative.

**Status:** Todo  
**Assigned:** Unassigned  
**Parent:** SPEC.md -> Recipient-facing frontend flow  
**Depends On:** feature-003-frontend-answer-form, feature-004-frontend-index-page

## Goal

Introduce a lightweight, maintainable i18n system for user-facing frontend pages so recipients can view content in Dutch (`nl`) or English (`en`).

Dutch must be the default language. Language should be switchable in the UI (dropdown or flag selector) and applied immediately to visible text.

Important scope rule: only recipient-facing/public frontend content is localized. Admin/configuration pages remain single-language for now.

## Scope

### In Scope

- Public/recipient-facing pages and components, including:
  - Root landing page (`/`)
  - Recipient form flow (`/forms/{token}` and done state)
  - Any helper UI text shown to recipients during the form-answer journey
- Language switcher control visible in recipient-facing UI
- Translation resources for:
  - Dutch (`nl`) - default
  - English (`en`)
- Fallback behavior to Dutch for missing keys or unsupported locale values

### Out of Scope

- Admin/config routes and UI under `/config`
- Template management/admin copy
- Backend/API localization
- Email localization (unless rendered by frontend route content)
- More than 2 languages

## User Flow

1. Recipient opens a public page.
2. UI renders in Dutch by default.
3. Recipient can change language using a visible switcher (dropdown or flag-based selector).
4. After switching, all translatable copy on the current recipient-facing page updates to the selected language immediately (without waiting for navigation or refresh).
5. Language choice persists for subsequent recipient-facing pages in the same browser session (and preferably across sessions).
6. If persisted locale is invalid/unknown, app falls back to Dutch.

## Acceptance Criteria

- [ ] Dutch (`nl`) and English (`en`) locale resources exist.
- [ ] Dutch is the default locale when no preference is set.
- [ ] Recipient-facing pages render translatable strings through a centralized i18n mechanism (no hardcoded user copy left in those pages).
- [ ] Admin/configuration pages are excluded from localization and keep current behavior.
- [ ] A visible language switcher is present on recipient-facing pages.
- [ ] Switching language updates visible copy immediately on selection (same view, no manual reload).
- [ ] Language preference is persisted client-side (e.g., localStorage/cookie) and reused on navigation/reload.
- [ ] Invalid or unsupported stored locale values gracefully fall back to Dutch.
- [ ] Missing translation keys fail safely (fallback to Dutch key/value, not empty UI).
- [ ] Mobile and desktop layouts remain usable with both locales.

## UX Notes

- Switcher can be either:
  - A compact dropdown with language labels (`Nederlands`, `English`), or
  - A flag + label selector, if implemented accessibly.
- Keep the control unobtrusive but discoverable (for example in page header/top-right area).
- Avoid relying on flag-only controls; include text labels for clarity and accessibility.

## Technical Notes

- Target a small, explicit translation structure first (for example a `messages` object keyed by locale and translation key).
- Keep translation keys grouped by feature/page for maintainability.
- Define locale constants/types in one place to avoid drift:
  - supported locales: `nl | en`
  - default locale: `nl`
- Add a single helper/hook for:
  - reading active locale
  - setting locale
  - retrieving translated strings with fallback
- Ensure i18n integration works with current Next.js App Router structure.
- Language switcher should set locale state in the active UI tree so translated strings re-render instantly.
- Avoid introducing localization complexity for admin routes; isolate i18n usage to recipient-facing app segments.

## Suggested Files to Create/Modify

- `src/frontend/src/lib/i18n.ts` - locale constants, storage key, resolver/fallback helpers
- `src/frontend/src/lib/messages.ts` - translation dictionaries for `nl` and `en`
- `src/frontend/src/app/_components/language-switcher.tsx` - reusable locale switcher UI
- Recipient-facing pages/components:
  - `src/frontend/src/app/page.tsx`
  - `src/frontend/src/app/forms/[token]/page.tsx`
  - `src/frontend/src/app/forms/[token]/done/page.tsx`
  - (Optional compatibility path equivalents under `/form/[token]` if still used)

## Build Scope For First Pass

- Add i18n primitives (locales, dictionaries, translate helper).
- Add language switcher component.
- Migrate recipient-facing text to translation keys.
- Persist and restore selected locale.
- Verify admin pages are untouched.
