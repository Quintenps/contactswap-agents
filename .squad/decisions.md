# Squad Decisions

## Active Decisions

### 2026-04-19: Adopt Hono as API framework for the Worker

- Status: Proposed
- By: Gus (Backend Dev)
- Context: API implementation needs Worker-native routing, typed bindings, scoped middleware, and schema validation.
- Decision: Use Hono as the required framework for API routes.
- Rationale: Predictable route composition, centralized error handling, and clean integration with typed `c.env` plus Zod validation.
- Consequences: Standardized endpoint patterns and improved reviewability/testability.

### 2026-04-22T00:00:00Z: API feature documentation directive

- Status: Active directive
- By: qpeels (via Copilot)
- Decision: When building API features, always create or update matching `.http` files with runnable request examples.
- Why: Preserve executable API examples alongside implementation work.

### 2026-05-10: Index page client component extraction

- Status: Accepted
- By: Jesse
- Feature: `feature-004-frontend-index-page`
- Decision: Keep `src/frontend/src/app/page.tsx` as a Server Component and place the auth-aware button in named export `AdminLink` at `src/frontend/src/app/_components/admin-link.tsx` (`'use client'`).
- Rationale: Maintain SSR for static page content while limiting hydration to the interactive button.

### 2026-05-18: Frontend validation error contract and UX precedence

- Status: Accepted
- By: Walter (Lead), Quinten Peels (via Copilot), Jesse
- Feature: `feature-006-frontend-form-validation`
- Decision: Keep validation API-driven; use typed `422` handling (`error`, optional `invalidField`) and map `invalidField` to inline field errors with focus when mapped, otherwise show a form-level fallback without clearing values; keep format feedback API-driven (no blur-time requirement); show a short generic banner alongside mapped field errors; treat `409`/`410` token-state responses as higher precedence than `422`; no phase-1 monitoring for unmapped `invalidField`.
- Rationale: Keep frontend behavior deterministic while preserving precise, actionable correction guidance.
- Consequences: Frontend and API field keys must stay aligned; status-precedence rules remain simple and predictable.

### 2026-05-18: Frontend 422 field message and highlight precedence

- Status: Accepted
- By: Quinten Peels (via Scribe inbox merge)
- Scope: `src/frontend/src/app/form/[token]/page.tsx`
- Decision: For API `422` responses, when `invalidField` maps to a rendered field, source the inline field message from `errors[].message` where `errors[].field === invalidField`; if not present, fall back to top-level validation text (`validation.error`, then `error.message`). Keep the form-level banner on top-level API `error` and keep the mapped field highlighted/focused. If `invalidField` is missing or unmapped, show only the form-level error.
- Rationale: Preserve precise, field-specific guidance while retaining consistent form-level context and existing `409/410` precedence behavior.
- Consequences: UI message sourcing and field highlight behavior are now explicitly tied to API payload structure for mapped validation errors.

### 2026-05-19: Keep frontend Cloudflare deployment mode explicit until selected

- Status: Proposed
- By: Gus
- Context: The API already has a Wrangler-managed Worker configuration, but the frontend only has a conditional static export in `src/frontend/next.config.ts` and no Cloudflare deployment config yet.
- Decision: Document frontend deployment preparation as a required choice between `pages-static` and `workers-next` instead of assuming one mode in advance.
- Rationale: The correct Cloudflare setup, scripts, and config files differ materially between static export and runtime Next.js deployment. Locking the mode before implementation avoids accidental partial setup.
- Consequences: The deployment-preparation feature can be drafted now, but the owner still needs to choose the frontend mode before implementation work starts.

### 2026-06-02: API CORS origin strategy baseline and extensions

- Status: Accepted
- By: Walter (via Scribe inbox merge)
- Scope: API CORS policy configuration
- Context: Current CORS allow-list derives from `PUBLIC_APP_URL`, which points to API origin and blocks frontend-origin browser requests.
- Decision: Adopt Option A immediately by introducing explicit `FRONTEND_APP_URL` as CORS baseline. Keep Option B available as controlled extension through `CORS_ALLOWED_ORIGINS` (comma-separated exact origins). Defer Option C wildcard support until explicitly required.
- Rationale: Option A restores expected browser behavior with lowest risk. Option B supports multi-origin deployments while preserving explicit trust boundaries. Deferring wildcard support avoids unnecessary matching complexity and security surface.
- Consequences: CORS responses must only reflect validated origins, must include `Vary: Origin` when origin can vary per request, must fail safe on invalid env values, and must never use `*` with credentials.

### 2026-06-02: Exchange-token migration gap closed with renamed migration

- Status: Accepted
- By: Hank (via Scribe inbox merge)
- Scope: `src/api/migrations/`
- Context: The exchange-token table existed in the code path, but the ordered migration set had no tracked migration for `form_exchange_tokens`. `0004` was already occupied by `0004_add_photo_to_templates.sql`, so the backfill could not reuse that sequence number.
- Decision: Keep the exchange-token schema in a later, non-conflicting migration and preserve the intended contract: `id`, `form_id`, `exchange_token_hash`, `expires_at`, with `exchange_token_hash` unique and `form_id` referencing `forms(id)`.
- Rationale: A later migration avoids numbering collisions while keeping schema recovery deterministic and idempotent.
- Consequences: The migration history remains ordered, and any reconstructed schema can reconcile the exchange-token table without renumbering earlier migrations.

### 2026-06-02: User-facing create-form links must resolve to frontend origin

- Status: Accepted
- By: Jesse, Gus (via Scribe inbox merge)
- Scope: API `CreateFormResponse.url`, frontend admin create-form success actions
- Context: User-facing form links were vulnerable to API-origin leakage when built directly from backend absolute URL fields in mixed-origin deployments.
- Decision: Keep API response shape unchanged (`id`, `token`, `url`, `expiresAt`), but define the link contract as frontend-origin for user-facing navigation. Backend constructs `url` from `FRONTEND_APP_URL`; frontend success UX builds/open/copy actions from `token` with frontend-origin resolution (`NEXT_PUBLIC_FRONTEND_URL`, then browser origin, then local fallback).
- Rationale: Preserves contract stability while ensuring all share/open actions target frontend-owned `/forms/{token}` routes.
- Consequences: Admin copy/open/share flows are origin-safe for end users, API absolute URLs remain suitable for API-scope resources only, and shared API type/docs now explicitly describe `url` as user-facing frontend route intent.

## Governance

- All meaningful changes require team consensus
- Document architectural decisions here
- Keep history focused on work, decisions focused on direction
