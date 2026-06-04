# Project Context

- **Owner:** Quinten Peels
- **Project:** contactswap-agents
- **Project Description:** Repo scaffold initialized; team setup in progress.
- **Stack:** TypeScript emphasis requested; broader stack not specified yet.
- **Created:** 2026-04-16T14:12:21Z

## Learnings

- Initialized as TypeScript specialist responsible for type-safe implementation and architecture.
- Recast from Matrix universe (Trinity) to Breaking Bad universe.
- **feature-004 (2026-05-10):** In Next.js App Router you cannot mix server and `'use client'` exports in the same file. When a page must be a Server Component but needs client-side localStorage access, extract the client logic into a separate file under `_components/` and import it into the page. The page itself stays directive-free (Server Component by default).
- **feature-004:** Used a three-state enum (`'pending' | 'authenticated' | 'unauthenticated'`) for auth state so the button slot renders `null` during the in-flight check, preventing any flash of the admin button on unauthenticated users.
- **feature-006 (2026-05-18):** Frontend 422 UX is safest when the API client exposes a typed validation payload (`status: 422`, `error`, optional `invalidField`) on `ApiClientError`; submit handlers can then deterministically apply field-level mapping only for rendered keys, keep values intact, and fall back to form-level banner messaging when mapping is missing or stale.
- **feature-006 (2026-05-18):** When API `errors[]` is present, field-level text should come from the matching `{ field, message }` entry, while the form banner should keep the top-level API `error` for consistent global guidance.
- **feature-001 (2026-05-19):** Frontend Cloudflare deployment prep must keep the deployment mode explicit until selected: `pages-static` and `workers-next` require materially different config, scripts, and hosting setup, so implementation should not assume one before the owner chooses.
- 📌 Team update (2026-05-19): Frontend deployment mode is now fixed to `pages-static` with production domain `contactswap.quinten.dev`; keep static export-safe patterns (including `Suspense` wrapping for `useSearchParams`) for release stability.
- Team update (2026-06-02): API CORS strategy now assumes frontend browser origins are allow-listed via explicit `FRONTEND_APP_URL` (with optional exact-origin extensions), so frontend environments should align origin config with API CORS envs.
- **feature-frontend-url-origin (2026-06-02):** In admin create-form success UX, never reuse backend-provided absolute `url` for user sharing/open actions. Build frontend-facing links from `token` via a frontend-origin resolver (`NEXT_PUBLIC_FRONTEND_URL` override, then `window.location.origin`, then local fallback) so copy/open always target `/forms/{token}` on the frontend app.
- **feature-007 (2026-06-03):** Total-contact-swaps display is defined as done-state-only frontend behavior, strictly dependent on API feature-010 `totalContactSwaps` in answer success payload, with graceful UI fallback when the field is missing or invalid.
- **feature-007 implementation (2026-06-03):** Safest frontend-only handoff for post-submit metrics is to validate response fields in `api.ts`, pass valid values through existing done redirect query params, and re-validate on the done page before rendering locale-formatted output so success UX never regresses on malformed payloads.

